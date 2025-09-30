from django.contrib import admin
from django.contrib.admin import SimpleListFilter
from unfold.admin import ModelAdmin
from datetime import datetime, timedelta

# Register your models here.
from .models import TreatmentSchedule, TreatmentSession, TreatmentInstance
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

class TreatmentSessionFilter(SimpleListFilter):
    title = 'treatment session'
    parameter_name = 'treatment_session'

    def lookups(self, request, model_admin):
        now = datetime.now()
        days_before = now - timedelta(days=1)
        days_after = now + timedelta(days=1)
        sessions = TreatmentSession.objects.filter(session_date__gte=days_before, session_date__lte=days_after)
        return [(session.id, str(session)) for session in sessions]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(treatment_session_id=self.value())
        return queryset

@admin.register(TreatmentSession)
class TreatmentSessionAdmin(ModelAdmin):    # show useful columns in the changelist
    def instance_count(self, obj):
        return obj.instances.count()
    instance_count.short_description = "Treatments"

    list_display = ['session_date', 'session_type', 'instance_count']

    list_filter = (
        ('session_date', RangeDateFilter),
        ('session_type'),
    )

    # name is better served by a search box than a list filter
    search_fields = []

    def instances_list(self, obj):
        return ", ".join(str(instance) for instance in obj.instances.all())
    instances_list.short_description = "Instances"

    readonly_fields = ['instances_list']
    # paging and ordering
    list_per_page = 25
    ordering = ['session_date']


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

    def get_patient(self, obj):
        return obj.treatment_schedule.patient
    get_patient.short_description = "Patient"

    def get_medicine(self, obj):
        return obj.treatment_schedule.medicine
    get_medicine.short_description = "Medicine"

    def get_dosage(self, obj):
        return obj.treatment_schedule.dosage
    get_dosage.short_description = "Dosage"

    def get_unit(self, obj):
        return obj.treatment_schedule.unit
    get_unit.short_description = "Unit"

    list_display = [
        "get_patient",
        "get_medicine",
        "get_dosage",
        "get_unit",
        "treatment_session",
        "scheduled_time",
        "status"
    ]

    def get_patient_sort_key(obj):
        return obj.treatment_schedule.patient.name if obj.treatment_schedule and obj.treatment_schedule.patient else ''

    def get_medicine_sort_key(obj):
        return obj.treatment_schedule.medicine if obj.treatment_schedule else ''

    get_patient.admin_order_field = 'treatment_schedule__patient__name'
    get_medicine.admin_order_field = 'treatment_schedule__medicine'

    list_editable = ["status"]

    # show a submit button for filters (unfold contrib)
    list_filter_submit = True

    list_filter = (
        ('scheduled_time', RangeDateTimeFilter),
        UniqueHourFilter,
        'status',
        TreatmentSessionFilter,
    )

    # name is better served by a search box than a list filter
    search_fields = ['treatment_schedule__patient__name']

    # paging and ordering
    list_per_page = 25
    ordering = ['scheduled_time']
