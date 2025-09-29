from django.shortcuts import render

import random
import json
from django.utils.safestring import mark_safe
from django.utils.translation import gettext as _
from treatments.models import TreatmentInstance
from django.utils import timezone


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
    treatments_total = TreatmentInstance.objects.filter(scheduled_time=today).count()
    treatments_pending = TreatmentInstance.objects.filter(status=1, scheduled_time=today).count()
    treatments_given = TreatmentInstance.objects.filter(status=2, scheduled_time=today).count()
    treatments_skipped = TreatmentInstance.objects.filter(status=3, scheduled_time=today).count()

    context["treatments_today"] = {
        "pending": treatments_pending,
        "given": treatments_given,
        "skipped": treatments_skipped,
    }
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
                },
                {
                    "title": "Treatments Given Today",
                    "description": f"{treatments_given} of {treatments_total}",
                    "value": treatments_given / treatments_total * 100 if treatments_total != 0 else 0,
                },
                {
                    "title": "Treatments Given Today",
                    "description": f"{treatments_given} of {treatments_total}",
                    "value": treatments_given / treatments_total * 100 if treatments_total != 0 else 0,
                },
            ],
            "chart": json.dumps(
                {
                    "labels": [WEEKDAYS[day % 7] for day in range(1, 28)],
                    "datasets": [
                        {
                            "label": "Example 1",
                            "type": "line",
                            "data": average,
                            "backgroundColor": "#f0abfc",
                            "borderColor": "#f0abfc",
                        },
                        {
                            "label": "Example 2",
                            "data": positive,
                            "backgroundColor": "#9333ea",
                        },
                        {
                            "label": "Example 3",
                            "data": negative,
                            "backgroundColor": "#f43f5e",
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