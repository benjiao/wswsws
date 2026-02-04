from django.db import models
from patients.models import Patient
from clinics.models import Clinic, Veterinarian
import uuid

# Create your models here.
class VaccineType(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    species = models.CharField(max_length=50, default='cat')

    interval_days = models.IntegerField(null=True, blank=True)  # e.g. 365 for annual booster
    grace_days = models.IntegerField(default=0)  # allow "due soon" buffer

    is_required = models.BooleanField(default=True)
    notes = models.TextField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class VaccineProduct(models.Model):
    product_name = models.CharField(max_length=255)
    manufacturer = models.CharField(max_length=255, null=True, blank=True)
    vaccine_type = models.ForeignKey(
        VaccineType,
        on_delete=models.CASCADE,
        related_name="products"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.product_name} - {self.manufacturer}"

class VaccineDose(models.Model):
    vaccine_type = models.ForeignKey(VaccineType, on_delete=models.CASCADE, related_name="doses")
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="vaccinations")

    dose_number = models.PositiveIntegerField()
    dose_date = models.DateField()
    expiration_date = models.DateField(null=True, blank=True)

    clinic = models.ForeignKey(
        Clinic,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vaccine_doses',
    )
    veterinarian = models.ForeignKey(
        Veterinarian,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vaccine_doses',
    )
    vaccine_product = models.ForeignKey(
        VaccineProduct,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vaccine_doses',
    )
    
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.vaccine_type.name} - Dose {self.dose_number} - {self.patient.name} - {self.dose_date}"
