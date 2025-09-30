from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response

from datetime import datetime
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import TreatmentSchedule, TreatmentInstance
from .serializers import (
    TreatmentScheduleSerializer, TreatmentScheduleDetailSerializer,
    TreatmentInstanceSerializer, TreatmentInstanceDetailSerializer
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
        'treatment_schedule__patient', 'treatment_schedule__medicine'
    )
    serializer_class = TreatmentInstanceSerializer

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = [
        'status',
        'treatment_schedule__patient',
        'treatment_schedule__medicine',
        'scheduled_time',  # Allows filtering by exact datetime or date
    ]
    search_fields = [
        'treatment_schedule__patient__name',
        'treatment_schedule__medicine__name']
    ordering_fields = ['scheduled_time']
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
        
        return queryset

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
