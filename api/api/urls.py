"""
URL configuration for api project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

# Import viewsets
from patients.views import PatientViewSet, PatientGroupViewSet, PatientStatusViewSet
from clinics.views import ClinicViewSet, VeterinarianViewSet
from treatments.views import TreatmentScheduleViewSet, TreatmentInstanceViewSet, TreatmentSessionViewSet
from inventory.views import MedicineViewSet
from vaccinations.views import VaccineTypeViewSet, VaccineProductViewSet, VaccineDoseViewSet

admin.site.site_header = "wswsws admin"
admin.site.site_title = "wswsws admin"
admin.site.index_title = "🐱 wswsws..."

router = DefaultRouter()
router.register(r'patients', PatientViewSet)
router.register(r'patient-groups', PatientGroupViewSet)
router.register(r'patient-statuses', PatientStatusViewSet)
router.register(r'clinics', ClinicViewSet)
router.register(r'veterinarians', VeterinarianViewSet)
router.register(r'treatment-schedules', TreatmentScheduleViewSet)
router.register(r'treatment-instances', TreatmentInstanceViewSet)
router.register(r'treatment-sessions', TreatmentSessionViewSet)

router.register(r'medicines', MedicineViewSet)
router.register(r'vaccine-types', VaccineTypeViewSet)
router.register(r'vaccine-products', VaccineProductViewSet)
router.register(r'vaccine-doses', VaccineDoseViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    path('api/admin/', admin.site.urls),
]
