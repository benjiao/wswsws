from django.core.management.base import BaseCommand, CommandError
from treatments.models import TreatmentSchedule
from treatments.tasks import generate_treatment_instances
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Regenerate treatment instances for all existing schedules"

    def add_arguments(self, parser):
        parser.add_argument(
            '--active-only',
            action='store_true',
            dest='active_only',
            default=True,
            help='Only regenerate instances for active schedules (is_active=True). This is the default behavior.',
        )
        parser.add_argument(
            '--all',
            action='store_false',
            dest='active_only',
            help='Regenerate instances for all schedules, including inactive ones.',
        )

    def handle(self, *args, **options):
        active_only = options.get('active_only', True)
        
        if active_only:
            self.stdout.write(self.style.WARNING('Regenerating instances for ACTIVE schedules only...'))
            schedules = TreatmentSchedule.objects.filter(is_active=True)
        else:
            self.stdout.write(self.style.WARNING('Regenerating instances for ALL schedules (including inactive)...'))
            schedules = TreatmentSchedule.objects.all()
        
        total_schedules = schedules.count()
        self.stdout.write(f'Found {total_schedules} schedule(s) to process')
        
        if total_schedules == 0:
            self.stdout.write(self.style.WARNING('No schedules found to process.'))
            return
        
        successful = 0
        failed = 0
        skipped = 0
        
        for schedule in schedules:
            try:
                # Check if schedule has required fields
                if not schedule.start_time:
                    self.stdout.write(
                        self.style.WARNING(
                            f'Skipping schedule {schedule.id} (patient: {schedule.patient.name}): missing start_time'
                        )
                    )
                    skipped += 1
                    continue
                
                if not schedule.doses or schedule.doses <= 0:
                    self.stdout.write(
                        self.style.WARNING(
                            f'Skipping schedule {schedule.id} (patient: {schedule.patient.name}): missing or invalid doses'
                        )
                    )
                    skipped += 1
                    continue
                
                if not schedule.frequency or schedule.frequency <= 0:
                    self.stdout.write(
                        self.style.WARNING(
                            f'Skipping schedule {schedule.id} (patient: {schedule.patient.name}): missing or invalid frequency'
                        )
                    )
                    skipped += 1
                    continue
                
                # Call the existing generate_treatment_instances task
                self.stdout.write(f'Processing schedule {schedule.id} (patient: {schedule.patient.name})...')
                result = generate_treatment_instances(schedule.id)
                
                if result is not None:
                    successful += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✓ Successfully regenerated instances for schedule {schedule.id} (patient: {schedule.patient.name})'
                        )
                    )
                else:
                    failed += 1
                    self.stdout.write(
                        self.style.ERROR(
                            f'✗ Failed to regenerate instances for schedule {schedule.id} (patient: {schedule.patient.name})'
                        )
                    )
                    
            except Exception as e:
                failed += 1
                self.stdout.write(
                    self.style.ERROR(
                        f'✗ Error regenerating instances for schedule {schedule.id} (patient: {schedule.patient.name}): {str(e)}'
                    )
                )
        
        # Print summary
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 50))
        self.stdout.write(self.style.SUCCESS('Regeneration Summary:'))
        self.stdout.write(self.style.SUCCESS(f'  Total schedules: {total_schedules}'))
        self.stdout.write(self.style.SUCCESS(f'  Successful: {successful}'))
        self.stdout.write(self.style.ERROR(f'  Failed: {failed}'))
        self.stdout.write(self.style.WARNING(f'  Skipped: {skipped}'))
        self.stdout.write(self.style.SUCCESS('=' * 50))
