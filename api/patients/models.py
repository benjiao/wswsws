from django.db import models

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

    def __str__(self):
        return self.name
