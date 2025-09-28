from django.contrib import admin
from unfold.admin import ModelAdmin

# Register your models here.
from .models import TreatmentSchedule, TreatmentInstance

@admin.register(TreatmentSchedule)
class TreatmentScheduleAdmin(ModelAdmin):    # show useful columns in the changelist
    list_display = ["patient", "medicine", "start_date", "end_date", "frequency", "interval", "dosage", "unit"]
    list_editable = ["start_date", "end_date", "frequency", "interval", "dosage", "unit"]

    # show a submit button for filters (unfold contrib)
    list_filter_submit = True

    list_filter = (
        ('start_date', admin.DateFieldListFilter),
        ('end_date', admin.DateFieldListFilter),
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
    list_display = ["treatment_schedule", "scheduled_time", "status"]
    list_editable = ["status"]

    # show a submit button for filters (unfold contrib)
    list_filter_submit = True

    list_filter = (
        ('scheduled_time', admin.DateFieldListFilter),
        'status',
    )

    # name is better served by a search box than a list filter
    search_fields = ['treatment_schedule__patient__name']

    # paging and ordering
    list_per_page = 25
    ordering = ['scheduled_time']
