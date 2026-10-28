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
  "basic-wash": "/service_basic_wash.jpg?v=2",
  "interior-cleaning": "/service_interior_cleaning.jpg?v=2",
  "premium-wash": "/service_premium_wash.jpg?v=2",
  "full-detailing": "/service_full_detailing.jpg?v=2",
  "express-foam-exterior": "/service_basic_wash.jpg?v=2",
  "standard-interior-exterior": "/service_premium_wash.jpg?v=2",
  "intense-interior-deep-sanitization": "/service_interior_cleaning.jpg?v=2",
  "premium-wax-spa-detailing": "/service_full_detailing.jpg?v=2",
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
    <div className="container-premium py-12 lg:py-16 space-y-16 text-slate-100">
      {/* Hero Header */}
      <FadeUp>
        <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl bg-[#090F1C]/90 backdrop-blur-xl p-8 sm:p-14 text-center max-w-4xl mx-auto space-y-5">
          <div className="absolute top-0 right-1/4 w-80 h-80 bg-cyan-500/10 blur-[130px] rounded-full pointer-events-none" />

          <div className="inline-flex items-center gap-2 bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 font-bold text-xs px-3.5 py-1.5 rounded-full shadow-lg shadow-cyan-500/10">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Studio Grade Doorstep Detailing</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Precision Car Detailing Packages
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            All services include our proprietary purified soft water (TDS &lt; 50), German pressure equipment, and professional pH-neutral detailing chemistry. Pay strictly after your personal inspection.
          </p>

          {/* Vehicle Selector */}
          {vehicles.length > 0 && (
            <div className="pt-6 space-y-4">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-[0.2em] block">
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
                      className={`group p-3 rounded-2xl text-left transition-all duration-300 border flex flex-col justify-between ${
                        isSelected
                          ? "bg-cyan-950/40 border-cyan-400 ring-2 ring-cyan-400/30 shadow-lg shadow-cyan-500/15"
                          : "bg-[#0B1220]/80 border-white/10 hover:border-cyan-500/40 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="relative w-full h-20 sm:h-24 rounded-xl overflow-hidden mb-2 bg-slate-900 border border-white/10">
                        <Image
                          src={meta.image}
                          alt={v.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 50vw, 200px"
                        />
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow-md">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                          {v.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 block truncate mt-0.5 font-medium">
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
                    className="inline-flex items-center gap-2 bg-cyan-950/40 border border-cyan-500/30 px-4 py-2 rounded-xl text-xs text-cyan-300 mt-2 shadow-sm"
                  >
                    <span className="font-bold text-white">{selectedVehicleObj.name}:</span>
                    <span>{VEHICLE_METADATA[selectedVehicleObj.slug]?.models || selectedVehicleObj.description}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </FadeUp>

      {/* Package Cards */}
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(Array.isArray(packages) ? packages : []).map((pkg) => {
          const priceObj = getPrice(pkg);
          const isPopular = pkg.is_popular || pkg.name.toLowerCase().includes("premium");
          return (
            <StaggerItem key={pkg.id}>
              <div
                className={`glass-card glass-card-hover rounded-3xl p-6 flex flex-col justify-between relative h-full transition-all duration-300 ${
                  isPopular
                    ? "border-2 border-cyan-400/60 ring-2 ring-cyan-400/20 shadow-2xl shadow-cyan-500/15 bg-[#0E172B]/90"
                    : "border border-white/10 bg-[#0B1220]/80 hover:border-cyan-400/40"
                }`}
              >
                {pkg.badge_text && (
                  <span
                    className={`absolute -top-3 right-6 text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-lg ${
                      isPopular
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/30 border border-cyan-300/30"
                        : "bg-cyan-950 border border-cyan-500/30 text-cyan-400"
                    }`}
                  >
                    {pkg.badge_text}
                  </span>
                )}

                <div className="space-y-5">
                  {/* Package thumbnail */}
                  <div className="relative w-full h-40 rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shadow-inner">
                    <Image
                      src={PACKAGE_IMAGES[pkg.slug] || "/service_basic_wash.jpg?v=2"}
                      alt={pkg.name}
                      fill
                      className="object-cover transition-transform duration-500 hover:scale-105"
                      sizes="(max-width: 640px) 100vw, 300px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  </div>

                  <div>
                    <div className="h-14 flex items-center">
                      <h3 className="text-lg sm:text-xl font-black text-white leading-snug line-clamp-2">
                        {pkg.name}
                      </h3>
                    </div>
                    <p className="h-10 text-xs text-slate-400 line-clamp-2 leading-relaxed mt-1">
                      {pkg.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline justify-between gap-2 pt-2 pb-4 border-b border-white/10">
                    <div className="flex items-baseline gap-1.5 shrink-0">
                      <span className="text-2xl sm:text-3xl font-black text-cyan-400 tracking-tight">
                        ₹{priceObj ? Math.round(Number(priceObj.effective_price)).toLocaleString("en-IN") : "—"}
                      </span>
                      {priceObj && priceObj.discounted_price && priceObj.discounted_price !== priceObj.base_price && (
                        <span className="text-xs text-slate-500 line-through">
                          ₹{Math.round(Number(priceObj.base_price)).toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-300 font-semibold shrink-0 flex items-center gap-1 bg-white/[0.04] border border-white/10 px-2 py-1 rounded-lg">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      {pkg.estimated_duration_minutes} mins
                    </span>
                  </div>

                  {/* Features */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      What&apos;s included
                    </span>
                    <ul className="space-y-2">
                      {pkg.features.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                          <span className="font-medium">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-6 mt-auto">
                  <Link
                    href={`/book?package=${pkg.id}&vehicle=${selectedVehicle || ""}`}
                    className="w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 hover:scale-[1.01]"
                  >
                    <span>Book for {selectedVehicleObj ? selectedVehicleObj.name : "This Car"}</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </Link>
                </div>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {/* Assurance banner */}
      <FadeUp>
        <div className="glass-card rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-[#0B1220]/80 border border-white/10 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">100% Satisfaction or Free Re-Wash</h4>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                If any glass streak, wheel alloy dirt, or interior dust spot is missed, our technician will rectify it on the spot before taking payment.
              </p>
            </div>
          </div>
          <Link
            href="/book"
            className="btn-primary shrink-0 text-xs uppercase tracking-wider px-6 py-3.5 font-bold"
          >
            Check Slot Availability →
          </Link>
        </div>
      </FadeUp>
    </div>
  );
}
