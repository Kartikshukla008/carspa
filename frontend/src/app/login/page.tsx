"use client";

import { useState, Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Mail,
  Phone,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Smartphone,
  KeyRound,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

function GoogleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect") || "/";
  const redirectPath = rawRedirect.startsWith("/") ? rawRedirect : `/${rawRedirect}`;

  const { login, setSession, isAuthenticated, isLoading: authLoading } = useAuth();

  // If already authenticated, redirect to destination immediately
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      window.location.href = redirectPath;
    }
  }, [authLoading, isAuthenticated, redirectPath]);

  // Auth Mode: "password" vs "otp"
  const [authMode, setAuthMode] = useState<"password" | "otp">("password");

  // Password state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // OTP state
  const [otpPhone, setOtpPhone] = useState("");
  const [otpChannel, setOtpChannel] = useState<"WHATSAPP" | "SMS">("WHATSAPP");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [devPreviewCode, setDevPreviewCode] = useState<string | null>(null);

  // Status
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const tokenClientRef = useRef<any>(null);

  // Load Google Identity Services SDK or process OAuth redirect
  useEffect(() => {
    // 1. Check if returning from Google OAuth redirect (hash token)
    if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      if (accessToken) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        setGoogleLoading(true);
        fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then((r) => r.json())
          .then(async (userInfo) => {
            if (userInfo.email) {
              const res = await api.googleAuth({
                email: userInfo.email,
                name: userInfo.name || `${userInfo.given_name || ""} ${userInfo.family_name || ""}`.trim(),
                sub: userInfo.sub,
              });
              setSession(res.token, res.user);
              window.location.href = redirectPath;
            }
          })
          .catch((err: any) => {
            setError(err.message || "Failed to process Google sign-in response.");
            setGoogleLoading(false);
          });
      }
    }

    // 2. Load Google Identity Services SDK if Client ID is configured
    const googleClientId = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "").trim();
    if (!googleClientId) return;

    if (document.getElementById("google-gsi-client")) return;

    const script = document.createElement("script");
    script.id = "google-gsi-client";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // 1. One-Tap / ID Token callback
      if ((window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            if (response.credential) {
              setGoogleLoading(true);
              try {
                const res = await api.googleAuth({ credential: response.credential });
                setSession(res.token, res.user);
                window.location.href = redirectPath;
              } catch (err: any) {
                setError(err.message || "Failed to authenticate with Google.");
              } finally {
                setGoogleLoading(false);
              }
            }
          },
        });
      }

      // 2. OAuth2 Token Client (for custom button clicks / popup)
      if ((window as any).google?.accounts?.oauth2) {
        tokenClientRef.current = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: "openid email profile",
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              setGoogleLoading(false);
              if (tokenResponse.error !== "access_denied") {
                setError(`Google Sign-In failed: ${tokenResponse.error}`);
              }
              return;
            }
            if (tokenResponse.access_token) {
              setGoogleLoading(true);
              try {
                const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const userInfo = await userInfoRes.json();
                const res = await api.googleAuth({
                  email: userInfo.email,
                  name: userInfo.name || `${userInfo.given_name || ""} ${userInfo.family_name || ""}`.trim(),
                  sub: userInfo.sub,
                });
                setSession(res.token, res.user);
                window.location.href = redirectPath;
              } catch (err: any) {
                setError(err.message || "Failed to complete Google authentication.");
              } finally {
                setGoogleLoading(false);
              }
            }
          },
          error_callback: () => {
            setGoogleLoading(false);
          },
        });
      }
    };
    document.body.appendChild(script);
  }, [redirectPath, router, setSession]);

  // Countdown timer for OTP
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  // Handle Standard Password Login
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setError("Please enter your registered email address or 10-digit mobile number.");
      return;
    }
    if (!password) {
      setError("Please enter your account password.");
      return;
    }

    setLoading(true);
    try {
      await login({
        identifier: cleanIdentifier,
        password,
        remember_me: rememberMe,
      });
      router.push(redirectPath);
    } catch (err: any) {
      setError(err.message || "Failed to log in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleaned = otpPhone.replace(/\D/g, "");
    if (cleaned.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.sendPhoneOtp(cleaned, otpChannel);
      setOtpSent(true);
      setOtpCountdown(60);
      setSuccessMsg(`Verification code sent via ${otpChannel} to +91 ${cleaned.slice(-10)}`);
      if (res.dev_preview_code) {
        setDevPreviewCode(res.dev_preview_code);
      }
    } catch (err: any) {
      setError(err.message || "Failed to dispatch verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Verify OTP & Login
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleaned = otpPhone.replace(/\D/g, "");
    if (!cleaned || cleaned.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!otpCode || otpCode.length !== 6) {
      setError("Please enter the 6-digit verification code received.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyPhoneOtp(cleaned, otpCode);
      setSession(res.token, res.user);
      router.push(redirectPath);
    } catch (err: any) {
      setError(err.message || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  };

  // Handle 1-Click Sign in with Google (triggers official Google Account Chooser popup or redirect)
  const handleGoogleSignIn = () => {
    setError(null);

    const googleClientId = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "").trim();

    if (!googleClientId) {
      setError(
        "Google Sign-In is not active in this deployment yet. If you recently added NEXT_PUBLIC_GOOGLE_CLIENT_ID in Vercel, please click 'Redeploy' on your deployment in Vercel to apply it."
      );
      return;
    }

    setGoogleLoading(true);

    // Timeout safety: if user closes popup without selecting account, reset loading state
    const resetLoadingOnFocus = () => {
      setTimeout(() => setGoogleLoading(false), 2000);
      window.removeEventListener("focus", resetLoadingOnFocus);
    };
    window.addEventListener("focus", resetLoadingOnFocus);

    // 1. If OAuth2 token client is initialized, launch the official Google Account Chooser popup
    if (tokenClientRef.current) {
      try {
        tokenClientRef.current.requestAccessToken({ prompt: "select_account" });
        return;
      } catch (e) {
        console.warn("Failed to requestAccessToken with initialized client:", e);
      }
    }

    // 2. If SDK loaded dynamically, initialize token client on-demand
    if (typeof window !== "undefined" && (window as any).google?.accounts?.oauth2) {
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: "openid email profile",
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              setGoogleLoading(false);
              if (tokenResponse.error !== "access_denied") {
                setError(`Google Sign-In failed: ${tokenResponse.error}`);
              }
              return;
            }
            if (tokenResponse.access_token) {
              try {
                const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const userInfo = await userInfoRes.json();
                const res = await api.googleAuth({
                  email: userInfo.email,
                  name: userInfo.name || `${userInfo.given_name || ""} ${userInfo.family_name || ""}`.trim(),
                  sub: userInfo.sub,
                });
                setSession(res.token, res.user);
                window.location.href = redirectPath;
              } catch (err: any) {
                setError(err.message || "Failed to complete Google authentication.");
              } finally {
                setGoogleLoading(false);
              }
            }
          },
          error_callback: () => {
            setGoogleLoading(false);
          },
        });
        tokenClientRef.current = client;
        client.requestAccessToken({ prompt: "select_account" });
        return;
      } catch (e) {
        console.warn("Dynamic initTokenClient failed:", e);
      }
    }

    // 3. Fallback: Standard Google OAuth 2.0 Web Redirect (guaranteed to work even if SDK is blocked)
    if (typeof window !== "undefined") {
      const redirectUri = window.location.origin + window.location.pathname;
      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
        googleClientId
      )}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=token&scope=openid%20email%20profile&prompt=select_account`;
      window.location.href = oauthUrl;
    }
  };

  if (isAuthenticated || googleLoading) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4 py-20 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-cyan-600/15 via-blue-600/10 to-transparent blur-3xl rounded-full pointer-events-none" />
        <div className="relative w-full max-w-md z-10 text-center p-8 rounded-3xl bg-[#0B1220]/90 border border-white/10 shadow-2xl backdrop-blur-xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">
              {googleLoading ? "Connecting with Google..." : "Signed In Successfully"}
            </h3>
            <p className="text-xs text-slate-400">
              {googleLoading
                ? "Securing your session and loading your profile..."
                : "Redirecting you to your destination..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-20 relative overflow-hidden">
      {/* Background radial glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-cyan-600/15 via-blue-600/10 to-transparent blur-3xl rounded-full pointer-events-none" />

      <div className="relative w-full max-w-md z-10">
        {/* Card Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>CARSPA Customer Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Welcome Back
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Log in to manage your doorstep wash bookings, saved cars &amp; invoices.
          </p>
        </div>

        {/* Login Form Container */}
        <div className="bg-[#0B1220]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/50 space-y-6">
          {/* 1. Google 1-Click Social Sign-In */}
          <div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer disabled:opacity-75"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <GoogleIcon className="w-4 h-4" />
                  <span>Continue with Google</span>
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px bg-white/10 flex-1" />
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
              Or Sign In With
            </span>
            <div className="h-px bg-white/10 flex-1" />
          </div>

          {/* Auth Method Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#060A14] border border-white/10">
            <button
              type="button"
              onClick={() => {
                setAuthMode("password");
                setError(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === "password"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Password</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("otp");
                setError(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === "otp"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>1-Click OTP</span>
            </button>
          </div>

          {/* Error & Success Messages */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: Password Login */}
          {authMode === "password" ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* Email or Mobile Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Email Address or Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    {identifier.includes("@") ? (
                      <Mail className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <Phone className="w-4 h-4 text-cyan-400" />
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="name@example.com or 98888 77771"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#060A14] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4 text-cyan-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#060A14] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 bg-[#060A14] text-cyan-500 focus:ring-cyan-400/30 focus:ring-offset-0"
                  />
                  <span>Remember me on this device</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-5 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to My Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* TAB 2: Phone OTP Passwordless Login */
            <div className="space-y-4">
              {!otpSent ? (
                /* Step 1: Request OTP */
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Mobile Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 text-xs font-bold">
                        +91
                      </div>
                      <input
                        type="tel"
                        maxLength={10}
                        required
                        placeholder="98888 77771"
                        value={otpPhone}
                        onChange={(e) => setOtpPhone(e.target.value.replace(/\D/g, ""))}
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#060A14] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                      />
                    </div>
                  </div>

                  {/* Channel Choice */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Dispatch Channel
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setOtpChannel("WHATSAPP")}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                          otpChannel === "WHATSAPP"
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold"
                            : "bg-[#060A14] border-white/10 text-slate-400 hover:text-white"
                        }`}
                      >
                        WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => setOtpChannel("SMS")}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                          otpChannel === "SMS"
                            ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold"
                            : "bg-[#060A14] border-white/10 text-slate-400 hover:text-white"
                        }`}
                      >
                        Standard SMS
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otpPhone.length < 10}
                    className="w-full py-3.5 px-5 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Send 6-Digit Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Step 2: Enter & Verify OTP */
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Sending to:</span>
                      <span className="font-mono font-bold text-white">+91 {otpPhone.slice(-10)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtpCode("");
                        setDevPreviewCode(null);
                      }}
                      className="text-[11px] font-semibold text-cyan-400 hover:underline"
                    >
                      Change Number
                    </button>
                  </div>

                  {devPreviewCode && (
                    <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-cyan-300">
                        Dev Preview OTP: <strong className="font-mono text-white text-sm">{devPreviewCode}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setOtpCode(devPreviewCode)}
                        className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold hover:bg-cyan-500/30"
                      >
                        Auto-Fill
                      </button>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Enter 6-Digit Verification Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      autoFocus
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      className="w-full px-4 py-3 rounded-xl bg-[#060A14] border border-cyan-500/40 text-center font-mono font-black text-lg tracking-[0.3em] text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 transition-all"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span>Didn&apos;t receive code?</span>
                    {otpCountdown > 0 ? (
                      <span className="font-mono text-cyan-400 font-semibold">
                        Resend in {otpCountdown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendOtp()}
                        className="font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Resend Code</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otpCode.length !== 6}
                    className="w-full py-3.5 px-5 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-400 hover:to-teal-500 shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify &amp; Sign In</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Secure Login Footer */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>End-to-end encrypted &amp; secure session</span>
          </div>
        </div>

        {/* Don't have an account */}
        <div className="text-center mt-6 text-xs text-slate-400">
          <span>Don&apos;t have a CARSPA account yet? </span>
          <Link
            href={`/signup${redirectPath !== "/dashboard" ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`}
            className="font-bold text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-4"
          >
            Create your account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#060B13] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
