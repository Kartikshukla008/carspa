from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token

from apps.accounts.models import UserProfile, CustomerAddress, CustomerVehicle, PasswordResetToken
from apps.services.models import VehicleType, ServicePackage, ServicePackagePrice
from apps.bookings.models import Booking, Customer

User = get_user_model()


class AuthenticationAndAccountsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.vehicle_type = VehicleType.objects.create(name="Sedan", slug="sedan", sort_order=1)
        self.service_pkg = ServicePackage.objects.create(name="Standard Wash", slug="standard-wash", estimated_duration_minutes=45)
        ServicePackagePrice.objects.create(
            service_package=self.service_pkg,
            vehicle_type=self.vehicle_type,
            base_price=Decimal("499.00"),
        )

    def test_signup_creates_unique_carspa_user_id(self):
        signup_data = {
            "full_name": "Vikramaditya Rao",
            "email": "vikram@example.com",
            "phone": "+91 98888 77771",
            "password": "SecurePassword123!",
            "confirm_password": "SecurePassword123!",
            "terms_accepted": True,
        }
        res = self.client.post("/api/auth/register/", signup_data, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", res.data)
        self.assertIn("user", res.data)
        user_id = res.data["user"]["user_id"]
        self.assertTrue(user_id.startswith("CARSPA-USER-"))
        self.assertEqual(res.data["user"]["phone"], "9888877771")

        # Second user should get next sequential User ID
        signup_data2 = {
            "full_name": "Aman Deep",
            "email": "aman@example.com",
            "phone": "9812345678",
            "password": "SecurePassword123!",
            "confirm_password": "SecurePassword123!",
            "terms_accepted": True,
        }
        res2 = self.client.post("/api/auth/register/", signup_data2, format="json")
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        user_id2 = res2.data["user"]["user_id"]
        self.assertNotEqual(user_id, user_id2)

    def test_duplicate_email_and_phone_rejected(self):
        self.client.post("/api/auth/register/", {
            "full_name": "Rohan Sharma",
            "email": "rohan@example.com",
            "phone": "9999988888",
            "password": "Password1234!",
            "confirm_password": "Password1234!",
            "terms_accepted": True,
        }, format="json")

        # Duplicate email
        res_email = self.client.post("/api/auth/register/", {
            "full_name": "Rohan Clone",
            "email": "rohan@example.com",
            "phone": "9999977777",
            "password": "Password1234!",
            "confirm_password": "Password1234!",
            "terms_accepted": True,
        }, format="json")
        self.assertEqual(res_email.status_code, status.HTTP_400_BAD_REQUEST)

        # Duplicate phone
        res_phone = self.client.post("/api/auth/register/", {
            "full_name": "Rohan Other",
            "email": "rohan_diff@example.com",
            "phone": "+91 9999988888",
            "password": "Password1234!",
            "confirm_password": "Password1234!",
            "terms_accepted": True,
        }, format="json")
        self.assertEqual(res_phone.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_with_email_and_mobile(self):
        self.client.post("/api/auth/register/", {
            "full_name": "Simran Kaur",
            "email": "simran@example.com",
            "phone": "9876543210",
            "password": "Password1234!",
            "confirm_password": "Password1234!",
            "terms_accepted": True,
        }, format="json")

        # Login via email
        res_email = self.client.post("/api/auth/login/", {
            "identifier": "simran@example.com",
            "password": "Password1234!",
        }, format="json")
        self.assertEqual(res_email.status_code, status.HTTP_200_OK)
        self.assertIn("token", res_email.data)

        # Login via mobile number (+91 formatting)
        res_phone = self.client.post("/api/auth/login/", {
            "identifier": "+91 98765 43210",
            "password": "Password1234!",
        }, format="json")
        self.assertEqual(res_phone.status_code, status.HTTP_200_OK)
        self.assertIn("token", res_phone.data)

        # Invalid password
        res_fail = self.client.post("/api/auth/login/", {
            "identifier": "simran@example.com",
            "password": "WrongPassword!",
        }, format="json")
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)

    def test_customer_dashboard_and_saved_data(self):
        # Register user
        reg_res = self.client.post("/api/auth/register/", {
            "full_name": "Deepak Verma",
            "email": "deepak@example.com",
            "phone": "9123456780",
            "password": "Password1234!",
            "confirm_password": "Password1234!",
            "terms_accepted": True,
        }, format="json")
        token = reg_res.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

        # Add saved address
        addr_res = self.client.post("/api/customer/addresses/", {
            "house_building": "Flat 301, Tower B",
            "street_locality": "Sector 68",
            "city": "Mohali",
            "state": "Punjab",
            "pincode": "160062",
            "address_type": "HOME",
            "is_default": True,
        }, format="json")
        self.assertEqual(addr_res.status_code, status.HTTP_201_CREATED)

        # Add saved vehicle
        veh_res = self.client.post("/api/customer/vehicles/", {
            "vehicle_type": self.vehicle_type.id,
            "brand": "Honda",
            "model_name": "City",
            "license_plate": "CH01-AB-9999",
            "color": "Pearl White",
            "is_default": True,
        }, format="json")
        self.assertEqual(veh_res.status_code, status.HTTP_201_CREATED)

        # Create booking while authenticated
        tomorrow = (timezone.localdate() + timezone.timedelta(days=1)).isoformat()
        book_res = self.client.post("/api/bookings/", {
            "vehicle_type_id": self.vehicle_type.id,
            "service_package_id": self.service_pkg.id,
            "service_date": tomorrow,
            "slot_time": "10:00",
            "customer_name": "Deepak Verma",
            "customer_phone": "9123456780",
            "customer_email": "deepak@example.com",
            "address_line": "Flat 301, Tower B",
            "locality": "Sector 68",
            "pincode": "160062",
        }, format="json")
        self.assertEqual(book_res.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(book_res.data.get("user_id"))

        # Verify Dashboard API
        dash_res = self.client.get("/api/customer/dashboard/")
        self.assertEqual(dash_res.status_code, status.HTTP_200_OK)
        self.assertEqual(dash_res.data["metrics"]["total_bookings"], 1)
        self.assertEqual(dash_res.data["metrics"]["saved_addresses_count"], 1)
        self.assertEqual(dash_res.data["metrics"]["saved_vehicles_count"], 1)

    def test_cross_user_isolation(self):
        # Register user A
        userA = self.client.post("/api/auth/register/", {
            "full_name": "User Alpha",
            "email": "alpha@example.com",
            "phone": "9111111111",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "terms_accepted": True,
        }, format="json")
        tokenA = userA.data["token"]

        # Register user B
        userB = self.client.post("/api/auth/register/", {
            "full_name": "User Beta",
            "email": "beta@example.com",
            "phone": "9222222222",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "terms_accepted": True,
        }, format="json")
        tokenB = userB.data["token"]

        # User A adds address
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {tokenA}")
        addrA = self.client.post("/api/customer/addresses/", {
            "house_building": "House 10",
            "street_locality": "Sector 10",
            "pincode": "160010",
        }, format="json")
        addr_id = addrA.data["id"]

        # User B queries addresses -> must be empty
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {tokenB}")
        resB = self.client.get("/api/customer/addresses/")
        self.assertEqual(len(resB.data), 0)

        # User B attempts to access user A's address directly -> 404
        direct_access = self.client.get(f"/api/customer/addresses/{addr_id}/")
        self.assertEqual(direct_access.status_code, status.HTTP_404_NOT_FOUND)
