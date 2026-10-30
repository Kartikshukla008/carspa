"use client";

import React, { useRef } from "react";
import { Printer, Download, X, CheckCircle2, Clock, ShieldCheck, Car, MapPin, Phone, Mail, FileText } from "lucide-react";
import { BookingResponse } from "@/types";

interface BookingInvoiceModalProps {
  booking: BookingResponse;
  isOpen: boolean;
  onClose: () => void;
}

export function BookingInvoiceModal({ booking, isOpen, onClose }: BookingInvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const invoiceNumber = `INV-${booking.booking_reference.replace(/^CW-/, "")}`;
  const issueDate = new Date(booking.created_at || Date.now()).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const basePrice = Number(booking.price_snapshot || 0);
  const addons = booking.selected_addons || [];
  const taxAmount = Number(booking.tax_amount || 0);
  const finalAmount = Number(booking.final_amount || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Container */}
      <div className="relative w-full max-w-3xl bg-[#0B1220] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#060B13]/80 shrink-0 no-print">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Tax Invoice &amp; Service Receipt</h3>
              <p className="text-[11px] text-slate-400">Ref: {booking.booking_reference}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-500/20 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Sheet Container */}
        <div className="overflow-y-auto p-4 sm:p-8 bg-slate-900/50">
          {/* Printable Invoice Page (White background paper style) */}
          <div
            ref={printRef}
            id="printable-invoice"
            className="printable-invoice-container bg-white text-slate-900 p-6 sm:p-10 rounded-xl shadow-lg border border-slate-200 text-xs font-sans max-w-2xl mx-auto"
          >
            {/* Header / Brand */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-slate-900 pb-6 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-950 text-cyan-400 font-black text-sm flex items-center justify-center">
                    CS
                  </div>
                  <span className="text-xl font-black tracking-tight text-slate-950 font-sans">
                    CARSPA
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-600 mt-1 uppercase tracking-wider">
                  Doorstep Detailing &amp; Steam Wash
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Tricity (Chandigarh • Mohali • Panchkula) &amp; Bengaluru Operations
                </p>
                <p className="text-[10px] text-slate-500">
                  Email: care@carspa.in • Phone/WhatsApp: +91 70878 11881
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="inline-block px-2.5 py-1 rounded bg-slate-100 text-slate-900 font-extrabold uppercase text-[11px] tracking-widest border border-slate-300">
                  Tax Invoice / Receipt
                </span>
                <p className="font-mono font-black text-sm text-slate-900 mt-2">
                  #{invoiceNumber}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  <span className="font-semibold text-slate-700">Issue Date:</span> {issueDate}
                </p>
                <p className="text-[10px] text-slate-500">
                  <span className="font-semibold text-slate-700">Booking Ref:</span> {booking.booking_reference}
                </p>
              </div>
            </div>

            {/* Billed To & Service Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-5 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Customer / Service Location
                </span>
                <p className="font-bold text-slate-900 text-sm">{booking.customer_name}</p>
                <p className="text-slate-600 mt-0.5">{booking.customer_phone}</p>
                {booking.customer_email && (
                  <p className="text-slate-600">{booking.customer_email}</p>
                )}
                <p className="text-slate-700 mt-1.5 leading-relaxed">
                  {booking.address_line}, {booking.locality}
                  {booking.landmark && ` (Near ${booking.landmark})`}
                  {booking.pincode && ` - ${booking.pincode}`}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Appointment &amp; Detailing Unit
                </span>
                <p className="font-bold text-slate-900 text-sm">
                  {booking.vehicle_type_name}
                </p>
                <p className="text-slate-700 font-semibold mt-0.5">
                  Package: {booking.service_package_name}
                </p>
                <p className="text-slate-600 mt-1">
                  <span className="font-semibold text-slate-700">Scheduled Date:</span> {booking.service_date}
                </p>
                <p className="text-slate-600">
                  <span className="font-semibold text-slate-700">Slot Window:</span> {booking.slot_start_time} - {booking.slot_end_time}
                </p>
                <p className="text-slate-600">
                  <span className="font-semibold text-slate-700">Assigned Crew:</span>{" "}
                  {booking.assigned_staff_name || "CARSPA Certified Mobile Detailing Van"}
                </p>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="py-5 border-b border-slate-200">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                Itemized Detailing Services
              </span>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-300 text-[10px] font-black uppercase text-slate-600 tracking-wider">
                    <th className="py-2">Item Description</th>
                    <th className="py-2 text-center">Duration</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="py-2.5">
                      <span className="font-bold text-slate-900 block">{booking.service_package_name}</span>
                      <span className="text-[10px] text-slate-500">
                        Doorstep detailing treatment for {booking.vehicle_type_name}
                      </span>
                    </td>
                    <td className="py-2.5 text-center text-[11px] text-slate-500">
                      {booking.estimated_duration_minutes}m
                    </td>
                    <td className="py-2.5 text-right font-semibold">1</td>
                    <td className="py-2.5 text-right font-bold text-slate-900">
                      ₹{basePrice.toFixed(2)}
                    </td>
                  </tr>

                  {addons.map((addon: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2">
                        <span className="font-semibold text-slate-900 block">+ {addon.name}</span>
                        <span className="text-[10px] text-slate-500">Studio add-on treatment</span>
                      </td>
                      <td className="py-2 text-center text-[11px] text-slate-500">—</td>
                      <td className="py-2 text-right font-semibold">1</td>
                      <td className="py-2 text-right font-bold text-slate-900">
                        ₹{Number(addon.price).toFixed(2)}
                      </td>
                    </tr>
                  ))}

                  <tr>
                    <td className="py-2 text-slate-600">
                      Doorstep Mobile Van Dispatch &amp; Soft Water Surcharge
                    </td>
                    <td className="py-2 text-center text-[10px] text-slate-500">—</td>
                    <td className="py-2 text-right font-semibold">1</td>
                    <td className="py-2 text-right font-bold text-emerald-600">FREE</td>
                  </tr>
                </tbody>
              </table>

              {/* Totals */}
              <div className="pt-4 flex justify-end">
                <div className="w-full sm:w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-900">
                      ₹{(finalAmount - taxAmount).toFixed(2)}
                    </span>
                  </div>

                  {taxAmount > 0 ? (
                    <div className="flex justify-between text-slate-600">
                      <span>GST (18% Included):</span>
                      <span className="font-semibold text-slate-900">₹{taxAmount.toFixed(2)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Applicable Taxes:</span>
                      <span>Included</span>
                    </div>
                  )}

                  <div className="pt-2 border-t-2 border-slate-900 flex justify-between items-baseline font-black">
                    <span className="text-sm text-slate-900">Total Amount:</span>
                    <span className="text-base text-slate-950 font-mono">
                      ₹{finalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment & Settlement Block */}
            <div className="py-5 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center border-b border-slate-200">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Payment Verification
                </span>
                <p className="text-slate-800">
                  <span className="font-semibold">Payment Mode:</span>{" "}
                  {booking.payment_method_display ||
                    (booking.payment_method === "RAZORPAY"
                      ? "Razorpay Online (UPI/Cards)"
                      : "Pay on Completion (Cash/UPI)")}
                </p>
                {booking.payment_details?.payment_id && (
                  <p className="text-[10px] text-slate-600 font-mono">
                    Transaction ID: {booking.payment_details.payment_id}
                  </p>
                )}
                <p className="text-[10px] text-slate-500">
                  Status: {booking.status_display} ({booking.status})
                </p>
              </div>

              {/* Stamp Badge */}
              <div className="sm:text-right">
                {booking.payment_status === "PAID" ? (
                  <div className="inline-block border-2 border-emerald-600 text-emerald-700 px-4 py-2 rounded-lg font-black uppercase tracking-wider text-xs rotate-[-2deg] bg-emerald-50">
                    ✓ PAID &amp; SETTLED
                  </div>
                ) : (
                  <div className="inline-block border-2 border-amber-600 text-amber-700 px-4 py-2 rounded-lg font-black uppercase tracking-wider text-xs bg-amber-50">
                    PAYMENT DUE ON ARRIVAL
                  </div>
                )}
              </div>
            </div>

            {/* Footer / Legal Notes */}
            <div className="pt-5 space-y-2 text-[10px] text-slate-500 leading-normal">
              <p>
                <strong>Terms &amp; Notes:</strong> All doorstep services are executed using high-pressure soft-water foam wash equipment and pH-neutral detailing chemistry. We guarantee 100% surface scratch-free care.
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-slate-400">
                <span>Computer-generated service invoice. No physical signature required.</span>
                <span className="font-semibold text-slate-600">CARSPA Customer Care: +91 70878 11881</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar (Hidden in print) */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-white/10 bg-[#060B13]/80 shrink-0 text-xs text-slate-400 no-print">
          <span>Tip: Select &quot;Save as PDF&quot; in the print dialog to export a PDF document.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
