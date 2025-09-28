from rest_framework import serializers
from .models import Patient

class PatientSerializer(serializers.ModelSerializer):
    sex_display = serializers.CharField(source='get_sex_display', read_only=True)
    
    class Meta:
        model = Patient
        fields = ['id', 'name', 'birth_date', 'rescued_date', 'color', 'sex', 'sex_display', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

class PatientListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views"""
    sex_display = serializers.CharField(source='get_sex_display', read_only=True)
    
    class Meta:
        model = Patient
        fields = ['id', 'name', 'birth_date', 'color', 'sex', 'sex_display']