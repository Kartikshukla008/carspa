"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, CheckCircle2, Clock, ShieldCheck, ArrowRight, Check } from "lucide-react";
import { api } from "@/lib/api";
import { ServicePackage, VehicleType } from "@/types";
import { FadeUp, StaggerContainer, StaggerItem, easings } from "@/components/ui/motion";

const VEHICLE_METADATA: Record<string, { image: string; badge: string; models: string; surface: string }> = {
  hatchback: {
    image: "/vehicles/hatchback_swift.jpg?v=4",
    badge: "Compact Hatchback",
    models: "Swift, i20, Polo, Baleno, Altroz",
    surface: "~14 m² Surface Area",
  },
  sedan: {
    image: "/vehicles/sedan_honda_city.jpg?v=4",
    badge: "Executive Sedan",
    models: "City, Verna, Slavia, Virtus, BMW 3-Series",
    surface: "~17 m² Surface Area",
  },
  "suv-muv": {
    image: "/vehicles/suv_creta.jpg?v=4",
    badge: "Mid-Size SUV & Crossover",
    models: "Creta, Seltos, Nexon, Harrier, XUV700",
    surface: "~21 m² Surface Area",
  },
  "luxury-7seater": {
    image: "/vehicles/luxury_fortuner.jpg?v=4",
    badge: "Full-Size 7-Seater & Flagship",
    models: "Fortuner, Innova Hycross, Gloster, BMW X5",
    surface: "~26 m² Surface Area",
  },
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

export default function ServicesPage() {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [vehicles, setVehicles] = useState<VehicleType[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [pkgs, vtypes] = await Promise.all([
          api.getServicePackages(),
          api.getVehicleTypes(),
        ]);
        const cleanPkgs = Array.isArray(pkgs) ? pkgs : (pkgs as any)?.results || [];
        const cleanVtypes = Array.isArray(vtypes) ? vtypes : (vtypes as any)?.results || [];
        setPackages(cleanPkgs);
        setVehicles(cleanVtypes);
        if (cleanVtypes.length > 0) {
          setSelectedVehicle(cleanVtypes[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const getPrice = (pkg: ServicePackage) => {
    if (!selectedVehicle || !pkg || !pkg.prices || !Array.isArray(pkg.prices)) return null;
    const p = pkg.prices.find((item) => item.vehicle_type === selectedVehicle);
    return p;
  };

  const selectedVehicleObj = vehicles.find((v) => v.id === selectedVehicle);

  return (
    <div className="container-premium py-8 lg:py-14 space-y-16">
      {/* Hero Header */}
      <FadeUp>
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] shadow-premium">
          <div className="absolute inset-0 z-0">
            <Image
              src="/hero-car-wash-alt.jpg"
              alt="Doorstep Car Detailing Service in Progress"
              fill
              priority
              className="object-cover object-center animate-cinematic-bg filter brightness-[0.65] contrast-[1.1]"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-navy-900/95 via-navy-900/85 to-navy-900 z-10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-brand-500/8 blur-[130px] pointer-events-none rounded-full z-10 animate-mist" />
          </div>

          <div className="relative z-20 text-center max-w-3xl mx-auto px-6 py-14 sm:py-20 space-y-5">
            <span className="badge badge-primary">
              <Sparkles className="w-3.5 h-3.5" />
              Studio Grade Doorstep Detailing
            </span>

            <h1 className="text-hero tracking-tight">
              Precision Car Detailing Packages
            </h1>
            <p className="section-subheading mx-auto">
              All services include our proprietary purified soft water, German pressure equipment, and professional detailing chemistry. No hidden fees or extra travel charges.
            </p>

            {/* Vehicle Selector */}
            {vehicles.length > 0 && (
              <div className="pt-6 space-y-4">
                <span className="text-xs font-bold text-brand-400 uppercase tracking-[0.15em] block">
                  Step 1: Choose Your Vehicle Segment
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto">
                  {vehicles.map((v) => {
                    const meta = VEHICLE_METADATA[v.slug] || VEHICLE_METADATA["sedan"];
                    const isSelected = selectedVehicle === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVehicle(v.id)}
                        className={`group p-2.5 rounded-2xl text-left transition-all duration-300 border flex flex-col justify-between ${
                          isSelected
                            ? "bg-brand-500/10 border-brand-500 ring-2 ring-brand-500/30 shadow-glow"
                            : "bg-navy-800/60 border-white/[0.06] hover:border-white/[0.12] hover:bg-navy-700/40"
                        }`}
                      >
                        <div className="relative w-full h-20 sm:h-24 rounded-xl overflow-hidden mb-2 bg-navy-800 border border-white/[0.04]">
                          <Image
                            src={meta.image}
                            alt={v.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 640px) 50vw, 200px"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-navy-900/70 via-transparent to-transparent" />
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-md">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-brand-300 transition-colors">
                            {v.name}
                          </h4>
                          <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                            {meta.surface}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence mode="wait">
                  {selectedVehicleObj && (
                    <motion.div
                      key={selectedVehicleObj.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.25, ease: easings.premium }}
                      className="inline-flex items-center gap-2 bg-brand-500/[0.06] border border-brand-500/15 px-4 py-2 rounded-xl text-xs text-brand-300 mt-2"
                    >
                      <span className="font-semibold text-white">{selectedVehicleObj.name}:</span>
                      <span>{VEHICLE_METADATA[selectedVehicleObj.slug]?.models || selectedVehicleObj.description}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </FadeUp>

      {/* Package Cards */}
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(Array.isArray(packages) ? packages : []).map((pkg) => {
          const priceObj = getPrice(pkg);
          return (
            <StaggerItem key={pkg.id}>
              <div
                className={`glass-card glass-card-hover rounded-2xl p-8 flex flex-col justify-between relative h-full ${
                  pkg.is_popular ? "border-brand-500/30 ring-1 ring-brand-500/10" : ""
                }`}
              >
                {pkg.badge_text && (
                  <span className={`absolute -top-3 right-8 text-[11px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md ${
                    pkg.is_popular
                      ? "bg-gradient-to-r from-brand-500 to-accent-400 text-white"
                      : "bg-navy-700 text-slate-300 border border-white/[0.08]"
                  }`}>
                    {pkg.badge_text}
                  </span>
                )}

                <div className="space-y-6">
                  {/* Package thumbnail */}
                  <div className="relative w-full h-36 rounded-xl overflow-hidden bg-slate-900 border border-white/[0.08]">
                    <Image
                      src={PACKAGE_IMAGES[pkg.slug] || "/service_basic_wash.jpg"}
                      alt={pkg.name}
                      fill
                      className="object-cover transition-transform duration-500 hover:scale-105"
                      sizes="(max-width: 640px) 100vw, 300px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#07111F]/80 via-transparent to-transparent" />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white">{pkg.name}</h3>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      {pkg.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-3 pt-2 pb-4 border-b border-white/[0.06]">
                    <span className="text-4xl font-extrabold text-white tracking-tight">
                      ₹{priceObj ? priceObj.effective_price : "—"}
                    </span>
                    {priceObj && priceObj.discounted_price && (
                      <span className="text-base text-slate-600 line-through">
                        ₹{priceObj.base_price}
                      </span>
                    )}
                    <span className="text-xs text-brand-400 font-semibold ml-auto flex items-center gap-1 badge badge-primary">
                      <Clock className="w-3.5 h-3.5" />
                      {pkg.estimated_duration_minutes} mins
                    </span>
                  </div>

                  {/* Features */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      What&apos;s included
                    </span>
                    <ul className="space-y-2.5">
                      {pkg.features.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-8">
                  <Link
                    href={`/book?package=${pkg.id}&vehicle=${selectedVehicle || ""}`}
                    className={`w-full py-3.5 rounded-xl font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 ${
                      pkg.is_popular
                        ? "btn-primary"
                        : "bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.08] hover:border-white/[0.15]"
                    }`}
                  >
                    Book for {selectedVehicleObj ? selectedVehicleObj.name : "This Car"}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {/* Assurance banner */}
      <FadeUp>
        <div className="glass-card rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">100% Satisfaction or Free Re-Wash</h4>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                If any glass streak, wheel alloy dirt, or interior dust spot is missed, our technician will rectify it on the spot before taking payment.
              </p>
            </div>
          </div>
          <Link
            href="/book"
            className="btn-primary shrink-0 text-xs uppercase tracking-wider px-6 py-3"
          >
            Check Slot Availability
          </Link>
        </div>
      </FadeUp>
    </div>
  );
}
