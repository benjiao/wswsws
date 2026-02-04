from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Max
from datetime import timedelta
from .models import VaccineType, VaccineProduct, VaccineDose
from .serializers import VaccineTypeSerializer, VaccineProductSerializer, VaccineDoseSerializer, VaccineDoseDetailSerializer


class VaccineTypeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for VaccineType CRUD operations.
    
    Provides:
    - list: GET /api/vaccine-types/
    - create: POST /api/vaccine-types/
    - retrieve: GET /api/vaccine-types/{id}/
    - update: PUT /api/vaccine-types/{id}/
    - partial_update: PATCH /api/vaccine-types/{id}/
    - destroy: DELETE /api/vaccine-types/{id}/
    """
    queryset = VaccineType.objects.all().order_by('name')
    serializer_class = VaccineTypeSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['species', 'is_required']
    search_fields = ['name', 'notes']
    ordering_fields = ['name', 'species', 'is_required', 'created_at', 'updated_at']
    ordering = ['name']
    
    @action(detail=False, methods=['get'])
    def all(self, request):
        """Get all vaccine types without pagination (for dropdowns/selects)"""
        vaccine_types = self.queryset.all()
        serializer = self.get_serializer(vaccine_types, many=True)
        return Response(serializer.data)


class VaccineProductViewSet(viewsets.ModelViewSet):
    """ViewSet for VaccineProduct CRUD. Used for product dropdown and creatable on dose form."""
    queryset = VaccineProduct.objects.select_related('vaccine_type').all().order_by('vaccine_type__name', 'product_name')
    serializer_class = VaccineProductSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['vaccine_type']
    search_fields = ['product_name', 'manufacturer']
    ordering_fields = ['product_name', 'manufacturer', 'created_at', 'updated_at']
    ordering = ['vaccine_type__name', 'product_name']

    @action(detail=False, methods=['get'])
    def all(self, request):
        """Get all vaccine products without pagination (for dropdowns/selects)"""
        products = self.queryset.all()
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)


class VaccineDoseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for VaccineDose CRUD operations.
    
    Provides:
    - list: GET /api/vaccine-doses/
    - create: POST /api/vaccine-doses/
    - retrieve: GET /api/vaccine-doses/{id}/
    - update: PUT /api/vaccine-doses/{id}/
    - partial_update: PATCH /api/vaccine-doses/{id}/
    - destroy: DELETE /api/vaccine-doses/{id}/
    """
    queryset = VaccineDose.objects.select_related(
        'vaccine_type', 'patient', 'clinic', 'veterinarian', 'vaccine_product'
    ).all().order_by('-dose_date', 'patient__name')
    serializer_class = VaccineDoseSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['vaccine_type', 'patient', 'clinic', 'veterinarian', 'vaccine_product', 'dose_date']
    search_fields = [
        'patient__name', 'vaccine_type__name', 'clinic__name', 'veterinarian__name',
        'notes',
    ]
    ordering_fields = ['dose_date', 'expiration_date', 'dose_number', 'created_at', 'updated_at']
    ordering = ['-dose_date', 'patient__name']

    def get_serializer_class(self):
        """Use detailed serializer for retrieve action"""
        if self.action == 'retrieve':
            return VaccineDoseDetailSerializer
        return VaccineDoseSerializer

    def perform_create(self, serializer):
        """Set dose_number and expiration_date if not provided."""
        validated_data = serializer.validated_data
        dose_number = validated_data.get('dose_number')
        expiration_date = validated_data.get('expiration_date')
        if dose_number is None:
            patient = validated_data['patient']
            vaccine_type = validated_data['vaccine_type']
            max_dose = VaccineDose.objects.filter(
                patient=patient,
                vaccine_type=vaccine_type
            ).aggregate(max_dose_number=Max('dose_number'))['max_dose_number']
            dose_number = (max_dose or 0) + 1
        if expiration_date is None:
            vaccine_type = validated_data['vaccine_type']
            dose_date = validated_data.get('dose_date')
            if dose_date and vaccine_type.interval_days:
                expiration_date = dose_date + timedelta(days=vaccine_type.interval_days)
        serializer.save(dose_number=dose_number, expiration_date=expiration_date)

    def perform_update(self, serializer):
        """Auto-compute dose_number when explicitly set to null."""
        validated_data = serializer.validated_data
        dose_number = validated_data.get('dose_number')
        if dose_number is None and 'dose_number' in validated_data:
            instance = serializer.instance
            patient = validated_data.get('patient', instance.patient)
            vaccine_type = validated_data.get('vaccine_type', instance.vaccine_type)
            max_dose = VaccineDose.objects.filter(
                patient=patient,
                vaccine_type=vaccine_type
            ).exclude(pk=instance.pk).aggregate(max_dose_number=Max('dose_number'))['max_dose_number']
            dose_number = (max_dose or 0) + 1
        serializer.save(dose_number=dose_number if 'dose_number' in validated_data else serializer.instance.dose_number)
