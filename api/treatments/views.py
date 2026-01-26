from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Prefetch
from datetime import datetime
from django.db.models import Q
from django.db.models.functions import TruncDate
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import TreatmentSchedule, TreatmentInstance, TreatmentSession
from .serializers import (
    TreatmentScheduleSerializer, TreatmentScheduleDetailSerializer,
    TreatmentInstanceSerializer, TreatmentInstanceDetailSerializer,
    TreatmentSessionSerializer, TreatmentSessionDetailSerializer
)

from .tasks import generate_treatment_instances

import logging
from django.db.models import Count, Q

logger = logging.getLogger(__name__)

class TreatmentScheduleViewSet(viewsets.ModelViewSet):
    queryset = TreatmentSchedule.objects.select_related('patient', 'medicine')
    serializer_class = TreatmentScheduleSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'medicine', 'interval', 'is_active']
    search_fields = ['patient__name', 'medicine__name', 'notes']
    ordering_fields = [
        'start_time', 'created_at', 'patient__name', 'medicine__name',
        'frequency', 'doses', 'interval', 'dosage', 'is_active'
    ]
    ordering = ['start_time']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TreatmentScheduleDetailSerializer
        return TreatmentScheduleSerializer
    
    def perform_update(self, serializer):
        """Override to pass update_fields when only is_active is being updated"""
        instance = serializer.instance
        if self.request.method == 'PATCH' and instance:
            # Check if only is_active is in the validated data
            validated_data = serializer.validated_data
            if len(validated_data) == 1 and 'is_active' in validated_data:
                # Only is_active is being updated, save with update_fields
                instance.is_active = validated_data['is_active']
                instance.save(update_fields=['is_active'])
                return
        # For all other updates, use default behavior
        serializer.save()
    
    def get_queryset(self):
        """Filter queryset based on active parameter"""
        queryset = super().get_queryset()
        
        # Filter by is_active field
        active_param = self.request.query_params.get('active', None)
        if active_param is not None:
            if active_param.lower() == 'true':
                # Active: schedules where is_active is True
                queryset = queryset.filter(is_active=True)
            elif active_param.lower() == 'false':
                # Inactive: schedules where is_active is False
                queryset = queryset.filter(is_active=False)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def generate_instances(self, request, pk=None):
        """Trigger Celery task to generate treatment instances"""
        schedule = self.get_object()
        task = generate_treatment_instances.delay(schedule.id)
        return Response({
            'message': 'Instance generation started',
            'task_id': task.id,
            'schedule_id': schedule.id
        })
    
    @action(detail=True, methods=['get'])
    def instances(self, request, pk=None):
        """Get all instances for this schedule"""
        schedule = self.get_object()
        instances = schedule.instances.all().order_by('scheduled_time')
        serializer = TreatmentInstanceSerializer(instances, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active treatment schedules (schedules where is_active is True)"""
        active_schedules = self.get_queryset().filter(is_active=True)
        serializer = self.get_serializer(active_schedules, many=True)
        return Response(serializer.data)

class TreatmentInstanceViewSet(viewsets.ModelViewSet):
    queryset = TreatmentInstance.objects.select_related(
        'treatment_schedule__patient',
        'treatment_schedule__medicine'
    )
    serializer_class = TreatmentInstanceSerializer

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = [
        'status',
        'treatment_schedule__patient',
        'treatment_schedule__medicine',
        'scheduled_time',
    ]
    search_fields = [
        'treatment_schedule__patient__name',
        'treatment_schedule__medicine__name']

    ordering_fields = [
        'scheduled_time',
        'status',
        'treatment_schedule__patient__name',
        'treatment_schedule__medicine__name',
        'created_at',
        'updated_at',]

    ordering = ['scheduled_time']
        
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Handle date filtering manually to avoid issues
        scheduled_date = self.request.query_params.get('scheduled_time__date', None)
        if scheduled_date:
            try:
                # Parse the date string
                date_obj = datetime.strptime(scheduled_date, '%Y-%m-%d').date()
                queryset = queryset.filter(scheduled_time__date=date_obj)
            except ValueError as e:
                logger.warning(f"Invalid date format: {scheduled_date}, error: {e}")
                # Return empty queryset for invalid dates
                queryset = queryset.none()
        
        # Apply ordering from URL parameter if provided
        ordering = self.get_ordering()
        if ordering:
            queryset = queryset.order_by(*ordering)
        
        return queryset

    def get_ordering(self):
        """
        Get ordering from URL parameter or use default.
        Supports multiple fields and descending order with '-' prefix.
        """
        ordering_param = self.request.query_params.get('ordering', None)
        
        logger.debug(f"Ordering parameter: {ordering_param}")
        if ordering_param:
            # Split by comma for multiple fields
            ordering_fields = [field.strip() for field in ordering_param.split(',')]
            
            # Validate ordering fields
            valid_fields = []
            for field in ordering_fields:
                # Remove '-' prefix for validation
                field_name = field.lstrip('-')
                
                # Check if field is in allowed ordering_fields
                if field_name in self.ordering_fields:
                    valid_fields.append(field)
                else:
                    logger.warning(f"Invalid ordering field: {field_name}")
            
            return valid_fields if valid_fields else self.ordering
        
        return self.ordering

    # Removed custom paginate_queryset to use default pagination
    # Pagination will now always be applied and include metadata

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TreatmentInstanceDetailSerializer
        return TreatmentInstanceSerializer
    
    @action(detail=True, methods=['post'])
    def mark_given(self, request, pk=None):
        """Mark treatment instance as given"""
        instance = self.get_object()
        instance.status = 2  # Given
        instance.save()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_skipped(self, request, pk=None):
        """Mark treatment instance as skipped"""
        instance = self.get_object()
        instance.status = 3  # Skipped
        instance.save()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get all pending treatment instances"""
        pending_instances = self.get_queryset().filter(status=TreatmentInstance.STATUS_PENDING)
        page = self.paginate_queryset(pending_instances)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(pending_instances, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def due_today(self, request):
        """Get treatment instances due today"""
        today = timezone.now().date()
        due_today = self.get_queryset().filter(
            scheduled_time__date=today,
            status=TreatmentInstance.STATUS_PENDING
        )
        serializer = self.get_serializer(due_today, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    @action(detail=False, methods=['get'])
    def medicine_adherence(self, request):
        """
        Calculate medicine adherence, filtered by start and end date.
        Query params: start_date, end_date
        Also returns daily adherence.
        Uses Django timezone for date calculations.
        """
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        queryset = self.get_queryset()

        if start_date:
            try:
                # Parse date string and create timezone-aware datetime at start of day in Django timezone
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                start_datetime = timezone.make_aware(
                    datetime.combine(start_date_obj, datetime.min.time())
                )
                queryset = queryset.filter(scheduled_time__gte=start_datetime)
            except ValueError:
                return Response({'error': 'Invalid start_date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        if end_date:
            try:
                # Parse date string and create timezone-aware datetime at end of day in Django timezone
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                end_datetime = timezone.make_aware(
                    datetime.combine(end_date_obj, datetime.max.time())
                )
                queryset = queryset.filter(scheduled_time__lte=end_datetime)
            except ValueError:
                return Response({'error': 'Invalid end_date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        total = queryset.count()
        if total == 0:
            return Response({'adherence': 0, 'daily_adherence': {}})

        given = queryset.filter(status=TreatmentInstance.STATUS_GIVEN).count()
        adherence = (given / total) * 100

        # Calculate daily adherence
        # Use timezone-aware date extraction for proper timezone handling
        daily_qs = queryset.annotate(
            scheduled_date=TruncDate('scheduled_time', tzinfo=timezone.get_current_timezone())
        ).values('scheduled_date').annotate(
            scheduled=Count('id'),
            given=Count('id', filter=Q(status=TreatmentInstance.STATUS_GIVEN)),
            skipped=Count('id', filter=Q(status=TreatmentInstance.STATUS_SKIPPED)),
            pending=Count('id', filter=Q(status=TreatmentInstance.STATUS_PENDING)),
        ).order_by('scheduled_date')

        daily_adherence = {}
        for row in daily_qs:
            # scheduled_date comes as a datetime at midnight in Django timezone (from TruncDate)
            date_obj = row['scheduled_date']
            # Convert to date in Django timezone
            if isinstance(date_obj, datetime):
                # If it's timezone-aware, convert to local timezone then get date
                if timezone.is_aware(date_obj):
                    date_obj = timezone.localtime(date_obj).date()
                else:
                    date_obj = date_obj.date()
            elif hasattr(date_obj, 'date'):
                date_obj = date_obj.date()
            # ensure string key in YYYY-MM-DD
            date_str = date_obj.strftime('%Y-%m-%d') if hasattr(date_obj, 'strftime') else str(date_obj)
            scheduled = row.get('scheduled', 0)
            given_count = row.get('given', 0)
            skipped_count = row.get('skipped', 0)
            pending_count = row.get('pending', 0)
            adherence_pct = round((given_count / scheduled) * 100, 2) if scheduled > 0 else 0

            daily_adherence[date_str] = {
                'scheduled': scheduled,
                'given': given_count,
                'skipped': skipped_count,
                'pending': pending_count,
                'adherence': adherence_pct,
            }

        return Response({'adherence': round(adherence, 2), 'daily_adherence': daily_adherence})


# Add this new ViewSet after TreatmentInstanceViewSet
class TreatmentSessionViewSet(viewsets.ModelViewSet):
    queryset = TreatmentSession.objects.all()
    serializer_class = TreatmentSessionSerializer

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = [
        'session_type',
        'session_date',
    ]
    search_fields = [
        'instances__treatment_schedule__patient__name',
        'instances__treatment_schedule__medicine__name'
    ]
    ordering_fields = [
        'session_date',
        'session_type',
        'created_at',
        'updated_at',
    ]
    ordering = ['session_date', 'session_type']

    def get_queryset(self):
        # Define the sorted instances prefetch
        sorted_instances = TreatmentInstance.objects.select_related(
            'treatment_schedule__patient',
            'treatment_schedule__medicine'
        ).order_by(
            'treatment_schedule__patient__name',  # Sort by patient name
            'scheduled_time'  # Then by scheduled time
        )

        # Base queryset with prefetch
        queryset = TreatmentSession.objects.prefetch_related(
            Prefetch('instances', queryset=sorted_instances)
        )        
        
        # Filter by date range if provided
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        
        if date_from:
            try:
                date_from_obj = datetime.strptime(date_from, '%Y-%m-%d').date()
                queryset = queryset.filter(session_date__gte=date_from_obj)
            except ValueError:
                logger.warning(f"Invalid date_from format: {date_from}")
        
        if date_to:
            try:
                date_to_obj = datetime.strptime(date_to, '%Y-%m-%d').date()
                queryset = queryset.filter(session_date__lte=date_to_obj)
            except ValueError:
                logger.warning(f"Invalid date_to format: {date_to}")
        
        return queryset

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TreatmentSessionDetailSerializer
        return TreatmentSessionSerializer

    @action(detail=False, methods=['get'], url_path='by-date/(?P<session_date>[^/.]+)')
    def by_date(self, request, session_date=None, session_type=None):
        """
        Fetch a TreatmentInstance by session_date and session_type_display.
        Expects URL: treatment-session/by_date/<session_date>/
        Query params:
        - in_care: Filter to only include patients currently in care (Active, Available, Medical Hold, Quarantine)
        - group: Filter by patient group ID
        """
        if session_date == "today":
            session_date = timezone.localtime(timezone.now()).date().strftime('%Y-%m-%d')
        if session_date == "tomorrow":
            session_date = (timezone.localtime(timezone.now()).date() + timezone.timedelta(days=1)).strftime('%Y-%m-%d')
        if session_date == "yesterday":
            session_date = (timezone.localtime(timezone.now()).date() - timezone.timedelta(days=1)).strftime('%Y-%m-%d')

        today_sessions = self.get_queryset().filter(session_date=session_date).order_by('session_type')
        
        # Get filters from query params
        group_id = request.query_params.get('group', None)
        in_care = request.query_params.get('in_care', 'false').lower() == 'true'
        
        # Pass filters to serializer context
        serializer = TreatmentSessionDetailSerializer(
            today_sessions, 
            many=True,
            context={
                'group_id': int(group_id) if group_id else None,
                'session_date': session_date,
                'in_care': in_care
            }
        )
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def instances(self, request, pk=None):
        """Get all treatment instances for this session"""
        session = self.get_object()
        instances = session.instances.select_related(
            'treatment_schedule__patient', 'treatment_schedule__medicine'
        ).order_by(
            'treatment_schedule__patient__name'
        )
        
        # Filter by status if provided
        status_filter = request.query_params.get('status', None)
        if status_filter:
            try:
                status_int = int(status_filter)
                instances = instances.filter(status=status_int)
            except ValueError:
                pass
        
        serializer = TreatmentInstanceSerializer(instances, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        """Get progress statistics for this session"""
        session = self.get_object()
        total = session.instances.count()
        pending = session.instances.filter(status=1).count()
        given = session.instances.filter(status=2).count()
        skipped = session.instances.filter(status=3).count()
        
        return Response({
            'session_id': session.id,
            'session_type': session.session_type,
            'session_type_display': session.session_type_display,
            'session_date': session.session_date,
            'total_instances': total,
            'pending': pending,
            'given': given,
            'skipped': skipped,
            'completed': given + skipped,
            'completion_percentage': round((given + skipped) / total * 100, 2) if total > 0 else 0
        })

    @action(detail=False, methods=['post'])
    def create_sessions_for_date(self, request):
        """Create all 4 sessions (morning, noon, afternoon, evening) for a specific date"""
        date_str = request.data.get('date')
        if not date_str:
            return Response({'error': 'Date is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
        
        sessions = []
        for session_type, session_name in TreatmentSession.SESSION_CHOICES:
            session, created = TreatmentSession.objects.get_or_create(
                session_type=session_type,
                session_date=date_obj,
                defaults=self._get_default_times(session_type)
            )
            sessions.append(session)
                
        serializer = self.get_serializer(sessions, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='(?P<session_date>[^/.]+)/(?P<session_type>[^/.]+)')
    def by_date_and_type(self, request, session_date=None, session_type=None):
        """
        Fetch a TreatmentInstance by session_date and session_type_display.
        Expects URL: treatment-schedule/<session_date>/<session_type>/
        """

        if session_date == "today":
            session_date = timezone.localtime(timezone.now()).date().strftime('%Y-%m-%d')
        if session_date == "tomorrow":
            session_date = (timezone.localtime(timezone.now()).date() + timezone.timedelta(days=1)).strftime('%Y-%m-%d')
        if session_date == "yesterday":
            session_date = (timezone.localtime(timezone.now()).date() - timezone.timedelta(days=1)).strftime('%Y-%m-%d')

        if not session_date or not session_type:
            return Response({'error': 'session_date and session_type are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            date_obj = datetime.strptime(session_date, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Invalid session_date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        session = TreatmentSession.objects.filter(
            session_date=date_obj,
            session_type=session_type
        ).first()

        if not session:
            return Response({'error': 'No matching TreatmentSession found.'}, status=status.HTTP_404_NOT_FOUND)

        instances = session.instances.select_related(
            'treatment_schedule__patient', 'treatment_schedule__medicine'
        ).order_by('treatment_schedule__patient__name')

        instance_serializer = TreatmentInstanceSerializer(instances, many=True)
        session_data = TreatmentSessionDetailSerializer(session).data
        session_data['instances'] = instance_serializer.data
        return Response(session_data)

    def _get_default_times(self, session_type):
        """Get default start and end times for session type"""
        time_mappings = {
            TreatmentSession.SESSION_MORNING: {'start_time': '08:00', 'end_time': '11:00'},
            TreatmentSession.SESSION_NOON: {'start_time': '11:00', 'end_time': '14:00'},
            TreatmentSession.SESSION_AFTERNOON: {'start_time': '14:00', 'end_time': '18:00'},
            TreatmentSession.SESSION_EVENING: {'start_time': '18:00', 'end_time': '22:00'},
        }
        
        times = time_mappings.get(session_type, {'start_time': '08:00', 'end_time': '12:00'})
        return {
            'start_time': timezone.datetime.strptime(times['start_time'], '%H:%M').time(),
            'end_time': timezone.datetime.strptime(times['end_time'], '%H:%M').time(),
        }
