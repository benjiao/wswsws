from django.contrib import admin
from unfold.admin import ModelAdmin

# Register your models here.
from .models import TreatmentSchedule, TreatmentInstance
from unfold.contrib.filters.admin import RangeDateFilter, RangeDateTimeFilter

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
        'status',
    )

    # name is better served by a search box than a list filter
    search_fields = ['treatment_schedule__patient__name']

    # paging and ordering
    list_per_page = 25
    ordering = ['scheduled_time']
