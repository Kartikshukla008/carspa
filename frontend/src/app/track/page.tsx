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
        return "text-sky-700 bg-sky-50 border-sky-200";
      case "IN_PROGRESS":
        return "text-indigo-700 bg-indigo-50 border-indigo-200";
      case "COMPLETED":
        return "text-emerald-700 bg-emerald-50 border-emerald-200";
      case "CANCELLED":
      case "REJECTED":
        return "text-red-700 bg-red-50 border-red-200";
      default:
        return "text-amber-700 bg-amber-50 border-amber-200";
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 space-y-10">
      <div className="text-center space-y-2">
        <span className="text-xs font-bold text-sky-600 uppercase tracking-widest">
          Live Status Tracker
        </span>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Track Your Car Wash Appointment
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Enter your unique booking reference (e.g. <span className="font-mono text-slate-800 font-bold">CW-DEMO-001</span>)
        </p>
      </div>

      {/* Search Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleLookup();
        }}
        className="bg-white p-2 rounded-2xl flex items-center border border-slate-300 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 shadow-sm transition-all"
      >
        <div className="pl-3 pr-2 text-slate-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="e.g. CW-20261027-XXXX"
          className="w-full bg-transparent text-sm text-slate-900 focus:outline-none placeholder:text-slate-400 uppercase font-mono tracking-wider"
        />
        <button
          type="submit"
          disabled={loading || !reference.trim()}
          className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all shrink-0 flex items-center gap-1.5 shadow-md shadow-sky-600/20"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Track"}
        </button>
      </form>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 p-6 rounded-2xl border border-red-200 text-center space-y-2">
          <AlertCircle className="w-6 h-6 text-red-500 mx-auto" />
          <h4 className="text-sm font-bold text-slate-900">Booking Not Found</h4>
          <p className="text-xs text-slate-600">{error}</p>
        </div>
      )}

      {/* Booking Details Result */}
      {booking && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
            <div>
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                Booking Reference
              </span>
              <h2 className="text-2xl font-black text-slate-900 font-mono">
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
              <span className="text-slate-500 block font-semibold uppercase tracking-wider text-[10px]">
                Customer Name
              </span>
              <p className="text-sm font-bold text-slate-900">{booking.customer_name}</p>
              <p className="text-slate-600">{booking.customer_phone}</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 block font-semibold uppercase tracking-wider text-[10px]">
                Car Segment &amp; Service
              </span>
              <p className="text-sm font-bold text-slate-900">
                {booking.service_package_name}
              </p>
              <p className="text-sky-600 font-medium">{booking.vehicle_type_name}</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 block font-semibold uppercase tracking-wider text-[10px]">
                Date &amp; Time Window
              </span>
              <p className="text-sm font-bold text-slate-900">
                {booking.service_date} @ {booking.slot_start_time}
              </p>
              <p className="text-slate-500">
                Duration: {booking.estimated_duration_minutes} Minutes
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 block font-semibold uppercase tracking-wider text-[10px]">
                Assigned Technician
              </span>
              <p className="text-sm font-bold text-slate-900">
                {booking.assigned_staff_name ? (
                  <span className="text-emerald-600">{booking.assigned_staff_name}</span>
                ) : (
                  <span className="text-slate-400 italic">Assigning nearest van...</span>
                )}
              </p>
            </div>

            <div className="sm:col-span-2 space-y-1 pt-2 border-t border-slate-100">
              <span className="text-slate-500 block font-semibold uppercase tracking-wider text-[10px]">
                Service Location
              </span>
              <p className="text-sm text-slate-700">
                {booking.address_line}, {booking.locality}
              </p>
              {booking.landmark && (
                <p className="text-xs text-slate-500">Landmark: {booking.landmark}</p>
              )}
            </div>
          </div>

          {/* Pricing & settlement info */}
          <div className="pt-4 border-t border-slate-100 flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-[11px] text-slate-500">Payment Status:</span>
              <p className="text-xs font-semibold text-slate-900">
                {booking.payment_method_display} ({booking.payment_status})
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500">Total Amount:</span>
              <p className="text-xl font-black text-sky-600">₹{booking.final_amount}</p>
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
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-semibold text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <span>Book Another Wash</span>
            </Link>
          </div>
        </div>
      )}
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
