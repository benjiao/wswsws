from django.contrib import admin
from unfold.admin import ModelAdmin

# Register your models here.
from .models import Patient, PatientGroup

from unfold.contrib.filters.admin import TextFilter, FieldTextFilter


@admin.register(Patient)
class PatientAdmin(ModelAdmin):
    list_editable = (
        'color', 'sex', 'birth_date', 'rescued_date',
        'spay_neuter_status', 'spay_neuter_date', 'spay_neuter_clinic', 'group')

    # show a submit button for filters (unfold contrib)
    list_filter_submit = True

    # Prefer specialized filters:
    # - use a choices filter for sex
    # - use Django's DateFieldListFilter for date ranges
    list_filter = (
        ('sex', admin.ChoicesFieldListFilter),
        ('birth_date', admin.DateFieldListFilter),
        ('rescued_date', admin.DateFieldListFilter),
        'color',
        'group',
    )

    # show useful columns in the changelist
    list_display = [
        "name",
        "color",
        "sex",
        "birth_date",
        "rescued_date",
        "spay_neuter_status",
        "spay_neuter_date",
        "spay_neuter_clinic",
        "group"
    ]

    # name is better served by a search box than a list filter
    search_fields = ['name', 'color']

    # paging and ordering
    list_per_page = 25
    ordering = ['name']


@admin.register(PatientGroup)
class PatientGroupAdmin(ModelAdmin):
    list_display = ['name', 'description', 'created_at', 'updated_at']
    list_display_links = ['name']
    list_editable = ['description']
    search_fields = ['name', 'description']
    list_filter = ['created_at', 'updated_at']
    list_per_page = 25
    ordering = ['name']
