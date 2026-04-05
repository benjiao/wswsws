from django.db import models
from clinics.models import Veterinarian, Clinic
from patients.models import Patient

class MedicalRecord(models.Model):
    record_date = models.DateField(null=True, blank=True)

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='medical_records')
    veterinarian = models.ForeignKey(Veterinarian, on_delete=models.SET_NULL, null=True, blank=True, related_name='medical_records')
    clinic = models.ForeignKey(Clinic, on_delete=models.SET_NULL, null=True, blank=True, related_name='medical_records')
    details = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.patient.name} - {self.record_date}"

class Diagnosis(models.Model):
    medical_record = models.ForeignKey(MedicalRecord, on_delete=models.CASCADE, related_name='diagnoses')
    type = models.CharField(max_length=255)
    details = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.medical_record.patient.name} - {self.type}"

class HealthCondition(models.Model):
    medical_record = models.ForeignKey(MedicalRecord, on_delete=models.CASCADE, related_name='health_conditions')
    type = models.CharField(max_length=255)
    details = models.TextField(null=True, blank=True)
    is_choronic = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.medical_record.patient.name} - {self.type}"

class TestResult(models.Model):
    medical_record = models.ForeignKey(MedicalRecord, on_delete=models.CASCADE, related_name='test_results')
    health_condition = models.ForeignKey(HealthCondition, on_delete=models.SET_NULL, null=True, blank=True, related_name='test_results')
    type = models.CharField(max_length=255)
    details = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.medical_record.patient.name} - {self.type}"

class FollowUp(models.Model):
    medical_record = models.ForeignKey(MedicalRecord, on_delete=models.CASCADE, related_name='follow_ups')
    follow_up_date = models.DateField(null=True, blank=True)
    details = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.medical_record.patient.name} - {self.follow_up_date}"
