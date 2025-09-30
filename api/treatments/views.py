from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response

from datetime import datetime
from django.db.models import Q
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
logger = logging.getLogger(__name__)

class TreatmentScheduleViewSet(viewsets.ModelViewSet):
    queryset = TreatmentSchedule.objects.select_related('patient', 'medicine')
    serializer_class = TreatmentScheduleSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'medicine', 'interval']
    search_fields = ['patient__name', 'medicine__name', 'notes']
    ordering_fields = ['start_date', 'end_date', 'created_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TreatmentScheduleDetailSerializer
        return TreatmentScheduleSerializer
    
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

    def paginate_queryset(self, queryset):
        """
        Return a paginated style `Response`, or `None` if pagination is not configured.
        Only paginate if 'page' parameter is explicitly provided.
        """
        if 'page' not in self.request.query_params:
            return None
        return super().paginate_queryset(queryset)

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

# Add this new ViewSet after TreatmentInstanceViewSet
class TreatmentSessionViewSet(viewsets.ModelViewSet):
    queryset = TreatmentSession.objects.prefetch_related('instances__treatment_schedule__patient', 'instances__treatment_schedule__medicine')
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
        queryset = super().get_queryset()
        
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

    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get all sessions for today"""
        today = timezone.now().date()
        today_sessions = self.get_queryset().filter(session_date=today)
        serializer = self.get_serializer(today_sessions, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def tomorrow(self, request):
        """Get all sessions for tomorrow"""
        tomorrow = timezone.now().date() + timezone.timedelta(days=1)
        tomorrow_sessions = self.get_queryset().filter(session_date=tomorrow)
        serializer = self.get_serializer(tomorrow_sessions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def instances(self, request, pk=None):
        """Get all treatment instances for this session"""
        session = self.get_object()
        instances = session.instances.select_related(
            'treatment_schedule__patient', 'treatment_schedule__medicine'
        ).order_by('scheduled_time')
        
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