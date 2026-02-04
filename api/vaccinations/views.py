from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import OuterRef, Subquery, Max, F, Case, When, Value, BooleanField, Q
from datetime import timedelta
from django.utils import timezone
from .models import VaccineType, VaccineProduct, VaccineDose
from .serializers import VaccineTypeSerializer, VaccineProductSerializer, VaccineDoseSerializer, VaccineDoseDetailSerializer
from .filters import VaccineDoseFilter
from patients.models import Patient


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
    ordering_fields = ['product_name', 'manufacturer', 'vaccine_type__name', 'created_at', 'updated_at']
    ordering = ['vaccine_type__name', 'product_name']

    @action(detail=False, methods=['get'])
    def all(self, request):
        """Get all vaccine products without pagination (for dropdowns/selects)"""
        products = self.queryset.all()
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)


def _vaccine_dose_queryset():
    """Base queryset for VaccineDose with is_latest annotation."""
    latest_date_subq = VaccineDose.objects.filter(
        patient=OuterRef('patient'),
        vaccine_type=OuterRef('vaccine_type'),
    ).values('patient', 'vaccine_type').annotate(
        max_dose_date=Max('dose_date')
    ).values('max_dose_date')[:1]
    return VaccineDose.objects.select_related(
        'vaccine_type', 'patient', 'clinic', 'veterinarian', 'vaccine_product'
    ).annotate(
        _latest_dose_date=Subquery(latest_date_subq),
        is_latest=Case(
            When(dose_date=F('_latest_dose_date'), then=Value(True)),
            default=Value(False),
            output_field=BooleanField(),
        ),
    ).order_by('-dose_date', 'patient__name')


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
    
    Each dose includes is_latest (bool): whether it is the latest dose for that
    patient + vaccine type. Filter with ?is_latest=true to get only latest doses.
    """
    queryset = _vaccine_dose_queryset()
    serializer_class = VaccineDoseSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = VaccineDoseFilter
    search_fields = [
        'patient__name', 'vaccine_type__name', 'clinic__name', 'veterinarian__name',
        'notes',
    ]
    ordering_fields = [
        'dose_date', 'expiration_date', 'created_at', 'updated_at',
        'patient__name', 'vaccine_type__name',
    ]
    ordering = ['-dose_date', 'patient__name']

    def get_serializer_class(self):
        """Use detailed serializer for retrieve action"""
        if self.action == 'retrieve':
            return VaccineDoseDetailSerializer
        return VaccineDoseSerializer

    @action(detail=False, methods=['get'])
    def coverage(self, request):
        """Get vaccination coverage for in-care cats and required vaccine types."""
        in_care_patients_count = Patient.objects.filter(status__is_in_care=True).count()
        required_vaccine_types = VaccineType.objects.filter(is_required=True, species='cat')
        required_vaccine_types_count = required_vaccine_types.count()

        total_slots = in_care_patients_count * required_vaccine_types_count

        today = timezone.now().date()
        covered_pairs = _vaccine_dose_queryset().filter(
            is_latest=True,
            patient__status__is_in_care=True,
            vaccine_type__in=required_vaccine_types,
        ).filter(
            Q(expiration_date__isnull=True) | Q(expiration_date__gte=today)
        ).values('patient_id', 'vaccine_type_id').distinct().count()

        percentage = (covered_pairs / total_slots * 100) if total_slots > 0 else 0

        return Response({
            'in_care_patients': in_care_patients_count,
            'required_vaccine_types': required_vaccine_types_count,
            'covered_pairs': covered_pairs,
            'total_slots': total_slots,
            'percentage': round(percentage, 2),
        })

    def perform_create(self, serializer):
        """Set expiration_date if not provided."""
        validated_data = serializer.validated_data
        expiration_date = validated_data.get('expiration_date')
        if expiration_date is None:
            vaccine_type = validated_data['vaccine_type']
            dose_date = validated_data.get('dose_date')
            if dose_date and vaccine_type.interval_days:
                expiration_date = dose_date + timedelta(days=vaccine_type.interval_days)
        serializer.save(expiration_date=expiration_date)
