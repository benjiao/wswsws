from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medical', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='medicalrecord',
            name='details',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='medicalrecord',
            name='notes',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='diagnosis',
            name='details',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='diagnosis',
            name='notes',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='healthcondition',
            name='details',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='healthcondition',
            name='notes',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='testresult',
            name='details',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='testresult',
            name='notes',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='followup',
            name='details',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='followup',
            name='notes',
            field=models.TextField(blank=True, null=True),
        ),
    ]
