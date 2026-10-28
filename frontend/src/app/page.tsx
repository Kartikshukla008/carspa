"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Droplets,
  MapPin,
  ChevronRight,
  Star,
  Phone,
  ArrowRight,
  Car,
  HelpCircle,
  ChevronDown,
  Home,
  Tag,
  Leaf,
  MessageSquare,
} from "lucide-react";
import { api } from "@/lib/api";
import { ServicePackage, VehicleType } from "@/types";
import {
  FadeUp,
  SlideIn,
  StaggerContainer,
  StaggerItem,
  ScaleIn,
  easings,
} from "@/components/ui/motion";
import CarSpaLogo from "@/components/CarSpaLogo";

/* ─── Fallback Data aligned with CARSPA Design ─── */
const FALLBACK_VEHICLES: VehicleType[] = [
  { id: 1, name: "Hatchback", slug: "hatchback", description: "Compact hatchbacks (Swift, i20, Polo, Baleno)", icon_name: "Car", sort_order: 1, is_active: true },
  { id: 2, name: "Sedan", slug: "sedan", description: "Executive sedans (City, Verna, Ciaz, Slavia)", icon_name: "Car", sort_order: 2, is_active: true },
  { id: 3, name: "SUV / MUV", slug: "suv-muv", description: "Compact & mid SUVs (Creta, Seltos, Nexon)", icon_name: "Car", sort_order: 3, is_active: true },
  { id: 4, name: "Luxury / 7-Seater", slug: "luxury-7seater", description: "Full size luxury & 7-seaters (Fortuner, Innova)", icon_name: "Truck", sort_order: 4, is_active: true },
];

const FALLBACK_PACKAGES: ServicePackage[] = [
  {
    id: 1,
    name: "Basic Wash",
    slug: "basic-wash",
    short_description: "Exterior cleaning for a fresh look.",
    description: "Touchless snow foam, pressure rinse, alloy wheel cleaning & tire dressing.",
    estimated_duration_minutes: 45,
    features: [
      "High-pressure pre-rinse",
      "pH-neutral snow foam bath",
      "Two-bucket grit guard hand wash",
      "Alloy wheel & rim degreasing",
      "Streak-free glass cleaning",
      "Tire dressing & shine protection"
    ],
    is_popular: false,
    badge_text: "Fresh Look",
    sort_order: 1,
    is_active: true,
    prices: [
      { id: 1, vehicle_type: 1, vehicle_type_name: "Hatchback", base_price: "399.00", discounted_price: "399.00", effective_price: "399.00", is_active: true },
      { id: 2, vehicle_type: 2, vehicle_type_name: "Sedan", base_price: "499.00", discounted_price: "499.00", effective_price: "499.00", is_active: true },
      { id: 3, vehicle_type: 3, vehicle_type_name: "SUV / MUV", base_price: "599.00", discounted_price: "599.00", effective_price: "599.00", is_active: true },
      { id: 4, vehicle_type: 4, vehicle_type_name: "Luxury / 7-Seater", base_price: "699.00", discounted_price: "699.00", effective_price: "699.00", is_active: true },
    ]
  },
  {
    id: 4,
    name: "Interior Cleaning",
    slug: "interior-cleaning",
    short_description: "Deep interior vacuum and cleaning.",
    description: "High-power cabin & boot vacuuming, upholstery agitation, dashboard conditioning, and anti-bacterial cabin treatment.",
    estimated_duration_minutes: 60,
    features: [
      "High-power cabin & boot deep vacuum",
      "Seat stain agitation & steam wipe",
      "Floor mat deep wash & scrub",
      "Dashboard & console antimicrobial wipe",
      "Door jamb & rubber bead cleaning",
      "Signature organic car fragrance"
    ],
    is_popular: false,
    badge_text: "Deep Clean",
    sort_order: 2,
    is_active: true,
    prices: [
      { id: 5, vehicle_type: 1, vehicle_type_name: "Hatchback", base_price: "599.00", discounted_price: "599.00", effective_price: "599.00", is_active: true },
      { id: 6, vehicle_type: 2, vehicle_type_name: "Sedan", base_price: "699.00", discounted_price: "699.00", effective_price: "699.00", is_active: true },
      { id: 7, vehicle_type: 3, vehicle_type_name: "SUV / MUV", base_price: "799.00", discounted_price: "799.00", effective_price: "799.00", is_active: true },
      { id: 8, vehicle_type: 4, vehicle_type_name: "Luxury / 7-Seater", base_price: "999.00", discounted_price: "999.00", effective_price: "999.00", is_active: true },
    ]
  },
  {
    id: 2,
    name: "Premium Wash",
    slug: "premium-wash",
    short_description: "Exterior + interior for a complete refresh.",
    description: "Complete snow foam exterior wash + comprehensive cabin deep vacuum, dashboard wipe, glass polishing & organic fragrance.",
    estimated_duration_minutes: 80,
    features: [
      "Complete snow foam exterior wash",
      "High-power cabin & boot vacuuming",
      "Alloy degreasing & tire dressing",
      "Dashboard, console & door pad wipe",
      "Interior & exterior glass smear polish",
      "AC vent sanitization mist"
    ],
    is_popular: true,
    badge_text: "MOST POPULAR",
    sort_order: 3,
    is_active: true,
    prices: [
      { id: 9, vehicle_type: 1, vehicle_type_name: "Hatchback", base_price: "899.00", discounted_price: "899.00", effective_price: "899.00", is_active: true },
      { id: 10, vehicle_type: 2, vehicle_type_name: "Sedan", base_price: "999.00", discounted_price: "999.00", effective_price: "999.00", is_active: true },
      { id: 11, vehicle_type: 3, vehicle_type_name: "SUV / MUV", base_price: "1199.00", discounted_price: "1099.00", effective_price: "1099.00", is_active: true },
      { id: 12, vehicle_type: 4, vehicle_type_name: "Luxury / 7-Seater", base_price: "1399.00", discounted_price: "1299.00", effective_price: "1299.00", is_active: true },
    ]
  },
  {
    id: 3,
    name: "Full Detailing",
    slug: "full-detailing",
    short_description: "Advanced cleaning and protection.",
    description: "Everything in Premium Wash plus hand-buffed Brazilian Carnauba Wax sealant, 60-day hydrophobic water beading shield, rubber restorer, and engine bay dressing.",
    estimated_duration_minutes: 120,
    features: [
      "Everything in Premium Wash included",
      "Hand-buffed Brazilian Carnauba Wax",
      "60-day hydrophobic water beading shield",
      "External plastic trim & rubber restorer",
      "Engine bay blow & degrease wipe",
      "Chrome grill & emblem micro-polishing"
    ],
    is_popular: false,
    badge_text: "Advanced Protection",
    sort_order: 4,
    is_active: true,
    prices: [
      { id: 13, vehicle_type: 1, vehicle_type_name: "Hatchback", base_price: "1499.00", discounted_price: "1499.00", effective_price: "1499.00", is_active: true },
      { id: 14, vehicle_type: 2, vehicle_type_name: "Sedan", base_price: "1699.00", discounted_price: "1699.00", effective_price: "1699.00", is_active: true },
      { id: 15, vehicle_type: 3, vehicle_type_name: "SUV / MUV", base_price: "1999.00", discounted_price: "1899.00", effective_price: "1899.00", is_active: true },
      { id: 16, vehicle_type: 4, vehicle_type_name: "Luxury / 7-Seater", base_price: "2399.00", discounted_price: "2299.00", effective_price: "2299.00", is_active: true },
    ]
  }
];

const VEHICLE_HOME_IMAGES: Record<string, string> = {
  hatchback: "/vehicles/hatchback_swift.jpg?v=4",
  sedan: "/vehicles/sedan_honda_city.jpg?v=4",
  "suv-muv": "/vehicles/suv_creta.jpg?v=4",
  "luxury-7seater": "/vehicles/luxury_fortuner.jpg?v=4",
};

const PACKAGE_IMAGES: Record<string, string> = {
  "basic-wash": "/service_basic_wash.jpg",
  "interior-cleaning": "/service_interior_cleaning.jpg",
  "premium-wash": "/service_premium_wash.jpg",
  "full-detailing": "/service_full_detailing.jpg",
  "express-foam-exterior": "/service_basic_wash.jpg",
  "standard-interior-exterior": "/service_premium_wash.jpg",
  "intense-interior-deep-sanitization": "/service_interior_cleaning.jpg",
  "premium-wax-spa-detailing": "/service_full_detailing.jpg",
};

const HOW_IT_WORKS_STEPS = [
  {
    step: 1,
    icon: Car,
    title: "Choose Your Service",
    desc: "Pick between Basic Wash, Interior, Premium, or Full Detailing.",
  },
  {
    step: 2,
    icon: Calendar,
    title: "Select Date & Time",
    desc: "Choose a convenient time slot that fits your schedule.",
  },
  {
    step: 3,
    icon: MapPin,
    title: "Share Your Address",
    desc: "Tell us your home or office address in Chandigarh, Mohali, or Panchkula.",
  },
  {
    step: 4,
    icon: Sparkles,
    title: "Relax We Clean",
    desc: "Our equipped detailing crew arrives and washes your car to perfection.",
  },
];

const TESTIMONIALS = [
  {
    name: "Karan Singla",
    car: "Hyundai Creta SX (SUV)",
    area: "Sector 35, Chandigarh",
    text: "Unbelievable doorstep convenience! Booked the Premium Wash for Saturday 10 AM. The team arrived on the dot with their own water & power equipment. My car looks like delivery day.",
    rating: 5,
  },
  {
    name: "Simran Kaur",
    car: "Honda City ZX (Sedan)",
    area: "Phase 7, Mohali",
    text: "The Full Detailing Carnauba wax package is incredible. Other wash centers cause swirls on black cars, but CARSPA's team used fresh microfibres and high-pressure snow foam. Spotless finish!",
    rating: 5,
  },
  {
    name: "Dr. Rohit Verma",
    car: "Toyota Fortuner (7-Seater)",
    area: "Sector 20, Panchkula",
    text: "Tried their Interior Cleaning after our Himachal road trip. Spilled stains on the beige seats are completely gone and the cabin smells neutral and hygienic. Highly recommended!",
    rating: 5,
  },
];

const FAQ_ITEMS = [
  {
    q: "Do I need to supply water or electricity?",
    a: "No! CARSPA detailing vans are equipped with onboard soft water tanks and silent generator power. However, if your society allows a standard socket in parking, we can optionally connect.",
  },
  {
    q: "Can you wash cars in apartment basement parking?",
    a: "Yes! Our high-pressure equipment uses controlled runoff guards and water extraction trays. We leave your parking stall clean and dry after completing the wash.",
  },
  {
    q: "Which areas do you currently serve?",
    a: "We currently provide full doorstep car wash coverage across all sectors of Chandigarh, Mohali (Phase 1 to 11, Sector 70+), Panchkula (Sectors & MDC), and Zirakpur.",
  },
  {
    q: "What is your cancellation and rescheduling policy?",
    a: "You can reschedule or cancel your appointment free of charge at any time before the scheduled time slot either online via our booking tracker or by replying on WhatsApp.",
  },
  {
    q: "When and how do I pay?",
    a: "Payment is strictly after service completion. Once our detailing technician finishes and you inspect your vehicle, you can pay via UPI (GPay, PhonePe, Paytm) or cash directly to the technician.",
  },
];

const SERVICE_AREAS = [
  { name: "Chandigarh (All Sectors)", pin: "160017" },
  { name: "Mohali (Phase 1–11)", pin: "160062" },
  { name: "Panchkula (Sectors & MDC)", pin: "134112" },
  { name: "Sector 70, Mohali", pin: "160071" },
  { name: "Sector 35, Chandigarh", pin: "160035" },
  { name: "Zirakpur & VIP Road", pin: "140603" },
];

/* ─── FAQ Accordion Item ─── */
function FAQItem({ q, a, isOpen, onToggle }: { q: string; a: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 text-left group transition-colors hover:bg-slate-50/60"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-bold text-slate-900 flex items-center gap-2.5 pr-4">
          <HelpCircle className="w-4 h-4 text-sky-600 shrink-0" />
          {q}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="shrink-0"
        >
          <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition-colors" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="px-5 pb-5 pt-0">
              <p className="text-sm text-slate-600 leading-relaxed pl-6.5">
                {a}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HomePage() {
  const [packages, setPackages] = useState<ServicePackage[]>(FALLBACK_PACKAGES);
  const [vehicles, setVehicles] = useState<VehicleType[]>(FALLBACK_VEHICLES);
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(1);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [pkgs, vtypes] = await Promise.all([
          api.getServicePackages(),
          api.getVehicleTypes(),
        ]);
        const cleanPkgs = Array.isArray(pkgs) && pkgs.length > 0 ? pkgs : FALLBACK_PACKAGES;
        const cleanVtypes = Array.isArray(vtypes) && vtypes.length > 0 ? vtypes : FALLBACK_VEHICLES;
        setPackages(cleanPkgs);
        setVehicles(cleanVtypes);
        if (cleanVtypes.length > 0) {
          setSelectedVehicle(cleanVtypes[0].id);
        }
      } catch (err) {
        console.error("Using fallbacks:", err);
        setPackages(FALLBACK_PACKAGES);
        setVehicles(FALLBACK_VEHICLES);
        setSelectedVehicle(1);
      }
    }
    loadData();
  }, []);

  const getPackagePrice = (pkg: ServicePackage) => {
    if (!selectedVehicle || !pkg || !pkg.prices || !Array.isArray(pkg.prices)) return null;
    const priceObj = pkg.prices.find((p) => p.vehicle_type === selectedVehicle);
    if (!priceObj) return null;
    return {
      effective: priceObj.effective_price,
      base: priceObj.base_price,
      discounted: priceObj.discounted_price,
    };
  };

  const selectedVehicleObj = vehicles.find((v) => v.id === selectedVehicle);

  return (
    <div className="space-y-20 lg:space-y-28 pb-20 bg-[#F8FAFC]">
      {/* ═══════════════════════════════════════════════════
          1. HERO SECTION (Clean Bright Studio)
      ═══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center -mt-18 sm:-mt-24 border-b border-slate-200">
        {/* Background Action Layer */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero-car-wash.jpg"
            alt="CARSPA Doorstep Car Detailing"
            fill
            priority
            quality={92}
            className="object-cover object-[80%_center] md:object-[72%_center] lg:object-[68%_center] filter brightness-[1.02] contrast-[1.04]"
            sizes="100vw"
          />

          {/* Clean Bright Studio Gradients */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#F8FAFC] via-[#F8FAFC]/95 via-[48%] to-[#F8FAFC]/30 lg:from-[#F8FAFC] lg:via-[#F8FAFC]/92 lg:via-[52%] lg:to-transparent z-10" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#F8FAFC] via-[#F8FAFC]/70 to-transparent z-10" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]/80 to-transparent z-10" />

          {/* Ambient Blue Radial Glow */}
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[350px] bg-sky-400/10 blur-[130px] pointer-events-none rounded-full z-10" />
        </div>

        {/* Content Layer */}
        <div className="container-premium relative z-20 pt-28 pb-16 lg:py-32 w-full">
          <div className="max-w-2xl lg:max-w-3xl space-y-7">
            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex items-center gap-2"
            >
              <span className="text-xs font-black tracking-[0.22em] uppercase text-sky-700 bg-sky-50 border border-sky-200 px-3.5 py-1.5 rounded-full shadow-sm">
                PREMIUM CAR CARE
              </span>
              <span className="text-xs text-slate-500 hidden sm:inline font-medium">• Chandigarh • Mohali • Panchkula</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[1.05]"
            >
              AT YOUR{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600">
                DOORSTEP
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-base sm:text-lg text-slate-600 max-w-lg leading-relaxed font-medium"
            >
              Professional car washing and detailing at your home or office. Purified soft water, zero scratches, transparent pricing.
            </motion.p>

            {/* 4 Feature Cards */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2"
            >
              {[
                { icon: Home, title: "Convenient Home Service" },
                { icon: Sparkles, title: "Professional Cleaning" },
                { icon: Tag, title: "Transparent Pricing" },
                { icon: Calendar, title: "Flexible Scheduling" },
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center sm:items-start text-center sm:text-left gap-2 p-3 rounded-2xl bg-white/90 border border-slate-200 shadow-sm backdrop-blur-sm hover:shadow-md transition-all">
                  <div className="w-9 h-9 rounded-full bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 leading-snug">
                    {item.title}
                  </span>
                </div>
              ))}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-3"
            >
              <Link
                href="/book"
                className="btn-primary text-sm px-8 py-4 rounded-xl shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 font-bold"
              >
                <Calendar className="w-4 h-4" />
                <span>Book a Car Wash →</span>
              </Link>
              <a
                href="https://wa.me/917087811881?text=Hi%20CARSPA%2C%20I%20would%20like%20to%20enquire%20about%20a%20doorstep%20car%20wash."
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm px-6 py-4 rounded-xl text-emerald-700 hover:text-emerald-800 border-emerald-200 hover:border-emerald-300 bg-emerald-50 hover:bg-emerald-100/80 flex items-center justify-center gap-2 font-bold shadow-sm"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>Chat on WhatsApp</span>
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          2. OUR SERVICES (Clean Studio Cards)
      ═══════════════════════════════════════════════════ */}
      <section id="services" className="container-premium">
        <FadeUp>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-sky-600">
                Transparent Doorstep Packages
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight uppercase mt-0.5">
                OUR SERVICES
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Choose the perfect package for your car.
              </p>
            </div>

            {/* 3 Trust Badges */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 shadow-sm">
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                <span className="font-semibold">Trained Professionals</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 shadow-sm">
                <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-semibold">Eco-Friendly Products</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                <span className="font-semibold">Zero-Scratch Guarantee</span>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* Vehicle Segment Selector */}
        {vehicles.length > 0 && (
          <FadeUp className="mb-8">
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-3">
                Select Segment:
              </span>
              {vehicles.map((v) => {
                const img = VEHICLE_HOME_IMAGES[v.slug] || "/vehicles/sedan.jpg";
                const isSelected = selectedVehicle === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVehicle(v.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300 ${
                      isSelected
                        ? "bg-sky-600 text-white shadow-md shadow-sky-600/30 scale-[1.02]"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <div className="relative w-6 h-4 rounded overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                      <Image src={img} alt={v.name} fill className="object-cover" sizes="24px" />
                    </div>
                    <span>{v.name}</span>
                  </button>
                );
              })}
            </div>
          </FadeUp>
        )}

        {/* 4 Service Cards Grid */}
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {packages.slice(0, 4).map((pkg) => {
            const price = getPackagePrice(pkg);
            const imageSrc = PACKAGE_IMAGES[pkg.slug] || "/service_basic_wash.jpg";
            const isPopular = pkg.is_popular || pkg.name.toLowerCase().includes("premium");

            return (
              <StaggerItem key={pkg.id}>
                <div
                  className={`glass-card glass-card-hover rounded-3xl p-5 flex flex-col justify-between relative h-full transition-all duration-300 ${
                    isPopular
                      ? "border-2 border-sky-500 shadow-xl shadow-sky-500/10 ring-4 ring-sky-500/10 bg-white"
                      : "border border-slate-200 shadow-sm hover:shadow-lg bg-white"
                  }`}
                >
                  {/* MOST POPULAR badge */}
                  {isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-sky-600 to-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md z-10">
                      ★ MOST POPULAR
                    </span>
                  )}

                  <div className="space-y-4">
                    {/* Package Image */}
                    <div className="relative w-full h-36 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                      <Image
                        src={imageSrc}
                        alt={pkg.name}
                        fill
                        className="object-cover transition-transform duration-500 hover:scale-105"
                        sizes="(max-width: 640px) 100vw, 250px"
                      />
                    </div>

                    {/* Title & Short Description */}
                    <div>
                      <h3 className="text-lg font-black text-slate-900">{pkg.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {pkg.short_description}
                      </p>
                    </div>

                    {/* Price - "From ₹..." */}
                    <div className="pt-2 border-t border-slate-100 flex items-baseline gap-1.5">
                      <span className="text-xs text-slate-500 font-medium">From</span>
                      <span className="text-3xl font-black text-sky-600 tracking-tight">
                        ₹{price ? price.effective : "—"}
                      </span>
                      {selectedVehicleObj && (
                        <span className="text-[10px] text-slate-500 ml-auto font-medium">
                          for {selectedVehicleObj.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Book Button */}
                  <div className="pt-5">
                    <Link
                      href={`/book?package=${pkg.id}&vehicle=${selectedVehicle || ""}`}
                      className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-300 ${
                        isPopular
                          ? "btn-primary shadow-md shadow-sky-600/30"
                          : "btn-secondary hover:border-sky-500 hover:text-sky-600"
                      }`}
                    >
                      <span>Book Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </section>

      {/* ═══════════════════════════════════════════════════
          3. HOW IT WORKS (High-Contrast Rich Navy Card)
      ═══════════════════════════════════════════════════ */}
      <section id="how-it-works" className="container-premium">
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-8 sm:p-12 shadow-2xl text-white">
          {/* Subtle water glow */}
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-sky-500/10 blur-[120px] rounded-full pointer-events-none" />

          <FadeUp className="mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
              Simple 4-Step Process
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase mt-0.5">
              HOW IT WORKS
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Book your car wash in just a few simple steps.
            </p>
          </FadeUp>

          {/* 4 Steps row with CTAs */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Steps (Cols 1-8) */}
            <div className="lg:col-span-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {HOW_IT_WORKS_STEPS.map((s) => (
                  <div
                    key={s.step}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-md shadow-sky-500/30">
                        {s.step}
                      </div>
                      <s.icon className="w-4 h-4 text-sky-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white leading-snug">
                        {s.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTAs on the right (Cols 9-12) */}
            <div className="lg:col-span-4 flex flex-col gap-3 justify-center">
              <Link
                href="/book"
                className="w-full bg-sky-500 hover:bg-sky-400 text-white font-extrabold text-sm py-4 px-6 rounded-2xl shadow-xl shadow-sky-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Book a Car Wash →</span>
              </Link>
              <a
                href="https://wa.me/917087811881"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-sm py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-sm"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950">
                  <MessageSquare className="w-3 h-3 fill-slate-950" />
                </div>
                <span>Chat on WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          4. SERVICE COVERAGE (Chandigarh • Mohali • Panchkula)
      ═══════════════════════════════════════════════════ */}
      <section className="container-premium">
        <FadeUp className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-sky-600">
            Tricity Doorstep Hubs
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            Chandigarh • Mohali • Panchkula
          </h2>
          <p className="text-sm text-slate-500">
            Our detailing vans are stationed across Tricity to reach your home in under 45 minutes.
          </p>
        </FadeUp>

        <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {SERVICE_AREAS.map((loc, i) => (
            <StaggerItem key={i}>
              <div className="glass-card glass-card-hover p-4 rounded-2xl text-center space-y-1.5 cursor-default bg-white border border-slate-200">
                <MapPin className="w-4 h-4 text-sky-600 mx-auto" />
                <h4 className="text-xs font-bold text-slate-900">{loc.name}</h4>
                <p className="text-[10px] text-slate-500 font-mono">PIN: {loc.pin}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* ═══════════════════════════════════════════════════
          5. TESTIMONIALS
      ═══════════════════════════════════════════════════ */}
      <section className="container-premium">
        <FadeUp className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3.5 py-1 rounded-full font-bold shadow-sm">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>Verified Customer Reviews</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            What Our Customers Say
          </h2>
        </FadeUp>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((item, idx) => (
            <StaggerItem key={idx}>
              <div className="glass-card glass-card-hover p-6 rounded-3xl space-y-4 flex flex-col justify-between h-full bg-white border border-slate-200 shadow-sm">
                <div className="space-y-3">
                  <div className="flex gap-0.5 text-amber-500">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-500" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed italic">
                    &ldquo;{item.text}&rdquo;
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900">{item.name}</h4>
                  <p className="text-[11px] text-sky-600 font-semibold mt-0.5">{item.car}</p>
                  <p className="text-[10px] text-slate-500">{item.area}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* ═══════════════════════════════════════════════════
          6. FAQ ACCORDION
      ═══════════════════════════════════════════════════ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp className="text-center mb-10 space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-sky-600">
            Common Questions
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            Frequently Asked Questions
          </h2>
        </FadeUp>

        <div className="space-y-3">
          {FAQ_ITEMS.map((faq, i) => (
            <FadeUp key={i} delay={i * 0.05}>
              <FAQItem
                q={faq.q}
                a={faq.a}
                isOpen={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
              />
            </FadeUp>
          ))}
        </div>
      </section>
    </div>
  );
}
