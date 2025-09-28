# treatments/signals.py
from django.db.models.signals import post_save
from django.db import transaction
from django.dispatch import receiver

from .models import TreatmentSchedule
from .tasks import generate_treatment_instances  # celery shared_task

@receiver(post_save, sender=TreatmentSchedule)
def enqueue_generate_instances_on_create(sender, instance: TreatmentSchedule, created: bool, **kwargs):
    # run the task after the DB transaction commits (prevents race conditions)
    def _enqueue():
        generate_treatment_instances.delay(instance.id)

    transaction.on_commit(_enqueue)
