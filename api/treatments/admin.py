from django.contrib import admin
from django.contrib.admin import SimpleListFilter
from unfold.admin import ModelAdmin
from datetime import datetime, timedelta

# Register your models here.
from .models import TreatmentSchedule, TreatmentInstance
from unfold.contrib.filters.admin import RangeDateFilter, RangeDateTimeFilter

class UniqueHourFilter(SimpleListFilter):
    title = 'scheduled hour'
    parameter_name = 'scheduled_hour'

    def lookups(self, request, model_admin):
        # Get unique datetime values truncated to hour
        from django.db.models import DateTimeField
        from django.db.models.functions import TruncHour
        
        now = datetime.now()
        days_before = now - timedelta(days=1)
        days_after = now + timedelta(days=1)

        unique_hours = (TreatmentInstance.objects
                   .filter(scheduled_time__gte=days_before, scheduled_time__lte=days_after)
                   .annotate(hour=TruncHour('scheduled_time'))
                   .values_list('hour', flat=True)
                   .distinct()
                   .order_by('-hour'))
        return [(hour.strftime('%Y-%m-%d %H:00'), 
                hour.strftime('%B %d, %Y at %I:00 %p')) 
                for hour in unique_hours if hour]

    def queryset(self, request, queryset):
        if self.value():
            from datetime import datetime, timedelta
            selected_hour = datetime.strptime(self.value(), '%Y-%m-%d %H:00')
            next_hour = selected_hour + timedelta(hours=1)
            return queryset.filter(
                scheduled_time__gte=selected_hour,
                scheduled_time__lt=next_hour
            )
        return queryset

@admin.register(TreatmentSchedule)
class TreatmentScheduleAdmin(ModelAdmin):    # show useful columns in the changelist
    list_display = ["patient", "medicine", "start_date", "end_date", "frequency", "interval", "dosage", "unit"]
    list_editable = ["start_date", "end_date", "frequency", "interval", "dosage", "unit"]

    # show a submit button for filters (unfold contrib)
    list_filter_submit = True

    list_filter = (
        ('start_date', RangeDateFilter),
        ('end_date', RangeDateFilter),
        'frequency',
        'interval',
        'dosage',
        'unit',
    )

    # name is better served by a search box than a list filter
    search_fields = ['patient__name']

    # paging and ordering
    list_per_page = 25
    ordering = ['start_date']


@admin.register(TreatmentInstance)
class TreatmentInstanceAdmin(ModelAdmin):
    list_display = ["treatment_schedule__patient", "treatment_schedule__medicine", "scheduled_time", "status"]
    
    def get_patient(self, obj):
        return obj.treatment_schedule.patient
    get_patient.short_description = "Patient"

    def get_medicine(self, obj):
        return obj.treatment_schedule.medicine
    get_medicine.short_description = "Medicine"

    list_display = ["get_patient", "get_medicine", "scheduled_time", "status"]
    list_editable = ["status"]

    # show a submit button for filters (unfold contrib)
    list_filter_submit = True

    list_filter = (
        ('scheduled_time', RangeDateTimeFilter),
        UniqueHourFilter,
        'status',
    )

    # name is better served by a search box than a list filter
    search_fields = ['treatment_schedule__patient__name']

    # paging and ordering
    list_per_page = 25
    ordering = ['scheduled_time']
