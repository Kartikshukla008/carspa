"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Calendar,
  Clock,
  MapPin,
  Car,
  CreditCard,
  KeyRound,
  LogOut,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Printer,
  ChevronRight,
  ShieldCheck,
  Star,
  Loader2,
  Building,
  Check,
  X,
  Phone,
  Mail,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  CustomerDashboardData,
  BookingResponse,
  CustomerAddress,
  CustomerVehicle,
  CustomerPaymentItem,
  VehicleType,
} from "@/types";
import { BookingInvoiceModal } from "@/components/BookingInvoiceModal";

export default function CustomerDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout, refreshProfile } = useAuth();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<
    "overview" | "bookings" | "addresses" | "vehicles" | "payments" | "profile"
  >("overview");

  // Dashboard Data State
  const [dashboardData, setDashboardData] = useState<CustomerDashboardData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);

  // Bookings Tab State
  const [bookingFilter, setBookingFilter] = useState<string>("ALL");
  const [bookingsList, setBookingsList] = useState<BookingResponse[]>([]);
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState<BookingResponse | null>(null);

  // Address Modal State
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [addressForm, setAddressForm] = useState({
    house_building: "",
    street_locality: "",
    city: "Chandigarh",
    state: "Punjab",
    pincode: "",
    address_type: "HOME" as "HOME" | "WORK" | "OTHER",
    landmark: "",
    is_default: false,
  });

  // Vehicle Modal State
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<CustomerVehicle | null>(null);
  const [vehicleForm, setVehicleForm] = useState({
    vehicle_type: 0,
    brand: "",
    model_name: "",
    license_plate: "",
    color: "",
    is_default: false,
  });

  // Payment History State
  const [paymentsList, setPaymentsList] = useState<CustomerPaymentItem[]>([]);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);

  // Password Change State
  const [passwordForm, setPasswordForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Toast / Feedback message
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // Auth Protection: Redirect if logged out
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/dashboard");
    }
  }, [authLoading, isAuthenticated, router]);

  // Load Dashboard Data & Metadata
  const loadData = async () => {
    if (!isAuthenticated) return;
    try {
      setLoadingData(true);
      const [dash, vTypes] = await Promise.all([
        api.getCustomerDashboard(),
        api.getVehicleTypes().catch(() => []),
      ]);
      setDashboardData(dash);
      setBookingsList(dash.recent_bookings || []);
      setVehicleTypes(vTypes);
      if (dash.profile) {
        setProfileForm({
          full_name: dash.profile.full_name,
          phone: dash.profile.phone,
        });
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to load dashboard data.");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  // Fetch full bookings list when switching to bookings tab
  useEffect(() => {
    if (activeTab === "bookings" && isAuthenticated) {
      api.getCustomerBookings().then(setBookingsList).catch(() => {});
    } else if (activeTab === "payments" && isAuthenticated) {
      api.getCustomerPayments().then(setPaymentsList).catch(() => {});
    }
  }, [activeTab, isAuthenticated]);

  // Handle Address Submit
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.house_building.trim() || !addressForm.street_locality.trim() || !addressForm.pincode.trim()) {
      showToast("error", "Please fill in all required address fields.");
      return;
    }

    try {
      if (editingAddress) {
        await api.updateCustomerAddress(editingAddress.id, addressForm);
        showToast("success", "Address updated successfully!");
      } else {
        await api.createCustomerAddress(addressForm);
        showToast("success", "New address added to your address book!");
      }
      setAddressModalOpen(false);
      setEditingAddress(null);
      loadData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to save address.");
    }
  };

  const handleDeleteAddress = async (id: number) => {
    if (!confirm("Are you sure you want to delete this saved address?")) return;
    try {
      await api.deleteCustomerAddress(id);
      showToast("success", "Address removed.");
      loadData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to delete address.");
    }
  };

  // Handle Vehicle Submit
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleForm.vehicle_type || !vehicleForm.brand.trim() || !vehicleForm.model_name.trim()) {
      showToast("error", "Please select a vehicle category and enter brand and model.");
      return;
    }

    try {
      if (editingVehicle) {
        await api.updateCustomerVehicle(editingVehicle.id, vehicleForm);
        showToast("success", "Vehicle updated in your garage!");
      } else {
        await api.createCustomerVehicle(vehicleForm);
        showToast("success", "Vehicle added to your garage!");
      }
      setVehicleModalOpen(false);
      setEditingVehicle(null);
      loadData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to save vehicle.");
    }
  };

  const handleDeleteVehicle = async (id: number) => {
    if (!confirm("Are you sure you want to remove this vehicle from your garage?")) return;
    try {
      await api.deleteCustomerVehicle(id);
      showToast("success", "Vehicle removed from garage.");
      loadData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to remove vehicle.");
    }
  };

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await api.updateProfile(profileForm);
      await refreshProfile();
      showToast("success", "Profile details updated successfully!");
    } catch (err: any) {
      showToast("error", err.message || "Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new_password.length < 8) {
      showToast("error", "New password must be at least 8 characters long.");
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showToast("error", "New passwords do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      await api.changePassword(passwordForm);
      setPasswordForm({ old_password: "", new_password: "", confirm_password: "" });
      showToast("success", "Password changed successfully!");
    } catch (err: any) {
      showToast("error", err.message || "Failed to change password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  if (authLoading || (loadingData && !dashboardData)) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Loading your CARSPA account...</p>
      </div>
    );
  }

  const profile = dashboardData?.profile || user;

  // Filtered Bookings
  const filteredBookings = bookingsList.filter((b) => {
    if (bookingFilter === "ALL") return true;
    if (bookingFilter === "UPCOMING") return ["PENDING", "CONFIRMED", "ASSIGNED", "IN_PROGRESS"].includes(b.status);
    if (bookingFilter === "COMPLETED") return b.status === "COMPLETED";
    if (bookingFilter === "CANCELLED") return b.status === "CANCELLED";
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 space-y-8 relative">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border animate-in fade-in slide-in-from-top-3 ${
            toast.type === "success"
              ? "bg-emerald-950/95 text-emerald-300 border-emerald-700/80"
              : "bg-red-950/95 text-red-300 border-red-700/80"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span className="text-xs font-semibold">{toast.text}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-gray-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner & User ID Card */}
      <div className="bg-gradient-to-r from-[#0B1426] via-[#0D1B33] to-[#0A1628] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-cyan-500/25 shrink-0">
              {profile?.full_name ? profile.full_name.slice(0, 2).toUpperCase() : "CS"}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {profile?.full_name || "CARSPA Member"}
                </h1>
                {profile?.user_id && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 shadow-sm">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>ID: {profile.user_id}</span>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{profile?.email}</span>
                </span>
                <span className="flex items-center gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-cyan-400" />
                  <span>+91 {profile?.phone}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/book"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Book a Wash</span>
            </Link>
            <button
              onClick={async () => {
                await logout();
                router.push("/");
              }}
              className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/10 transition-colors"
              title="Logout from Account"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-white/10 text-xs font-semibold">
        {[
          { id: "overview", label: "Dashboard Overview", icon: Sparkles },
          { id: "bookings", label: "My Bookings & History", icon: Calendar },
          { id: "addresses", label: "Saved Addresses", icon: MapPin },
          { id: "vehicles", label: "My Vehicles (Garage)", icon: Car },
          { id: "payments", label: "Payment History", icon: CreditCard },
          { id: "profile", label: "Profile & Security", icon: User },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 1. OVERVIEW TAB                                                      */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === "overview" && (
        <div className="space-y-8 animate-in fade-in">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0B1220]/90 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl space-y-1">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                Total Bookings
              </span>
              <p className="text-2xl sm:text-3xl font-black text-white">
                {dashboardData?.metrics.total_bookings ?? 0}
              </p>
              <span className="text-[11px] text-cyan-400 font-medium">All time doorstep services</span>
            </div>

            <div className="bg-[#0B1220]/90 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl space-y-1">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                Active &amp; Upcoming
              </span>
              <p className="text-2xl sm:text-3xl font-black text-amber-400">
                {dashboardData?.metrics.active_bookings ?? 0}
              </p>
              <span className="text-[11px] text-slate-400 font-medium">Scheduled or in progress</span>
            </div>

            <div className="bg-[#0B1220]/90 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl space-y-1">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                Completed Washes
              </span>
              <p className="text-2xl sm:text-3xl font-black text-emerald-400">
                {dashboardData?.metrics.completed_bookings ?? 0}
              </p>
              <span className="text-[11px] text-slate-400 font-medium">Mirror-gloss finishes delivered</span>
            </div>

            <div className="bg-[#0B1220]/90 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl space-y-1">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                Total Invested
              </span>
              <p className="text-2xl sm:text-3xl font-black text-cyan-400">
                ₹{dashboardData?.metrics.total_spent ?? "0"}
              </p>
              <span className="text-[11px] text-slate-400 font-medium">In vehicle detailing care</span>
            </div>
          </div>

          {/* Recent Bookings & Garage Quick Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Bookings (2 Cols) */}
            <div className="lg:col-span-2 bg-[#0B1220]/90 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden shadow-xl">
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <span>Recent Bookings</span>
                  </h3>
                  <p className="text-xs text-slate-400">Your latest doorstep appointment statuses</p>
                </div>
                <button
                  onClick={() => setActiveTab("bookings")}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-white/5">
                {dashboardData?.recent_bookings.length === 0 ? (
                  <div className="p-8 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto text-slate-400">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-white">No bookings yet</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Ready for a spotless, mirror-finish doorstep wash? Book your first session in under 60 seconds!
                    </p>
                    <Link
                      href="/book"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-500/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Book Wash Now</span>
                    </Link>
                  </div>
                ) : (
                  dashboardData?.recent_bookings.map((b) => (
                    <div key={b.id} className="p-4 sm:p-5 hover:bg-white/[0.02] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-cyan-400">
                            #{b.booking_reference}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              b.status === "COMPLETED"
                                ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                                : b.status === "CANCELLED"
                                ? "bg-rose-500/15 border border-rose-500/30 text-rose-400"
                                : "bg-cyan-500/15 border border-cyan-500/30 text-cyan-300"
                            }`}
                          >
                            {b.status_display}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-white">
                          {b.service_package_name} • {b.vehicle_type_name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {b.service_date} at {b.slot_start_time.slice(0, 5)} • {b.locality}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 sm:self-center">
                        <Link
                          href={`/track?ref=${encodeURIComponent(b.booking_reference)}`}
                          className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Track</span>
                        </Link>
                        <button
                          onClick={() => setSelectedInvoiceBooking(b)}
                          className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Invoice</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Garage & Addresses Card */}
            <div className="space-y-6">
              {/* Saved Garage preview */}
              <div className="bg-[#0B1220]/90 backdrop-blur-md rounded-3xl border border-white/10 p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Car className="w-4 h-4 text-cyan-400" />
                    <span>My Garage</span>
                  </h3>
                  <button
                    onClick={() => {
                      setEditingVehicle(null);
                      setVehicleForm({
                        vehicle_type: vehicleTypes[0]?.id || 1,
                        brand: "",
                        model_name: "",
                        license_plate: "",
                        color: "",
                        is_default: false,
                      });
                      setVehicleModalOpen(true);
                    }}
                    className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Car</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {dashboardData?.saved_vehicles.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No vehicles added yet.</p>
                  ) : (
                    dashboardData?.saved_vehicles.slice(0, 3).map((v) => (
                      <div
                        key={v.id}
                        className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white">{v.brand} {v.model_name}</span>
                            {v.is_default && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold">
                                Default
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {v.license_plate || v.vehicle_type_name}
                          </span>
                        </div>
                        <span className="text-[11px] text-cyan-400 font-medium">
                          {v.vehicle_type_name}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Saved Addresses preview */}
              <div className="bg-[#0B1220]/90 backdrop-blur-md rounded-3xl border border-white/10 p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-cyan-400" />
                    <span>Saved Addresses</span>
                  </h3>
                  <button
                    onClick={() => {
                      setEditingAddress(null);
                      setAddressForm({
                        house_building: "",
                        street_locality: "",
                        city: "Chandigarh",
                        state: "Punjab",
                        pincode: "",
                        address_type: "HOME",
                        landmark: "",
                        is_default: false,
                      });
                      setAddressModalOpen(true);
                    }}
                    className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Address</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {dashboardData?.saved_addresses.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No saved addresses yet.</p>
                  ) : (
                    dashboardData?.saved_addresses.slice(0, 2).map((a) => (
                      <div
                        key={a.id}
                        className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{a.address_type}</span>
                          {a.is_default && (
                            <span className="text-[10px] text-cyan-400 font-semibold">Primary</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {a.house_building}, {a.street_locality}, {a.city}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* 2. MY BOOKINGS & HISTORY TAB                                         */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === "bookings" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">My Booking History</h2>
              <p className="text-xs text-slate-400">View and track all doorstep washes booked under your account</p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-[#060A14] p-1 rounded-2xl border border-white/10 text-xs">
              {["ALL", "UPCOMING", "COMPLETED", "CANCELLED"].map((f) => (
                <button
                  key={f}
                  onClick={() => setBookingFilter(f)}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                    bookingFilter === f
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {f.charAt(0) + f.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredBookings.length === 0 ? (
              <div className="bg-[#0B1220]/90 border border-white/10 rounded-3xl p-12 text-center space-y-3">
                <Calendar className="w-10 h-10 text-slate-500 mx-auto" />
                <h3 className="text-sm font-bold text-white">No bookings match this filter</h3>
                <p className="text-xs text-slate-400">Schedule your doorstep detailing session whenever you&apos;re ready.</p>
                <Link
                  href="/book"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Book Doorstep Wash</span>
                </Link>
              </div>
            ) : (
              filteredBookings.map((b) => (
                <div
                  key={b.id}
                  className="bg-[#0B1220]/90 backdrop-blur-md border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm text-cyan-400">
                        #{b.booking_reference}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          b.status === "COMPLETED"
                            ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                            : b.status === "CANCELLED"
                            ? "bg-rose-500/15 border border-rose-500/30 text-rose-400"
                            : "bg-cyan-500/15 border border-cyan-500/30 text-cyan-300"
                        }`}
                      >
                        {b.status_display}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">Amount:</span>
                      <span className="font-bold text-white text-sm">₹{b.final_amount}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          b.payment_status === "PAID"
                            ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                            : "bg-amber-950/80 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {b.payment_status === "PAID" ? "PAID" : "PAY ON ARRIVAL"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Vehicle &amp; Package</span>
                      <p className="font-bold text-white mt-0.5">{b.service_package_name}</p>
                      <p className="text-slate-400 text-[11px]">{b.vehicle_type_name}</p>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Date &amp; Slot</span>
                      <p className="font-bold text-white mt-0.5">{b.service_date}</p>
                      <p className="text-slate-400 text-[11px]">{b.slot_start_time.slice(0, 5)} - {b.slot_end_time.slice(0, 5)}</p>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Doorstep Address</span>
                      <p className="font-bold text-white mt-0.5 line-clamp-1">{b.locality}</p>
                      <p className="text-slate-400 text-[11px] line-clamp-1">{b.address_line}</p>
                    </div>
                  </div>

                  {b.selected_addons && b.selected_addons.length > 0 && (
                    <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold mr-1">Add-ons:</span>
                      {b.selected_addons.map((add) => (
                        <span key={add.id} className="px-2 py-0.5 rounded-lg bg-white/[0.03] border border-white/10 text-slate-300 text-[11px]">
                          + {add.name} (₹{add.price})
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-500">
                      Booked on {new Date(b.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/track?ref=${encodeURIComponent(b.booking_reference)}`}
                        className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Live Status</span>
                      </Link>

                      <button
                        onClick={() => setSelectedInvoiceBooking(b)}
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Tax Invoice (PDF)</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* 3. SAVED ADDRESSES TAB                                               */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === "addresses" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Saved Addresses</h2>
              <p className="text-xs text-slate-400">Save home, office &amp; recurring doorstep detailing locations for fast 1-click booking</p>
            </div>
            <button
              onClick={() => {
                setEditingAddress(null);
                setAddressForm({
                  house_building: "",
                  street_locality: "",
                  city: "Chandigarh",
                  state: "Punjab",
                  pincode: "",
                  address_type: "HOME",
                  landmark: "",
                  is_default: false,
                });
                setAddressModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Address</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dashboardData?.saved_addresses.length === 0 ? (
              <div className="col-span-2 bg-[#0B1220]/90 border border-white/10 rounded-3xl p-12 text-center space-y-3">
                <MapPin className="w-10 h-10 text-slate-500 mx-auto" />
                <h3 className="text-sm font-bold text-white">No addresses saved yet</h3>
                <p className="text-xs text-slate-400">Save your primary doorstep wash address to breeze through checkout.</p>
              </div>
            ) : (
              dashboardData?.saved_addresses.map((a) => (
                <div
                  key={a.id}
                  className={`bg-[#0B1220]/90 backdrop-blur-md rounded-3xl p-5 border shadow-xl flex flex-col justify-between space-y-4 ${
                    a.is_default ? "border-cyan-500/40 bg-cyan-950/10" : "border-white/10"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/[0.05] border border-white/10 text-slate-200">
                        <Building className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{a.address_type}</span>
                      </span>
                      {a.is_default ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-300">
                          <Star className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" />
                          <span>Default Address</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            api.updateCustomerAddress(a.id, { is_default: true }).then(() => {
                              showToast("success", "Set as default address!");
                              loadData();
                            });
                          }}
                          className="text-[11px] text-slate-400 hover:text-cyan-400 transition-colors"
                        >
                          Set as Default
                        </button>
                      )}
                    </div>

                    <p className="font-bold text-white text-sm">{a.house_building}</p>
                    <p className="text-xs text-slate-300">{a.street_locality}</p>
                    <p className="text-xs text-slate-400">
                      {a.city}, {a.state} - {a.pincode}
                    </p>
                    {a.landmark && (
                      <p className="text-[11px] text-slate-500 italic">Near {a.landmark}</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingAddress(a);
                        setAddressForm({
                          house_building: a.house_building,
                          street_locality: a.street_locality,
                          city: a.city,
                          state: a.state,
                          pincode: a.pincode,
                          address_type: a.address_type,
                          landmark: a.landmark || "",
                          is_default: a.is_default,
                        });
                        setAddressModalOpen(true);
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="Edit Address"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAddress(a.id)}
                      className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                      title="Delete Address"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* 4. MY VEHICLES (GARAGE) TAB                                          */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === "vehicles" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">My Vehicles Garage</h2>
              <p className="text-xs text-slate-400">Save your vehicles to automatically auto-select packages and pricing when booking</p>
            </div>
            <button
              onClick={() => {
                setEditingVehicle(null);
                setVehicleForm({
                  vehicle_type: vehicleTypes[0]?.id || 1,
                  brand: "",
                  model_name: "",
                  license_plate: "",
                  color: "",
                  is_default: false,
                });
                setVehicleModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add Vehicle</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardData?.saved_vehicles.length === 0 ? (
              <div className="col-span-full bg-[#0B1220]/90 border border-white/10 rounded-3xl p-12 text-center space-y-3">
                <Car className="w-10 h-10 text-slate-500 mx-auto" />
                <h3 className="text-sm font-bold text-white">No cars in your garage yet</h3>
                <p className="text-xs text-slate-400">Add your car so our doorstep technician arrives with the right equipment.</p>
              </div>
            ) : (
              dashboardData?.saved_vehicles.map((v) => (
                <div
                  key={v.id}
                  className={`bg-[#0B1220]/90 backdrop-blur-md rounded-3xl p-5 border shadow-xl flex flex-col justify-between space-y-4 ${
                    v.is_default ? "border-cyan-500/40 bg-cyan-950/10" : "border-white/10"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 border border-cyan-500/25 text-cyan-300">
                        {v.vehicle_type_name}
                      </span>
                      {v.is_default ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-300">
                          <Star className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" />
                          <span>Primary Car</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            api.updateCustomerVehicle(v.id, { is_default: true }).then(() => {
                              showToast("success", "Set as primary vehicle!");
                              loadData();
                            });
                          }}
                          className="text-[11px] text-slate-400 hover:text-cyan-400 transition-colors"
                        >
                          Set as Primary
                        </button>
                      )}
                    </div>

                    <p className="font-black text-white text-base">
                      {v.brand} {v.model_name}
                    </p>
                    <div className="space-y-0.5 text-xs text-slate-400">
                      {v.license_plate && (
                        <p className="font-mono text-cyan-300 font-semibold">{v.license_plate}</p>
                      )}
                      {v.color && <p className="text-slate-400">{v.color}</p>}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingVehicle(v);
                        setVehicleForm({
                          vehicle_type: v.vehicle_type,
                          brand: v.brand,
                          model_name: v.model_name,
                          license_plate: v.license_plate,
                          color: v.color || "",
                          is_default: v.is_default,
                        });
                        setVehicleModalOpen(true);
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="Edit Vehicle"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteVehicle(v.id)}
                      className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                      title="Remove Vehicle"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* 5. PAYMENT HISTORY TAB                                               */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === "payments" && (
        <div className="space-y-6 animate-in fade-in">
          <div>
            <h2 className="text-lg font-bold text-white">Payment &amp; Billing History</h2>
            <p className="text-xs text-slate-400">All online settlements, Razorpay transaction references &amp; receipt records</p>
          </div>

          <div className="bg-[#0B1220]/90 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#080D1A] text-slate-400 uppercase tracking-wider text-[10px] border-b border-white/10 font-bold">
                  <tr>
                    <th className="p-4">Transaction Ref</th>
                    <th className="p-4">Service &amp; Booking</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Method / Provider</th>
                    <th className="p-4">Date &amp; Time</th>
                    <th className="p-4">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {paymentsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400 space-y-2">
                        <CreditCard className="w-8 h-8 mx-auto text-slate-500" />
                        <p className="font-semibold text-white">No payment transactions recorded yet.</p>
                      </td>
                    </tr>
                  ) : (
                    paymentsList.map((p) => (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 font-mono font-bold text-cyan-400">
                          {p.payment_id || p.order_id || `PAY-${p.id}`}
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-white block">{p.service_package_name}</span>
                          <span className="font-mono text-[11px] text-slate-400">#{p.booking_reference}</span>
                        </td>
                        <td className="p-4 font-bold text-white text-sm">
                          ₹{p.amount}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/[0.04] border border-white/10 text-slate-300">
                            {p.provider}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400 text-[11px]">
                          {new Date(p.created_at).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              p.status === "SUCCESS"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : p.status === "FAILED"
                                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* 6. PROFILE & SECURITY TAB                                            */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
          {/* Personal Profile Details */}
          <div className="bg-[#0B1220]/90 backdrop-blur-md rounded-3xl border border-white/10 p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-400" />
                <span>My Profile</span>
              </h3>
              <p className="text-xs text-slate-400">Update your customer contact information</p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Unique Customer ID
                </label>
                <div className="px-3.5 py-2.5 rounded-xl bg-[#060A14] border border-white/10 text-cyan-300 font-mono font-bold text-xs select-all">
                  {profile?.user_id}
                </div>
                <span className="text-[10px] text-slate-500">Permanent system identifier</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060A14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={profile?.email || ""}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060A14]/50 border border-white/5 text-slate-400 text-xs cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-500">Linked to primary Google/email account</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Mobile Number (+91)
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value.replace(/\D/g, "") })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060A14] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <button
                type="submit"
                disabled={profileSaving}
                className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save Profile Details</span>}
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-[#0B1220]/90 backdrop-blur-md rounded-3xl border border-white/10 p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-cyan-400" />
                <span>Change Password</span>
              </h3>
              <p className="text-xs text-slate-400">Keep your CARSPA customer account secure</p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={passwordForm.old_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060A14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  New Password <span className="text-slate-500 font-normal">(Min 8 characters)</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060A14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060A14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <button
                type="submit"
                disabled={passwordSaving}
                className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Update Password</span>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* SAVED ADDRESS MODAL                                                  */}
      {/* -------------------------------------------------------------------- */}
      {addressModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B1220] border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>{editingAddress ? "Edit Saved Address" : "Add New Address"}</span>
              </h3>
              <button
                onClick={() => setAddressModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Address Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["HOME", "WORK", "OTHER"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAddressForm({ ...addressForm, address_type: t })}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        addressForm.address_type === t
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                          : "bg-white/[0.03] text-slate-400 border border-white/5"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  House / Flat / Building Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flat 402, Oakwood Manor"
                  value={addressForm.house_building}
                  onChange={(e) => setAddressForm({ ...addressForm, house_building: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060A14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Street / Sector / Locality *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sector 68, Kumbra Chowk"
                  value={addressForm.street_locality}
                  onChange={(e) => setAddressForm({ ...addressForm, street_locality: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060A14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    City
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#060A14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="160062"
                    value={addressForm.pincode}
                    onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#060A14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Landmark (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Near Community Center"
                  value={addressForm.landmark}
                  onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060A14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none pt-1">
                <input
                  type="checkbox"
                  checked={addressForm.is_default}
                  onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                  className="w-4 h-4 rounded border-white/10 bg-[#060A14] text-cyan-500 focus:ring-cyan-400/30"
                />
                <span>Set as primary default address for wash visits</span>
              </label>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddressModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* SAVED VEHICLE MODAL                                                  */}
      {/* -------------------------------------------------------------------- */}
      {vehicleModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B1220] border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Car className="w-4 h-4 text-cyan-400" />
                <span>{editingVehicle ? "Edit Vehicle" : "Add New Vehicle to Garage"}</span>
              </h3>
              <button
                onClick={() => setVehicleModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Vehicle Category / Type *
                </label>
                <select
                  required
                  value={vehicleForm.vehicle_type}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_type: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060A14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                >
                  <option value="">Select category...</option>
                  {vehicleTypes.map((vt) => (
                    <option key={vt.id} value={vt.id}>
                      {vt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Brand / Make *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hyundai"
                    value={vehicleForm.brand}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, brand: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#060A14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Model *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Creta"
                    value={vehicleForm.model_name}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, model_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#060A14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    License Plate (Reg No)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CH01-AB-1234"
                    value={vehicleForm.license_plate}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, license_plate: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#060A14] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Color
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Phantom Black"
                    value={vehicleForm.color}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#060A14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none pt-1">
                <input
                  type="checkbox"
                  checked={vehicleForm.is_default}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, is_default: e.target.checked })}
                  className="w-4 h-4 rounded border-white/10 bg-[#060A14] text-cyan-500 focus:ring-cyan-400/30"
                />
                <span>Set as primary car in my garage</span>
              </label>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setVehicleModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md"
                >
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAX INVOICE MODAL                                                    */}
      {/* -------------------------------------------------------------------- */}
      {selectedInvoiceBooking && (
        <BookingInvoiceModal
          booking={selectedInvoiceBooking}
          isOpen={!!selectedInvoiceBooking}
          onClose={() => setSelectedInvoiceBooking(null)}
        />
      )}
    </div>
  );
}
