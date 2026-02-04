# Generated migration: remove schedule_mode, series_*, booster_interval_days from VaccineType

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('vaccinations', '0002_alter_vaccinedose_expiration_date'),
    ]

    operations = [
        migrations.RemoveField(model_name='vaccinetype', name='schedule_mode'),
        migrations.RemoveField(model_name='vaccinetype', name='series_doses'),
        migrations.RemoveField(model_name='vaccinetype', name='series_min_age_days'),
        migrations.RemoveField(model_name='vaccinetype', name='series_gap_days'),
        migrations.RemoveField(model_name='vaccinetype', name='booster_interval_days'),
    ]
