from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import VaccineType, VaccineDose


@admin.register(VaccineType)
class VaccineTypeAdmin(ModelAdmin):
    list_display = [
        'name',
        'species',
        'interval_days',
        'grace_days',
        'is_required',
        'created_at',
        'updated_at'
    ]
    list_filter = [
        'species',
        'is_required',
        'created_at',
        'updated_at'
    ]
    search_fields = ['name', 'notes']
    list_editable = ['species', 'interval_days', 'grace_days', 'is_required']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'name', 'species', 'is_required', 'notes')
        }),
        ('Scheduling Configuration', {
            'fields': ('interval_days', 'grace_days')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    list_per_page = 25
    ordering = ['name']


@admin.register(VaccineDose)
class VaccineDoseAdmin(ModelAdmin):
    list_display = [
        'vaccine_type',
        'patient',
        'dose_date',
        'expiration_date',
        'clinic',
        'veterinarian',
        'created_at'
    ]
    list_filter = [
        'vaccine_type',
        'clinic',
        'veterinarian',
        'dose_date',
        'expiration_date',
        'created_at',
        'updated_at'
    ]
    search_fields = [
        'patient__name',
        'vaccine_type__name',
        'clinic__name',
        'veterinarian__name',
        'notes'
    ]
    list_editable = ['dose_date', 'expiration_date']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'dose_date'
    autocomplete_fields = ['clinic', 'veterinarian']
    list_select_related = ['vaccine_type', 'patient', 'clinic', 'veterinarian']

    fieldsets = (
        ('Basic Information', {
            'fields': ('vaccine_type', 'patient')
        }),
        ('Dates', {
            'fields': ('dose_date', 'expiration_date')
        }),
        ('Vaccine Details', {
            'fields': ('clinic', 'veterinarian')
        }),
        ('Additional Information', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    list_per_page = 25
    ordering = ['-dose_date', 'patient__name']
