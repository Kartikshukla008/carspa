from django.contrib import admin
from apps.accounts.models import UserProfile, CustomerAddress, CustomerVehicle, PasswordResetToken

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("carspa_user_id", "full_name", "phone", "account_status", "created_at")
    search_fields = ("carspa_user_id", "full_name", "phone", "user__email")
    list_filter = ("account_status", "is_phone_verified", "is_email_verified", "created_at")
    readonly_fields = ("carspa_user_id", "created_at", "updated_at")

@admin.register(CustomerAddress)
class CustomerAddressAdmin(admin.ModelAdmin):
    list_display = ("user", "house_building", "street_locality", "city", "address_type", "is_default")
    search_fields = ("user__username", "house_building", "street_locality", "city", "pincode")
    list_filter = ("address_type", "is_default", "city")

@admin.register(CustomerVehicle)
class CustomerVehicleAdmin(admin.ModelAdmin):
    list_display = ("user", "brand", "model_name", "license_plate", "vehicle_type", "is_default")
    search_fields = ("user__username", "brand", "model_name", "license_plate")
    list_filter = ("vehicle_type", "is_default")

@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "token", "created_at", "expires_at", "is_used")
    search_fields = ("user__username", "token")
    list_filter = ("is_used",)
