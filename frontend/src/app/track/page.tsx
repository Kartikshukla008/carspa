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
  FileText,
  CreditCard,
  Printer,
  Download,
} from "lucide-react";
import { api } from "@/lib/api";
import { launchRazorpayCheckout } from "@/lib/razorpay";
import { BookingResponse } from "@/types";
import { BookingInvoiceModal } from "@/components/BookingInvoiceModal";

function TrackFlow() {
  const searchParams = useSearchParams();
  const initialRef = searchParams.get("reference") || "";

  const [reference, setReference] = useState(initialRef);
  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payingOnline, setPayingOnline] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const handlePayOnline = async () => {
    if (!booking) return;
    setPayingOnline(true);
    setPaymentMessage(null);
    try {
      const orderData = await api.createRazorpayOrder(booking.booking_reference);
      await launchRazorpayCheckout({
        orderData,
        onSuccess: (verifiedBooking) => {
          setBooking(verifiedBooking);
          setPayingOnline(false);
          setPaymentMessage({ type: "success", text: "Payment verified successfully via Razorpay!" });
        },
        onFailure: (err) => {
          setPayingOnline(false);
          const msg = typeof err === "string" ? err : err?.description || "Payment attempt failed or was cancelled. Please try again.";
          setPaymentMessage({ type: "error", text: msg });
        },
        onDismiss: () => {
          setPayingOnline(false);
        },
      });
    } catch (err: any) {
      setPayingOnline(false);
      setPaymentMessage({ type: "error", text: err.message || "Failed to initialize Razorpay checkout." });
    }
  };

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
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-bold transition-all shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Invoice / Receipt</span>
                </button>
                <div
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider ${getStatusColor(
                    booking.status
                  )}`}
                >
                  <span className="w-2 h-2 rounded-full bg-current animate-ping" />
                  <span>{booking.status_display}</span>
                </div>
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

              {/* Selected Add-ons Display */}
              {booking.selected_addons && booking.selected_addons.length > 0 && (
                <div className="sm:col-span-2 space-y-2 pt-2 border-t border-white/10">
                  <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">
                    Precision Add-On Treatments ({booking.selected_addons.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {booking.selected_addons.map((addon: any, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-semibold"
                      >
                        <span>+ {addon.name}</span>
                        <span className="text-white font-bold">₹{addon.price}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Pricing & settlement info */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              {paymentMessage && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    paymentMessage.type === "success"
                      ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                      : "bg-red-950/40 border-red-500/30 text-red-300"
                  }`}
                >
                  {paymentMessage.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span>{paymentMessage.text}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.03] p-4 rounded-xl border border-white/10">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 block font-semibold uppercase tracking-wider">
                    Payment Status
                  </span>
                  <div className="flex items-center gap-2">
                    {booking.payment_status === "PAID" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Paid via Razorpay</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Payment Pending ({booking.payment_method_display || "Pay on Arrival"})</span>
                      </span>
                    )}
                  </div>
                  {booking.payment_details?.payment_id && (
                    <p className="text-[11px] text-slate-400 pt-0.5">
                      Razorpay ID: <span className="font-mono text-cyan-300">{booking.payment_details.payment_id}</span>
                    </p>
                  )}
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[11px] text-slate-400 block">Total Amount</span>
                  <p className="text-2xl font-black text-cyan-400">₹{booking.final_amount}</p>
                </div>
              </div>

              {/* Pay Online CTA if pending */}
              {booking.payment_status !== "PAID" && booking.status !== "CANCELLED" && (
                <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-cyan-400" />
                      <span>Settle Payment Online</span>
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Pay instantly via Google Pay, PhonePe, Paytm, UPI QR, or Debit/Credit Card.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={payingOnline}
                    onClick={handlePayOnline}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-md shadow-cyan-500/20 shrink-0 flex items-center justify-center gap-2"
                  >
                    {payingOnline ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Launching...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pay ₹{booking.final_amount} via Razorpay</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowInvoiceModal(true)}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/25"
              >
                <Printer className="w-4 h-4" />
                <span>Download / Print Invoice (PDF)</span>
              </button>
              <a
                href={`https://wa.me/917087811881?text=Hi%2C%20I%20am%20checking%20status%20for%20my%20booking%20ref%20${booking.booking_reference}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Contact on WhatsApp</span>
              </a>
              <Link
                href="/book"
                className="bg-white/[0.05] hover:bg-white/[0.09] text-white border border-white/10 font-semibold text-xs py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <span>Book Again</span>
              </Link>
            </div>
          </div>
        )}

        {/* Tax Invoice & Printable Receipt Modal */}
        {booking && (
          <BookingInvoiceModal
            booking={booking}
            isOpen={showInvoiceModal}
            onClose={() => setShowInvoiceModal(false)}
          />
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
