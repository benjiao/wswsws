# treatments/signals.py
from django.db.models.signals import post_save
from django.db import transaction
from django.dispatch import receiver

from .models import TreatmentSchedule
from .models import TreatmentInstance
from .tasks import generate_treatment_instances  # celery shared_task
from .tasks import generate_treatment_session    # celery shared_task

@receiver(post_save, sender=TreatmentSchedule)
def enqueue_generate_instances_on_create(sender, instance: TreatmentSchedule, created: bool, **kwargs):
    # Skip instance generation if only is_active field was updated
    if not created:
        update_fields = kwargs.get('update_fields')
        if update_fields is not None:
            # If update_fields is specified and only contains 'is_active' (and possibly 'updated_at'), skip generation
            relevant_fields = update_fields - {'updated_at'}  # Remove auto-updated field
            if relevant_fields == {'is_active'}:
                return
    
    # run the task after the DB transaction commits (prevents race conditions)
    def _enqueue():
        generate_treatment_instances.delay(instance.id)

    transaction.on_commit(_enqueue)


@receiver(post_save, sender=TreatmentInstance)
def enqueue_generate_session_on_create(sender, instance: TreatmentInstance, created: bool, **kwargs):
    if created:
        def _enqueue():
            generate_treatment_session.delay(instance.id)
        transaction.on_commit(_enqueue)

