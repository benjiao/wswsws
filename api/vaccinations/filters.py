import django_filters
from django.db.models import OuterRef, Subquery, Max, F
from .models import VaccineDose


class VaccineDoseFilter(django_filters.FilterSet):
    """Custom filterset for VaccineDose with is_latest and expires_before filters."""
    is_latest = django_filters.BooleanFilter(method='filter_is_latest')
    expires_before = django_filters.DateFilter(field_name='expiration_date', lookup_expr='lte')

    class Meta:
        model = VaccineDose
        fields = [
            'vaccine_type', 'patient', 'clinic', 'veterinarian',
            'vaccine_product', 'dose_date', 'is_latest', 'expires_before',
        ]

    def filter_is_latest(self, queryset, name, value):
        """Filter to only doses that are the latest for each (patient, vaccine_type)."""
        if value is True:
            latest_date_subq = VaccineDose.objects.filter(
                patient=OuterRef('patient'),
                vaccine_type=OuterRef('vaccine_type'),
            ).values('patient', 'vaccine_type').annotate(
                max_dose_date=Max('dose_date')
            ).values('max_dose_date')[:1]
            return queryset.annotate(
                _latest_date=Subquery(latest_date_subq)
            ).filter(dose_date=F('_latest_date'))
        elif value is False:
            latest_date_subq = VaccineDose.objects.filter(
                patient=OuterRef('patient'),
                vaccine_type=OuterRef('vaccine_type'),
            ).values('patient', 'vaccine_type').annotate(
                max_dose_date=Max('dose_date')
            ).values('max_dose_date')[:1]
            return queryset.annotate(
                _latest_date=Subquery(latest_date_subq)
            ).exclude(dose_date=F('_latest_date'))
        return queryset
