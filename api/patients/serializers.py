from rest_framework import serializers
from .models import Patient, PatientGroup, PatientStatus

class PatientStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientStatus
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

class PatientGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientGroup
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

class PatientSerializer(serializers.ModelSerializer):
    sex_display = serializers.CharField(source='get_sex_display', read_only=True)
    group = PatientGroupSerializer(read_only=True)
    group_id = serializers.PrimaryKeyRelatedField(
        source='group',
        queryset=PatientGroup.objects.all(),
        write_only=True,
        required=False,
        allow_null=True
    )
    status = PatientStatusSerializer(read_only=True)
    status_id = serializers.PrimaryKeyRelatedField(
        source='status',
        queryset=PatientStatus.objects.all(),
        write_only=True,
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = Patient
        fields = ['id', 'name', 'birth_date', 'rescued_date', 'color', 'sex', 'sex_display', 
                 'spay_neuter_status', 'spay_neuter_date', 'spay_neuter_clinic', 
                 'group', 'group_id', 'status', 'status_id', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

class PatientListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views"""
    sex_display = serializers.CharField(source='get_sex_display', read_only=True)
    active_treatment_schedules_count = serializers.SerializerMethodField()
    group_name = serializers.CharField(source='group.name', read_only=True)
    group_id = serializers.IntegerField(source='group.id', read_only=True, allow_null=True)
    status_name = serializers.CharField(source='status.name', read_only=True, allow_null=True)
    status_id = serializers.IntegerField(source='status.id', read_only=True, allow_null=True)
    
    class Meta:
        model = Patient
        fields = ['id', 'name', 'birth_date', 'color', 'sex', 'sex_display', 
                 'spay_neuter_status', 'active_treatment_schedules_count', 'group_id', 'group_name',
                 'status_id', 'status_name']
    
    def get_active_treatment_schedules_count(self, obj):
        """Count active treatment schedules for this patient (schedules where is_active is True)"""
        # Use annotated field if available (from queryset annotation), otherwise calculate
        if hasattr(obj, 'active_count'):
            return obj.active_count
        return obj.treatment_schedules.filter(is_active=True).count()