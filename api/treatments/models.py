from django.db import models

# Create your models here.
class TreatmentSchedule(models.Model):
    INTERVAL_DAILY = 1
    INTERVAL_EVERY_OTHER_DAY = 2

    patient = models.ForeignKey('patients.Patient', on_delete=models.CASCADE, related_name='treatment_schedules')
    medicine = models.ForeignKey('inventory.Medicine', on_delete=models.CASCADE, related_name='treatment_schedules', null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    frequency = models.IntegerField(null=True, blank=True)
    INTERVAL_CHOICES = [
        (INTERVAL_DAILY, 'DAILY'),
        (INTERVAL_EVERY_OTHER_DAY, 'EVERY OTHER DAY'),
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
    STATUS_PENDING = 1
    STATUS_GIVEN = 2
    STATUS_SKIPPED = 3

    treatment_schedule = models.ForeignKey(TreatmentSchedule, on_delete=models.CASCADE, related_name='instances')
    scheduled_time = models.DateTimeField()
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_GIVEN, 'Given'),
        (STATUS_SKIPPED, 'Skipped'),
    ]
    status = models.IntegerField(
        choices=STATUS_CHOICES,
        blank=True,
        default=1)
        
