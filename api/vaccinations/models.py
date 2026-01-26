from django.db import models
from patients.models import Patient
import uuid

# Create your models here.
class VaccineType(models.Model):
    SCHEDULE_MODE_INTERVAL = 'interval'
    SCHEDULE_MODE_SERIES = 'series'
    
    SCHEDULE_MODE_CHOICES = [
        (SCHEDULE_MODE_INTERVAL, 'Interval'),
        (SCHEDULE_MODE_SERIES, 'Series'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    species = models.CharField(max_length=50, default='cat')
    
    # Scheduling knobs
    schedule_mode = models.CharField(
        max_length=20,
        choices=SCHEDULE_MODE_CHOICES,
        default=SCHEDULE_MODE_INTERVAL
    )
    interval_days = models.IntegerField(null=True, blank=True)  # e.g. 365 for annual booster
    grace_days = models.IntegerField(default=0)  # allow "due soon" buffer

    series_doses = models.IntegerField(null=True, blank=True)  # e.g. 3
    series_min_age_days = models.IntegerField(null=True, blank=True)  # earliest start
    series_gap_days = models.IntegerField(null=True, blank=True)  # e.g. 21-28 days
    booster_interval_days = models.IntegerField(null=True, blank=True)  # after series complete

    is_required = models.BooleanField(default=True)
    notes = models.TextField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class VaccineDose(models.Model):
    vaccine_type = models.ForeignKey(VaccineType, on_delete=models.CASCADE, related_name="doses")
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="vaccinations")

    dose_number = models.PositiveIntegerField()
    dose_date = models.DateField()
    expiration_date = models.DateField(null=True, blank=True)

    clinic_name = models.CharField(max_length=255, null=True, blank=True)
    product_name = models.CharField(max_length=255, null=True, blank=True)
    manufacturer = models.CharField(max_length=255, null=True, blank=True)

    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.vaccine_type.name} - Dose {self.dose_number} - {self.patient.name} - {self.dose_date}"
