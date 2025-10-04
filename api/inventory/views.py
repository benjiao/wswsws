from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Sum, F
from django.db.models.functions import TruncDate
from .models import Medicine
from .serializers import MedicineSerializer
from treatments.models import TreatmentInstance, TreatmentSchedule
from django.utils import timezone
from datetime import datetime, timedelta

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

    @action(detail=True, methods=['get'])
    def dosage_stats(self, request, pk=None):
        """Get dosage statistics for this medicine"""
        medicine = self.get_object()
        
        # Get date range from query params (default to last 30 days)
        end_date = request.query_params.get('end_date')
        start_date = request.query_params.get('start_date')
        
        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        else:
            end_date = timezone.now().date()
            
        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        else:
            start_date = end_date - timedelta(days=30)

        # Get treatment instances for this medicine, grouped by date
        dosage_by_date = TreatmentInstance.objects.filter(
            treatment_schedule__medicine=medicine,
            scheduled_time__date__gte=start_date,
            scheduled_time__date__lte=end_date
        ).annotate(
            date=TruncDate('scheduled_time')
        ).values('date').annotate(
            total_dosage=Sum('treatment_schedule__dosage'),
            instance_count=Count('id')
        ).order_by('date')

        # Calculate total dosage across all days
        total_dosage_all_days = sum(item['total_dosage'] or 0 for item in dosage_by_date)
        
        # Calculate average daily dosage
        days_count = (end_date - start_date).days + 1
        avg_daily_dosage = total_dosage_all_days / days_count if days_count > 0 else 0

        return Response({
            'medicine_id': medicine.id,
            'name': medicine.name,
            'date_range': {
                'start_date': start_date,
                'end_date': end_date
            },
            'dosage_by_date': list(dosage_by_date),
            'total_dosage_period': total_dosage_all_days,
            'average_daily_dosage': round(avg_daily_dosage, 2),
            'days_with_treatment': len(dosage_by_date)
        })

    @action(detail=False, methods=['get'])
    def daily_dosage_summary(self, request):
        """Get daily dosage summary for all medicines"""
        # Get date from query params (default to today)
        target_date = request.query_params.get('date')
        
        if target_date:
            target_date = datetime.strptime(target_date, '%Y-%m-%d').date()
        else:
            target_date = timezone.now().date()

        # Get dosage summary for all medicines on the target date
        daily_summary = TreatmentInstance.objects.filter(
            scheduled_time__date=target_date,
            treatment_schedule__medicine__isnull=False,
        ).values(
            'treatment_schedule__medicine__id',
            'treatment_schedule__medicine__name',
            'treatment_schedule__unit'
        ).annotate(
            total_dosage=Sum('treatment_schedule__dosage'),
            instance_count=Count('id')
        ).order_by('treatment_schedule__medicine__name')

        return Response({
            'date': target_date,
            'medicines': list(daily_summary),
            'total_medicines_used': len(daily_summary)
        })

    @action(detail=False, methods=['get'])
    def treatment_analytics(self, request):
        """Comprehensive treatment analytics with multiple groupings"""
        # Get date range from query params
        end_date = request.query_params.get('end_date')
        start_date = request.query_params.get('start_date')
        medicine_id = request.query_params.get('medicine_id')
        
        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        else:
            end_date = timezone.now().date()
            
        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        else:
            start_date = end_date - timedelta(days=7)

        # Base queryset
        base_queryset = TreatmentInstance.objects.filter(
            scheduled_time__date__gte=start_date,
            scheduled_time__date__lte=end_date,
            treatment_schedule__medicine__isnull=False,
            status=TreatmentInstance.STATUS_GIVEN
        )

        # Filter by specific medicine if provided
        if medicine_id:
            base_queryset = base_queryset.filter(treatment_schedule__medicine_id=medicine_id)

        # 1. Daily dosage by medicine
        daily_by_medicine = base_queryset.annotate(
            date=TruncDate('scheduled_time')
        ).values(
            'date',
            'treatment_schedule__medicine__id',
            'treatment_schedule__medicine__name',
            'treatment_schedule__unit'
        ).annotate(
            total_dosage=Sum('treatment_schedule__dosage'),
            instance_count=Count('id')
        ).order_by('date', 'treatment_schedule__medicine__name')

        # 2. Medicine totals for the period
        medicine_totals = base_queryset.values(
            'treatment_schedule__medicine__id',
            'treatment_schedule__medicine__name',
            'treatment_schedule__unit'
        ).annotate(
            total_dosage=Sum('treatment_schedule__dosage'),
            total_instances=Count('id'),
            days_used=Count('scheduled_time__date', distinct=True)
        ).order_by('-total_dosage')

        # 3. Daily totals (all medicines combined)
        daily_totals = base_queryset.annotate(
            date=TruncDate('scheduled_time')
        ).values('date').annotate(
            total_instances=Count('id'),
            unique_medicines=Count('treatment_schedule__medicine', distinct=True)
        ).order_by('date')

        return Response({
            'date_range': {
                'start_date': start_date,
                'end_date': end_date
            },
            'filter': {
                'medicine_id': medicine_id
            },
            'daily_by_medicine': list(daily_by_medicine),
            'medicine_totals': list(medicine_totals),
            'daily_totals': list(daily_totals),
            'summary': {
                'total_days': (end_date - start_date).days + 1,
                'total_medicines': len(medicine_totals),
                'total_instances': sum(item['total_instances'] for item in medicine_totals)
            }
        })