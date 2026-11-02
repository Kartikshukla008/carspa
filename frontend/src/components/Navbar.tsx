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
  User,
  LogOut,
} from "lucide-react";
import CarSpaLogo from "./CarSpaLogo";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
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
    { href: "/", label: "Home" },
    { href: "/services", label: "Services" },
    { href: "/#how-it-works", label: "How It Works" },
    { href: "/#pricing", label: "Pricing" },
    { href: "/track", label: "Track", icon: ShieldCheck },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-premium ${
          scrolled
            ? "bg-[#060B13]/95 backdrop-blur-xl border-b border-white/10 shadow-2xl shadow-black/80"
            : "bg-[#060B13]/70 backdrop-blur-md border-b border-white/5"
        }`}
      >
        {/* Top Micro-Bar: Slogan & Locations */}
        <div className="bg-[#03060B] border-b border-white/5 text-[11px] py-1.5 px-4 sm:px-6 lg:px-8 hidden sm:block">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-slate-400">
            <div className="flex items-center gap-2 font-semibold tracking-wider uppercase text-[10px] text-cyan-400">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Cleaner Cars, Happier Journeys</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5 text-slate-300">
                <MapPin className="w-3 h-3 text-cyan-400" />
                <span>Chandigarh • Mohali • Panchkula</span>
              </span>
              <a
                href="tel:+917087811881"
                className="flex items-center gap-1.5 hover:text-white transition-colors font-medium text-slate-200"
              >
                <Phone className="w-3 h-3 text-cyan-400" />
                <span>+91 70878 11881</span>
              </a>
            </div>
          </div>
        </div>

        {/* Main Navbar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-18 items-center gap-2">
            {/* CARSPA Logo */}
            <Link href="/" className="flex items-center shrink-0">
              <CarSpaLogo size="md" theme="dark" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-0.5 xl:gap-1.5">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs xl:text-[13px] font-medium text-slate-300 hover:text-cyan-400 px-2.5 xl:px-3 py-2 rounded-lg hover:bg-white/5 transition-all duration-200 flex items-center gap-1.5"
                >
                  {link.icon && (
                    <link.icon className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Desktop CTAs */}
            <div className="hidden lg:flex items-center gap-2.5 shrink-0">
              {isAuthenticated ? (
                <div className="relative group">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition-all shadow-sm"
                  >
                    <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold">
                      {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <span className="max-w-[100px] truncate">{user?.full_name?.split(" ")[0] || "Account"}</span>
                  </Link>
                  <div className="absolute right-0 top-full mt-2 w-48 py-2 bg-[#0B1220] border border-white/10 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="px-3.5 py-1.5 border-b border-white/5">
                      <p className="text-[10px] text-slate-400 font-mono">ID: {user?.user_id}</p>
                      <p className="text-xs font-bold text-white truncate">{user?.full_name}</p>
                    </div>
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>My Dashboard</span>
                    </Link>
                    <button
                      onClick={() => logout()}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-rose-400 hover:bg-rose-500/10 text-left transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-cyan-400 px-3 py-2 rounded-xl hover:bg-white/5 transition-all"
                >
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Log In</span>
                </Link>
              )}

              <a
                href="https://wa.me/917087811881?text=Hi%20CARSPA%2C%20I%20would%20like%20to%20book%20a%20doorstep%20car%20wash."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 px-3 py-2 rounded-xl transition-all duration-200 shadow-sm"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp</span>
              </a>
              <Link
                href="/book"
                className="btn-primary text-xs xl:text-[13px] px-4 xl:px-5 py-2.5 rounded-xl shadow-lg shadow-sky-600/30 flex items-center gap-1.5 whitespace-nowrap"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Book a Wash →</span>
              </Link>
            </div>

            {/* Mobile: CTA + Hamburger */}
            <div className="flex lg:hidden items-center gap-2.5">
              <Link
                href="/book"
                className="btn-primary text-xs px-3.5 py-2 rounded-lg shadow-md"
              >
                Book Wash
              </Link>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
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
                      <X className="w-5 h-5 text-white" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Menu className="w-5 h-5 text-white" />
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
              className="fixed top-18 left-0 right-0 z-50 lg:hidden bg-[#0A101D]/95 backdrop-blur-2xl border-b border-white/10 shadow-2xl"
            >
              <div className="px-5 pt-4 pb-6 space-y-2">
                <div className="pb-3 mb-2 border-b border-white/10 flex items-center justify-between text-xs text-cyan-400 font-semibold">
                  <span className="uppercase tracking-wider text-[10px]">
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
                      className="flex items-center justify-between text-[15px] font-semibold text-slate-200 hover:text-cyan-400 py-3 px-3 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        {link.icon && (
                          <link.icon className="w-4 h-4 text-cyan-400" />
                        )}
                        {link.label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </Link>
                  </motion.div>
                ))}

                {/* Mobile Auth Button */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  {isAuthenticated ? (
                    <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white">{user?.full_name}</span>
                        <span className="font-mono text-[10px] text-cyan-400 font-bold">{user?.user_id}</span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Link
                          href="/dashboard"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex-1 py-2 text-center text-xs font-semibold text-white bg-cyan-500/20 border border-cyan-500/30 rounded-xl hover:bg-cyan-500/30 transition-colors"
                        >
                          Customer Dashboard
                        </Link>
                        <button
                          onClick={() => {
                            logout();
                            setMobileMenuOpen(false);
                          }}
                          className="px-3.5 py-2 text-xs font-semibold text-rose-400 bg-rose-500/10 rounded-xl hover:bg-rose-500/20 transition-colors"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href="/login"
                        onClick={() => setMobileMenuOpen(false)}
                        className="py-2.5 text-center text-xs font-bold text-slate-200 bg-white/[0.04] border border-white/10 rounded-xl hover:bg-white/[0.08]"
                      >
                        Log In
                      </Link>
                      <Link
                        href="/signup"
                        onClick={() => setMobileMenuOpen(false)}
                        className="py-2.5 text-center text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl shadow-md"
                      >
                        Sign Up
                      </Link>
                    </div>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.3 }}
                  className="pt-4 border-t border-white/10 flex flex-col gap-2.5"
                >
                  <a
                    href="https://wa.me/917087811881"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-sm text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 py-3 rounded-xl font-semibold shadow-sm"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    Chat on WhatsApp
                  </a>
                  <Link
                    href="/book"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2 font-bold"
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
