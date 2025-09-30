from rest_framework import serializers
from .models import TreatmentSchedule, TreatmentInstance
from patients.serializers import PatientSerializer
from inventory.serializers import MedicineSerializer

class TreatmentScheduleSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    medicine_name = serializers.CharField(source='medicine.name', read_only=True)
    interval_display = serializers.CharField(source='get_interval_display', read_only=True)
    
    class Meta:
        model = TreatmentSchedule
        fields = ['id', 'patient', 'patient_name', 'medicine', 'medicine_name', 
                 'start_date', 'end_date', 'frequency', 'interval', 'interval_display',
                 'dosage', 'unit', 'notes', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

class TreatmentScheduleDetailSerializer(TreatmentScheduleSerializer):
    """Detailed serializer with nested objects"""
    patient = PatientSerializer(read_only=True)
    medicine = MedicineSerializer(read_only=True)
    instances_count = serializers.IntegerField(source='instances.count', read_only=True)
    
    class Meta(TreatmentScheduleSerializer.Meta):
        fields = TreatmentScheduleSerializer.Meta.fields + ['instances_count']

class TreatmentInstanceSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    treatment_schedule = TreatmentScheduleSerializer(read_only=True)
    class Meta:
        model = TreatmentInstance
        fields = ['id', 'treatment_schedule',
                 'scheduled_time', 'status', 'status_display']
        
class TreatmentInstanceDetailSerializer(TreatmentInstanceSerializer):
    """Detailed serializer with nested treatment schedule"""
    treatment_schedule = TreatmentScheduleSerializer(read_only=True)
    
    class Meta(TreatmentInstanceSerializer.Meta):
        pass