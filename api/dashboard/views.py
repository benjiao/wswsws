from django.shortcuts import render

import random
import json
from django.utils.safestring import mark_safe
from django.utils.translation import gettext as _
from django.utils import timezone

from treatments.models import TreatmentSchedule
from treatments.models import TreatmentInstance
from inventory.models import Medicine


def dashboard_callback(request, context):
    WEEKDAYS = [
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat",
        "Sun",
    ]

    positive = [[1, random.randrange(8, 28)] for i in range(1, 28)]
    negative = [[-1, -random.randrange(8, 28)] for i in range(1, 28)]
    average = [r[1] - random.randint(3, 5) for r in positive]
    performance_positive = [[1, random.randrange(8, 28)] for i in range(1, 28)]
    performance_negative = [[-1, -random.randrange(8, 28)] for i in range(1, 28)]

    # Example: Replace with actual query logic as needed
    today = timezone.localdate()
    treatments_total = TreatmentInstance.objects.filter(scheduled_time__date=today).count()
    treatments_pending = TreatmentInstance.objects.filter(status=1, scheduled_time__date=today).count()
    treatments_given = TreatmentInstance.objects.filter(status=2, scheduled_time__date=today).count()
    treatments_skipped = TreatmentInstance.objects.filter(status=3, scheduled_time__date=today).count()

    context["treatments_today"] = {
        "pending": treatments_pending,
        "given": treatments_given,
        "skipped": treatments_skipped,
    }

    past_28_days = [timezone.localdate() - timezone.timedelta(days=i) for i in range(27, -1, -1)]
    treatments_stats_28_days = []

    for day in past_28_days:
        total = TreatmentInstance.objects.filter(
            scheduled_time__date=day
        ).count()
        pending = TreatmentInstance.objects.filter(status=1, scheduled_time__date=day).count()
        given = TreatmentInstance.objects.filter(status=2, scheduled_time__date=day).count()
        skipped = TreatmentInstance.objects.filter(status=3, scheduled_time__date=day).count()
        treatments_stats_28_days.append({
            "date": day.strftime("%b %d"),  # e.g., 'Jun 10'
            "total": total,
            "pending": pending,
            "given": given,
            "skipped": skipped,
        })
    context["treatments_stats_28_days"] = treatments_stats_28_days


    # Get medicine IDs that are mapped to any pending TreatmentSchedule in the future
    mapped_medicine_ids = set(
        TreatmentInstance.objects.filter(
            status=1,
            scheduled_time__gt=timezone.now()
        ).values_list("treatment_schedule__medicine_id", flat=True)
    )

    # Filter out_of_stock_medicines to only those mapped to a TreatmentSchedule
    filtered_out_of_stock = Medicine.objects.filter(stock_status=0, id__in=mapped_medicine_ids)
    context["out_of_stock_medicines"] = list(filtered_out_of_stock.values("id", "name", "stock_status"))

    context.update(
        {
            # "navigation": [
            #     {
            #         "title": _("Dashboard"),
            #         "link": "/",
            #         "active": True
            #     },
            #     {
            #         "title": _("Analytics"),
            #         "link": "#"
            #     },
            #     {
            #         "title": _("Settings"),
            #         "link": "#"
            #     },
            # ],
            # "filters": [
            #     {
            #         "title": _("All"),
            #         "link": "#",
            #         "active": True
            #     },
            #     {
            #         "title": _("New"),
            #         "link": "#",
            #     },
            # ],
            "kpi": [
                {
                    "title": "Product A Performance",
                    "metric": "$1,234.56",
                    "footer": mark_safe(
                        '<strong class="text-green-600 font-medium">+3.14%</strong>&nbsp;progress from last week'
                    ),
                    "chart": json.dumps({"labels": [WEEKDAYS[day % 7] for day in range(1, 28)], "datasets": [{"data": average, "borderColor": "#9333ea"}]}),
                },
                {
                    "title": "Product B Performance",
                    "metric": "$1,234.56",
                    "footer": mark_safe(
                        '<strong class="text-green-600 font-medium">+3.14%</strong>&nbsp;progress from last week'
                    ),
                },
                {
                    "title": "Product C Performance",
                    "metric": "$1,234.56",
                    "footer": mark_safe(
                        '<strong class="text-green-600 font-medium">+3.14%</strong>&nbsp;progress from last week'
                    ),
                },
            ],
            "progress": [
                {
                    "title": "Treatments Given Today",
                    "description": f"{treatments_given} of {treatments_total}",
                    "value": treatments_given / treatments_total * 100 if treatments_total != 0 else 0,
                }
            ],
            "chart": json.dumps(
                {
                    "labels": [stat["date"] for stat in treatments_stats_28_days],
                    "datasets": [
                        {
                            "label": "Treatments Given",
                            "data": [stat["given"] for stat in treatments_stats_28_days],
                            "backgroundColor": "#26ff79",
                        },
                        {
                            "label": "Treatments Pending",
                            "data": [stat["pending"] for stat in treatments_stats_28_days],
                            "backgroundColor": "#c0c0c0",
                        },
                        {
                            "label": "Treatments Skipped",
                            "data": [-stat["skipped"] for stat in treatments_stats_28_days],
                            "backgroundColor": "#f59e42",
                        },
                    ],
                }
            ),
            "performance": [
                # {
                #     "title": _("Last week revenue"),
                #     "metric": "$1,234.56",
                #     "footer": mark_safe(
                #         '<strong class="text-green-600 font-medium">+3.14%</strong>&nbsp;progress from last week'
                #     ),
                #     "chart": json.dumps({"labels": [WEEKDAYS[day % 7] for day in range(1, 28)], "datasets": [{"data": performance_positive, "borderColor": "#9333ea"}]}),
                # },
                # {
                #     "title": _("Last week expenses"),
                #     "metric": "$1,234.56",
                #     "footer": mark_safe(
                #         '<strong class="text-green-600 font-medium">+3.14%</strong>&nbsp;progress from last week'
                #     ),
                #     "chart": json.dumps({"labels": [WEEKDAYS[day % 7] for day in range(1, 28)], "datasets": [{"data": performance_negative, "borderColor": "#f43f5e"}]}),
                # },
            ]
        },
    )

    return context