import csv
from django.db import models
from django.utils import timezone
from django.http import HttpResponse
from rest_framework import generics, viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.crm.models import Lead
from apps.crm.serializers import LeadCreateSerializer, LeadAdminSerializer

class PublicLeadCreateView(generics.CreateAPIView):
    queryset = Lead.objects.all()
    serializer_class = LeadCreateSerializer
    permission_classes = [permissions.AllowAny]

class AdminLeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.all().select_related("vehicle_type", "service_package", "assigned_staff")
    serializer_class = LeadAdminSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get("status")
        source = self.request.query_params.get("source")
        search = self.request.query_params.get("search")

        if status_param:
            qs = qs.filter(status=status_param)
        if source:
            qs = qs.filter(source=source)
        if search:
            qs = qs.filter(
                models.Q(customer_name__icontains=search) |
                models.Q(mobile_number__icontains=search) |
                models.Q(lead_id__icontains=search) |
                models.Q(locality__icontains=search)
            )
        return qs

    @action(detail=True, methods=["post"], url_path="update-status")
    def update_status(self, request, pk=None):
        lead = self.get_object()
        new_status = request.data.get("status")
        notes = request.data.get("notes", "")

        if not new_status or new_status not in dict(Lead.STATUS_CHOICES):
            return Response({"error": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)

        lead.status = new_status
        if notes:
            lead.admin_notes = f"{lead.admin_notes}\n[{timezone.now().strftime('%Y-%m-%d %H:%M')}] {notes}".strip()
        lead.save()
        return Response(LeadAdminSerializer(lead).data)

    @action(detail=False, methods=["get"], url_path="export-csv")
    def export_csv(self, request):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="leads_export.csv"'

        writer = csv.writer(response)
        writer.writerow([
            "Lead ID", "Customer Name", "Phone", "Email", "Vehicle",
            "Package", "Date", "Slot", "Locality", "Status", "Source", "Created At"
        ])

        for lead in self.get_queryset():
            writer.writerow([
                lead.lead_id,
                lead.customer_name,
                lead.mobile_number,
                lead.email,
                lead.vehicle_type.name if lead.vehicle_type else "",
                lead.service_package.name if lead.service_package else "",
                lead.requested_date or "",
                lead.requested_slot or "",
                lead.locality or "",
                lead.get_status_display(),
                lead.get_source_display(),
                lead.created_at.strftime("%Y-%m-%d %H:%M"),
            ])

        return response
