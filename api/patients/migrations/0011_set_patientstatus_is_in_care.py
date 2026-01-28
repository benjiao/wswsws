# Generated manually to set is_in_care values for existing PatientStatus records

from django.db import migrations


def set_is_in_care_values(apps, schema_editor):
    """
    Set is_in_care=True for: Active, Available, Medical Hold, Quarantine
    Set is_in_care=False for all other statuses
    """
    PatientStatus = apps.get_model('patients', 'PatientStatus')
    
    # Statuses that are "in care"
    in_care_statuses = ['Active', 'Available', 'Medical Hold', 'Quarantine']
    
    # Update statuses to be in care
    PatientStatus.objects.filter(name__in=in_care_statuses).update(is_in_care=True)
    
    # Update all other statuses to not be in care
    PatientStatus.objects.exclude(name__in=in_care_statuses).update(is_in_care=False)


def reverse_set_is_in_care_values(apps, schema_editor):
    """
    Reverse migration: Set all statuses to default (True)
    """
    PatientStatus = apps.get_model('patients', 'PatientStatus')
    PatientStatus.objects.all().update(is_in_care=True)


class Migration(migrations.Migration):

    dependencies = [
        ('patients', '0010_patientstatus_is_in_care'),
    ]

    operations = [
        migrations.RunPython(set_is_in_care_values, reverse_set_is_in_care_values),
    ]
