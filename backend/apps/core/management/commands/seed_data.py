import datetime
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.core.models import BusinessConfig
from apps.services.models import VehicleType, ServicePackage, ServicePackagePrice, ServiceArea
from apps.staff.models import StaffProfile, StaffWorkingSchedule, StaffServiceArea
from apps.crm.models import Lead
from apps.bookings.models import Booking, Customer, BookingStatusHistory

User = get_user_model()

class Command(BaseCommand):
    help = "Seeds initial demo data for car wash booking platform"

    def handle(self, *args, **options):
        self.stdout.write("Seeding database with realistic car wash business data...")

        # 1. Admin Superuser
        admin_user, created = User.objects.get_or_create(
            username="admin",
            defaults={"email": "admin@lustreautospa.com", "is_staff": True, "is_superuser": True}
        )
        if created or not admin_user.check_password("admin123"):
            admin_user.set_password("admin123")
            admin_user.save()
            self.stdout.write(self.style.SUCCESS("Created admin user: admin / admin123"))

        # 2. Business Configuration
        config = BusinessConfig.get_config()
        config.business_name = "Lustre AutoSpa - Doorstep Car Wash"
        config.contact_phone = "+91 98765 43210"
        config.contact_email = "care@lustreautospa.com"
        config.whatsapp_number = "+919876543210"
        config.day_open_time = datetime.time(8, 0)
        config.day_close_time = datetime.time(20, 0)
        config.slot_interval_minutes = 30
        config.default_buffer_minutes = 30
        config.min_advance_hours = 2
        config.max_advance_days = 14
        config.same_day_booking_allowed = True
        config.auto_confirm_bookings = False
        config.save()

        # 3. Vehicle Types
        vehicles_data = [
            ("Hatchback", "hatchback", "Compact hatchbacks (Swift, i20, Polo, Baleno)", "Car", 1),
            ("Sedan", "sedan", "Executive sedans (City, Verna, Ciaz, Slavia)", "Car", 2),
            ("SUV / MUV", "suv-muv", "Compact and mid SUVs (Creta, Seltos, Nexon, Harrier)", "Car", 3),
            ("Luxury / 7-Seater", "luxury-7seater", "Full size luxury & 7-seaters (Fortuner, Innova, BMW, Merc)", "Truck", 4),
        ]
        vehicle_objs = {}
        for name, slug, desc, icon, order in vehicles_data:
            v, _ = VehicleType.objects.get_or_create(
                slug=slug,
                defaults={"name": name, "description": desc, "icon_name": icon, "sort_order": order, "is_active": True}
            )
            vehicle_objs[slug] = v

        # 4. Service Areas (Bengaluru)
        areas_data = [
            ("Indiranagar & Domlur", "Bengaluru", "560038"),
            ("Koramangala & HSR Layout", "Bengaluru", "560034"),
            ("Whitefield & ITPL", "Bengaluru", "560066"),
            ("JP Nagar & Jayanagar", "Bengaluru", "560078"),
            ("Electronic City Phase 1 & 2", "Bengaluru", "560100"),
            ("Bellandur & Sarjapur Road", "Bengaluru", "560103"),
        ]
        area_objs = []
        for name, city, pin in areas_data:
            a, _ = ServiceArea.objects.get_or_create(
                name=name, city=city,
                defaults={"pincode_prefix": pin, "is_active": True}
            )
            area_objs.append(a)

        # 5. Service Packages
        packages_data = [
            {
                "name": "Express Foam Exterior",
                "slug": "express-foam-exterior",
                "short_description": "Touchless snow foam, pressure rinse, wheel cleaning & tire dressing.",
                "description": "Ideal for regular maintenance washes. Includes high-pressure rinse, pH-neutral snow foam cannon wash, microfibre hand wash, alloy degreasing, and UV tire shine dressing.",
                "duration": 45,
                "badge": "Fast & Clean",
                "is_popular": False,
                "features": [
                    "High-pressure pre-rinse",
                    "pH-neutral snow foam bath",
                    "Two-bucket grit guard hand wash",
                    "Alloy wheel & rim degreasing",
                    "Streak-free glass cleaning",
                    "Tire dressing & shine protection"
                ],
                "prices": {
                    "hatchback": (499, 449),
                    "sedan": (599, 549),
                    "suv-muv": (699, 649),
                    "luxury-7seater": (849, 799),
                }
            },
            {
                "name": "Standard Interior & Exterior",
                "slug": "standard-interior-exterior",
                "short_description": "Complete exterior wash + cabin deep vacuum, dashboard wipe & fragrance.",
                "description": "Our most popular comprehensive doorstep wash. Features full exterior pressure wash plus high-powered cabin vacuuming, dash conditioning, glass polishing, and premium scent.",
                "duration": 75,
                "badge": "Most Popular",
                "is_popular": True,
                "features": [
                    "All Express Exterior features included",
                    "High-power cabin & boot vacuuming",
                    "Floor mat agitation and pressure wash",
                    "Dashboard & console antimicrobial wipe",
                    "Door pad & door jamb detailing",
                    "Interior glass smear-free polish",
                    "Signature organic car perfume treatment"
                ],
                "prices": {
                    "hatchback": (899, 799),
                    "sedan": (999, 899),
                    "suv-muv": (1199, 1049),
                    "luxury-7seater": (1399, 1249),
                }
            },
            {
                "name": "Premium Wax Spa & Detailing",
                "slug": "premium-wax-spa-detailing",
                "short_description": "Hydrophobic Carnauba wax polish, engine bay blast & trim rejuvenation.",
                "description": "Showroom gloss at your driveway. Features high-grade Brazilian carnauba wax polish applied by hand, rubber trim conditioning, engine bay air dusting, and deep anti-bacterial cabin wipe.",
                "duration": 110,
                "badge": "Showroom Shine",
                "is_popular": False,
                "features": [
                    "Everything in Standard Package",
                    "Hand-buffed Brazilian Carnauba Wax sealant",
                    "60-day hydrophobic water beading shield",
                    "External plastic trim & rubber restorer",
                    "Engine bay superficial blow & wipe",
                    "Ac vent steam & disinfectant mist",
                    "Chrome grill & emblem micro-polishing"
                ],
                "prices": {
                    "hatchback": (1499, 1299),
                    "sedan": (1699, 1499),
                    "suv-muv": (1999, 1749),
                    "luxury-7seater": (2399, 2099),
                }
            },
            {
                "name": "Intense Interior Deep Sanitization",
                "slug": "intense-interior-deep-sanitization",
                "short_description": "Hot water extraction seat shampoo, ceiling cleaning & odor neutralization.",
                "description": "Designed for cars with stubborn stains, pet hair, spillages or unpleasant odors. Deep fabric shampooing, leather conditioning, roof headliner cleaning, and germ elimination.",
                "duration": 120,
                "badge": "Deep Clean",
                "is_popular": False,
                "features": [
                    "Deep seat fabric foam shampoo / extraction",
                    "Premium leather seat cleaning & conditioner",
                    "Roof headliner stain spot treatment",
                    "Floor carpet scrub & deep extraction",
                    "AC evaporator odor neutralizer treatment",
                    "Sun visor and seatbelt deep sanitization",
                    "99.9% germ and bacteria sterilization"
                ],
                "prices": {
                    "hatchback": (1799, 1599),
                    "sedan": (1999, 1799),
                    "suv-muv": (2399, 2149),
                    "luxury-7seater": (2799, 2499),
                }
            },
            {
                "name": "Platinum Ceramic Booster Detail",
                "slug": "platinum-ceramic-booster-detail",
                "short_description": "Ultimate bumper-to-bumper transformation with ceramic spray booster.",
                "description": "The ultimate luxury car care package. Combines full interior shampoo extraction with exterior paint decontamination, clay treatment, and SiO2 ceramic spray coating for 4-month gloss & protection.",
                "duration": 180,
                "badge": "Ultra Luxury",
                "is_popular": False,
                "features": [
                    "Full Exterior + Full Interior Deep Sanitization",
                    "Paint iron & tar chemical decontamination",
                    "Clay bar glass-smooth surface prep",
                    "SiO2 Ceramic Spray Sealant application",
                    "Alloy wheel ceramic coat protection",
                    "Headlight & Taillight UV sealant",
                    "Executive gift pack & air freshener kit"
                ],
                "prices": {
                    "hatchback": (2899, 2599),
                    "sedan": (3299, 2999),
                    "suv-muv": (3899, 3499),
                    "luxury-7seater": (4599, 4199),
                }
            }
        ]

        for idx, pkg_info in enumerate(packages_data):
            pkg, _ = ServicePackage.objects.get_or_create(
                slug=pkg_info["slug"],
                defaults={
                    "name": pkg_info["name"],
                    "short_description": pkg_info["short_description"],
                    "description": pkg_info["description"],
                    "estimated_duration_minutes": pkg_info["duration"],
                    "badge_text": pkg_info["badge"],
                    "is_popular": pkg_info["is_popular"],
                    "features": pkg_info["features"],
                    "sort_order": idx + 1,
                    "is_active": True
                }
            )
            # Create prices for each vehicle type
            for v_slug, (base_p, disc_p) in pkg_info["prices"].items():
                v_type = vehicle_objs.get(v_slug)
                if v_type:
                    ServicePackagePrice.objects.update_or_create(
                        service_package=pkg,
                        vehicle_type=v_type,
                        defaults={
                            "base_price": Decimal(str(base_p)),
                            "discounted_price": Decimal(str(disc_p)),
                            "is_active": True
                        }
                    )

        # 6. Staff Members & Schedules
        staff_data = [
            ("Ramesh Kumar", "+919876500001", "ramesh@lustreautospa.com", 6),
            ("Arun Gowda", "+919876500002", "arun@lustreautospa.com", 6),
            ("Deepak Sharma", "+919876500003", "deepak@lustreautospa.com", 5),
        ]
        created_staff = []
        for name, phone, email, max_jobs in staff_data:
            s, _ = StaffProfile.objects.get_or_create(
                phone=phone,
                defaults={"name": name, "email": email, "max_daily_jobs": max_jobs, "is_active": True}
            )
            # Assign areas
            for area in area_objs[:3]:
                StaffServiceArea.objects.get_or_create(staff=s, service_area=area, defaults={"is_primary": True})
            # Assign working schedule Mon-Sun
            for day in range(7):
                StaffWorkingSchedule.objects.update_or_create(
                    staff=s,
                    day_of_week=day,
                    defaults={"start_time": datetime.time(8, 0), "end_time": datetime.time(19, 0), "is_active": True}
                )
            created_staff.append(s)

        # 7. Sample Customer, Leads & Bookings
        cust, _ = Customer.objects.get_or_create(
            phone="+919888877771",
            defaults={
                "name": "Vikramaditya Rao",
                "email": "vikram.rao@example.com",
                "locality": "Indiranagar",
                "default_address": "Flat 402, Oakwood Manor, 12th Main Road, Indiranagar",
                "pincode": "560038"
            }
        )

        lead1, _ = Lead.objects.get_or_create(
            mobile_number="+919888877771",
            customer_name="Vikramaditya Rao",
            defaults={
                "email": "vikram.rao@example.com",
                "vehicle_type": vehicle_objs["suv-muv"],
                "service_package": ServicePackage.objects.get(slug="standard-interior-exterior"),
                "locality": "Indiranagar",
                "address": "Flat 402, Oakwood Manor, 12th Main Road, Indiranagar",
                "source": "WEBSITE",
                "status": "CONVERTED",
            }
        )

        # Sample Booking for today
        today = timezone.localdate()
        booking1, b_created = Booking.objects.get_or_create(
            booking_reference="CW-DEMO-001",
            defaults={
                "customer": cust,
                "lead": lead1,
                "vehicle_type": vehicle_objs["suv-muv"],
                "service_package": ServicePackage.objects.get(slug="standard-interior-exterior"),
                "service_area": area_objs[0],
                "service_date": today,
                "slot_start_time": datetime.time(10, 0),
                "slot_end_time": datetime.time(11, 15),
                "estimated_duration_minutes": 75,
                "status": "CONFIRMED",
                "customer_name": cust.name,
                "customer_phone": cust.phone,
                "customer_email": cust.email,
                "address_line": cust.default_address,
                "locality": cust.locality,
                "pincode": "560038",
                "landmark": "Near Defence Colony Club",
                "special_instructions": "Gate code is 4421. Power point available in the garage.",
                "price_snapshot": Decimal("1049.00"),
                "tax_amount": Decimal("0.00"),
                "final_amount": Decimal("1049.00"),
                "payment_method": "PAY_ON_SERVICE",
                "payment_status": "PENDING",
                "assigned_staff": created_staff[0],
            }
        )
        if b_created:
            BookingStatusHistory.objects.create(
                booking=booking1,
                from_status="",
                to_status="CONFIRMED",
                notes="Initial demo booking confirmed."
            )

        # Sample Lead 2 (new enquiry)
        Lead.objects.get_or_create(
            mobile_number="+919777766662",
            defaults={
                "customer_name": "Pooja Hegde",
                "email": "pooja.h@example.com",
                "vehicle_type": vehicle_objs["sedan"],
                "service_package": ServicePackage.objects.get(slug="premium-wax-spa-detailing"),
                "locality": "Koramangala",
                "address": "Villa 18, Green Meadows, 5th Block Koramangala",
                "source": "WHATSAPP",
                "status": "NEW",
                "admin_notes": "Enquired on WhatsApp regarding ceramic coating durability.",
            }
        )

        self.stdout.write(self.style.SUCCESS("Demo data successfully seeded!"))
