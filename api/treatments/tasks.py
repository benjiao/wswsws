from celery import shared_task
from .models import TreatmentSchedule, TreatmentInstance, TreatmentSession
import logging
from datetime import datetime, timedelta, time
logger = logging.getLogger(__name__)

@shared_task
def count_treatment_schedules():
    return TreatmentSchedule.objects.count()

@shared_task
def generate_treatment_instances(schedule_id):
    print(f"Task parameters: schedule_id={schedule_id}")
    try:
        schedule = TreatmentSchedule.objects.get(id=schedule_id)
    except TreatmentSchedule.DoesNotExist:
        return None

    logger.info(f"Generating treatment instances for schedule ID {schedule_id}")

    # Clear existing pending instances
    TreatmentInstance.objects.filter(
        treatment_schedule=schedule,
        status=TreatmentInstance.STATUS_PENDING # Pending
    ).delete()

    # Handle DAILY interval
    if schedule.interval == 1:  # DAILY 
        start_time = time(6, 0)  # 6AM
        interval_minutes = int(24 * 60 / schedule.frequency)

        current_date = schedule.start_date
        while current_date <= schedule.end_date:
            for i in range(schedule.frequency):
                dose_time = (datetime.combine(current_date, start_time) + timedelta(minutes=i * interval_minutes)).time()

                if not TreatmentInstance.objects.filter(
                    treatment_schedule=schedule,
                    scheduled_time=datetime.combine(current_date, dose_time)
                ).exists():
                    TreatmentInstance.objects.create(
                        treatment_schedule=schedule,
                        scheduled_time=datetime.combine(current_date, dose_time)
                    )

            current_date += timedelta(days=1)
    return schedule.id

@shared_task
def generate_treatment_sessions():
    instances = TreatmentInstance.objects.filter(treatment_session__isnull=True)

    for t in instances:
        session = TreatmentSession.get_session_for_time(t.scheduled_time)
        t.treatment_session = session
        t.save()
    
    return True