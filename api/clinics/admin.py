from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import Clinic, Veterinarian


@admin.register(Clinic)
class ClinicAdmin(ModelAdmin):
    list_display = [
        'name',
        'phone',
        'email',
        'created_at',
        'updated_at',
    ]
    list_filter = ['created_at', 'updated_at']
    search_fields = ['name', 'address', 'phone', 'email', 'notes']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        (None, {
            'fields': ('name', 'address', 'phone', 'email', 'notes'),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    list_per_page = 25
    ordering = ['name']


@admin.register(Veterinarian)
class VeterinarianAdmin(ModelAdmin):
    list_display = [
        'name',
        'clinic',
        'phone',
        'email',
        'created_at',
        'updated_at',
    ]
    list_filter = ['clinic', 'created_at', 'updated_at']
    search_fields = ['name', 'phone', 'email', 'notes', 'clinic__name']
    list_select_related = ['clinic']
    readonly_fields = ['created_at', 'updated_at']
    autocomplete_fields = ['clinic']

    fieldsets = (
        (None, {
            'fields': ('name', 'clinic', 'phone', 'email', 'notes'),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    list_per_page = 25
    ordering = ['name']
