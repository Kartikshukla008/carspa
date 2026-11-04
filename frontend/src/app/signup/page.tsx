"use client";

import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";

  const { register, isAuthenticated, isLoading: authLoading } = useAuth();

  // If already authenticated, redirect to home page immediately
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      window.location.href = "/";
    }
  }, [authLoading, isAuthenticated]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validations
    const nameClean = fullName.trim();
    if (nameClean.length < 2) {
      setError("Please enter your full name.");
      return;
    }

    const emailClean = email.trim().toLowerCase();
    if (!emailClean || !emailClean.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    const phoneClean = phone.replace(/\D/g, "");
    const normalizedPhone = phoneClean.startsWith("91") && phoneClean.length === 12 ? phoneClean.slice(2) : phoneClean;
    if (normalizedPhone.length !== 10) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    if (!termsAccepted) {
      setError("Please accept the Terms of Service & Privacy Policy to proceed.");
      return;
    }

    setLoading(true);
    try {
      await register({
        full_name: nameClean,
        email: emailClean,
        phone: normalizedPhone,
        password,
        confirm_password: confirmPassword,
        terms_accepted: termsAccepted,
      });
      router.push(redirectPath);
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Background radial glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[650px] h-[450px] bg-gradient-to-tr from-cyan-600/15 via-blue-600/10 to-transparent blur-3xl rounded-full pointer-events-none" />

      <div className="relative w-full max-w-lg z-10">
        {/* Card Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create Your CARSPA Account</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Join CARSPA Detailing
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Get your unique User ID, track active doorstep washes &amp; manage your garage.
          </p>
        </div>

        {/* Signup Form Container */}
        <div className="bg-[#0B1220]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/50">
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4 text-cyan-400" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikramaditya Rao"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#060A14] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                />
              </div>
            </div>

            {/* Email Address & Mobile Number in 2 columns on larger screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4 text-cyan-400" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#060A14] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                  />
                </div>
              </div>

              {/* Mobile Number with +91 indicator */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Mobile Number
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-0 pl-3 flex items-center gap-1 pointer-events-none text-slate-400 text-xs font-semibold border-r border-white/10 pr-2">
                    <span className="text-cyan-400">🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="98888 77771"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    className="w-full pl-16 pr-4 py-3 rounded-xl bg-[#060A14] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Password <span className="text-slate-500 font-normal">(Min 8 characters)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4 text-cyan-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#060A14] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4 text-cyan-400" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#060A14] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Terms and conditions acceptance */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300 leading-normal">
                <input
                  type="checkbox"
                  required
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="w-4 h-4 rounded border-white/10 bg-[#060A14] text-cyan-500 focus:ring-cyan-400/30 focus:ring-offset-0 mt-0.5"
                />
                <span>
                  I agree to CARSPA&apos;s{" "}
                  <Link href="/terms" className="text-cyan-400 hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-cyan-400 hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-5 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 pt-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account &amp; Generate User ID</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Unique User ID highlight */}
          <div className="mt-6 pt-5 border-t border-white/10 space-y-2 text-center">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-cyan-300 font-semibold bg-cyan-950/40 border border-cyan-500/30 px-3 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Instant Unique Customer ID Generated on Signup</span>
            </div>
          </div>
        </div>

        {/* Already have an account */}
        <div className="text-center mt-6 text-xs text-slate-400">
          <span>Already have a CARSPA account? </span>
          <Link
            href={`/login${redirectPath !== "/dashboard" ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`}
            className="font-bold text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-4"
          >
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#060B13] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
