import datetime
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from apps.core.models import BusinessConfig
from apps.services.models import VehicleType, ServicePackage, ServicePackagePrice, ServiceArea
from apps.staff.models import StaffProfile, StaffWorkingSchedule, StaffServiceArea
from apps.crm.models import Lead
from apps.bookings.models import Booking, Customer
from apps.scheduling.engine import AvailabilityEngine

User = get_user_model()

class BookingPlatformTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_superuser("testadmin", "admin@test.com", "pass123")
        
        self.config = BusinessConfig.get_config()
        self.config.day_open_time = datetime.time(9, 0)
        self.config.day_close_time = datetime.time(18, 0)
        self.config.slot_interval_minutes = 60
        self.config.default_buffer_minutes = 0
        self.config.min_advance_hours = 0
        self.config.same_day_booking_allowed = True
        self.config.save()

        self.vehicle = VehicleType.objects.create(name="Sedan", slug="sedan", sort_order=1)
        self.package = ServicePackage.objects.create(
            name="Deluxe Wash",
            slug="deluxe-wash",
            short_description="Clean outside and inside",
            description="Complete exterior & interior wash",
            estimated_duration_minutes=60,
        )
        self.price = ServicePackagePrice.objects.create(
            service_package=self.package,
            vehicle_type=self.vehicle,
            base_price=Decimal("800.00"),
            discounted_price=Decimal("750.00"),
        )
        self.area = ServiceArea.objects.create(name="Indiranagar", city="Bengaluru")

        # Create 1 staff member with capacity for 1 concurrent job
        self.staff = StaffProfile.objects.create(name="Ramesh", phone="+919999900001")
        StaffServiceArea.objects.create(staff=self.staff, service_area=self.area)
        for day in range(7):
            StaffWorkingSchedule.objects.create(
                staff=self.staff,
                day_of_week=day,
                start_time=datetime.time(9, 0),
                end_time=datetime.time(18, 0)
            )

    def test_availability_engine_generates_slots(self):
        engine = AvailabilityEngine(self.config)
        tomorrow = timezone.localdate() + datetime.timedelta(days=1)
        res = engine.get_available_slots(
            target_date=tomorrow,
            service_package_id=self.package.id,
            vehicle_type_id=self.vehicle.id,
            service_area_id=self.area.id
        )
        self.assertIsNone(res["error"])
        self.assertTrue(len(res["slots"]) > 0)
        first_slot = res["slots"][0]
        self.assertEqual(first_slot["time"], "09:00")
        self.assertTrue(first_slot["available"])

    def test_booking_creation_calculates_price_snapshot_safely(self):
        tomorrow = timezone.localdate() + datetime.timedelta(days=1)
        payload = {
            "vehicle_type_id": self.vehicle.id,
            "service_package_id": self.package.id,
            "service_area_id": self.area.id,
            "service_date": tomorrow.strftime("%Y-%m-%d"),
            "slot_time": "10:00",
            "customer_name": "Rahul Verma",
            "customer_phone": "+919876543219",
            "customer_email": "rahul@test.com",
            "address_line": "123 Palm Grove",
            "locality": "Indiranagar",
            "payment_method": "PAY_ON_SERVICE"
        }

        response = self.client.post("/api/bookings/", payload, format="json")
        self.assertEqual(response.status_code, 201)
        data = response.data
        self.assertTrue(data["booking_reference"].startswith("CW-"))
        self.assertEqual(Decimal(str(data["price_snapshot"])), Decimal("750.00"))
        self.assertEqual(Decimal(str(data["final_amount"])), Decimal("750.00"))

        self.assertTrue(Customer.objects.filter(phone="+919876543219").exists())
        self.assertTrue(Lead.objects.filter(mobile_number="+919876543219").exists())

    def test_double_booking_prevention_under_capacity_limit(self):
        tomorrow = timezone.localdate() + datetime.timedelta(days=1)
        payload = {
            "vehicle_type_id": self.vehicle.id,
            "service_package_id": self.package.id,
            "service_area_id": self.area.id,
            "service_date": tomorrow.strftime("%Y-%m-%d"),
            "slot_time": "11:00",
            "customer_name": "Customer One",
            "customer_phone": "+919111111111",
            "address_line": "Flat 1",
            "locality": "Indiranagar"
        }
        res1 = self.client.post("/api/bookings/", payload, format="json")
        self.assertEqual(res1.status_code, 201)

        payload2 = {
            "vehicle_type_id": self.vehicle.id,
            "service_package_id": self.package.id,
            "service_area_id": self.area.id,
            "service_date": tomorrow.strftime("%Y-%m-%d"),
            "slot_time": "11:00",
            "customer_name": "Customer Two",
            "customer_phone": "+919222222222",
            "address_line": "Flat 2",
            "locality": "Indiranagar"
        }
        res2 = self.client.post("/api/bookings/", payload2, format="json")
        self.assertEqual(res2.status_code, 400)
        self.assertIn("slot_time", res2.data)

    def test_past_date_rejection(self):
        yesterday = timezone.localdate() - datetime.timedelta(days=1)
        payload = {
            "vehicle_type_id": self.vehicle.id,
            "service_package_id": self.package.id,
            "service_date": yesterday.strftime("%Y-%m-%d"),
            "slot_time": "10:00",
            "customer_name": "Late Customer",
            "customer_phone": "+919555555555",
            "address_line": "Road 1",
            "locality": "Indiranagar"
        }
        res = self.client.post("/api/bookings/", payload, format="json")
        self.assertEqual(res.status_code, 400)

    def test_lead_capture_and_conversion_lifecycle(self):
        lead_payload = {
            "customer_name": "Priya Sharma",
            "mobile_number": "+919888899999",
            "email": "priya@test.com",
            "vehicle_type": self.vehicle.id,
            "service_package": self.package.id,
            "locality": "Indiranagar",
            "source": "WEBSITE"
        }
        lead_res = self.client.post("/api/leads/", lead_payload, format="json")
        self.assertEqual(lead_res.status_code, 201)
        lead_id = lead_res.data["lead_id"]

        # Admin updates lead
        self.client.force_authenticate(user=self.admin_user)
        lead_obj = Lead.objects.get(lead_id=lead_id)
        update_res = self.client.post(
            f"/api/admin/leads/{lead_obj.id}/update-status/",
            {"status": "CONTACTED", "notes": "Customer requested callback at 4 PM."},
            format="json"
        )
        self.assertEqual(update_res.status_code, 200)
        lead_obj.refresh_from_db()
        self.assertEqual(lead_obj.status, "CONTACTED")

    def test_admin_booking_workflow(self):
        tomorrow = timezone.localdate() + datetime.timedelta(days=1)
        cust = Customer.objects.create(name="Ananya", phone="+919333333333")
        booking = Booking.objects.create(
            customer=cust,
            vehicle_type=self.vehicle,
            service_package=self.package,
            service_date=tomorrow,
            slot_start_time=datetime.time(14, 0),
            slot_end_time=datetime.time(15, 0),
            status="PENDING",
            customer_name=cust.name,
            customer_phone=cust.phone,
            address_line="Tower 5",
            locality="Indiranagar",
            price_snapshot=Decimal("750.00"),
            final_amount=Decimal("750.00"),
        )

        self.client.force_authenticate(user=self.admin_user)

        res_confirm = self.client.post(f"/api/admin/bookings/{booking.id}/confirm/")
        self.assertEqual(res_confirm.status_code, 200)
        booking.refresh_from_db()
        self.assertEqual(booking.status, "CONFIRMED")

        res_assign = self.client.post(f"/api/admin/bookings/{booking.id}/assign/", {"staff_id": self.staff.id})
        self.assertEqual(res_assign.status_code, 200)
        booking.refresh_from_db()
        self.assertEqual(booking.assigned_staff, self.staff)

        res_cancel = self.client.post(f"/api/admin/bookings/{booking.id}/cancel/", {"reason": "Customer rescheduled elsewhere"})
        self.assertEqual(res_cancel.status_code, 200)
        booking.refresh_from_db()
        self.assertEqual(booking.status, "CANCELLED")

        # Test complete workflow on a fresh confirmed booking
        booking2 = Booking.objects.create(
            vehicle_type=self.vehicle,
            service_package=self.package,
            customer=cust,
            service_date=datetime.date.today() + datetime.timedelta(days=2),
            slot_start_time=datetime.time(11, 0),
            slot_end_time=datetime.time(12, 0),
            status="CONFIRMED",
            customer_name="Test Customer 2",
            customer_phone="9876543211",
            address_line="Sector 17",
            locality="Chandigarh",
            price_snapshot=Decimal("899.00"),
            final_amount=Decimal("899.00"),
            payment_status="PENDING",
        )

        # 1. Complete booking action
        res_complete = self.client.post(f"/api/admin/bookings/{booking2.id}/complete/", {"mark_paid": True, "notes": "Car cleaned spotless."})
        self.assertEqual(res_complete.status_code, 200)
        booking2.refresh_from_db()
        self.assertEqual(booking2.status, "COMPLETED")
        self.assertEqual(booking2.payment_status, "PAID")

        # 2. Update payment status action
        res_payment = self.client.post(f"/api/admin/bookings/{booking2.id}/update-payment/", {"payment_status": "REFUNDED"})
        self.assertEqual(res_payment.status_code, 200)
        booking2.refresh_from_db()
        self.assertEqual(booking2.payment_status, "REFUNDED")

        # 3. Reschedule booking action
        new_date_str = (datetime.date.today() + datetime.timedelta(days=3)).strftime("%Y-%m-%d")
        res_reschedule = self.client.post(
            f"/api/admin/bookings/{booking2.id}/reschedule/",
            {"service_date": new_date_str, "slot_time": "14:00", "force": True}
        )
        self.assertEqual(res_reschedule.status_code, 200)
        booking2.refresh_from_db()
        self.assertEqual(booking2.service_date.strftime("%Y-%m-%d"), new_date_str)

        # 4. Filter query params testing
        res_filter_status = self.client.get("/api/admin/bookings/?status=COMPLETED")
        self.assertEqual(res_filter_status.status_code, 200)
        self.assertTrue(len(res_filter_status.data["results"]) >= 1)

        res_filter_search = self.client.get("/api/admin/bookings/?search=Sector 17")
        self.assertEqual(res_filter_search.status_code, 200)
        self.assertTrue(len(res_filter_search.data["results"]) >= 1)

        # Dashboard metrics endpoint check
        dash_res = self.client.get("/api/admin/dashboard/")
        self.assertEqual(dash_res.status_code, 200)
        self.assertIn("metrics", dash_res.data)
