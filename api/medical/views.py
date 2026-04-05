from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import MedicalRecord, HealthCondition, TestResult, FollowUp
from .serializers import MedicalRecordSerializer, HealthConditionSerializer, TestResultSerializer, FollowUpSerializer


class MedicalRecordViewSet(viewsets.ModelViewSet):
    queryset = MedicalRecord.objects.select_related('patient', 'veterinarian', 'clinic').all().order_by('-record_date')
    serializer_class = MedicalRecordSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'veterinarian', 'clinic', 'record_date']
    search_fields = ['patient__name', 'veterinarian__name', 'clinic__name', 'details']
    ordering_fields = ['record_date', 'created_at', 'updated_at', 'patient__name']
    ordering = ['-record_date']


class HealthConditionViewSet(viewsets.ModelViewSet):
    queryset = HealthCondition.objects.select_related('medical_record', 'medical_record__patient').all().order_by('-created_at')
    serializer_class = HealthConditionSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['medical_record', 'is_choronic', 'is_active']
    search_fields = ['type', 'details', 'medical_record__patient__name']
    ordering_fields = ['created_at', 'updated_at', 'type']
    ordering = ['-created_at']


class TestResultViewSet(viewsets.ModelViewSet):
    queryset = TestResult.objects.select_related('medical_record', 'medical_record__patient', 'health_condition').all().order_by('-created_at')
    serializer_class = TestResultSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['medical_record', 'health_condition']
    search_fields = ['type', 'details', 'medical_record__patient__name']
    ordering_fields = ['created_at', 'updated_at', 'type']
    ordering = ['-created_at']


class FollowUpViewSet(viewsets.ModelViewSet):
    queryset = FollowUp.objects.select_related('medical_record', 'medical_record__patient').all().order_by('-follow_up_date')
    serializer_class = FollowUpSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['medical_record', 'follow_up_date']
    search_fields = ['details', 'medical_record__patient__name']
    ordering_fields = ['follow_up_date', 'created_at', 'updated_at']
    ordering = ['-follow_up_date']
