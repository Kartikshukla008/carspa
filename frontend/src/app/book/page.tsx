"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Car,
  Sparkles,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  MessageSquare,
  FileText,
  Droplets,
  Layers,
  Check
} from "lucide-react";
import { api } from "@/lib/api";
import { VehicleType, ServicePackage, ServiceArea, TimeSlot, BookingResponse } from "@/types";

// Vehicle metadata for rich visual presentation
export interface CarModelItem {
  name: string;
  image: string;
}

interface VehicleCategoryMeta {
  image: string;
  badge: string;
  surfaceArea: string;
  foamCapacity: string;
  estDuration: string;
  popularModels: CarModelItem[];
}

const VEHICLE_METADATA: Record<string, VehicleCategoryMeta> = {
  hatchback: {
    image: "/vehicles/hatchback.jpg",
    badge: "Compact Urban Segment",
    surfaceArea: "~14 m² Surface Area",
    foamCapacity: "1.2L Snow Foam Cannon",
    estDuration: "45 - 75 Mins Detailing",
    popularModels: [
      { name: "Maruti Swift", image: "/vehicles/hatchback_swift.jpg" },
      { name: "Hyundai i20", image: "/vehicles/hatchback_i20.jpg" },
      { name: "Volkswagen Polo", image: "/vehicles/hatchback_polo.jpg" },
      { name: "Maruti Baleno", image: "/vehicles/hatchback_baleno.jpg" },
      { name: "Tata Altroz", image: "/vehicles/hatchback_altroz.jpg" },
    ],
  },
  sedan: {
    image: "/vehicles/sedan.jpg",
    badge: "Executive Sedan Segment",
    surfaceArea: "~17 m² Surface Area",
    foamCapacity: "1.5L Snow Foam Cannon",
    estDuration: "60 - 90 Mins Detailing",
    popularModels: [
      { name: "Honda City", image: "/vehicles/sedan_honda_city.jpg" },
      { name: "Hyundai Verna", image: "/vehicles/sedan_hyundai_verna.jpg" },
      { name: "Skoda Slavia", image: "/vehicles/sedan_skoda_slavia.jpg" },
      { name: "Volkswagen Virtus", image: "/vehicles/sedan_vw_virtus.jpg" },
      { name: "BMW 3 Series", image: "/vehicles/sedan_bmw_3.jpg" },
      { name: "Audi A4", image: "/vehicles/sedan_audi_a4.jpg" },
    ],
  },
  "suv-muv": {
    image: "/vehicles/suv.jpg",
    badge: "Mid-Size SUV & Crossover",
    surfaceArea: "~21 m² Surface Area",
    foamCapacity: "1.8L Snow Foam Cannon",
    estDuration: "75 - 110 Mins Detailing",
    popularModels: [
      { name: "Hyundai Creta", image: "/vehicles/suv_creta.jpg" },
      { name: "Kia Seltos", image: "/vehicles/suv_seltos.jpg" },
      { name: "Tata Nexon", image: "/vehicles/suv_nexon.jpg" },
      { name: "Mahindra XUV700", image: "/vehicles/suv_xuv700.jpg" },
      { name: "Tata Harrier", image: "/vehicles/suv_harrier.jpg" },
      { name: "Maruti Grand Vitara", image: "/vehicles/suv_grand_vitara.jpg" },
    ],
  },
  "luxury-7seater": {
    image: "/vehicles/luxury-7seater.jpg",
    badge: "Full-Size 7-Seater & Flagship Luxury",
    surfaceArea: "~26 m² Surface Area",
    foamCapacity: "2.2L Snow Foam Cannon",
    estDuration: "90 - 130 Mins Detailing",
    popularModels: [
      { name: "Toyota Fortuner", image: "/vehicles/luxury_fortuner.jpg" },
      { name: "Toyota Innova Hycross", image: "/vehicles/luxury_innova.jpg" },
      { name: "MG Gloster", image: "/vehicles/luxury_gloster.jpg" },
      { name: "Mahindra Scorpio-N", image: "/vehicles/luxury_scorpio_n.jpg" },
      { name: "BMW X5", image: "/vehicles/luxury_bmw_x5.jpg" },
    ],
  },
};

function BookingFlow() {
  const searchParams = useSearchParams();
  const preselectedPkgId = searchParams.get("package");
  const preselectedVehicleId = searchParams.get("vehicle");

  // Step state (1: Vehicle, 2: Package, 3: Date & Slot, 4: Contact & Address, 5: Review, 6: Success)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Data from backend
  const [vehicles, setVehicles] = useState<VehicleType[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Selections
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [selectedCarModel, setSelectedCarModel] = useState<string>("");
  const [customCarModel, setCustomCarModel] = useState<string>("");
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);

  // Date & Slot
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlotTime, setSelectedSlotTime] = useState<string>("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);

  // Customer Form
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    addressLine: "",
    locality: "",
    landmark: "",
    pincode: "",
    specialInstructions: "",
    paymentMethod: "PAY_ON_SERVICE",
  });

  const [leadCapturedId, setLeadCapturedId] = useState<string | null>(null);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingResponse | null>(null);

  // 1. Initial Data Fetch
  useEffect(() => {
    async function init() {
      try {
        const [vtypes, pkgs, areas] = await Promise.all([
          api.getVehicleTypes(),
          api.getServicePackages(),
          api.getServiceAreas(),
        ]);
        const cleanVtypes = Array.isArray(vtypes) ? vtypes : (vtypes as any)?.results || [];
        const cleanPkgs = Array.isArray(pkgs) ? pkgs : (pkgs as any)?.results || [];
        const cleanAreas = Array.isArray(areas) ? areas : (areas as any)?.results || [];
        setVehicles(cleanVtypes);
        setPackages(cleanPkgs);
        setServiceAreas(cleanAreas);

        if (cleanAreas.length > 0) {
          setSelectedAreaId(cleanAreas[0].id);
        }

        if (preselectedVehicleId) {
          const vid = parseInt(preselectedVehicleId, 10);
          const found = cleanVtypes.find((v: any) => v.id === vid);
          if (found) {
            setSelectedVehicleId(vid);
            const m = VEHICLE_METADATA[found.slug] || VEHICLE_METADATA["sedan"];
            if (m && m.popularModels.length > 0) setSelectedCarModel(m.popularModels[0].name);
          }
        } else if (cleanVtypes.length > 0) {
          setSelectedVehicleId(cleanVtypes[0].id);
          const m = VEHICLE_METADATA[cleanVtypes[0].slug] || VEHICLE_METADATA["sedan"];
          if (m && m.popularModels.length > 0) setSelectedCarModel(m.popularModels[0].name);
        }

        if (preselectedPkgId) {
          const pid = parseInt(preselectedPkgId, 10);
          if (cleanPkgs.some((p: any) => p.id === pid)) setSelectedPackageId(pid);
        }

        // Default date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yyyy = tomorrow.getFullYear();
        const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
        const dd = String(tomorrow.getDate()).padStart(2, "0");
        setSelectedDate(`${yyyy}-${mm}-${dd}`);
      } catch (err) {
        console.error("Failed to load booking dependencies", err);
      } finally {
        setLoadingInitial(false);
      }
    }
    init();
  }, [preselectedPkgId, preselectedVehicleId]);

  // 2. Fetch Slots whenever date or package changes
  useEffect(() => {
    if (!selectedDate || !selectedPackageId) return;

    let isMounted = true;
    async function loadSlots() {
      setLoadingSlots(true);
      setSlotError(null);
      setSelectedSlotTime("");
      try {
        const res = await api.getAvailability(
          selectedDate,
          selectedPackageId!,
          selectedVehicleId || undefined,
          selectedAreaId || undefined
        );
        if (isMounted) {
          setSlots(res.slots || []);
        }
      } catch (err: any) {
        if (isMounted) {
          setSlotError(err.message || "Failed to load slots for this date.");
          setSlots([]);
        }
      } finally {
        if (isMounted) setLoadingSlots(false);
      }
    }

    loadSlots();
    return () => {
      isMounted = false;
    };
  }, [selectedDate, selectedPackageId, selectedVehicleId, selectedAreaId]);

  // Derived selections
  const currentVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const currentVehicleMeta = currentVehicle ? VEHICLE_METADATA[currentVehicle.slug] || VEHICLE_METADATA["sedan"] : null;
  const currentPackage = packages.find((p) => p.id === selectedPackageId);
  const currentPriceObj =
    currentPackage && selectedVehicleId
      ? currentPackage.prices.find((p) => p.vehicle_type === selectedVehicleId)
      : null;
  const activeCarDisplayName = customCarModel.trim() || selectedCarModel || currentVehicle?.name || "Standard";

  // Resolve the exact studio image for the selected car model
  const selectedModelObj = currentVehicleMeta?.popularModels.find(
    (m) => m.name.toLowerCase() === selectedCarModel.toLowerCase()
  );
  const activeCarImage = selectedModelObj?.image || currentVehicleMeta?.image || "/vehicles/sedan.jpg";

  const handleSelectVehicle = (v: VehicleType) => {
    setSelectedVehicleId(v.id);
    const meta = VEHICLE_METADATA[v.slug] || VEHICLE_METADATA["sedan"];
    if (meta && meta.popularModels.length > 0) {
      setSelectedCarModel(meta.popularModels[0].name);
    }
  };

  // Background lead capture when advancing from Contact step
  const handleCaptureLead = async () => {
    if (!formData.customerName || !formData.customerPhone) return;
    try {
      const carDetail = customCarModel.trim() || selectedCarModel;
      const lead = await api.createLead({
        customer_name: formData.customerName,
        mobile_number: formData.customerPhone,
        email: formData.customerEmail,
        vehicle_type: selectedVehicleId,
        service_package: selectedPackageId,
        requested_date: selectedDate,
        requested_slot: selectedSlotTime,
        locality: formData.locality,
        address: formData.addressLine,
        pincode: formData.pincode,
        source: carDetail ? `BOOKING_FLOW (${carDetail})` : "BOOKING_FLOW",
      });
      setLeadCapturedId(lead.lead_id);
    } catch {
      // Non-blocking lead capture
    }
  };

  // Submit final booking
  const handleBookingSubmit = async () => {
    if (!selectedVehicleId || !selectedPackageId || !selectedDate || !selectedSlotTime) {
      setBookingError("Please complete all required fields before confirming.");
      return;
    }

    setSubmittingBooking(true);
    setBookingError(null);

    try {
      const carDetail = customCarModel.trim() || selectedCarModel;
      let finalInstructions = formData.specialInstructions.trim();
      if (carDetail) {
        finalInstructions = finalInstructions
          ? `[Car Model: ${carDetail}] ${finalInstructions}`
          : `[Car Model: ${carDetail}]`;
      }

      const bookingPayload = {
        vehicle_type_id: selectedVehicleId,
        service_package_id: selectedPackageId,
        service_area_id: selectedAreaId,
        service_date: selectedDate,
        slot_time: selectedSlotTime,
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone,
        customer_email: formData.customerEmail,
        address_line: formData.addressLine,
        locality: formData.locality,
        landmark: formData.landmark,
        pincode: formData.pincode,
        special_instructions: finalInstructions,
        payment_method: formData.paymentMethod,
        lead_id: leadCapturedId || "",
      };

      const result = await api.createBooking(bookingPayload);
      setConfirmedBooking(result);
      setCurrentStep(6); // Success step
    } catch (err: any) {
      setBookingError(err.message || "Failed to confirm booking. The slot may have just been booked.");
    } finally {
      setSubmittingBooking(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
        <p className="text-sm text-gray-400">Loading booking configuration &amp; packages...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen py-10 lg:py-16 overflow-hidden bg-[#060B13] text-slate-100">
      {/* Background Car Wash Atmosphere */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Image
          src="/hero-car-wash.jpg"
          alt="Doorstep Car Detailing Atmosphere"
          fill
          priority
          className="object-cover object-top opacity-15 filter saturate-150"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#060B13]/90 via-[#060B13]/95 to-[#060B13]" />
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[350px] bg-cyan-500/10 blur-[140px] rounded-full animate-mist" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Title */}
      <div className="text-center mb-8">
        <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-cyan-400 mb-1">
          Direct Doorstep Detailing
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Book Doorstep Car Detailing
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Zero advance payment. Pay upon completion after inspecting your spotless car.
        </p>
      </div>

      {/* Progress Steps (1 to 5) */}
      {currentStep < 6 && (
        <div className="mb-10">
          <div className="flex items-center justify-between relative max-w-2xl mx-auto">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/10 -translate-y-1/2 -z-0" />
            {[
              { num: 1, label: "Vehicle" },
              { num: 2, label: "Package" },
              { num: 3, label: "Date & Slot" },
              { num: 4, label: "Address" },
              { num: 5, label: "Review" },
            ].map((step) => (
              <div key={step.num} className="relative z-10 flex flex-col items-center gap-1.5 bg-[#060B13] px-2">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    currentStep === step.num
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white ring-4 ring-cyan-500/25 shadow-lg shadow-cyan-500/30"
                      : currentStep > step.num
                      ? "bg-emerald-500 text-white"
                      : "bg-[#0B1220] text-slate-500 border border-white/10 shadow-sm"
                  }`}
                >
                  {currentStep > step.num ? <CheckCircle2 className="w-4 h-4" /> : step.num}
                </div>
                <span className={`text-[10px] font-semibold hidden sm:block ${
                  currentStep === step.num ? "text-cyan-400 font-bold" : currentStep > step.num ? "text-emerald-400" : "text-slate-500"
                }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 1: VEHICLE TYPE */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-white">Select Vehicle Type</h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Pricing and wash chemistry adjust according to vehicle surface area.
            </p>
          </div>

          {/* 4 Category Selection Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {vehicles.map((v) => {
              const meta = VEHICLE_METADATA[v.slug] || VEHICLE_METADATA["sedan"];
              const isSelected = selectedVehicleId === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleSelectVehicle(v)}
                  className={`group relative p-4 rounded-2xl text-left transition-all flex flex-col sm:flex-row items-center sm:items-start gap-4 border ${
                    isSelected
                      ? "border-cyan-400 bg-cyan-950/30 ring-2 ring-cyan-400/50 shadow-xl shadow-cyan-500/15"
                      : "border-white/10 hover:border-cyan-500/40 bg-[#0B1220]/80 hover:bg-[#0E172B] shadow-sm hover:shadow-lg"
                  }`}
                >
                  {/* Vehicle Image Thumbnail */}
                  <div className="relative w-full sm:w-36 h-28 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-slate-900">
                    <Image
                      src={isSelected ? activeCarImage : meta.image}
                      alt={v.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, 150px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                    {isSelected && (
                      <span className="absolute top-2 left-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md">
                        Selected
                      </span>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors">
                        {v.name}
                      </h3>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/40"
                            : "border border-white/20 text-transparent"
                        }`}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    </div>
                    <span className="inline-block text-[10px] font-bold text-cyan-400 uppercase tracking-wider mt-0.5">
                      {meta.badge}
                    </span>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {v.description}
                    </p>
                    <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1.5 font-medium">
                      <Layers className="w-3 h-3 text-cyan-400" />
                      <span>{meta.surfaceArea}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* INTERACTIVE SELECTED VEHICLE SHOWCASE & MODEL SELECTOR */}
          {currentVehicle && currentVehicleMeta && (
            <div className="relative rounded-3xl p-6 sm:p-8 border border-white/10 bg-[#0B1220]/90 shadow-2xl space-y-6 overflow-hidden backdrop-blur-xl">
              <div className="absolute -top-24 -right-24 w-80 h-80 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none" />

              <div className="flex flex-col lg:flex-row items-center gap-6">
                {/* Large Visual Car Photo Display */}
                <div className="relative w-full lg:w-1/2 h-56 sm:h-64 rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-slate-950 group">
                  <Image
                    key={activeCarImage}
                    src={activeCarImage}
                    alt={activeCarDisplayName}
                    fill
                    priority
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#060B13] via-[#060B13]/30 to-transparent" />

                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-lg">
                      Active Selection
                    </span>
                    <span className="bg-black/60 backdrop-blur-md text-cyan-300 text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/10">
                      {currentVehicleMeta.badge}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <div>
                      <p className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">
                        Chosen Vehicle Class
                      </p>
                      <h4 className="text-xl sm:text-2xl font-black text-white">
                        {currentVehicle.name}
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Current Choice:</span>
                      <span className="text-xs font-bold text-cyan-300">
                        {activeCarDisplayName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Detailing Specifications & Model Picker */}
                <div className="w-full lg:w-1/2 space-y-5">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span>Detailing Calibrations &amp; Specifications</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Chemistry and pressure equipment pre-calibrated for {currentVehicle.name}.
                    </p>
                  </div>

                  {/* 4 Detailing Specs */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-white/[0.03] border border-white/10 p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-medium">Surface Coverage</span>
                      <span className="text-xs font-bold text-white flex items-center gap-1.5 mt-0.5">
                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                        {currentVehicleMeta.surfaceArea}
                      </span>
                    </div>
                    <div className="bg-white/[0.03] border border-white/10 p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-medium">Snow Foam Volume</span>
                      <span className="text-xs font-bold text-white flex items-center gap-1.5 mt-0.5">
                        <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                        {currentVehicleMeta.foamCapacity}
                      </span>
                    </div>
                    <div className="bg-white/[0.03] border border-white/10 p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-medium">Est. Detailing Time</span>
                      <span className="text-xs font-bold text-white flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        {currentVehicleMeta.estDuration}
                      </span>
                    </div>
                    <div className="bg-white/[0.03] border border-white/10 p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-medium">Water TDS Quality</span>
                      <span className="text-xs font-bold text-white flex items-center gap-1.5 mt-0.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        TDS &lt; 50 No-Spots
                      </span>
                    </div>
                  </div>

                  {/* Model Selector Pills */}
                  <div className="space-y-2 pt-1">
                    <label className="text-xs font-bold text-white block">
                      Select Your Car Model (or type custom model):
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {currentVehicleMeta.popularModels.map((modelObj) => {
                        const isModelSelected = selectedCarModel === modelObj.name && !customCarModel;
                        return (
                          <button
                            key={modelObj.name}
                            type="button"
                            onClick={() => {
                              setSelectedCarModel(modelObj.name);
                              setCustomCarModel("");
                            }}
                            className={`group px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                              isModelSelected
                                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold ring-2 ring-cyan-400 shadow-md shadow-cyan-500/30 scale-[1.02]"
                                : "bg-white/[0.05] text-slate-300 border border-white/10 hover:border-cyan-500/30 hover:bg-white/[0.08] hover:text-white"
                            }`}
                          >
                            <div className="relative w-7 h-5 rounded overflow-hidden bg-slate-900 shrink-0 border border-white/10">
                              <Image
                                src={modelObj.image}
                                alt={modelObj.name}
                                fill
                                className="object-cover"
                                sizes="28px"
                              />
                            </div>
                            <span>{modelObj.name}</span>
                            {isModelSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Model Input */}
                    <div className="pt-2">
                      <input
                        type="text"
                        placeholder="Or enter custom model &amp; color (e.g. 2024 Black Safari Adventure)"
                        value={customCarModel}
                        onChange={(e) => setCustomCarModel(e.target.value)}
                        className="w-full bg-slate-900/90 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="button"
              disabled={!selectedVehicleId}
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider px-7 py-3.5 rounded-xl transition-all shadow-lg shadow-cyan-500/25"
            >
              <span>Next: Select Service</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SERVICE PACKAGE */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Selected Vehicle Sticky Banner */}
          {currentVehicle && currentVehicleMeta && (
            <div className="p-3 sm:p-4 rounded-2xl border border-cyan-500/30 bg-[#0B1220]/90 flex items-center justify-between gap-4 shadow-lg backdrop-blur-md">
              <div className="flex items-center gap-3.5">
                <div className="relative w-16 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-slate-900">
                  <Image
                    src={activeCarImage}
                    alt={activeCarDisplayName}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider block">
                    Selected Vehicle
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-white">
                    {currentVehicle.name} <span className="text-cyan-300 font-semibold">• {activeCarDisplayName}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline font-semibold shrink-0"
              >
                Change Car
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Choose Service Package</h2>
              <p className="text-xs text-slate-400">
                Displaying calibrated prices for <span className="text-cyan-400 font-semibold">{currentVehicle?.name}</span> ({activeCarDisplayName})
              </p>
            </div>
            <button
              onClick={() => setCurrentStep(1)}
              className="text-xs text-slate-400 hover:text-white underline font-medium"
            >
              Change Car
            </button>
          </div>

          <div className="space-y-4">
            {packages.map((pkg) => {
              const priceObj = selectedVehicleId
                ? pkg.prices.find((p) => p.vehicle_type === selectedVehicleId)
                : null;
              const isSelected = selectedPackageId === pkg.id;

              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPackageId(pkg.id)}
                  className={`p-5 rounded-2xl cursor-pointer transition-all border ${
                    isSelected
                      ? "border-cyan-400 bg-cyan-950/30 ring-2 ring-cyan-400/50 shadow-xl shadow-cyan-500/15"
                      : "border-white/10 hover:border-cyan-500/40 bg-[#0B1220]/80 hover:bg-[#0E172B] shadow-sm hover:shadow-lg"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white">{pkg.name}</h3>
                        {pkg.badge_text && (
                          <span className="text-[10px] uppercase font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                            {pkg.badge_text}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 max-w-xl">
                        {pkg.short_description}
                      </p>
                    </div>

                    <div className="flex items-center sm:flex-col sm:items-end justify-between shrink-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-cyan-400">
                          ₹{priceObj ? priceObj.effective_price : "—"}
                        </span>
                        {priceObj && priceObj.discounted_price && (
                          <span className="text-xs text-slate-500 line-through">
                            ₹{priceObj.base_price}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        {pkg.estimated_duration_minutes} mins
                      </span>
                    </div>
                  </div>

                  {/* Feature preview */}
                  <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
                    {pkg.features.slice(0, 3).map((f, idx) => (
                      <span key={idx} className="flex items-center gap-1.5 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                        {f}
                      </span>
                    ))}
                    {pkg.features.length > 3 && (
                      <span className="text-[11px] text-slate-500 font-medium">
                        +{pkg.features.length - 3} more perks
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white px-4 py-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              disabled={!selectedPackageId}
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider px-7 py-3.5 rounded-xl transition-all shadow-lg shadow-cyan-500/25"
            >
              <span>Next: Pick Date &amp; Slot</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: DATE & TIME SLOT */}
      {currentStep === 3 && (
        <div className="space-y-6">
          {/* Selected Vehicle Banner */}
          {currentVehicle && currentVehicleMeta && (
            <div className="p-3 sm:p-4 rounded-2xl border border-cyan-500/30 bg-[#0B1220]/90 flex items-center justify-between gap-4 shadow-lg backdrop-blur-md">
              <div className="flex items-center gap-3.5">
                <div className="relative w-16 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-slate-900">
                  <Image
                    src={activeCarImage}
                    alt={activeCarDisplayName}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider block">
                    Selected Vehicle &amp; Package
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-white">
                    {currentVehicle.name} ({activeCarDisplayName}) • <span className="text-cyan-300">{currentPackage?.name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline font-semibold shrink-0"
              >
                Change Car
              </button>
            </div>
          )}

          <div>
            <h2 className="text-xl font-bold text-white">Select Date &amp; Arrival Slot</h2>
            <p className="text-xs text-slate-400">
              Live capacity engine: slots are validated real-time against active technician schedules.
            </p>
          </div>

          {/* Date Picker & Service Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#0B1220]/80 p-4 rounded-2xl border border-white/10 shadow-sm space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Select Service Date
              </label>
              <input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-slate-900/90 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
              />
            </div>

            <div className="bg-[#0B1220]/80 p-4 rounded-2xl border border-white/10 shadow-sm space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Locality / Service Area
              </label>
              <select
                value={selectedAreaId || ""}
                onChange={(e) => setSelectedAreaId(parseInt(e.target.value, 10))}
                className="w-full bg-slate-900/90 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
              >
                {serviceAreas.map((area) => (
                  <option key={area.id} value={area.id} className="bg-slate-900 text-white">
                    {area.name} ({area.city})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Slots View */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Available Start Times for {selectedDate}
              </span>
              {loadingSlots && (
                <span className="text-xs text-cyan-400 flex items-center gap-1.5 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Calculating slot capacity...
                </span>
              )}
            </div>

            {slotError && (
              <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{slotError}</span>
              </div>
            )}

            {!loadingSlots && slots.length === 0 && !slotError && (
              <div className="bg-[#0B1220]/80 p-8 rounded-2xl text-center space-y-2 border border-white/10 shadow-sm">
                <CalendarIcon className="w-8 h-8 text-slate-500 mx-auto" />
                <h4 className="text-sm font-bold text-white">No Slots Available on this Date</h4>
                <p className="text-xs text-slate-400">
                  Please choose another date or contact our support team on WhatsApp.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {slots.map((slot) => {
                const isSelected = selectedSlotTime === slot.time;
                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => setSelectedSlotTime(slot.time)}
                    className={`p-3.5 rounded-xl text-left border transition-all ${
                      isSelected
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-400 text-white shadow-lg shadow-cyan-500/25 scale-[1.02]"
                        : slot.available
                        ? "bg-[#0B1220]/80 border-white/10 text-white hover:border-cyan-400/50 hover:bg-[#0E172B] hover:shadow-md"
                        : "bg-white/[0.02] border-white/5 text-slate-500 cursor-not-allowed opacity-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">{slot.label}</span>
                      {slot.available ? (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          isSelected ? "bg-white/20 text-white" : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        }`}>
                          Open
                        </span>
                      ) : (
                        <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-white/5 text-slate-500">
                          {slot.unavailable_reason || "Full"}
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] block mt-1 ${isSelected ? "text-cyan-100" : "text-slate-400"}`}>
                      Ends approx. {slot.end_label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white px-4 py-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              disabled={!selectedSlotTime}
              onClick={() => setCurrentStep(4)}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider px-7 py-3.5 rounded-xl transition-all shadow-lg shadow-cyan-500/25"
            >
              <span>Next: Customer Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: CUSTOMER DETAILS & ADDRESS */}
      {currentStep === 4 && (
        <div className="space-y-6">
          {/* Selected Vehicle Banner */}
          {currentVehicle && currentVehicleMeta && (
            <div className="p-3 sm:p-4 rounded-2xl border border-cyan-500/30 bg-[#0B1220]/90 flex items-center justify-between gap-4 shadow-lg backdrop-blur-md">
              <div className="flex items-center gap-3.5">
                <div className="relative w-16 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-slate-900">
                  <Image
                    src={activeCarImage}
                    alt={activeCarDisplayName}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider block">
                    Car &amp; Appointment Selected
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-white">
                    {currentVehicle.name} ({activeCarDisplayName}) • {selectedDate} @ {selectedSlotTime}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline font-semibold shrink-0"
              >
                Change Car
              </button>
            </div>
          )}

          <div>
            <h2 className="text-xl font-bold text-white">Doorstep Address &amp; Contact</h2>
            <p className="text-xs text-slate-400">
              Where should our detailing team arrive?
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikramaditya Rao"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full bg-slate-900/90 border border-white/15 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  10-Digit Mobile Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 7087811881"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full bg-slate-900/90 border border-white/15 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Email Address (Optional)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    className="w-full bg-slate-900/90 border border-white/15 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Locality / Neighborhood *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sector 17 / Phase 7 Mohali / MDC Panchkula"
                  value={formData.locality}
                  onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                  className="w-full bg-slate-900/90 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Complete Street / Apartment Address *
              </label>
              <textarea
                required
                rows={2}
                placeholder="e.g. House #242, Sector 8-C, Near Inner Market"
                value={formData.addressLine}
                onChange={(e) => setFormData({ ...formData, addressLine: e.target.value })}
                className="w-full bg-slate-900/90 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Landmark (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Near Gurudwara Sahib"
                  value={formData.landmark}
                  onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                  className="w-full bg-slate-900/90 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Postal Code (PIN)
                </label>
                <input
                  type="text"
                  placeholder="160017"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  className="w-full bg-slate-900/90 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Parking Instructions or Gate Code (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Park outside front driveway, water tap available near gate."
                value={formData.specialInstructions}
                onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
                className="w-full bg-slate-900/90 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white px-4 py-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              disabled={!formData.customerName || !formData.customerPhone || !formData.addressLine || !formData.locality}
              onClick={async () => {
                await handleCaptureLead();
                setCurrentStep(5);
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider px-7 py-3.5 rounded-xl transition-all shadow-lg shadow-cyan-500/25"
            >
              <span>Review Booking</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: REVIEW & CONFIRM */}
      {currentStep === 5 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">Review Appointment Summary</h2>
            <p className="text-xs text-slate-400">
              Please double check your details before confirming your car wash slot.
            </p>
          </div>

          {bookingError && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{bookingError}</span>
            </div>
          )}

          <div className="bg-[#0B1220]/90 p-6 rounded-2xl border border-white/10 shadow-xl space-y-6 backdrop-blur-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-white/10">
              <div className="p-4 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 flex items-center gap-4">
                {currentVehicleMeta && (
                  <div className="relative w-24 h-16 rounded-xl overflow-hidden shrink-0 border border-cyan-500/30 bg-slate-900 shadow-sm">
                    <Image
                      src={activeCarImage}
                      alt={activeCarDisplayName}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-cyan-400 block font-bold">
                    Vehicle Selected
                  </span>
                  <p className="text-sm font-bold text-white mt-0.5 truncate">
                    {currentVehicle?.name}
                  </p>
                  <p className="text-xs text-cyan-300 font-semibold truncate">
                    {activeCarDisplayName}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {currentVehicleMeta?.surfaceArea}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
                  Selected Service Package
                </span>
                <p className="text-base font-bold text-white mt-1">
                  {currentPackage?.name}
                </p>
                <p className="text-xs text-cyan-400 font-medium">
                  Est. Duration: {currentPackage?.estimated_duration_minutes} Minutes
                </p>
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
                  Date &amp; Time Slot
                </span>
                <p className="text-base font-bold text-white mt-1">
                  {selectedDate} @ {selectedSlotTime}
                </p>
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
                  Service Address
                </span>
                <p className="text-sm font-semibold text-white mt-1">
                  {formData.addressLine}, {formData.locality}
                </p>
                {formData.landmark && (
                  <p className="text-xs text-slate-400">Landmark: {formData.landmark}</p>
                )}
              </div>
            </div>

            {/* Price breakdown */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Base Package Rate ({currentVehicle?.name}):</span>
                <span className="font-semibold text-white">
                  ₹{currentPriceObj ? currentPriceObj.effective_price : "0.00"}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Doorstep Travel &amp; Soft Water Surcharge:</span>
                <span className="text-emerald-400 font-semibold">FREE</span>
              </div>
              <div className="pt-3 border-t border-white/10 flex justify-between items-baseline">
                <span className="text-sm font-bold text-white">Total Amount Due:</span>
                <span className="text-2xl font-black text-cyan-400">
                  ₹{currentPriceObj ? currentPriceObj.effective_price : "0.00"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 text-right">
                Payment mode: Pay after service completion via Cash or UPI.
              </p>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              disabled={submittingBooking}
              onClick={() => setCurrentStep(4)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white px-4 py-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              disabled={submittingBooking}
              onClick={handleBookingSubmit}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider px-8 py-4 rounded-xl transition-all shadow-xl shadow-cyan-500/30"
            >
              {submittingBooking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Locking Slot &amp; Confirming...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirm &amp; Book Appointment</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: CONFIRMATION SUCCESS SCREEN */}
      {currentStep === 6 && confirmedBooking && (
        <div className="bg-[#0B1220]/95 p-8 sm:p-12 rounded-3xl border border-emerald-500/30 text-center space-y-8 shadow-2xl relative backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
              Booking Request Received
            </span>
            <h2 className="text-3xl font-extrabold text-white">
              Appointment Successfully Confirmed!
            </h2>
            <p className="text-sm text-slate-400 max-w-lg mx-auto">
              Our detailing crew will arrive at your home on the scheduled date. A confirmation message has been logged for your records.
            </p>
          </div>

          {/* Reference Card */}
          <div className="bg-black/40 p-6 rounded-2xl border border-white/10 max-w-md mx-auto space-y-4 text-left shadow-lg">
            {/* Visual Vehicle Confirmation Header */}
            {currentVehicleMeta && (
              <div className="relative w-full h-36 rounded-xl overflow-hidden border border-white/10 bg-slate-900 shadow-inner">
                <Image
                  src={activeCarImage}
                  alt={confirmedBooking.vehicle_type_name}
                  fill
                  className="object-cover"
                  sizes="400px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between">
                  <div>
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-wider block">
                      Confirmed Detailing Unit
                    </span>
                    <p className="text-sm font-bold text-white">
                      {confirmedBooking.vehicle_type_name} • {activeCarDisplayName}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    Slot Locked
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <span className="text-xs text-slate-400">Booking Reference:</span>
              <span className="text-base font-black text-cyan-400 font-mono tracking-wider">
                {confirmedBooking.booking_reference}
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-semibold text-white">{confirmedBooking.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Vehicle &amp; Model:</span>
                <span className="font-semibold text-white">{confirmedBooking.vehicle_type_name} ({activeCarDisplayName})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Package:</span>
                <span className="font-semibold text-white">{confirmedBooking.service_package_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date &amp; Time:</span>
                <span className="font-semibold text-white">
                  {confirmedBooking.service_date} @ {confirmedBooking.slot_start_time}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Address:</span>
                <span className="font-semibold text-white text-right max-w-[200px] truncate">
                  {confirmedBooking.address_line}, {confirmedBooking.locality}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-white/10 text-sm font-bold text-white">
                <span>Amount Due:</span>
                <span className="text-emerald-400">₹{confirmedBooking.final_amount}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href={`/track?reference=${confirmedBooking.booking_reference}`}
              className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              <span>Track Booking Status</span>
            </Link>

            <a
              href={`https://wa.me/917087811881?text=Hi%2C%20I%20have%20booked%20car%20wash%20ref%20${confirmedBooking.booking_reference}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Contact on WhatsApp</span>
            </a>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
          <p className="text-sm text-gray-400">Loading booking flow...</p>
        </div>
      }
    >
      <BookingFlow />
    </Suspense>
  );
}
