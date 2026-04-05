from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import MedicalRecord, HealthCondition, TestResult, FollowUp


@admin.register(MedicalRecord)
class MedicalRecordAdmin(ModelAdmin):
    list_display = [
        'patient',
        'record_date',
        'veterinarian',
        'clinic',
        'created_at',
        'updated_at',
    ]
    list_filter = ['record_date', 'clinic', 'veterinarian', 'created_at', 'updated_at']
    search_fields = ['patient__name', 'veterinarian__name', 'clinic__name', 'details']
    readonly_fields = ['created_at', 'updated_at']
    autocomplete_fields = ['patient', 'veterinarian', 'clinic']
    date_hierarchy = 'record_date'
    ordering = ['-record_date']


@admin.register(HealthCondition)
class HealthConditionAdmin(ModelAdmin):
    list_display = [
        'type',
        'medical_record',
        'is_choronic',
        'is_active',
        'created_at',
        'updated_at',
    ]
    list_filter = ['is_choronic', 'is_active', 'created_at', 'updated_at']
    search_fields = [
        'type',
        'details',
        'medical_record__patient__name',
    ]
    readonly_fields = ['created_at', 'updated_at']
    autocomplete_fields = ['medical_record']
    ordering = ['-created_at']


@admin.register(TestResult)
class TestResultAdmin(ModelAdmin):
    list_display = [
        'type',
        'medical_record',
        'health_condition',
        'created_at',
        'updated_at',
    ]
    list_filter = ['created_at', 'updated_at']
    search_fields = [
        'type',
        'details',
        'medical_record__patient__name',
    ]
    readonly_fields = ['created_at', 'updated_at']
    autocomplete_fields = ['medical_record', 'health_condition']
    ordering = ['-created_at']


@admin.register(FollowUp)
class FollowUpAdmin(ModelAdmin):
    list_display = [
        'medical_record',
        'follow_up_date',
        'created_at',
        'updated_at',
    ]
    list_filter = ['follow_up_date', 'created_at', 'updated_at']
    search_fields = [
        'details',
        'medical_record__patient__name',
    ]
    readonly_fields = ['created_at', 'updated_at']
    autocomplete_fields = ['medical_record']
    date_hierarchy = 'follow_up_date'
    ordering = ['-follow_up_date']
