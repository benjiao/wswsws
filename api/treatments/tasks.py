from celery import shared_task
from .models import TreatmentSchedule, TreatmentInstance, TreatmentSession
import logging
from datetime import datetime, timedelta, time
from django.utils import timezone
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

    # Validate required fields
    if not schedule.start_time:
        logger.error(f"Schedule {schedule_id} missing start_time")
        return None
    
    if not schedule.doses or schedule.doses <= 0:
        logger.error(f"Schedule {schedule_id} missing or invalid doses field")
        return None
    
    if not schedule.frequency or schedule.frequency <= 0:
        logger.error(f"Schedule {schedule_id} missing or invalid frequency")
        return None

    # Clear existing pending instances
    TreatmentInstance.objects.filter(
        treatment_schedule=schedule,
        status=TreatmentInstance.STATUS_PENDING # Pending
    ).delete()

    # Calculate how many days we need based on doses and frequency
    doses_per_day = schedule.frequency
    total_days_needed = (schedule.doses + doses_per_day - 1) // doses_per_day  # Ceiling division
    
    # Start from the start_time
    # Use the start_time as-is (it should already be timezone-aware if Django settings require it)
    current_datetime = schedule.start_time
    if timezone.is_naive(current_datetime):
        current_datetime = timezone.make_aware(current_datetime)
    
    # Extract the start time of day for dosing
    start_time_of_day = current_datetime.time()
    current_date = current_datetime.date()
    
    # Calculate interval between doses in minutes (for same day)
    interval_minutes = int(24 * 60 / schedule.frequency) if schedule.frequency > 1 else 0
    
    doses_created = 0
    days_processed = 0

    # Count the number of non-pending treatment instances for this schedule
    non_pending_count = TreatmentInstance.objects.filter(
        treatment_schedule=schedule
    ).exclude(
        status=TreatmentInstance.STATUS_PENDING
    ).count()
    logger.info(f"Non-pending instances under schedule {schedule_id}: {non_pending_count}")
    
    doses_created += non_pending_count

    while doses_created < schedule.doses:
        # Determine if we should schedule on this day based on interval
        should_schedule_today = True
        if schedule.interval == TreatmentSchedule.INTERVAL_EVERY_OTHER_DAY:  # EVERY_OTHER_DAY
            # Schedule on even-numbered days (0-indexed: 0, 2, 4, ...)
            if days_processed % 2 != 0:
                should_schedule_today = False
        
        if should_schedule_today:
            # Create doses for this day
            doses_for_today = min(schedule.frequency, schedule.doses - doses_created)
            
            for i in range(doses_for_today):
                if doses_created >= schedule.doses:
                    break
                
                # Calculate the time for this dose
                if i == 0:
                    dose_datetime = datetime.combine(current_date, start_time_of_day)
                else:
                    base_datetime = datetime.combine(current_date, start_time_of_day)
                    dose_datetime = base_datetime + timedelta(minutes=i * interval_minutes)
                
                # Make timezone-aware using the same timezone as start_time
                if timezone.is_naive(dose_datetime):
                    dose_datetime = timezone.make_aware(dose_datetime, current_datetime.tzinfo)
                else:
                    # Replace timezone to match start_time if needed
                    dose_datetime = dose_datetime.replace(tzinfo=current_datetime.tzinfo)
                
                # Check if instance already exists
                if not TreatmentInstance.objects.filter(
                    treatment_schedule=schedule,
                    scheduled_time=dose_datetime
                ).exists():
                    TreatmentInstance.objects.create(
                        treatment_schedule=schedule,
                        scheduled_time=dose_datetime
                    )
                    doses_created += 1
                else:
                    logger.debug(f"TreatmentInstance {dose_datetime} already exists")
        
        # Move to next day
        current_date += timedelta(days=1)
        days_processed += 1
        
        # Safety check to prevent infinite loops
        if days_processed > 1000:
            logger.error(f"Too many days processed for schedule {schedule_id}, stopping")
            break
    
    logger.info(f"Generated {doses_created} treatment instances for schedule ID {schedule_id}")
    return schedule.id

@shared_task
def generate_treatment_sessions():
    instances = TreatmentInstance.objects.filter(treatment_session__isnull=True)

    for t in instances:
        session = TreatmentSession.get_session_for_time(t.scheduled_time)
        t.treatment_session = session
        t.save()
    
    return True

@shared_task
def generate_treatment_session(instance_id):
    try:
        t = TreatmentInstance.objects.get(id=instance_id)
    except TreatmentInstance.DoesNotExist:
        return False

    if t.treatment_session is None:
        session = TreatmentSession.get_session_for_time(t.scheduled_time)
        t.treatment_session = session
        t.save()
        logger.debug(f"TreatmentInstance {t.id} was assigned a new session")
    else:
        logger.debug(f"TreatmentInstance {t.id} already has a session")
    return True