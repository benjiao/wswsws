from rest_framework import serializers
from .models import Patient
from treatments.models import TreatmentInstance

class PatientSerializer(serializers.ModelSerializer):
    sex_display = serializers.CharField(source='get_sex_display', read_only=True)
    
    class Meta:
        model = Patient
        fields = ['id', 'name', 'birth_date', 'rescued_date', 'color', 'sex', 'sex_display', 
                 'spay_neuter_status', 'spay_neuter_date', 'spay_neuter_clinic', 
                 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

class PatientListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views"""
    sex_display = serializers.CharField(source='get_sex_display', read_only=True)
    active_treatment_schedules_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Patient
        fields = ['id', 'name', 'birth_date', 'color', 'sex', 'sex_display', 
                 'spay_neuter_status', 'active_treatment_schedules_count']
    
    def get_active_treatment_schedules_count(self, obj):
        """Count active treatment schedules for this patient (schedules with pending instances)"""
        return obj.treatment_schedules.filter(
            instances__status=TreatmentInstance.STATUS_PENDING
        ).distinct().count()