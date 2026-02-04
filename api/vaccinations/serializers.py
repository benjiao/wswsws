from rest_framework import serializers
from .models import VaccineType, VaccineProduct, VaccineDose
from patients.serializers import PatientSerializer


class VaccineTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = VaccineType
        fields = [
            'id', 'name', 'species', 'interval_days', 'grace_days',
            'is_required', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class VaccineProductSerializer(serializers.ModelSerializer):
    vaccine_type_name = serializers.CharField(source='vaccine_type.name', read_only=True)

    class Meta:
        model = VaccineProduct
        fields = ['id', 'product_name', 'manufacturer', 'vaccine_type', 'vaccine_type_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class VaccineDoseSerializer(serializers.ModelSerializer):
    vaccine_type_name = serializers.CharField(source='vaccine_type.name', read_only=True)
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    clinic_name_display = serializers.SerializerMethodField()
    veterinarian_name_display = serializers.SerializerMethodField()
    vaccine_product_name_display = serializers.SerializerMethodField()
    dose_number = serializers.IntegerField(required=False, allow_null=True)
    expiration_date = serializers.DateField(required=False, allow_null=True)

    def get_clinic_name_display(self, obj):
        return obj.clinic.name if obj.clinic_id else None

    def get_veterinarian_name_display(self, obj):
        return obj.veterinarian.name if obj.veterinarian_id else None

    def get_vaccine_product_name_display(self, obj):
        if obj.vaccine_product_id:
            return obj.vaccine_product.product_name + (f' ({obj.vaccine_product.manufacturer})' if obj.vaccine_product.manufacturer else '')
        return None

    class Meta:
        model = VaccineDose
        fields = [
            'id', 'vaccine_type', 'vaccine_type_name', 'patient', 'patient_name',
            'dose_number', 'dose_date', 'expiration_date',
            'clinic', 'clinic_name_display', 'veterinarian', 'veterinarian_name_display',
            'vaccine_product', 'vaccine_product_name_display',
            'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class VaccineDoseDetailSerializer(VaccineDoseSerializer):
    """Detailed serializer with nested objects"""
    vaccine_type = VaccineTypeSerializer(read_only=True)
    patient = PatientSerializer(read_only=True)

