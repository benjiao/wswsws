from django.contrib import admin
from unfold.admin import ModelAdmin

# Register your models here.
from .models import Patient

@admin.register(Patient)
class PatientAdmin(ModelAdmin):
    list_display = ["name", "color", "sex", "birth_date", "rescued_date"]
