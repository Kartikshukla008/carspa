"use client";

import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Clock,
  ChevronRight,
  Calendar,
  Globe,
} from "lucide-react";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/ui/motion";
import CarSpaLogo from "./CarSpaLogo";

export default function Footer() {
  return (
    <footer className="relative bg-[#050B14] border-t border-white/[0.06] text-slate-400 pt-16 pb-8 overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-dot-pattern opacity-25 pointer-events-none" />

      <div className="container-premium relative z-10">
        {/* Pre-footer CTA */}
        <FadeUp className="mb-14">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0099FF]/15 via-[#07111F] to-[#0EA5E9]/10 border border-[#0099FF]/20 p-8 sm:p-12 shadow-2xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#0099FF]/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center lg:text-left">
                <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
                  Cleaner Cars, Happier Journeys
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Ready for a spotless car at your doorstep?
                </h3>
                <p className="text-sm text-slate-400 max-w-md">
                  Book your car wash in just a few simple steps. Serving Chandigarh, Mohali, and Panchkula.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Link href="/book" className="btn-primary px-8 py-3.5 text-sm whitespace-nowrap flex items-center justify-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Book a Car Wash →
                </Link>
                <a
                  href="https://wa.me/917087811881"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary px-6 py-3.5 text-sm whitespace-nowrap text-emerald-400 border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-950/40 hover:bg-emerald-950/60 flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Chat on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* Footer columns */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-14">
          {/* Brand */}
          <StaggerItem className="space-y-4">
            <CarSpaLogo size="lg" theme="dark" />
            <p className="text-sm leading-relaxed text-slate-400 pt-2">
              Professional car washing and detailing at your home or office. Purified soft water, pH-neutral snow foam, and zero scratches guaranteed.
            </p>
            <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 p-2.5 rounded-lg w-fit">
              <ShieldCheck className="w-4 h-4" />
              <span className="font-medium">100% Zero-Scratch Doorstep Guarantee</span>
            </div>
          </StaggerItem>

          {/* Services */}
          <StaggerItem>
            <h4 className="text-white text-xs font-bold tracking-[0.15em] uppercase mb-5">
              Our Services
            </h4>
            <ul className="space-y-3 text-sm">
              {[
                { name: "Basic Wash (From ₹399)", href: "/services" },
                { name: "Interior Cleaning (From ₹599)", href: "/services" },
                { name: "Premium Wash (From ₹899)", href: "/services" },
                { name: "Full Detailing (From ₹1,499)", href: "/services" },
              ].map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-1.5 hover:text-white transition-colors group"
                  >
                    <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-sky-400 transition-colors" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </StaggerItem>

          {/* Coverage: Chandigarh | Mohali | Panchkula */}
          <StaggerItem>
            <h4 className="text-white text-xs font-bold tracking-[0.15em] uppercase mb-5">
              Service Areas
            </h4>
            <ul className="space-y-3 text-sm">
              {[
                "Chandigarh (All Sectors)",
                "Mohali (Phase 1–11, Sectors)",
                "Panchkula (Sectors & MDC)",
                "Zirakpur & Peer Muchalla",
                "New Chandigarh & Kharar",
              ].map((area) => (
                <li key={area} className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#0099FF] shrink-0" />
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </StaggerItem>

          {/* Contact Details */}
          <StaggerItem>
            <h4 className="text-white text-xs font-bold tracking-[0.15em] uppercase mb-5">
              Contact Us
            </h4>
            <ul className="space-y-3.5 text-sm">
              <li className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                  <Phone className="w-3.5 h-3.5 text-[#0099FF]" />
                </div>
                <a href="tel:+917087811881" className="hover:text-white transition-colors">
                  +91 70878 11881
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                  <Mail className="w-3.5 h-3.5 text-[#0099FF]" />
                </div>
                <a href="mailto:care@carspa.in" className="hover:text-white transition-colors">
                  care@carspa.in
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                  <Globe className="w-3.5 h-3.5 text-[#0099FF]" />
                </div>
                <a href="https://www.carspa.in" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  www.carspa.in
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/[0.08] flex items-center justify-center shrink-0">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <a
                  href="https://wa.me/917087811881"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-300 text-emerald-400 font-medium transition-colors"
                >
                  WhatsApp Support
                </a>
              </li>
            </ul>
          </StaggerItem>
        </StaggerContainer>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} CARSPA. Cleaner Cars, Happier Journeys. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-slate-400">
              <MapPin className="w-3 h-3 text-[#0099FF]" />
              Chandigarh • Mohali • Panchkula
            </span>
            <Link href="/track" className="hover:text-slate-300 transition-colors">
              Track Appointment
            </Link>
            <Link href="/admin-portal" className="hover:text-slate-300 transition-colors">
              Admin Portal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
