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
  "basic-wash": "/service_basic_wash.jpg?v=2",
  "interior-cleaning": "/service_interior_cleaning.jpg?v=2",
  "premium-wash": "/service_premium_wash.jpg?v=2",
  "full-detailing": "/service_full_detailing.jpg?v=2",
  "express-foam-exterior": "/service_basic_wash.jpg?v=2",
  "standard-interior-exterior": "/service_premium_wash.jpg?v=2",
  "intense-interior-deep-sanitization": "/service_interior_cleaning.jpg?v=2",
  "premium-wax-spa-detailing": "/service_full_detailing.jpg?v=2",
};

const HOW_IT_WORKS_STEPS = [
  {
    step: 1,
    icon: Car,
    title: "Choose Your Service",
    desc: "Pick from exterior snow foam to complete interior restoration tailored for your car.",
  },
  {
    step: 2,
    icon: Calendar,
    title: "Select Your Slot",
    desc: "Choose a guaranteed time window and share your address in Chandigarh, Mohali, or Panchkula.",
  },
  {
    step: 3,
    icon: Sparkles,
    title: "Relax While We Care for Your Car",
    desc: "Our self-powered detailing crew arrives at your driveway. Inspect and pay only when satisfied.",
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
    <div className="glass-card rounded-2xl overflow-hidden border border-white/10 shadow-lg transition-all">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 text-left group transition-colors hover:bg-white/[0.03]"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-bold text-white flex items-center gap-2.5 pr-4">
          <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
          {q}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="shrink-0"
        >
          <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
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
              <p className="text-sm text-slate-300 leading-relaxed pl-6.5">
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
    <div className="space-y-24 lg:space-y-32 pb-24 bg-[#060B13] text-slate-100">
      {/* ═══════════════════════════════════════════════════
          1. CINEMATIC HERO SECTION (Luxury Automotive)
      ═══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden min-h-[92vh] flex items-center -mt-18 sm:-mt-24 border-b border-white/10">
        {/* Background Action Layer */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero-car-wash.jpg"
            alt="CARSPA Doorstep Car Detailing"
            fill
            priority
            quality={95}
            className="object-cover object-[78%_center] md:object-[72%_center] lg:object-[68%_center] filter brightness-[0.92] contrast-[1.08] animate-cinematic-bg"
            sizes="100vw"
          />

          {/* Deep Cinematic Gradients */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#060B13] via-[#060B13]/92 via-[52%] to-[#060B13]/40 lg:from-[#060B13] lg:via-[#060B13]/88 lg:via-[55%] lg:to-transparent z-10" />
          <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-[#060B13] via-[#060B13]/80 to-transparent z-10" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#060B13] via-[#060B13]/90 to-transparent z-10" />

          {/* Electric Cyan Radial Atmosphere */}
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[400px] bg-cyan-500/12 blur-[150px] pointer-events-none rounded-full z-10" />
        </div>

        {/* Content Layer */}
        <div className="container-premium relative z-20 pt-32 pb-20 lg:py-36 w-full">
          <div className="max-w-2xl lg:max-w-3xl space-y-8">
            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex items-center gap-2.5"
            >
              <span className="text-[11px] font-black tracking-[0.25em] uppercase text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-3.5 py-1.5 rounded-full shadow-lg shadow-cyan-500/10 backdrop-blur-md">
                CINEMATIC DOORSTEP DETAILING
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline font-medium tracking-wide">
                • Chandigarh • Mohali • Panchkula
              </span>
            </motion.div>

            {/* Main Headline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-1"
            >
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.05]">
                Premium Car Care.
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500">
                  At Your Doorstep.
                </span>
              </h1>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed font-normal"
            >
              Professional car cleaning and detailing, delivered to your home or workplace. Certified detailing crew, onboard soft water, zero scratches.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2"
            >
              <Link
                href="/book"
                className="btn-primary text-sm px-8 py-4 rounded-xl shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 font-bold tracking-wide"
              >
                <Calendar className="w-4 h-4" />
                <span>Book Your Wash →</span>
              </Link>
              <a
                href="#services"
                className="btn-secondary text-sm px-7 py-4 rounded-xl flex items-center justify-center gap-2 font-semibold"
              >
                <span>Explore Services</span>
                <ChevronDown className="w-4 h-4 text-cyan-400" />
              </a>
              <a
                href="https://wa.me/917087811881?text=Hi%20CARSPA%2C%20I%20would%20like%20to%20enquire%20about%20a%20doorstep%20car%20wash."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 px-4 py-4 rounded-xl transition-all shadow-sm"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span className="hidden md:inline">WhatsApp</span>
              </a>
            </motion.div>

            {/* Trust Indicator Strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="pt-4 flex items-center gap-3 text-xs text-slate-400 border-t border-white/10"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-md shadow-cyan-400/50" />
              <span className="font-medium tracking-wide">
                Convenient booking · Professional care · At-home service
              </span>
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 hidden md:flex flex-col items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-400 font-mono">
          <span>Scroll Down</span>
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          >
            <ChevronDown className="w-4 h-4 text-cyan-400" />
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          2. TRUST AND VALUE STRIP
      ═══════════════════════════════════════════════════ */}
      <section className="border-y border-white/10 bg-[#090F1C]/90 backdrop-blur-xl relative z-20">
        <div className="container-premium py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {[
              {
                icon: Home,
                title: "Doorstep Convenience",
                desc: "We bring purified soft water & power straight to your driveway.",
              },
              {
                icon: Sparkles,
                title: "Professional Cleaning",
                desc: "Certified detailers with German foam cannon & two-bucket wash.",
              },
              {
                icon: Calendar,
                title: "Flexible Scheduling",
                desc: "Real-time live slot booking with instant confirmation.",
              },
              {
                icon: Tag,
                title: "Transparent Pricing",
                desc: "Pay strictly after inspection. Zero surprise fees.",
              },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 shadow-sm">
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-snug">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          3. OUR SERVICES (Editorial Luxury Cards)
      ═══════════════════════════════════════════════════ */}
      <section id="services" className="container-premium">
        <FadeUp>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                Transparent Doorstep Packages
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase mt-0.5">
                OUR SERVICES
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Precision doorstep car washing and detailing tailored for your vehicle.
              </p>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-slate-300">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-semibold">Trained Detailers</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-slate-300">
                <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold">Eco-Friendly Lather</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-semibold">Zero-Scratch Guarantee</span>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* Vehicle Segment Selector */}
        {vehicles.length > 0 && (
          <FadeUp className="mb-8">
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-[#0B1220]/80 border border-white/10 shadow-lg backdrop-blur-xl">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3">
                Vehicle Segment:
              </span>
              {vehicles.map((v) => {
                const img = VEHICLE_HOME_IMAGES[v.slug] || "/vehicles/sedan.jpg";
                const isSelected = selectedVehicle === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVehicle(v.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300 ${
                      isSelected
                        ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-lg shadow-sky-600/30 scale-[1.02] border border-cyan-400/40"
                        : "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <div className="relative w-6 h-4 rounded overflow-hidden bg-slate-900 shrink-0 border border-white/10">
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
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {packages.slice(0, 4).map((pkg) => {
            const price = getPackagePrice(pkg);
            const imageSrc = PACKAGE_IMAGES[pkg.slug] || "/service_basic_wash.jpg?v=2";
            const isPopular = pkg.is_popular || pkg.name.toLowerCase().includes("premium");

            return (
              <StaggerItem key={pkg.id}>
                <div
                  className={`glass-card glass-card-hover rounded-3xl p-5 flex flex-col justify-between relative h-full transition-all duration-300 ${
                    isPopular
                      ? "border-2 border-cyan-400/50 shadow-2xl shadow-cyan-500/15 ring-2 ring-cyan-400/20 bg-[#0E172B]/90"
                      : "border border-white/10 bg-[#0B1220]/80 hover:border-cyan-400/30"
                  }`}
                >
                  {/* MOST POPULAR badge */}
                  {isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-lg shadow-cyan-500/30 z-10 border border-cyan-300/30">
                      ★ MOST POPULAR
                    </span>
                  )}

                  <div className="space-y-4">
                    {/* Package Image */}
                    <div className="relative w-full h-40 rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shadow-inner">
                      <Image
                        src={imageSrc}
                        alt={pkg.name}
                        fill
                        className="object-cover transition-transform duration-500 hover:scale-105"
                        sizes="(max-width: 640px) 100vw, 300px"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    </div>

                    {/* Title & Short Description */}
                    <div>
                      <h3 className="text-lg font-black text-white">{pkg.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {pkg.short_description}
                      </p>
                    </div>

                    {/* Price - "From ₹..." */}
                    <div className="pt-3 border-t border-white/10 flex items-baseline gap-1.5">
                      <span className="text-xs text-slate-400 font-medium">From</span>
                      <span className="text-3xl font-black text-cyan-400 tracking-tight">
                        ₹{price ? price.effective : "—"}
                      </span>
                      {selectedVehicleObj && (
                        <span className="text-[10px] text-slate-400 ml-auto font-medium">
                          for {selectedVehicleObj.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Book Button */}
                  <div className="pt-6">
                    <Link
                      href={`/book?package=${pkg.id}&vehicle=${selectedVehicle || ""}`}
                      className={`w-full py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-300 ${
                        isPopular
                          ? "btn-primary shadow-xl shadow-cyan-500/25 scale-[1.02]"
                          : "btn-secondary hover:border-cyan-400/60 hover:text-cyan-300"
                      }`}
                    >
                      <span>Book This Service</span>
                      <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                    </Link>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </section>

      {/* ═══════════════════════════════════════════════════
          4. HOW IT WORKS (Cinematic 3-Step Section)
      ═══════════════════════════════════════════════════ */}
      <section id="how-it-works" className="container-premium">
        <div className="relative overflow-hidden rounded-3xl bg-[#090F1C]/90 border border-white/10 p-8 sm:p-14 shadow-2xl">
          {/* Subtle water glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 blur-[130px] rounded-full pointer-events-none" />

          <FadeUp className="mb-12 text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
              Simple 3-Step Process
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">
              HOW IT WORKS
            </h2>
            <p className="text-sm text-slate-400">
              Book doorstep car care in under two minutes.
            </p>
          </FadeUp>

          {/* 3 Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 relative">
            {HOW_IT_WORKS_STEPS.map((s) => (
              <div
                key={s.step}
                className="glass-card p-6 rounded-2xl border border-white/10 relative flex flex-col justify-between space-y-4 hover:border-cyan-500/40 transition-all duration-300 bg-[#0D1527]/80"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-lg shadow-cyan-500/25">
                    {s.step}
                  </div>
                  <s.icon className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white tracking-tight">
                    {s.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Action Strip */}
          <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h4 className="text-sm font-bold text-white">Need an immediate wash?</h4>
              <p className="text-xs text-slate-400 mt-0.5">Vans available for dispatch today across Tricity.</p>
            </div>
            <Link
              href="/book"
              className="btn-primary text-xs px-6 py-3 rounded-xl font-bold uppercase tracking-wider"
            >
              <span>Book Your Wash →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          5. PREMIUM CONVERSION CTA BANNER
      ═══════════════════════════════════════════════════ */}
      <section className="container-premium">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0B1426] via-[#0D1B36] to-[#0A1324] border border-cyan-500/30 p-8 sm:p-14 shadow-2xl">
          {/* Background Ambient Glow */}
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-cyan-500/15 blur-[120px] rounded-full pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-3 py-1 rounded-full">
              DOORSTEP AUTOMOTIVE DETAILING
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Your Car Deserves Better Care.
            </h2>
            <p className="text-base text-slate-300 leading-relaxed">
              Experience the showroom shine at home. Purified RO soft water, zero swirl marks, and payment strictly after your personal inspection.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <Link
                href="/book"
                className="btn-primary text-sm px-8 py-4 rounded-xl shadow-xl shadow-cyan-500/30 font-bold"
              >
                <Calendar className="w-4 h-4" />
                <span>Schedule Your Wash</span>
              </Link>
              <a
                href="https://wa.me/917087811881"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm px-6 py-4 rounded-xl flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>Chat with an Expert</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          6. PRICING & COMPARISON (id="pricing")
      ═══════════════════════════════════════════════════ */}
      <section id="pricing" className="container-premium">
        <FadeUp className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
            Transparent Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            Choose Your Detailing Level
          </h2>
          <p className="text-sm text-slate-400">
            Real prices calculated for {selectedVehicleObj ? selectedVehicleObj.name : "your vehicle"}. No surprise charges.
          </p>
        </FadeUp>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {packages.map((pkg) => {
            const price = getPackagePrice(pkg);
            const isPopular = pkg.is_popular || pkg.name.toLowerCase().includes("premium");

            return (
              <StaggerItem key={pkg.id}>
                <div
                  className={`glass-card p-6 rounded-3xl flex flex-col justify-between h-full border ${
                    isPopular
                      ? "border-cyan-400/60 bg-[#0E172B]/90 shadow-2xl shadow-cyan-500/10"
                      : "border-white/10 bg-[#0B1220]/80"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold text-white">{pkg.name}</h3>
                        <p className="text-xs text-slate-400 mt-1">{pkg.short_description}</p>
                      </div>
                      {isPopular && (
                        <span className="text-[10px] font-black uppercase text-cyan-300 bg-cyan-950 border border-cyan-500/40 px-2 py-0.5 rounded-full">
                          Popular
                        </span>
                      )}
                    </div>

                    <div className="pt-2 pb-4 border-b border-white/10">
                      <span className="text-3xl font-black text-cyan-400">
                        ₹{price ? price.effective : "—"}
                      </span>
                      <span className="text-xs text-slate-400 ml-1.5 font-medium">
                        / {selectedVehicleObj ? selectedVehicleObj.name : "wash"}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2 font-mono">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{pkg.estimated_duration_minutes} mins duration</span>
                      </div>
                    </div>

                    <ul className="space-y-2 text-xs text-slate-300">
                      {pkg.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6">
                    <Link
                      href={`/book?package=${pkg.id}&vehicle=${selectedVehicle || ""}`}
                      className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                        isPopular ? "btn-primary shadow-lg shadow-cyan-500/25" : "btn-secondary"
                      }`}
                    >
                      <span>Book This Service</span>
                    </Link>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </section>

      {/* ═══════════════════════════════════════════════════
          7. TRICITY COVERAGE HUBS
      ═══════════════════════════════════════════════════ */}
      <section className="container-premium">
        <FadeUp className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
            Tricity Hubs
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Chandigarh • Mohali • Panchkula
          </h2>
          <p className="text-sm text-slate-400">
            Vans stationed strategically across Tricity to reach your home or office on schedule.
          </p>
        </FadeUp>

        <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {SERVICE_AREAS.map((loc, i) => (
            <StaggerItem key={i}>
              <div className="glass-card p-4 rounded-2xl text-center space-y-1.5 cursor-default bg-[#0B1220]/80 border border-white/10 hover:border-cyan-500/40 transition-all">
                <MapPin className="w-4 h-4 text-cyan-400 mx-auto" />
                <h4 className="text-xs font-bold text-white">{loc.name}</h4>
                <p className="text-[10px] text-slate-400 font-mono">PIN: {loc.pin}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* ═══════════════════════════════════════════════════
          8. TESTIMONIALS
      ═══════════════════════════════════════════════════ */}
      <section className="container-premium">
        <FadeUp className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs text-amber-300 bg-amber-950/40 border border-amber-500/30 px-3.5 py-1 rounded-full font-bold">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>Verified Customer Reviews</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            What Our Customers Say
          </h2>
        </FadeUp>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((item, idx) => (
            <StaggerItem key={idx}>
              <div className="glass-card p-6 rounded-3xl space-y-4 flex flex-col justify-between h-full bg-[#0B1220]/80 border border-white/10 shadow-lg">
                <div className="space-y-3">
                  <div className="flex gap-0.5 text-amber-400">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed italic">
                    &ldquo;{item.text}&rdquo;
                  </p>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <h4 className="text-xs font-bold text-white">{item.name}</h4>
                  <p className="text-[11px] text-cyan-400 font-semibold mt-0.5">{item.car}</p>
                  <p className="text-[10px] text-slate-400">{item.area}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* ═══════════════════════════════════════════════════
          9. FAQ ACCORDION
      ═══════════════════════════════════════════════════ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp className="text-center mb-10 space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
            Common Questions
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
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
