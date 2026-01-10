# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('treatments', '0011_remove_treatmentschedule_end_date_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='treatmentschedule',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
    ]
