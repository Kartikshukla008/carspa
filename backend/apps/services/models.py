from django.db import models
from apps.core.models import TimeStampedModel

class VehicleType(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon_name = models.CharField(max_length=50, default="Car", help_text="Lucide icon name")
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name

class ServicePackage(TimeStampedModel):
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=150, unique=True)
    short_description = models.CharField(max_length=255)
    description = models.TextField()
    estimated_duration_minutes = models.PositiveIntegerField(
        default=60,
        help_text="Expected duration of the car wash session in minutes"
    )
    features = models.JSONField(
        default=list,
        help_text="List of bullet points included in this package"
    )
    is_popular = models.BooleanField(default=False)
    badge_text = models.CharField(max_length=50, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.name

class ServicePackagePrice(TimeStampedModel):
    service_package = models.ForeignKey(
        ServicePackage, on_delete=models.CASCADE, related_name="prices"
    )
    vehicle_type = models.ForeignKey(
        VehicleType, on_delete=models.CASCADE, related_name="package_prices"
    )
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    discounted_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("service_package", "vehicle_type")
        ordering = ["service_package", "vehicle_type"]

    def __str__(self):
        return f"{self.service_package.name} - {self.vehicle_type.name}: ₹{self.effective_price}"

    @property
    def effective_price(self):
        if self.discounted_price and self.discounted_price > 0:
            return self.discounted_price
        return self.base_price

class ServiceArea(TimeStampedModel):
    name = models.CharField(max_length=150)
    city = models.CharField(max_length=100, default="Bengaluru")
    pincode_prefix = models.CharField(max_length=10, blank=True, help_text="e.g. 5600 for Bengaluru")
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["city", "name"]

    def __str__(self):
        return f"{self.name}, {self.city}"
