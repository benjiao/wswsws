from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count
from .models import Patient, PatientGroup, PatientStatus
from .serializers import PatientSerializer, PatientListSerializer, PatientGroupSerializer, PatientStatusSerializer


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
    queryset = Patient.objects.all().order_by('name')
    serializer_class = PatientSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['sex', 'color', 'spay_neuter_status', 'group', 'status']
    search_fields = ['name', 'color']
    ordering_fields = [
        'name', 'birth_date', 'rescued_date', 'created_at', 
        'color', 'sex', 'spay_neuter_status', 'group__name', 'status__name', 'active_count'
    ]
    ordering = ['name']
    
    def get_serializer_class(self):
        """Use lighter serializer for list view"""
        if self.action == 'list':
            return PatientListSerializer
        return PatientSerializer
    
    def get_queryset(self):
        """Filter queryset based on query parameters"""
        queryset = super().get_queryset()
        
        # Always annotate active_count for potential filtering and ordering
        queryset = queryset.annotate(
            active_count=Count('treatment_schedules', filter=Q(treatment_schedules__is_active=True))
        )
        
        # Filter by active treatment schedules count
        active_treatments = self.request.query_params.get('active_treatments', None)
        if active_treatments is not None:
            if active_treatments.lower() == 'yes':
                # Has active treatments: count > 0
                queryset = queryset.filter(active_count__gt=0)
            elif active_treatments.lower() == 'no':
                # No active treatments: count = 0
                queryset = queryset.filter(active_count=0)
        
        # Filter by patient status is_in_care
        status_in_care = self.request.query_params.get('status__is_in_care', None)
        if status_in_care is not None:
            if status_in_care.lower() == 'true':
                # Only patients with status marked as in care
                queryset = queryset.filter(status__is_in_care=True)
            elif status_in_care.lower() == 'false':
                # Only patients with status marked as not in care
                queryset = queryset.filter(status__is_in_care=False)
        
        return queryset
    
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
    
    @action(detail=False, methods=['get'])
    def all(self, request):
        """Get all patients without pagination (for dropdowns/selects)"""
        patients = self.queryset.all()
        serializer = PatientListSerializer(patients, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def spay_neuter_stats(self, request):
        """Get spay/neuter statistics"""
        total_patients = Patient.objects.count()
        spayed_neutered_count = Patient.objects.filter(spay_neuter_status=True).count()
        
        percentage = (spayed_neutered_count / total_patients * 100) if total_patients > 0 else 0
        
        return Response({
            'total_patients': total_patients,
            'spayed_neutered_count': spayed_neutered_count,
            'percentage': round(percentage, 2)
        })


class PatientGroupViewSet(viewsets.ModelViewSet):
    """
    ViewSet for PatientGroup CRUD operations.
    """
    queryset = PatientGroup.objects.all().order_by('name')
    serializer_class = PatientGroupSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['name']
    
    @action(detail=False, methods=['get'])
    def all(self, request):
        """Get all patient groups without pagination (for dropdowns/selects)"""
        groups = self.queryset.all()
        serializer = self.get_serializer(groups, many=True)
        return Response(serializer.data)


class PatientStatusViewSet(viewsets.ModelViewSet):
    """
    ViewSet for PatientStatus CRUD operations.
    """
    queryset = PatientStatus.objects.all().order_by('name')
    serializer_class = PatientStatusSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_in_care']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'is_in_care', 'created_at', 'updated_at']
    ordering = ['name']
    
    @action(detail=False, methods=['get'])
    def all(self, request):
        """Get all patient statuses without pagination (for dropdowns/selects)"""
        statuses = self.queryset.all()
        serializer = self.get_serializer(statuses, many=True)
        return Response(serializer.data)