from decimal import Decimal

AVAILABLE_ADDONS = [
    {
        "id": "windshield-coating",
        "name": "Windshield Hydrophobic Nano-Coating",
        "short_description": "Crystal clear wet weather visibility without wiper chatter",
        "price": Decimal("199.00"),
        "duration_minutes": 15,
        "badge": "Monsoon Essential",
        "icon": "ShieldCheck",
    },
    {
        "id": "ac-disinfection",
        "name": "AC Vent & Interior Anti-Bacterial Fogging",
        "short_description": "Deep duct sanitization that kills cabin bacteria, mold & damp odors",
        "price": Decimal("249.00"),
        "duration_minutes": 15,
        "badge": "High Demand",
        "icon": "Wind",
    },
    {
        "id": "engine-bay",
        "name": "Engine Bay Foam Clean & Satin Dressing",
        "short_description": "Safe degreasing of grease with non-sticky dust-resistant OEM finish",
        "price": Decimal("299.00"),
        "duration_minutes": 20,
        "badge": "Pro Detailing",
        "icon": "Gauge",
    },
    {
        "id": "alloy-ceramic",
        "name": "Alloy Wheel De-Brake Dust & Ceramic Gloss",
        "short_description": "Acid-free iron fallout wash with high-gloss hydrophobic rim shield",
        "price": Decimal("199.00"),
        "duration_minutes": 15,
        "badge": "Shine Boost",
        "icon": "Sparkles",
    },
    {
        "id": "headlight-restoration",
        "name": "Headlight Lens Clarity Polish & UV Shield",
        "short_description": "Compound polish removes yellow oxidation haze for maximum night throw",
        "price": Decimal("349.00"),
        "duration_minutes": 20,
        "badge": "Safety First",
        "icon": "Sun",
    },
]

ADDONS_BY_ID = {addon["id"]: addon for addon in AVAILABLE_ADDONS}
