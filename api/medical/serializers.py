from rest_framework import serializers
from .models import MedicalRecord, HealthCondition, TestResult, FollowUp


class MedicalRecordSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    veterinarian_name_display = serializers.SerializerMethodField()
    clinic_name_display = serializers.SerializerMethodField()

    def get_veterinarian_name_display(self, obj):
        return obj.veterinarian.name if obj.veterinarian_id else None

    def get_clinic_name_display(self, obj):
        return obj.clinic.name if obj.clinic_id else None

    class Meta:
        model = MedicalRecord
        fields = [
            'id',
            'record_date',
            'patient',
            'patient_name',
            'veterinarian',
            'veterinarian_name_display',
            'clinic',
            'clinic_name_display',
            'details',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'details': {'required': False, 'allow_null': True, 'allow_blank': True},
        }


class HealthConditionSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='medical_record.patient.name', read_only=True)

    class Meta:
        model = HealthCondition
        fields = [
            'id',
            'medical_record',
            'patient_name',
            'type',
            'details',
            'is_choronic',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'details': {'required': False, 'allow_null': True, 'allow_blank': True},
        }


class TestResultSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='medical_record.patient.name', read_only=True)
    health_condition_type = serializers.CharField(source='health_condition.type', read_only=True)

    class Meta:
        model = TestResult
        fields = [
            'id',
            'medical_record',
            'patient_name',
            'health_condition',
            'health_condition_type',
            'type',
            'details',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'details': {'required': False, 'allow_null': True, 'allow_blank': True},
        }


class FollowUpSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='medical_record.patient.name', read_only=True)

    class Meta:
        model = FollowUp
        fields = [
            'id',
            'medical_record',
            'patient_name',
            'follow_up_date',
            'details',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'details': {'required': False, 'allow_null': True, 'allow_blank': True},
        }
