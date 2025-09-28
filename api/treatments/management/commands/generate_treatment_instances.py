from django.core.management.base import BaseCommand, CommandError
from treatments.models import TreatmentSchedule
from treatments.models import TreatmentInstance
from treatments.tasks import generate_treatment_instances


class Command(BaseCommand):
    help = "Generates treatment instances for the specified treatment schedules"

    def add_arguments(self, parser):
        parser.add_argument("schedule_ids", nargs="+", type=int)

    def handle(self, *args, **options):
        for schedule_id in options["schedule_ids"]:
            try:
                schedule = TreatmentSchedule.objects.get(pk=schedule_id)
            except TreatmentSchedule.DoesNotExist:
                raise CommandError('TreatmentSchedule "%s" does not exist' % schedule_id)

            generate_treatment_instances.delay(schedule.id)

            self.stdout.write(
                self.style.SUCCESS('Successfully initiated treatment instance generation for schedule "%s"' % schedule_id)
            )
