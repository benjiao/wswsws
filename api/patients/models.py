from django.db import models


class PatientStatus(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    is_in_care = models.BooleanField(default=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class PatientGroup(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

# Create your models here.
class Patient(models.Model):
    name = models.CharField(max_length=255)
    birth_date = models.DateField(null=True, blank=True)
    rescued_date = models.DateField(null=True, blank=True)
    color = models.CharField(max_length=100, null=True, blank=True)
    SEX_CHOICES = (
        (1, 'Male'),
        (2, 'Female'),
    )
    sex = models.IntegerField(choices=SEX_CHOICES, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    spay_neuter_status = models.BooleanField(default=False, blank=True)
    spay_neuter_date = models.DateField(null=True, blank=True)
    spay_neuter_clinic = models.CharField(max_length=255, null=True, blank=True)

    group = models.ForeignKey(PatientGroup, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.ForeignKey(PatientStatus, on_delete=models.SET_NULL, null=True, blank=True)

    def get_status_display(self):
        return self.status.name if self.status else None

    def __str__(self):
        return self.name
