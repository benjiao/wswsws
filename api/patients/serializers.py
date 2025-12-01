from rest_framework import serializers
from django.utils import timezone
from django.db.models import Q
from .models import Patient

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
        """Count active treatment schedules for this patient"""
        today = timezone.now().date()
        return obj.treatment_schedules.filter(
            Q(end_date__isnull=True) | Q(end_date__gte=today),
            start_date__lte=today
        ).count()