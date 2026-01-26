# Generated manually for seeding PatientStatus data

from django.db import migrations


def create_patient_statuses(apps, schema_editor):
    PatientStatus = apps.get_model('patients', 'PatientStatus')
    
    statuses = [
        {
            'name': 'Active',
            'description': 'Patient is currently active in the shelter system'
        },
        {
            'name': 'Medical Hold',
            'description': 'Patient is on medical hold and requires special care'
        },
        {
            'name': 'Quarantine',
            'description': 'Patient is in quarantine for health reasons'
        },
        {
            'name': 'Available',
            'description': 'Patient is available for adoption'
        },
        {
            'name': 'Adopted',
            'description': 'Patient has been adopted and is no longer in the shelter'
        },
        {
            'name': 'Deceased',
            'description': 'Patient has passed away'
        },
        {
            'name': 'Lost',
            'description': 'Patient has been lost and is no longer in the shelter'
        }
    ]
    
    for status_data in statuses:
        PatientStatus.objects.get_or_create(
            name=status_data['name'],
            defaults={'description': status_data['description']}
        )


def remove_patient_statuses(apps, schema_editor):
    PatientStatus = apps.get_model('patients', 'PatientStatus')
    
    status_names = [
        'Active',
        'Adopted',
        'Foster',
        'Medical Hold',
        'Quarantine',
        'Deceased',
        'Transferred',
    ]
    
    PatientStatus.objects.filter(name__in=status_names).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('patients', '0007_patientstatus'),
    ]

    operations = [
        migrations.RunPython(create_patient_statuses, remove_patient_statuses),
    ]

