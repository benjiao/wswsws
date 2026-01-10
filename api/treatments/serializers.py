from rest_framework import serializers
from .models import TreatmentSchedule, TreatmentInstance, TreatmentSession
from patients.serializers import PatientSerializer
from inventory.serializers import MedicineSerializer

class TreatmentScheduleSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    medicine_name = serializers.CharField(source='medicine.name', read_only=True)
    interval_display = serializers.CharField(source='get_interval_display', read_only=True)
    instances_count = serializers.SerializerMethodField()
    pending_count = serializers.SerializerMethodField()
    completed_count = serializers.SerializerMethodField()
    
    class Meta:
        model = TreatmentSchedule
        fields = ['id', 'patient', 'patient_name', 'medicine', 'medicine_name', 
                 'start_time', 'frequency', 'interval', 'interval_display', 'doses',
                 'dosage', 'unit', 'notes', 'created_at', 'updated_at',
                 'instances_count', 'pending_count', 'completed_count']
        read_only_fields = ['created_at', 'updated_at']
    
    def get_instances_count(self, obj):
        return obj.instances.count()
    
    def get_pending_count(self, obj):
        return obj.instances.filter(status=1).count()  # Status 1 is PENDING
    
    def get_completed_count(self, obj):
        return obj.instances.filter(status=3).count()  # Status 3 is COMPLETED

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

# Add to existing serializers.py

class TreatmentSessionSerializer(serializers.ModelSerializer):
    session_type_display = serializers.CharField(source='get_session_type_display', read_only=True)
    instances_count = serializers.SerializerMethodField()
    pending_count = serializers.SerializerMethodField()
    completed_count = serializers.SerializerMethodField()
    
    class Meta:
        model = TreatmentSession
        fields = [
            'id',
            'session_type',
            'session_type_display',
            'session_date', 
            'instances_count', 'pending_count',
            'completed_count', 'created_at', 'updated_at',
            'url'
        ]
    

    def get_prep_list(self, obj):
        prep = {}
        for instance in obj.instances.all():
            medicine = instance.treatment_schedule.medicine
            dosage = instance.treatment_schedule.dosage
            unit = instance.treatment_schedule.unit
            key = (medicine.id, medicine.name, dosage, unit)
            prep[key] = prep.get(key, 0) + 1
        result = []

        # Count pending, given, skipped per medicine
        status_counts = {}
        for instance in obj.instances.all():
            medicine = instance.treatment_schedule.medicine
            dosage = instance.treatment_schedule.dosage
            unit = instance.treatment_schedule.unit
            key = (medicine.id, medicine.name, dosage, unit)
            if key not in status_counts:
                status_counts[key] = {'pending': 0, 'given': 0, 'skipped': 0, 'count': 0}
                status_counts[key]['count'] += 1
            if instance.status == 1:
                status_counts[key]['pending'] += 1
            elif instance.status == 2:
                status_counts[key]['given'] += 1
            elif instance.status == 3:
                status_counts[key]['skipped'] += 1

        for (med_id, med_name, dosage, unit), counts in status_counts.items():
            result.append({
            'medicine_id': med_id,
            'medicine_name': med_name,
            'dosage': dosage,
            'unit': unit,
            'count': counts['count'],
            'pending_count': counts['pending'],
            'given_count': counts['given'],
            'skipped_count': counts['skipped'],
            })
        result.sort(key=lambda x: x['medicine_name'])
        return result

    def get_instances_count(self, obj):
        return obj.instances.count()
    
    def get_pending_count(self, obj):
        return obj.instances.filter(status=1).count()
    
    def get_completed_count(self, obj):
        return obj.instances.filter(status__in=[2, 3]).count()

    def get_url(self, obj):
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(f'/api/treatment-sessions/{obj.id}/')
        return None

class TreatmentSessionDetailSerializer(serializers.ModelSerializer):
    session_type_display = serializers.CharField(source='get_session_type_display', read_only=True)
    instances = TreatmentInstanceSerializer(many=True, read_only=True)
    instances_count = serializers.SerializerMethodField()
    pending_count = serializers.SerializerMethodField()
    completed_count = serializers.SerializerMethodField()
    prep_list = serializers.SerializerMethodField()
    
    class Meta:
        model = TreatmentSession
        fields = [
            'id',
            'session_type',
            'session_type_display',
            'session_date', 
            'instances_count',
            'pending_count',
            'completed_count',
            'created_at', 'updated_at',
            'instances', 'prep_list'
        ]
    
    def get_instances_count(self, obj):
        return obj.instances.count()
    
    def get_pending_count(self, obj):
        return obj.instances.filter(status=1).count()
    
    def get_completed_count(self, obj):
        return obj.instances.filter(status__in=[2, 3]).count()

    def get_prep_list(self, obj):
        prep = {}
        for instance in obj.instances.all():
            medicine = instance.treatment_schedule.medicine
            dosage = instance.treatment_schedule.dosage
            unit = instance.treatment_schedule.unit
            key = (medicine.id, medicine.name, dosage, unit)
            prep[key] = prep.get(key, 0) + 1
        result = []

        # Count pending, given, skipped per medicine
        status_counts = {}
        for instance in obj.instances.all():
            medicine = instance.treatment_schedule.medicine
            dosage = instance.treatment_schedule.dosage
            unit = instance.treatment_schedule.unit
            key = (medicine.id, medicine.name, dosage, unit)
            if key not in status_counts:
                status_counts[key] = {'pending': 0, 'given': 0, 'skipped': 0, 'count': 0}
                status_counts[key]['count'] += 1
            if instance.status == 1:
                status_counts[key]['pending'] += 1
            elif instance.status == 2:
                status_counts[key]['given'] += 1
            elif instance.status == 3:
                status_counts[key]['skipped'] += 1

        for (med_id, med_name, dosage, unit), counts in status_counts.items():
            result.append({
            'medicine_id': med_id,
            'medicine_name': med_name,
            'dosage': dosage,
            'unit': unit,
            'count': counts['count'],
            'pending_count': counts['pending'],
            'given_count': counts['given'],
            'skipped_count': counts['skipped'],
            })
        result.sort(key=lambda x: x['medicine_name'])
        return result
