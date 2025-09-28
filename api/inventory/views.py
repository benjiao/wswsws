from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count
from .models import Medicine
from .serializers import MedicineSerializer
from django.utils import timezone

class MedicineViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Medicine CRUD operations.
    """
    queryset = Medicine.objects.all().order_by('name')
    serializer_class = MedicineSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['stock_status']
    search_fields = ['name']
    ordering_fields = ['name', 'created_at', 'stock_status']
    ordering = ['name']
    
    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Get medicines with low or out of stock"""
        medicines = self.queryset.filter(stock_status__in=[0, 1])
        serializer = self.get_serializer(medicines, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def usage_stats(self, request, pk=None):
        """Get usage statistics for this medicine"""
        medicine = self.get_object()
        schedules_count = medicine.treatment_schedules.count()
        active_schedules = medicine.treatment_schedules.filter(
            start_date__lte=timezone.now().date(),
            end_date__gte=timezone.now().date()
        ).count() if medicine.treatment_schedules.exists() else 0
        
        return Response({
            'medicine_id': medicine.id,
            'name': medicine.name,
            'total_schedules': schedules_count,
            'active_schedules': active_schedules,
        })