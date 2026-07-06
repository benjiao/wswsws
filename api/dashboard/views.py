import io
import os
import random
import tempfile
import json

from django.contrib.admin.views.decorators import staff_member_required
from django.contrib import admin, messages
from django.core.management import call_command
from django.http import FileResponse
from django.shortcuts import redirect, render
from django.utils.safestring import mark_safe
from django.utils.translation import gettext as _
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAdminUser

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
    treatments_pending = TreatmentInstance.objects.filter(status=TreatmentInstance.STATUS_PENDING, scheduled_time__date=today).count()
    treatments_given = TreatmentInstance.objects.filter(status=TreatmentInstance.STATUS_GIVEN, scheduled_time__date=today).count()
    treatments_skipped = TreatmentInstance.objects.filter(status=TreatmentInstance.STATUS_SKIPPED, scheduled_time__date=today).count()

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
        pending = TreatmentInstance.objects.filter(status=TreatmentInstance.STATUS_PENDING, scheduled_time__date=day).count()
        given = TreatmentInstance.objects.filter(status=TreatmentInstance.STATUS_GIVEN, scheduled_time__date=day).count()
        skipped = TreatmentInstance.objects.filter(status=TreatmentInstance.STATUS_SKIPPED, scheduled_time__date=day).count()
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
            status=TreatmentInstance.STATUS_PENDING,
            scheduled_time__gt=timezone.now()
        ).values_list("treatment_schedule__medicine_id", flat=True)
    )

    # Filter out_of_stock_medicines to only those mapped to a TreatmentSchedule
    filtered_out_of_stock = Medicine.objects.filter(stock_status=Medicine.OUT_OF_STOCK, id__in=mapped_medicine_ids)
    context["out_of_stock_medicines"] = list(filtered_out_of_stock.values("id", "name", "stock_status"))

    filtered_low_in_stock = Medicine.objects.filter(stock_status=Medicine.LOW_STOCK, id__in=mapped_medicine_ids)
    context["low_in_stock_medicines"] = list(filtered_low_in_stock.values("id", "name", "stock_status"))
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
            # "kpi": [
            #     {
            #         "title": "Product A Performance",
            #         "metric": "$1,234.56",
            #         "footer": mark_safe(
            #             '<strong class="text-green-600 font-medium">+3.14%</strong>&nbsp;progress from last week'
            #         ),
            #         "chart": json.dumps({"labels": [WEEKDAYS[day % 7] for day in range(1, 28)], "datasets": [{"data": average, "borderColor": "#9333ea"}]}),
            #     },
            #     {
            #         "title": "Product B Performance",
            #         "metric": "$1,234.56",
            #         "footer": mark_safe(
            #             '<strong class="text-green-600 font-medium">+3.14%</strong>&nbsp;progress from last week'
            #         ),
            #     },
            #     {
            #         "title": "Product C Performance",
            #         "metric": "$1,234.56",
            #         "footer": mark_safe(
            #             '<strong class="text-green-600 font-medium">+3.14%</strong>&nbsp;progress from last week'
            #         ),
            #     },
            # ],
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
                        "options": {
                            "responsive": True,
                            "plugins": {
                                "legend": {
                                    "position": "top"
                                }
                            },
                            "scales": {
                                "x": {
                                    "stacked": True  # Enable stacking on X axis
                                },
                                "y": {
                                    "stacked": True  # Enable stacking on Y axis
                                }
                            }
                        }
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


class DatabaseExportView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, *args, **kwargs):
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        filename = f'wswsws_{timestamp}.json'
        buffer = io.StringIO()
        try:
            call_command(
                'dumpdata',
                exclude=['contenttypes', 'auth.permission', 'admin.logentry', 'sessions'],
                indent=2,
                stdout=buffer,
            )
        except Exception as e:
            return Response({'error': f'Export failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        buffer.seek(0)
        response = FileResponse(io.BytesIO(buffer.getvalue().encode('utf-8')), as_attachment=True, filename=filename)
        response['Content-Type'] = 'application/json'
        return response


class DatabaseRestoreView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser]

    def post(self, request, *args, **kwargs):
        if 'backup' not in request.FILES:
            return Response(
                {'error': 'No backup file provided. Expected a multipart field named "backup".'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        content = request.FILES['backup'].read()
        try:
            json.loads(content)
        except json.JSONDecodeError as e:
            return Response({'error': f'Invalid JSON: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(mode='wb', suffix='.json', delete=False) as tmp:
                tmp.write(content)
                tmp_path = tmp.name
            call_command('flush', interactive=False)
            call_command('loaddata', tmp_path)
            return Response({'status': 'success', 'message': 'Database restored successfully.'})
        except Exception as e:
            return Response({'error': f'Restore failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            if tmp_path:
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass


@staff_member_required
def database_tools_view(request):
    if request.method == 'POST':
        if 'backup' not in request.FILES:
            messages.error(request, 'No backup file provided.')
            return redirect('admin-db-tools')
        content = request.FILES['backup'].read()
        try:
            json.loads(content)
        except json.JSONDecodeError as e:
            messages.error(request, f'Invalid JSON: {e}')
            return redirect('admin-db-tools')
        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(mode='wb', suffix='.json', delete=False) as tmp:
                tmp.write(content)
                tmp_path = tmp.name
            call_command('flush', interactive=False)
            call_command('loaddata', tmp_path)
            messages.success(request, 'Database restored successfully.')
        except Exception as e:
            messages.error(request, f'Restore failed: {e}')
        finally:
            if tmp_path:
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass
        return redirect('admin-db-tools')
    context = {
        **admin.site.each_context(request),
        'title': 'Database Tools',
        'subtitle': 'Export & Restore',
    }
    return render(request, 'admin/database_tools.html', context)


@staff_member_required
def database_export_download(request):
    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
    filename = f'wswsws_{timestamp}.json'
    buffer = io.StringIO()
    call_command(
        'dumpdata',
        exclude=['contenttypes', 'auth.permission', 'admin.logentry', 'sessions'],
        indent=2,
        stdout=buffer,
    )
    buffer.seek(0)
    response = FileResponse(io.BytesIO(buffer.getvalue().encode('utf-8')), as_attachment=True, filename=filename)
    response['Content-Type'] = 'application/json'
    return response