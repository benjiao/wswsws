from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import VaccineType, VaccineDose


@admin.register(VaccineType)
class VaccineTypeAdmin(ModelAdmin):
    list_display = [
        'name',
        'species',
        'schedule_mode',
        'interval_days',
        'grace_days',
        'is_required',
        'created_at',
        'updated_at'
    ]
    list_filter = [
        'species',
        'schedule_mode',
        'is_required',
        'created_at',
        'updated_at'
    ]
    search_fields = ['name', 'notes']
    list_editable = ['species', 'schedule_mode', 'interval_days', 'grace_days', 'is_required']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'name', 'species', 'is_required', 'notes')
        }),
        ('Scheduling Configuration', {
            'fields': (
                'schedule_mode',
                'interval_days',
                'grace_days',
            )
        }),
        ('Series Configuration', {
            'fields': (
                'series_doses',
                'series_min_age_days',
                'series_gap_days',
                'booster_interval_days',
            ),
            'classes': ('collapse',)
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
        'dose_number',
        'dose_date',
        'expiration_date',
        'clinic_name',
        'product_name',
        'created_at'
    ]
    list_filter = [
        'vaccine_type',
        'dose_date',
        'expiration_date',
        'created_at',
        'updated_at'
    ]
    search_fields = [
        'patient__name',
        'vaccine_type__name',
        'clinic_name',
        'product_name',
        'manufacturer',
        'notes'
    ]
    list_editable = ['dose_number', 'dose_date', 'expiration_date']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'dose_date'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('vaccine_type', 'patient', 'dose_number')
        }),
        ('Dates', {
            'fields': ('dose_date', 'expiration_date')
        }),
        ('Vaccine Details', {
            'fields': ('clinic_name', 'product_name', 'manufacturer')
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
