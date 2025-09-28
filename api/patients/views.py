from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import Patient
from .serializers import PatientSerializer, PatientListSerializer


class PatientViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Patient CRUD operations.
    
    Provides:
    - list: GET /api/patients/
    - create: POST /api/patients/
    - retrieve: GET /api/patients/{id}/
    - update: PUT /api/patients/{id}/
    - partial_update: PATCH /api/patients/{id}/
    - destroy: DELETE /api/patients/{id}/
    """
    queryset = Patient.objects.all().order_by('-created_at')
    serializer_class = PatientSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['sex', 'color']
    search_fields = ['name', 'color']
    ordering_fields = ['name', 'birth_date', 'rescued_date', 'created_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Use lighter serializer for list view"""
        if self.action == 'list':
            return PatientListSerializer
        return PatientSerializer
    
    @action(detail=True, methods=['get'])
    def treatment_schedules(self, request, pk=None):
        """Get all treatment schedules for this patient"""
        patient = self.get_object()
        schedules = patient.treatment_schedules.all()
        from treatments.serializers import TreatmentScheduleSerializer
        serializer = TreatmentScheduleSerializer(schedules, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Advanced search endpoint"""
        query = request.query_params.get('q', '')
        if not query:
            return Response([])
        
        patients = self.queryset.filter(
            Q(name__icontains=query) | 
            Q(color__icontains=query)
        )[:10]  # Limit to 10 results
        
        serializer = PatientListSerializer(patients, many=True)
        return Response(serializer.data)