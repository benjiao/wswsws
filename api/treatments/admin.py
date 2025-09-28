from django.contrib import admin
from unfold.admin import ModelAdmin

# Register your models here.
from .models import TreatmentSchedule, TreatmentInstance

@admin.register(TreatmentSchedule)
class TreatmentScheduleAdmin(ModelAdmin):
    list_display = ["patient", "start_date", "end_date", "frequency", "interval", "dosage", "unit"]

# admin.site.register(TreatmentScheduleAdmin)
admin.site.register(TreatmentInstance)
