from rest_framework import serializers
from .models import VaccineType, VaccineDose
from patients.serializers import PatientSerializer


class VaccineTypeSerializer(serializers.ModelSerializer):
    schedule_mode_display = serializers.CharField(source='get_schedule_mode_display', read_only=True)
    
    class Meta:
        model = VaccineType
        fields = [
            'id', 'name', 'species', 'schedule_mode', 'schedule_mode_display',
            'interval_days', 'grace_days', 'series_doses', 'series_min_age_days',
            'series_gap_days', 'booster_interval_days', 'is_required', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class VaccineDoseSerializer(serializers.ModelSerializer):
    vaccine_type_name = serializers.CharField(source='vaccine_type.name', read_only=True)
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    dose_number = serializers.IntegerField(required=False, allow_null=True)
    expiration_date = serializers.DateField(required=False, allow_null=True)
    
    class Meta:
        model = VaccineDose
        fields = [
            'id', 'vaccine_type', 'vaccine_type_name', 'patient', 'patient_name',
            'dose_number', 'dose_date', 'expiration_date', 'clinic_name',
            'product_name', 'manufacturer', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class VaccineDoseDetailSerializer(VaccineDoseSerializer):
    """Detailed serializer with nested objects"""
    vaccine_type = VaccineTypeSerializer(read_only=True)
    patient = PatientSerializer(read_only=True)

