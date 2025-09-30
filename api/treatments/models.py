from django.db import models
from django.utils import timezone


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

class TreatmentSession(models.Model):
    SESSION_MORNING = 1
    SESSION_NOON = 2
    SESSION_AFTERNOON = 3
    SESSION_EVENING = 4
    
    SESSION_CHOICES = [
        (SESSION_MORNING, 'Morning'),
        (SESSION_NOON, 'Noon'),
        (SESSION_AFTERNOON, 'Afternoon'),
        (SESSION_EVENING, 'Evening'),
    ]
    
    session_type = models.IntegerField(choices=SESSION_CHOICES)
    session_date = models.DateField()  # The date for this session
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['session_type', 'session_date']
    
    def __str__(self):
        return f"{self.session_date} - {self.get_session_type_display()}"
    
    @classmethod
    def get_session_for_time(cls, datetime_obj):
        """Determine which session a datetime belongs to"""
        time = datetime_obj.time()
        date = datetime_obj.date()
        
        # TODO Move times to settings in the db
        if time < timezone.datetime.strptime('11:00', '%H:%M').time():
            session_type = cls.SESSION_MORNING
        elif time < timezone.datetime.strptime('14:00', '%H:%M').time():
            session_type = cls.SESSION_NOON
        elif time < timezone.datetime.strptime('18:00', '%H:%M').time():
            session_type = cls.SESSION_AFTERNOON
        else:
            session_type = cls.SESSION_EVENING
            
        session, created = cls.objects.get_or_create(
            session_type=session_type,
            session_date=date,
        )
        return session

class TreatmentInstance(models.Model):
    STATUS_PENDING = 1
    STATUS_GIVEN = 2
    STATUS_SKIPPED = 3

    treatment_schedule = models.ForeignKey(TreatmentSchedule, on_delete=models.CASCADE, related_name='instances')
    treatment_session = models.ForeignKey(TreatmentSession, on_delete=models.SET_NULL, related_name='instances', blank=True, null=True)
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

    def __str__(self):
        return f"{self.treatment_schedule.patient.name} - {self.treatment_schedule.medicine.name} {self.treatment_schedule.dosage}{self.treatment_schedule.unit}"