from django.contrib import admin
from unfold.admin import ModelAdmin

# Register your models here.
from .models import Medicine

from unfold.contrib.filters.admin import TextFilter, FieldTextFilter


@admin.register(Medicine)
class MedicineAdmin(ModelAdmin):
    list_display = ["name", "stock_status"]
    list_editable = ('stock_status',)

    # show a submit button for filters (unfold contrib)
    list_filter_submit = True

    # Prefer specialized filters:
    # - use a choices filter for sex
    # - use Django's DateFieldListFilter for date ranges
    list_filter = (
        ('stock_status', admin.ChoicesFieldListFilter),
    )

    # paging and ordering
    list_per_page = 25
    ordering = ['name']
