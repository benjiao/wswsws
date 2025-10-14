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
        # Group medicines by stock_status
        medicines_by_status = {}
        for status in [0, 1]:
            medicines = self.queryset.filter(stock_status=status)
            key = Medicine.STOCK_STATUS_CHOICES[status][1] if hasattr(Medicine, 'STOCK_STATUS_CHOICES') else str(status)

            medicines_by_status[key] = []
            for medicine in medicines:
                # Calculate pending dosage required for this specific medicine
                pending_instances = TreatmentInstance.objects.filter(
                    treatment_schedule__medicine=medicine,
                    status=TreatmentInstance.STATUS_PENDING,
                    scheduled_time__date__gt=timezone.now().date()
                )
                pending_dosage = pending_instances.aggregate(
                    total_pending_dosage=Sum('treatment_schedule__dosage')
                )['total_pending_dosage'] or 0

                if pending_dosage == 0:
                    continue

                medicine_data = self.get_serializer(medicine).data
                # Get all unique dosage units used for this medicine
                dosage_unit = TreatmentSchedule.objects.filter(
                    medicine=medicine
                ).values_list('unit', flat=True).distinct().first()

                medicine_data['dosage_unit'] = dosage_unit
                medicine_data['pending_dosage_required'] = pending_dosage
                medicines_by_status[key].append(medicine_data)

        return Response(medicines_by_status)
    
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
    def all_medicines_daily_stats(self, request):
        """Get daily dosage statistics for all medicines with detailed breakdown"""
        # Get date range from query params (default to last 7 days)
        end_date = request.query_params.get('end_date')
        start_date = request.query_params.get('start_date')
        
        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        else:
            end_date = timezone.now().date()
            
        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        else:
            start_date = end_date - timedelta(days=7)

        # Get all medicines that have treatment instances in the date range
        medicines_with_treatments = Medicine.objects.filter(
            treatment_schedules__instances__scheduled_time__date__gte=start_date,
            treatment_schedules__instances__scheduled_time__date__lte=end_date
        ).distinct().order_by('name')

        # Calculate days count for the period
        days_count = (end_date - start_date).days + 1

        medicines_data = []

        for medicine in medicines_with_treatments:
            # Get treatment instances for this medicine in date range
            treatment_instances = TreatmentInstance.objects.filter(
                treatment_schedule__medicine=medicine,
                scheduled_time__date__gte=start_date,
                scheduled_time__date__lte=end_date
            ).select_related(
                'treatment_schedule__patient',
                'treatment_session'
            ).order_by('scheduled_time')

            # Group by date
            daily_stats = {}
            total_dosage_period = 0
            total_instances = 0
            total_given = 0
            total_pending = 0
            total_skipped = 0
            unique_patients = set()

            for instance in treatment_instances:
                date_str = instance.scheduled_time.date().isoformat()
                
                if date_str not in daily_stats:
                    daily_stats[date_str] = {
                        'date': date_str,
                        'day_of_week': instance.scheduled_time.date().strftime('%A'),
                        'total_dosage_given': 0,
                        'total_dosage_scheduled': 0,
                        'instance_count': 0,
                        'given_count': 0,
                        'pending_count': 0,
                        'skipped_count': 0,
                        'patients': set(),
                        'sessions': {
                            'Morning': {'count': 0, 'dosage': 0},
                            'Noon': {'count': 0, 'dosage': 0},
                            'Afternoon': {'count': 0, 'dosage': 0},
                            'Evening': {'count': 0, 'dosage': 0},
                            'No Session': {'count': 0, 'dosage': 0}
                        }
                    }
                
                day_data = daily_stats[date_str]
                day_data['instance_count'] += 1
                day_data['total_dosage_scheduled'] += instance.treatment_schedule.dosage or 0
                day_data['patients'].add(instance.treatment_schedule.patient.name)
                
                # Count by status
                if instance.status == TreatmentInstance.STATUS_GIVEN:
                    day_data['given_count'] += 1
                    dosage = instance.treatment_schedule.dosage or 0
                    day_data['total_dosage_given'] += dosage
                    total_dosage_period += dosage
                    total_given += 1
                elif instance.status == TreatmentInstance.STATUS_PENDING:
                    day_data['pending_count'] += 1
                    total_pending += 1
                elif instance.status == TreatmentInstance.STATUS_SKIPPED:
                    day_data['skipped_count'] += 1
                    total_skipped += 1
                
                total_instances += 1
                unique_patients.add(instance.treatment_schedule.patient.name)
                
                # Session breakdown
                session_name = 'No Session'
                if instance.treatment_session:
                    session_name = instance.treatment_session.get_session_type_display()
                
                if session_name in day_data['sessions']:
                    day_data['sessions'][session_name]['count'] += 1
                    if instance.status == TreatmentInstance.STATUS_GIVEN:
                        day_data['sessions'][session_name]['dosage'] += instance.treatment_schedule.dosage or 0

            # Convert sets to lists and sort by date
            daily_list = []
            for date_str in sorted(daily_stats.keys()):
                day_data = daily_stats[date_str]
                day_data['patients'] = list(day_data['patients'])
                day_data['patient_count'] = len(day_data['patients'])
                daily_list.append(day_data)

            # Calculate summary stats for this medicine
            avg_daily_dosage = total_dosage_period / days_count if days_count > 0 else 0
            compliance_rate = (total_given / total_instances * 100) if total_instances > 0 else 0

            # Get medicine unit from first instance
            unit = 'mL'
            if treatment_instances.exists():
                unit = treatment_instances.first().treatment_schedule.unit or 'mL'

            medicines_data.append({
                'medicine_id': medicine.id,
                'medicine_name': medicine.name,
                'unit': unit,
                'color': medicine.color,
                'summary': {
                    'total_dosage_period': round(total_dosage_period, 2),
                    'average_daily_dosage': round(avg_daily_dosage, 2),
                    'total_instances': total_instances,
                    'given_instances': total_given,
                    'pending_instances': total_pending,
                    'skipped_instances': total_skipped,
                    'compliance_rate': round(compliance_rate, 2),
                    'days_with_treatment': len(daily_list),
                    'unique_patients': len(unique_patients)
                },
                'daily_breakdown': daily_list
            })

        # Overall summary across all medicines
        overall_summary = {
            'total_medicines': len(medicines_data),
            'total_dosage_all_medicines': sum(med['summary']['total_dosage_period'] for med in medicines_data),
            'total_instances_all_medicines': sum(med['summary']['total_instances'] for med in medicines_data),
            'overall_compliance_rate': round(
                sum(med['summary']['given_instances'] for med in medicines_data) / 
                sum(med['summary']['total_instances'] for med in medicines_data) * 100
                if sum(med['summary']['total_instances'] for med in medicines_data) > 0 else 0, 2
            ),
            'total_unique_patients': len(set().union(*[
                set(med['summary']['unique_patients'] for med in medicines_data) 
                for med in medicines_data if medicines_data
            ])) if medicines_data else 0
        }

        return Response({
            'date_range': {
                'start_date': start_date,
                'end_date': end_date,
                'total_days': days_count
            },
            'overall_summary': overall_summary,
            'medicines': medicines_data
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