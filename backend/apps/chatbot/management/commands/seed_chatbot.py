from datetime import timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.chatbot.models import ChatOffer, ChatFAQ


class Command(BaseCommand):
    help = "Seeds verified CARSPA FAQ knowledge base and active/expired promotional offers."

    def handle(self, *args, **options):
        now = timezone.now()

        # 1. Seed Promotional Offers
        offers_data = [
            {
                "code": "FIRSTWASH",
                "title": "15% Off Your First Doorstep Wash",
                "description": "Welcome discount for all new CARSPA customer accounts in Chandigarh Tricity.",
                "discount_type": "PERCENTAGE",
                "discount_value": Decimal("15.00"),
                "min_order_amount": Decimal("499.00"),
                "valid_from": now - timedelta(days=10),
                "valid_until": now + timedelta(days=60),
                "is_active": True,
            },
            {
                "code": "CARSPA100",
                "title": "Flat ₹100 Off on Premium Wash",
                "description": "Instant savings on exterior carnauba wax spa and interior detailing.",
                "discount_type": "FLAT",
                "discount_value": Decimal("100.00"),
                "min_order_amount": Decimal("899.00"),
                "valid_from": now - timedelta(days=5),
                "valid_until": now + timedelta(days=90),
                "is_active": True,
            },
            {
                "code": "CERAMIC500",
                "title": "Flat ₹500 Off Platinum Ceramic Booster",
                "description": "Ultimate 9H gloss paint sealant with hydrophobic booster.",
                "discount_type": "FLAT",
                "discount_value": Decimal("500.00"),
                "min_order_amount": Decimal("2499.00"),
                "valid_from": now - timedelta(days=3),
                "valid_until": now + timedelta(days=120),
                "is_active": True,
            },
            # EXPIRED OFFER: To test that expired offers are strictly filtered out by the chatbot!
            {
                "code": "DIWALI2023",
                "title": "Expired Festive Flash Sale",
                "description": "Past festive promotion that has expired.",
                "discount_type": "PERCENTAGE",
                "discount_value": Decimal("50.00"),
                "min_order_amount": Decimal("999.00"),
                "valid_from": now - timedelta(days=365),
                "valid_until": now - timedelta(days=30),  # strictly in the past
                "is_active": True,
            },
        ]

        for o in offers_data:
            ChatOffer.objects.update_or_create(
                code=o["code"],
                defaults=o
            )
        self.stdout.write(self.style.SUCCESS("✓ Seeded ChatOffers (including expired test coupon)"))

        # 2. Seed Verified Knowledge Base FAQs
        faqs_data = [
            {
                "question": "Do I need to provide water or electricity for doorstep car wash?",
                "answer": "No! CARSPA mobile detailing vans are 100% self-powered. Our vans are fitted with onboard soft-water tanks, high-pressure foam cannons, and silent inverters. You don't need to provide water taps, power points, or extension cords.",
                "category": "DOORSTEP",
                "keywords": "water, electricity, power, plug, generator, tap, wire, doorstep",
                "sort_order": 1,
            },
            {
                "question": "Which areas do you serve?",
                "answer": "We serve all sectors and localities across Chandigarh, Mohali, and Panchkula (Tricity) including Zirakpur and Kharar, as well as select hubs in Bengaluru. You can enter your sector or pincode in the chat to check instant availability.",
                "category": "GENERAL",
                "keywords": "area, location, city, sector, chandigarh, mohali, panchkula, tricity, coverage",
                "sort_order": 2,
            },
            {
                "question": "What are your operating hours?",
                "answer": "Our doorstep wash vans operate 7 days a week from 08:00 AM to 08:00 PM. You can book slots between 8:00 AM and 6:00 PM with minimum 2 hours advance notice.",
                "category": "BOOKING",
                "keywords": "hours, timing, time, working hours, open, close, schedule, slots",
                "sort_order": 3,
            },
            {
                "question": "How long does a detailing session take?",
                "answer": "A Basic Wash takes about 45 minutes; an Interior Sanitization or Premium Wash takes ~60-75 minutes; a Full Detailing takes ~90-120 minutes; and our Platinum Ceramic Booster takes ~120-180 minutes.",
                "category": "SERVICES",
                "keywords": "duration, how long, time, minutes, hours, full detailing, ceramic",
                "sort_order": 4,
            },
            {
                "question": "What payment methods are accepted?",
                "answer": "We accept online payments via Razorpay (UPI, Google Pay, PhonePe, Credit/Debit cards, Net Banking) as well as Pay on Service (Cash on Delivery or on-spot UPI to our technician) after inspecting the spotless finish.",
                "category": "PRICING",
                "keywords": "payment, pay, upi, gpay, phonepe, razorpay, cash, cod, card",
                "sort_order": 5,
            },
            {
                "question": "Is the foam wash safe for ceramic-coated or PPF cars?",
                "answer": "Yes, 100%! We strictly use pH-neutral, snow-foam shampoos imported from Koch-Chemie and Meguiar's. Our microfiber wash mitts and scratch-free drying towels protect ceramic coatings and PPF films without degrading hydrophobic protection.",
                "category": "SERVICES",
                "keywords": "ceramic, ppf, coating, safe, scratch, swirl, paint, foam, shampoo",
                "sort_order": 6,
            },
            {
                "question": "Can I cancel or reschedule my appointment?",
                "answer": "Yes, appointments can be easily rescheduled or cancelled through your Customer Dashboard or by messaging our WhatsApp support at +91 70878 11881 at least 1 hour prior to your scheduled slot.",
                "category": "BOOKING",
                "keywords": "cancel, reschedule, refund, change slot, change time, modify",
                "sort_order": 7,
            },
        ]

        for f in faqs_data:
            ChatFAQ.objects.update_or_create(
                question=f["question"],
                defaults=f
            )
        self.stdout.write(self.style.SUCCESS("✓ Seeded ChatFAQs knowledge base"))
