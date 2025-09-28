from django.db import models

# Create your models here.
class TreatmentSchedule(models.Model):
    patient = models.ForeignKey('patients.Patient', on_delete=models.CASCADE, related_name='treatment_schedules')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    frequency = models.IntegerField(null=True, blank=True)
    INTERVAL_CHOICES = [
        (1, 'DAILY'),
        (2, 'EVERY OTHER DAY'),
    ]
    interval = models.IntegerField(choices=INTERVAL_CHOICES, null=True, blank=True)
    dosage = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unit = models.CharField(max_length=50, null=True, blank=True, default="mL")
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True,)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.patient.name

class TreatmentInstance(models.Model):
    treatment_schedule = models.ForeignKey(TreatmentSchedule, on_delete=models.CASCADE, related_name='instances')
    datetime = models.DateTimeField()
    status = models.CharField(max_length=10, choices=[('pending', 'Pending'), ('given', 'Given'), ('skipped', 'Skipped')])
