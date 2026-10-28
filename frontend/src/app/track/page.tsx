"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  CheckCircle2,
  Clock,
  Car,
  MapPin,
  Calendar,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Phone,
  MessageSquare,
  FileText
} from "lucide-react";
import { api } from "@/lib/api";
import { BookingResponse } from "@/types";

function TrackFlow() {
  const searchParams = useSearchParams();
  const initialRef = searchParams.get("reference") || "";

  const [reference, setReference] = useState(initialRef);
  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async (refToSearch?: string) => {
    const target = refToSearch || reference;
    if (!target.trim()) return;

    setLoading(true);
    setError(null);
    setBooking(null);

    try {
      const data = await api.lookupBooking(target.trim());
      setBooking(data);
    } catch (err: any) {
      setError(err.message || "No booking found with this reference.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialRef) {
      handleLookup(initialRef);
    }
  }, [initialRef]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED":
      case "ASSIGNED":
        return "text-cyan-300 bg-cyan-950/40 border-cyan-500/30";
      case "IN_PROGRESS":
        return "text-blue-300 bg-blue-950/40 border-blue-500/30";
      case "COMPLETED":
        return "text-emerald-300 bg-emerald-950/40 border-emerald-500/30";
      case "CANCELLED":
      case "REJECTED":
        return "text-red-300 bg-red-950/40 border-red-500/30";
      default:
        return "text-amber-300 bg-amber-950/40 border-amber-500/30";
    }
  };

  return (
    <div className="relative min-h-screen py-12 lg:py-20 overflow-hidden bg-[#060B13] text-slate-100">
      {/* Background Atmosphere */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-cyan-500/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 relative z-10">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
            Live Status Tracker
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Track Your Car Wash Appointment
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Enter your unique booking reference (e.g. <span className="font-mono text-cyan-300 font-bold">CW-DEMO-001</span>)
          </p>
        </div>

        {/* Search Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLookup();
          }}
          className="bg-[#0B1220]/90 p-2 rounded-2xl flex items-center border border-white/10 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/20 shadow-xl backdrop-blur-xl transition-all"
        >
          <div className="pl-3 pr-2 text-slate-400">
            <Search className="w-5 h-5 text-cyan-400" />
          </div>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. CW-20261027-XXXX"
            className="w-full bg-transparent text-sm text-white focus:outline-none placeholder:text-slate-500 uppercase font-mono tracking-wider"
          />
          <button
            type="submit"
            disabled={loading || !reference.trim()}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all shrink-0 flex items-center gap-1.5 shadow-lg shadow-cyan-500/25"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Track"}
          </button>
        </form>

        {/* Error state */}
        {error && (
          <div className="bg-red-950/40 p-6 rounded-2xl border border-red-500/30 text-center space-y-2">
            <AlertCircle className="w-6 h-6 text-red-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">Booking Not Found</h4>
            <p className="text-xs text-slate-400">{error}</p>
          </div>
        )}

        {/* Booking Details Result */}
        {booking && (
          <div className="bg-[#0B1220]/90 p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-white/10 gap-4">
              <div>
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Booking Reference
                </span>
                <h2 className="text-2xl font-black text-cyan-400 font-mono">
                  {booking.booking_reference}
                </h2>
              </div>
              <div
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider self-start sm:self-auto ${getStatusColor(
                  booking.status
                )}`}
              >
                <span className="w-2 h-2 rounded-full bg-current animate-ping" />
                <span>{booking.status_display}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">
                  Customer Name
                </span>
                <p className="text-sm font-bold text-white">{booking.customer_name}</p>
                <p className="text-slate-400">{booking.customer_phone}</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">
                  Car Segment &amp; Service
                </span>
                <p className="text-sm font-bold text-white">
                  {booking.service_package_name}
                </p>
                <p className="text-cyan-400 font-medium">{booking.vehicle_type_name}</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">
                  Date &amp; Time Window
                </span>
                <p className="text-sm font-bold text-white">
                  {booking.service_date} @ {booking.slot_start_time}
                </p>
                <p className="text-slate-400">
                  Duration: {booking.estimated_duration_minutes} Minutes
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">
                  Assigned Technician
                </span>
                <p className="text-sm font-bold text-white">
                  {booking.assigned_staff_name ? (
                    <span className="text-emerald-400">{booking.assigned_staff_name}</span>
                  ) : (
                    <span className="text-slate-500 italic">Assigning nearest van...</span>
                  )}
                </p>
              </div>

              <div className="sm:col-span-2 space-y-1 pt-2 border-t border-white/10">
                <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">
                  Service Location
                </span>
                <p className="text-sm text-slate-300">
                  {booking.address_line}, {booking.locality}
                </p>
                {booking.landmark && (
                  <p className="text-xs text-slate-500">Landmark: {booking.landmark}</p>
                )}
              </div>
            </div>

            {/* Pricing & settlement info */}
            <div className="pt-4 border-t border-white/10 flex justify-between items-center bg-white/[0.03] p-4 rounded-xl border border-white/10">
              <div>
                <span className="text-[11px] text-slate-400">Payment Status:</span>
                <p className="text-xs font-semibold text-white">
                  {booking.payment_method_display} ({booking.payment_status})
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400">Total Amount:</span>
                <p className="text-xl font-black text-cyan-400">₹{booking.final_amount}</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href={`https://wa.me/917087811881?text=Hi%2C%20I%20am%20checking%20status%20for%20my%20booking%20ref%20${booking.booking_reference}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Contact Dispatcher on WhatsApp</span>
              </a>
              <Link
                href="/book"
                className="flex-1 bg-white/[0.05] hover:bg-white/[0.09] text-white border border-white/10 font-semibold text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <span>Book Another Wash</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
          <p className="text-sm text-gray-400">Loading tracker...</p>
        </div>
      }
    >
      <TrackFlow />
    </Suspense>
  );
}
