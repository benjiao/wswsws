from rest_framework import serializers
from .models import Medicine

class MedicineSerializer(serializers.ModelSerializer):
    stock_status_display = serializers.CharField(source='get_stock_status_display', read_only=True)
    
    class Meta:
        model = Medicine
        fields = ['id', 'name', 'stock_status', 'stock_status_display', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']