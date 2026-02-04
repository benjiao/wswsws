from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Clinic, Veterinarian
from .serializers import ClinicSerializer, VeterinarianSerializer


class ClinicViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Clinic CRUD operations.

    Provides:
    - list: GET /api/clinics/
    - create: POST /api/clinics/
    - retrieve: GET /api/clinics/{id}/
    - update: PUT /api/clinics/{id}/
    - partial_update: PATCH /api/clinics/{id}/
    - destroy: DELETE /api/clinics/{id}/
    """
    queryset = Clinic.objects.all().order_by('name')
    serializer_class = ClinicSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'address', 'phone', 'email', 'notes']
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['name']


class VeterinarianViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Veterinarian CRUD operations.

    Provides:
    - list: GET /api/veterinarians/
    - create: POST /api/veterinarians/
    - retrieve: GET /api/veterinarians/{id}/
    - update: PUT /api/veterinarians/{id}/
    - partial_update: PATCH /api/veterinarians/{id}/
    - destroy: DELETE /api/veterinarians/{id}/
    """
    queryset = Veterinarian.objects.select_related('clinic').all().order_by('name')
    serializer_class = VeterinarianSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['clinic']
    search_fields = ['name', 'phone', 'email', 'notes', 'clinic__name']
    ordering_fields = ['name', 'clinic__name', 'created_at', 'updated_at']
    ordering = ['name']
