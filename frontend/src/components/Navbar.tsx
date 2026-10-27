"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  MessageSquare,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
  Phone,
  MapPin,
  Sparkles,
} from "lucide-react";
import CarSpaLogo from "./CarSpaLogo";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { href: "/services", label: "Our Services" },
    { href: "/#how-it-works", label: "How It Works" },
    { href: "/track", label: "Track Booking", icon: ShieldCheck },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-premium ${
          scrolled
            ? "bg-[#07111F]/90 backdrop-blur-xl border-b border-white/[0.08] shadow-2xl shadow-black/30"
            : "bg-[#07111F]/60 backdrop-blur-md border-b border-white/[0.04]"
        }`}
      >
        {/* Top Micro-Bar: Slogan & Locations */}
        <div className="bg-[#050B14]/90 border-b border-white/[0.04] text-[11px] py-1 px-4 sm:px-6 lg:px-8 hidden sm:block">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-slate-400">
            <div className="flex items-center gap-2 font-semibold tracking-wider uppercase text-[10px] text-sky-400">
              <Sparkles className="w-3 h-3 text-[#0099FF]" />
              <span>Cleaner Cars, Happier Journeys</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5 hover:text-slate-300 transition-colors">
                <MapPin className="w-3 h-3 text-[#0099FF]" />
                <span>Chandigarh • Mohali • Panchkula</span>
              </span>
              <a
                href="tel:+917087811881"
                className="flex items-center gap-1.5 hover:text-white transition-colors font-medium"
              >
                <Phone className="w-3 h-3 text-[#0099FF]" />
                <span>+91 70878 11881</span>
              </a>
            </div>
          </div>
        </div>

        {/* Main Navbar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-18 items-center">
            {/* CARSPA Logo */}
            <Link href="/" className="flex items-center">
              <CarSpaLogo size="md" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[13px] font-medium text-slate-300 hover:text-white px-3.5 py-2 rounded-lg hover:bg-white/[0.05] transition-all duration-200 flex items-center gap-1.5"
                >
                  {link.icon && (
                    <link.icon className="w-3.5 h-3.5 text-[#0099FF]" />
                  )}
                  {link.label}
                </Link>
              ))}
              <Link
                href="/admin-portal"
                className="text-[11px] uppercase font-semibold text-slate-400 hover:text-sky-400 px-2.5 py-1.5 rounded-md border border-slate-800 hover:border-sky-500/40 bg-slate-900/60 transition-all duration-200 ml-1"
              >
                Admin Portal
              </Link>
            </div>

            {/* Desktop CTAs */}
            <div className="hidden lg:flex items-center gap-3">
              <a
                href="https://wa.me/917087811881?text=Hi%20CARSPA%2C%20I%20would%20like%20to%20book%20a%20doorstep%20car%20wash."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-950/60 border border-emerald-800/80 px-3.5 py-2 rounded-xl transition-all duration-200"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat on WhatsApp</span>
              </a>
              <Link
                href="/book"
                className="btn-primary text-[13px] px-5 py-2.5 rounded-xl shadow-lg shadow-sky-600/30 flex items-center gap-2"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Book a Car Wash →</span>
              </Link>
            </div>

            {/* Mobile: CTA + Hamburger */}
            <div className="flex lg:hidden items-center gap-2.5">
              <Link
                href="/book"
                className="btn-primary text-xs px-3.5 py-2 rounded-lg"
              >
                Book Wash
              </Link>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/[0.04] transition-colors"
                aria-label="Toggle Menu"
                aria-expanded={mobileMenuOpen}
              >
                <AnimatePresence mode="wait">
                  {mobileMenuOpen ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <X className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Menu className="w-5 h-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-18 left-0 right-0 z-50 lg:hidden bg-[#07111F]/98 backdrop-blur-2xl border-b border-white/[0.08] shadow-2xl shadow-black/50"
            >
              <div className="px-5 pt-4 pb-6 space-y-2">
                <div className="pb-3 mb-2 border-b border-white/[0.06] flex items-center justify-between text-xs text-sky-400">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">
                    Cleaner Cars, Happier Journeys
                  </span>
                  <span className="text-slate-400 text-[10px]">Chandigarh • Mohali • Panchkula</span>
                </div>

                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i, duration: 0.3 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between text-[15px] font-medium text-slate-200 hover:text-white py-3 px-3 rounded-xl hover:bg-white/[0.04] transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        {link.icon && (
                          <link.icon className="w-4 h-4 text-[#0099FF]" />
                        )}
                        {link.label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </Link>
                  </motion.div>
                ))}

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15, duration: 0.3 }}
                >
                  <Link
                    href="/admin-portal"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between text-[15px] font-medium text-sky-400 py-3 px-3 rounded-xl hover:bg-white/[0.04] transition-colors"
                  >
                    <span>Admin Dashboard</span>
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.3 }}
                  className="pt-4 border-t border-white/[0.06] flex flex-col gap-2.5"
                >
                  <a
                    href="https://wa.me/917087811881"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-sm text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 py-3 rounded-xl font-medium"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Chat on WhatsApp
                  </a>
                  <Link
                    href="/book"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Book Car Wash Now →
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Spacer for fixed navbar */}
      <div className="h-18 sm:h-24" />
    </>
  );
}
