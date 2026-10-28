"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  User,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Search,
  Filter,
  Download,
  Settings,
  ShieldAlert,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Car,
  DollarSign,
  TrendingUp,
  RefreshCw,
  LogOut,
  Plus,
  Eye,
  Check,
  X,
  RotateCcw,
  ExternalLink,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Info,
  CalendarCheck,
  CreditCard,
  Building,
  Navigation,
  Copy,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  DashboardMetrics,
  BookingResponse,
  Lead,
  StaffMember,
  ServicePackage,
  VehicleType,
} from "@/types";

export default function AdminPortalPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loginForm, setLoginForm] = useState({ username: "admin", password: "" });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  // Active Tab: overview | bookings | leads | staff | settings
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Dashboard Data
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<BookingResponse[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // Bookings Tab Data & Filters
  const [bookingsList, setBookingsList] = useState<BookingResponse[]>([]);
  const [bookingFilterStatus, setBookingFilterStatus] = useState<string>("");
  const [bookingFilterPayment, setBookingFilterPayment] = useState<string>("");
  const [bookingFilterDate, setBookingFilterDate] = useState<string>("");
  const [bookingFilterPackage, setBookingFilterPackage] = useState<string>("");
  const [bookingFilterVehicle, setBookingFilterVehicle] = useState<string>("");
  const [bookingSearch, setBookingSearch] = useState<string>("");
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Filter Metadata
  const [servicePackages, setServicePackages] = useState<ServicePackage[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);

  // Detailed View Modal & Action Modals
  const [selectedBooking, setSelectedBooking] = useState<BookingResponse | null>(null);
  const [rescheduleModal, setRescheduleModal] = useState<{
    booking: BookingResponse;
    newDate: string;
    newSlot: string;
    force: boolean;
  } | null>(null);
  const [completeModal, setCompleteModal] = useState<{
    booking: BookingResponse;
    notes: string;
    markPaid: boolean;
  } | null>(null);
  const [cancelModal, setCancelModal] = useState<{
    bookingId: number;
    reference: string;
    customerName: string;
    reason: string;
  } | null>(null);
  const [assignModal, setAssignModal] = useState<{
    bookingId: number;
    reference: string;
    staffId: number;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // Leads Tab Data
  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [leadFilterStatus, setLeadFilterStatus] = useState<string>("");
  const [leadSearch, setLeadSearch] = useState<string>("");
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Staff Data
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  // Settings
  const [configData, setConfigData] = useState<any>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);

  // Toast helper
  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedRef(text);
    showToast("success", `Copied "${text}" to clipboard`);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // 1. Check Authentication on Mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const user = await api.adminMe();
        setAdminUser(user);
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      }
    }
    checkAuth();
  }, []);

  // Load metadata once authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    api.getServicePackages().then(setServicePackages).catch(() => {});
    api.getVehicleTypes().then(setVehicleTypes).catch(() => {});
  }, [isAuthenticated]);

  // 2. Fetch Tab Data when Authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    if (activeTab === "overview") {
      fetchDashboardMetrics();
    } else if (activeTab === "bookings") {
      fetchBookings();
      fetchStaff();
    } else if (activeTab === "leads") {
      fetchLeads();
    } else if (activeTab === "staff") {
      fetchStaff();
    } else if (activeTab === "settings") {
      fetchConfig();
    }
  }, [isAuthenticated, activeTab]);

  // Re-fetch bookings when filters change
  useEffect(() => {
    if (!isAuthenticated || activeTab !== "bookings") return;
    fetchBookings();
  }, [
    bookingFilterStatus,
    bookingFilterPayment,
    bookingFilterDate,
    bookingFilterPackage,
    bookingFilterVehicle,
  ]);

  const fetchDashboardMetrics = async () => {
    setLoadingDashboard(true);
    try {
      const data = await api.getAdminDashboard();
      setMetrics(data.metrics);
      setUpcomingBookings(data.upcoming_appointments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const fetchBookings = async () => {
    setLoadingBookings(true);
    try {
      const params: Record<string, string> = {};
      if (bookingFilterStatus) params.status = bookingFilterStatus;
      if (bookingFilterPayment) params.payment_status = bookingFilterPayment;
      if (bookingFilterDate) params.date = bookingFilterDate;
      if (bookingFilterPackage) params.package = bookingFilterPackage;
      if (bookingFilterVehicle) params.vehicle_type = bookingFilterVehicle;
      if (bookingSearch.trim()) params.search = bookingSearch.trim();
      const data = await api.getAdminBookings(params);
      const list: BookingResponse[] = data.results || data || [];
      setBookingsList(list);

      // Keep active detailed modal updated with newest data if open
      if (selectedBooking) {
        const updated = list.find((b) => b.id === selectedBooking.id);
        if (updated) setSelectedBooking(updated);
      }
    } catch (err: any) {
      console.error(err);
      showToast("error", err.message || "Failed to load bookings");
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleResetFilters = () => {
    setBookingFilterStatus("");
    setBookingFilterPayment("");
    setBookingFilterDate("");
    setBookingFilterPackage("");
    setBookingFilterVehicle("");
    setBookingSearch("");
  };

  const hasActiveFilters = Boolean(
    bookingFilterStatus ||
    bookingFilterPayment ||
    bookingFilterDate ||
    bookingFilterPackage ||
    bookingFilterVehicle ||
    bookingSearch
  );

  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const params: Record<string, string> = {};
      if (leadFilterStatus) params.status = leadFilterStatus;
      if (leadSearch) params.search = leadSearch;
      const data = await api.getAdminLeads(params);
      setLeadsList(data.results || data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLeads(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const data = await api.getAdminStaff();
      setStaffList(data.results || data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConfig = async () => {
    try {
      const data = await api.getAdminConfig();
      setConfigData(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await api.adminLogin(loginForm);
      setAdminUser(res.user);
      setIsAuthenticated(true);
      fetchDashboardMetrics();
    } catch (err: any) {
      setLoginError(err.message || "Invalid username or password. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.adminLogout();
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
    setAdminUser(null);
  };

  const handleConfirmBooking = async (id: number) => {
    setActionLoading(true);
    try {
      const updated = await api.confirmBooking(id, "Confirmed via admin portal");
      showToast("success", `Booking ${updated.booking_reference} confirmed successfully!`);
      if (selectedBooking?.id === id) setSelectedBooking(updated);
      fetchBookings();
      if (activeTab === "overview") fetchDashboardMetrics();
    } catch (err: any) {
      showToast("error", err.message || "Failed to confirm booking.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteBooking = async () => {
    if (!completeModal) return;
    setActionLoading(true);
    try {
      const updated = await api.completeBooking(
        completeModal.booking.id,
        completeModal.notes,
        completeModal.markPaid
      );
      showToast("success", `Service ${updated.booking_reference} marked as COMPLETED!`);
      if (selectedBooking?.id === completeModal.booking.id) setSelectedBooking(updated);
      setCompleteModal(null);
      fetchBookings();
      fetchDashboardMetrics();
    } catch (err: any) {
      showToast("error", err.message || "Failed to mark booking as completed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRescheduleBooking = async () => {
    if (!rescheduleModal) return;
    setActionLoading(true);
    try {
      const updated = await api.rescheduleBooking(
        rescheduleModal.booking.id,
        rescheduleModal.newDate,
        rescheduleModal.newSlot,
        rescheduleModal.force
      );
      showToast(
        "success",
        `Booking ${updated.booking_reference} rescheduled to ${updated.service_date} at ${updated.slot_start_time}!`
      );
      if (selectedBooking?.id === rescheduleModal.booking.id) setSelectedBooking(updated);
      setRescheduleModal(null);
      fetchBookings();
    } catch (err: any) {
      showToast("error", err.message || "Failed to reschedule appointment.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelModal) return;
    setActionLoading(true);
    try {
      const updated = await api.cancelBooking(
        cancelModal.bookingId,
        cancelModal.reason || "Cancelled by admin"
      );
      showToast("success", `Booking ${updated.booking_reference} has been cancelled.`);
      if (selectedBooking?.id === cancelModal.bookingId) setSelectedBooking(updated);
      setCancelModal(null);
      fetchBookings();
      fetchDashboardMetrics();
    } catch (err: any) {
      showToast("error", err.message || "Failed to cancel booking.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePaymentStatus = async (id: number, newStatus: string) => {
    setActionLoading(true);
    try {
      const updated = await api.updatePaymentStatus(id, newStatus);
      showToast("success", `Payment status updated to ${newStatus}`);
      if (selectedBooking?.id === id) setSelectedBooking(updated);
      fetchBookings();
    } catch (err: any) {
      showToast("error", err.message || "Failed to update payment status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignStaff = async () => {
    if (!assignModal || !assignModal.staffId) return;
    setActionLoading(true);
    try {
      const updated = await api.assignStaff(assignModal.bookingId, assignModal.staffId);
      showToast("success", `Technician assigned to ${updated.booking_reference}`);
      if (selectedBooking?.id === assignModal.bookingId) setSelectedBooking(updated);
      setAssignModal(null);
      fetchBookings();
    } catch (err: any) {
      showToast("error", err.message || "Failed to assign technician.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateLead = async (id: number, newStatus: string) => {
    try {
      await api.updateLeadStatus(id, newStatus);
      fetchLeads();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigSuccess(false);
    try {
      await api.updateAdminConfig(configData);
      setConfigSuccess(true);
      setTimeout(() => setConfigSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  // Auth Loading
  if (isAuthenticated === null) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
      </div>
    );
  }

  // LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-20">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 space-y-6 shadow-xl">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center mx-auto shadow-sm">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Administrator Login</h2>
            <p className="text-xs text-slate-600">
              Access booking controls, capacity engine &amp; CRM.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Username</label>
              <input
                type="text"
                required
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-md shadow-sky-600/20 flex items-center justify-center gap-2"
            >
              {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In to Admin Portal"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // AUTHENTICATED DASHBOARD
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-8">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border animate-in fade-in slide-in-from-top-3 ${
            toastMessage.type === "success"
              ? "bg-emerald-950/95 text-emerald-300 border-emerald-700/80 shadow-emerald-950/50"
              : "bg-red-950/95 text-red-300 border-red-700/80 shadow-red-950/50"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span className="text-xs font-semibold">{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-gray-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <span className="text-[11px] font-bold text-sky-600 uppercase tracking-widest">
            Control Center
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Operations &amp; Booking Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-slate-900 block">
              {adminUser?.username || "Administrator"}
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold">Session Active</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 px-3.5 py-2 rounded-xl transition-colors shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {[
          { id: "overview", label: "Overview Metrics", icon: TrendingUp },
          { id: "bookings", label: "Bookings Management", icon: Calendar },
          { id: "leads", label: "Lead Capture CRM", icon: FileText },
          { id: "staff", label: "Technicians & Staff", icon: Users },
          { id: "settings", label: "Capacity & Pricing Config", icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                isActive
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. OVERVIEW METRICS TAB */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                Total Bookings
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {metrics ? metrics.total_bookings : "—"}
              </p>
              <span className="text-[11px] text-sky-600 font-medium">
                {metrics ? metrics.today_bookings_count : 0} scheduled today
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                Pending Approval
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-amber-600">
                {metrics ? metrics.pending_confirmations : "—"}
              </p>
              <span className="text-[11px] text-slate-500 font-medium">Requires confirmation</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                Gross Revenue
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                ₹{metrics ? metrics.total_revenue : "0.00"}
              </p>
              <span className="text-[11px] text-slate-500 font-medium">Completed &amp; settled</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                Lead Conversion
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-sky-600">
                {metrics ? metrics.conversion_rate : "0%"}
              </p>
              <span className="text-[11px] text-slate-500 font-medium">
                {metrics ? metrics.total_leads : 0} total leads
              </span>
            </div>
          </div>

          {/* Upcoming appointments */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">Upcoming Appointments</h3>
                <p className="text-xs text-slate-500">Next scheduled doorstep jobs</p>
              </div>
              <button
                onClick={fetchDashboardMetrics}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/90 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-4">Reference</th>
                    <th className="p-4">Date &amp; Slot</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Car &amp; Package</th>
                    <th className="p-4">Locality</th>
                    <th className="p-4">Technician</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {upcomingBookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        No upcoming bookings found.
                      </td>
                    </tr>
                  ) : (
                    upcomingBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-mono font-bold text-sky-600">
                          {b.booking_reference}
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-slate-900 block">{b.service_date}</span>
                          <span className="text-slate-500">{b.slot_start_time}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-slate-900 block">{b.customer_name}</span>
                          <span className="text-slate-500">{b.customer_phone}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold block text-slate-900">
                            {b.service_package_name}
                          </span>
                          <span className="text-slate-500">{b.vehicle_type_name}</span>
                        </td>
                        <td className="p-4 text-slate-700">{b.locality}</td>
                        <td className="p-4">
                          {b.assigned_staff_name ? (
                            <span className="text-emerald-600 font-medium">
                              {b.assigned_staff_name}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-700">
                            {b.status_display}
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

      {/* 2. BOOKINGS MANAGEMENT TAB */}
      {activeTab === "bookings" && (
        <div className="space-y-6">
          {/* Header Controls & Counts */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">Customer Bookings</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 font-semibold">
                  {bookingsList.length} {bookingsList.length === 1 ? "booking" : "bookings"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Real-time doorstep appointments submitted through the website. Confirm, reschedule, assign, and mark completed.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={fetchBookings}
                disabled={loadingBookings}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl transition-all shadow-sm"
                title="Refresh Bookings"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingBookings ? "animate-spin text-sky-600" : ""}`} />
                <span>Refresh</span>
              </button>

              <a
                href={`${api.getApiBaseUrl()}/api/admin/bookings/export-csv/`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl hover:bg-emerald-100 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </a>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <SlidersHorizontal className="w-3.5 h-3.5 text-sky-600" />
                <span>Search &amp; Filters</span>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              {/* Text Search */}
              <div className="sm:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search ref, customer, phone, email, locality..."
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchBookings()}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
                />
                {bookingSearch && (
                  <button
                    onClick={() => {
                      setBookingSearch("");
                      setTimeout(fetchBookings, 50);
                    }}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={bookingFilterStatus}
                  onChange={(e) => setBookingFilterStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">Pending Approval</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Payment Status Filter */}
              <div>
                <select
                  value={bookingFilterPayment}
                  onChange={(e) => setBookingFilterPayment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
                >
                  <option value="">All Payments</option>
                  <option value="PAID">Paid</option>
                  <option value="PENDING">Pending</option>
                  <option value="FAILED">Failed</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
              </div>

              {/* Washing Package Filter */}
              <div>
                <select
                  value={bookingFilterPackage}
                  onChange={(e) => setBookingFilterPackage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
                >
                  <option value="">All Packages</option>
                  {servicePackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vehicle Type Filter */}
              <div>
                <select
                  value={bookingFilterVehicle}
                  onChange={(e) => setBookingFilterVehicle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
                >
                  <option value="">All Vehicles</option>
                  {vehicleTypes.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date filter & Quick Day Filters */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
              <span className="text-[11px] text-slate-500 font-medium">Filter Date:</span>
              <input
                type="date"
                value={bookingFilterDate}
                onChange={(e) => setBookingFilterDate(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
              />
              <button
                type="button"
                onClick={() => {
                  const today = new Date().toISOString().split("T")[0];
                  setBookingFilterDate(today);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setBookingFilterDate(tomorrow.toISOString().split("T")[0]);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
              >
                Tomorrow
              </button>
              {bookingFilterDate && (
                <button
                  type="button"
                  onClick={() => setBookingFilterDate("")}
                  className="px-2 py-1 rounded-lg text-slate-400 hover:text-red-600 text-[11px]"
                >
                  Clear Date
                </button>
              )}

              <button
                type="button"
                onClick={fetchBookings}
                className="ml-auto bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-sm"
              >
                Apply Filters
              </button>
            </div>
          </div>

          {/* Bookings Table / List */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/90 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200 font-bold">
                  <tr>
                    <th className="p-3.5">Reference</th>
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5">Vehicle &amp; Package</th>
                    <th className="p-3.5">Date &amp; Slot</th>
                    <th className="p-3.5">Service Address</th>
                    <th className="p-3.5">Total &amp; Payment</th>
                    <th className="p-3.5">Booking Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loadingBookings ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400">
                        <Loader2 className="w-7 h-7 animate-spin mx-auto mb-3 text-sky-600" />
                        <span className="text-sm font-medium">Loading bookings from database...</span>
                      </td>
                    </tr>
                  ) : bookingsList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
                          <Calendar className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-slate-900 mb-1">No bookings found</p>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mb-3">
                          {hasActiveFilters
                            ? "No appointments match your active filter criteria. Try resetting filters."
                            : "No bookings submitted through website yet. New customer bookings will appear automatically here."}
                        </p>
                        {hasActiveFilters && (
                          <button
                            onClick={handleResetFilters}
                            className="text-xs font-semibold text-sky-600 hover:text-sky-700 underline"
                          >
                            Reset all filters
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    bookingsList.map((b) => (
                      <tr
                        key={b.id}
                        className="hover:bg-slate-50 transition-colors group cursor-pointer"
                        onClick={() => setSelectedBooking(b)}
                      >
                        {/* Reference */}
                        <td className="p-3.5 align-top">
                          <div className="flex items-center gap-1.5 font-mono font-bold text-sky-600 text-xs">
                            <span>{b.booking_reference}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(b.booking_reference);
                              }}
                              className="text-slate-400 hover:text-sky-600 transition-colors p-0.5 rounded"
                              title="Copy Reference"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {new Date(b.created_at).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                        </td>

                        {/* Customer */}
                        <td className="p-3.5 align-top">
                          <span className="font-bold text-slate-900 block text-xs">
                            {b.customer_name}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-slate-500 font-mono text-[11px]">
                              {b.customer_phone}
                            </span>
                            <a
                              href={`https://wa.me/91${b.customer_phone.replace(/\D/g, "")}?text=Hello%20${encodeURIComponent(b.customer_name)},%20this%20is%20CARSPA%20doorstep%20wash.`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-emerald-600 hover:text-emerald-700 text-[10px] p-0.5 rounded"
                              title="WhatsApp Customer"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </a>
                            <a
                              href={`tel:${b.customer_phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-sky-600 hover:text-sky-700 text-[10px] p-0.5 rounded"
                              title="Call Customer"
                            >
                              <Phone className="w-3 h-3" />
                            </a>
                          </div>
                          {b.customer_email && (
                            <span className="text-[10px] text-slate-400 block truncate max-w-[140px] mt-0.5">
                              {b.customer_email}
                            </span>
                          )}
                        </td>

                        {/* Vehicle & Package */}
                        <td className="p-3.5 align-top">
                          <span className="font-bold text-slate-900 block text-xs">
                            {b.service_package_name}
                          </span>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 border border-sky-200 text-sky-700">
                            {b.vehicle_type_name}
                          </span>
                        </td>

                        {/* Date & Slot */}
                        <td className="p-3.5 align-top whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-900 text-xs">
                            <Calendar className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                            <span>{b.service_date}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mt-1">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>
                              {b.slot_start_time.slice(0, 5)} - {b.slot_end_time.slice(0, 5)}
                            </span>
                          </div>
                        </td>

                        {/* Address */}
                        <td className="p-3.5 align-top max-w-[180px]">
                          <span className="font-semibold text-slate-900 block text-xs truncate">
                            {b.locality}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate mt-0.5" title={b.address_line}>
                            {b.address_line}
                          </span>
                          {b.landmark && (
                            <span className="text-[10px] text-slate-400 block truncate mt-0.5 italic">
                              Near {b.landmark}
                            </span>
                          )}
                        </td>

                        {/* Total & Payment */}
                        <td className="p-3.5 align-top whitespace-nowrap">
                          <span className="font-black text-emerald-600 block text-sm">
                            ₹{b.final_amount}
                          </span>
                          <div className="mt-1 flex items-center gap-1.5">
                            {b.payment_status === "PAID" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Paid
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                                {b.payment_status}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Booking Status */}
                        <td className="p-3.5 align-top whitespace-nowrap">
                          {b.status === "PENDING" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              <span>Pending</span>
                            </span>
                          )}
                          {b.status === "CONFIRMED" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Confirmed</span>
                            </span>
                          )}
                          {b.status === "ASSIGNED" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <User className="w-3 h-3" />
                              <span>Assigned</span>
                            </span>
                          )}
                          {b.status === "IN_PROGRESS" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-50 text-cyan-700 border border-cyan-200">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>In Progress</span>
                            </span>
                          )}
                          {b.status === "COMPLETED" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="w-3 h-3" />
                              <span>Completed</span>
                            </span>
                          )}
                          {b.status === "CANCELLED" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
                              <XCircle className="w-3 h-3" />
                              <span>Cancelled</span>
                            </span>
                          )}

                          {b.assigned_staff_name && (
                            <span className="text-[10px] text-slate-500 block mt-1 font-medium">
                              Tech: {b.assigned_staff_name}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 align-top text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* View Details */}
                            <button
                              onClick={() => setSelectedBooking(b)}
                              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold flex items-center gap-1 border border-slate-200 shadow-sm transition-colors"
                              title="View full booking details"
                            >
                              <Eye className="w-3 h-3 text-sky-600" />
                              <span>View</span>
                            </button>

                            {/* Confirm Action */}
                            {b.status === "PENDING" && (
                              <button
                                onClick={() => handleConfirmBooking(b.id)}
                                disabled={actionLoading}
                                className="px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>Confirm</span>
                              </button>
                            )}

                            {/* Mark Completed */}
                            {b.status !== "COMPLETED" && b.status !== "CANCELLED" && (
                              <button
                                onClick={() =>
                                  setCompleteModal({
                                    booking: b,
                                    notes: "Service completed successfully at doorstep.",
                                    markPaid: b.payment_status !== "PAID",
                                  })
                                }
                                disabled={actionLoading}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm"
                                title="Mark service completed"
                              >
                                Complete
                              </button>
                            )}

                            {/* Reschedule */}
                            {b.status !== "CANCELLED" && (
                              <button
                                onClick={() =>
                                  setRescheduleModal({
                                    booking: b,
                                    newDate: b.service_date,
                                    newSlot: b.slot_start_time.slice(0, 5),
                                    force: false,
                                  })
                                }
                                disabled={actionLoading}
                                className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[10px] font-semibold transition-all"
                                title="Reschedule date or time"
                              >
                                Reschedule
                              </button>
                            )}

                            {/* Cancel */}
                            {b.status !== "CANCELLED" && b.status !== "COMPLETED" && (
                              <button
                                onClick={() =>
                                  setCancelModal({
                                    bookingId: b.id,
                                    reference: b.booking_reference,
                                    customerName: b.customer_name,
                                    reason: "",
                                  })
                                }
                                disabled={actionLoading}
                                className="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-[10px] font-semibold transition-all"
                                title="Cancel booking"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 1. DETAILED BOOKING VIEW MODAL                                            */}
          {/* ========================================================================= */}
          {selectedBooking && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white max-w-3xl w-full rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/80 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-lg font-extrabold text-sky-600">
                        {selectedBooking.booking_reference}
                      </span>
                      <button
                        onClick={() => copyToClipboard(selectedBooking.booking_reference)}
                        className="text-slate-400 hover:text-sky-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Copy Reference"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-sky-50 border border-sky-200 text-sky-700">
                        {selectedBooking.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Submitted on {new Date(selectedBooking.created_at).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto text-xs">
                  {/* Top Summary Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Date</span>
                      <span className="text-sm font-bold text-slate-900 block mt-0.5">{selectedBooking.service_date}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Time Slot</span>
                      <span className="text-sm font-bold text-sky-600 block mt-0.5">
                        {selectedBooking.slot_start_time.slice(0, 5)} - {selectedBooking.slot_end_time.slice(0, 5)}
                      </span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Amount</span>
                      <span className="text-sm font-bold text-emerald-600 block mt-0.5">₹{selectedBooking.final_amount}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Payment Status</span>
                      <span className="text-sm font-bold text-amber-600 block mt-0.5">{selectedBooking.payment_status}</span>
                    </div>
                  </div>

                  {/* 2-Column Detail Sections */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Customer Info Card */}
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                          <User className="w-4 h-4 text-sky-600" />
                          <span>Customer Details</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <a
                            href={`https://wa.me/91${selectedBooking.customer_phone.replace(/\D/g, "")}?text=Hello%20${encodeURIComponent(selectedBooking.customer_name)},%20regarding%20your%20CARSPA%20appointment%20${selectedBooking.booking_reference}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition-colors"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>
                          <a
                            href={`tel:${selectedBooking.customer_phone}`}
                            className="flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-lg hover:bg-sky-100 transition-colors"
                          >
                            <Phone className="w-3 h-3" />
                            <span>Call</span>
                          </a>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Name:</span>
                          <span className="font-bold text-slate-900">{selectedBooking.customer_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Phone:</span>
                          <span className="font-mono text-slate-700">{selectedBooking.customer_phone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Email:</span>
                          <span className="text-slate-700">{selectedBooking.customer_email || "Not provided"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Vehicle & Package Card */}
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-xs border-b border-slate-200 pb-2">
                        <Car className="w-4 h-4 text-sky-600" />
                        <span>Vehicle &amp; Service Package</span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Vehicle Type:</span>
                          <span className="font-bold text-sky-700">{selectedBooking.vehicle_type_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Package:</span>
                          <span className="font-bold text-slate-900">{selectedBooking.service_package_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Estimated Duration:</span>
                          <span className="text-slate-700">~{selectedBooking.estimated_duration_minutes} minutes</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Service Area:</span>
                          <span className="text-slate-700">{selectedBooking.service_area_name || selectedBooking.locality}</span>
                        </div>
                      </div>
                    </div>

                    {/* Doorstep Location Card */}
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-xs border-b border-slate-200 pb-2">
                        <MapPin className="w-4 h-4 text-sky-600" />
                        <span>Doorstep Service Address</span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Address Line</span>
                          <span className="text-slate-800 block font-medium mt-0.5">{selectedBooking.address_line}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <span className="text-slate-500 block text-[10px]">Locality / Sector</span>
                            <span className="text-slate-800 font-semibold">{selectedBooking.locality}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Pincode</span>
                            <span className="text-slate-700">{selectedBooking.pincode || "—"}</span>
                          </div>
                        </div>
                        {selectedBooking.landmark && (
                          <div>
                            <span className="text-slate-500 block text-[10px]">Landmark</span>
                            <span className="text-slate-700 italic">{selectedBooking.landmark}</span>
                          </div>
                        )}
                        {selectedBooking.special_instructions && (
                          <div className="pt-1 border-t border-slate-200">
                            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Special Instructions</span>
                            <span className="text-amber-700 block mt-0.5">{selectedBooking.special_instructions}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Financials & Payment Management */}
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-xs border-b border-slate-200 pb-2">
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        <span>Financial Snapshot &amp; Status</span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Base Price:</span>
                          <span className="text-slate-800">₹{selectedBooking.price_snapshot}</span>
                        </div>
                        {Number(selectedBooking.tax_amount) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">GST / Tax:</span>
                            <span className="text-slate-800">₹{selectedBooking.tax_amount}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-1.5">
                          <span className="text-slate-900">Total Amount:</span>
                          <span className="text-emerald-600">₹{selectedBooking.final_amount}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                          <span className="text-slate-500">Payment Method:</span>
                          <span className="font-semibold text-slate-800">{selectedBooking.payment_method_display || selectedBooking.payment_method}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-slate-500">Update Payment:</span>
                          <select
                            value={selectedBooking.payment_status}
                            onChange={(e) => handleUpdatePaymentStatus(selectedBooking.id, e.target.value)}
                            disabled={actionLoading}
                            className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="PAID">PAID</option>
                            <option value="FAILED">FAILED</option>
                            <option value="REFUNDED">REFUNDED</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Technician & Notes */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                        <Users className="w-4 h-4 text-sky-600" />
                        <span>Assigned Technician</span>
                      </div>
                      <span className="text-xs font-semibold text-emerald-600">
                        {selectedBooking.assigned_staff_name || "Currently Unassigned"}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <select
                        value={selectedBooking.assigned_staff || (staffList[0]?.id || "")}
                        onChange={(e) => {
                          const sId = parseInt(e.target.value, 10);
                          if (sId) {
                            setAssignModal({
                              bookingId: selectedBooking.id,
                              reference: selectedBooking.booking_reference,
                              staffId: sId,
                            });
                          }
                        }}
                        className="flex-1 w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
                      >
                        <option value="">Choose technician to assign...</option>
                        {staffList.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.phone}) - {s.active_jobs_count} active jobs
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedBooking.cancellation_reason && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 mt-2">
                        <span className="font-bold block mb-0.5">Cancellation Reason:</span>
                        <span>{selectedBooking.cancellation_reason}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Action Bar */}
                <div className="p-5 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Confirm Button */}
                    {selectedBooking.status === "PENDING" && (
                      <button
                        onClick={() => handleConfirmBooking(selectedBooking.id)}
                        disabled={actionLoading}
                        className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-sky-600/30 transition-all"
                      >
                        <Check className="w-4 h-4" />
                        <span>Confirm Booking</span>
                      </button>
                    )}

                    {/* Mark Completed Button */}
                    {selectedBooking.status !== "COMPLETED" && selectedBooking.status !== "CANCELLED" && (
                      <button
                        onClick={() =>
                          setCompleteModal({
                            booking: selectedBooking,
                            notes: "Service completed successfully at doorstep.",
                            markPaid: selectedBooking.payment_status !== "PAID",
                          })
                        }
                        disabled={actionLoading}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Mark as Completed</span>
                      </button>
                    )}

                    {/* Reschedule Button */}
                    {selectedBooking.status !== "CANCELLED" && (
                      <button
                        onClick={() =>
                          setRescheduleModal({
                            booking: selectedBooking,
                            newDate: selectedBooking.service_date,
                            newSlot: selectedBooking.slot_start_time.slice(0, 5),
                            force: false,
                          })
                        }
                        disabled={actionLoading}
                        className="px-3.5 py-2 rounded-xl bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-700/80 text-indigo-300 font-semibold text-xs flex items-center gap-1.5 transition-all"
                      >
                        <Calendar className="w-4 h-4" />
                        <span>Reschedule</span>
                      </button>
                    )}

                    {/* Cancel Button */}
                    {selectedBooking.status !== "CANCELLED" && selectedBooking.status !== "COMPLETED" && (
                      <button
                        onClick={() =>
                          setCancelModal({
                            bookingId: selectedBooking.id,
                            reference: selectedBooking.booking_reference,
                            customerName: selectedBooking.customer_name,
                            reason: "",
                          })
                        }
                        disabled={actionLoading}
                        className="px-3.5 py-2 rounded-xl bg-red-950/70 hover:bg-red-900 border border-red-800 text-red-300 font-semibold text-xs flex items-center gap-1.5 transition-all"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Cancel Booking</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. RESCHEDULE MODAL                                                       */}
          {/* ========================================================================= */}
          {rescheduleModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white p-6 rounded-3xl max-w-md w-full space-y-5 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-sky-600" />
                      <span>Reschedule Booking</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {rescheduleModal.booking.booking_reference} &bull; {rescheduleModal.booking.customer_name}
                    </p>
                  </div>
                  <button
                    onClick={() => setRescheduleModal(null)}
                    className="text-slate-400 hover:text-slate-700 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-slate-700">
                  <span className="text-sky-700 font-bold block mb-0.5">Current Schedule:</span>
                  <span>{rescheduleModal.booking.service_date} at {rescheduleModal.booking.slot_start_time.slice(0, 5)}</span>
                </div>

                {/* New Date Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">Select New Date</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={rescheduleModal.newDate}
                    onChange={(e) =>
                      setRescheduleModal({ ...rescheduleModal, newDate: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                </div>

                {/* Time Slot Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">Select New Time Slot</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { time: "08:00", label: "08:00 AM" },
                      { time: "09:30", label: "09:30 AM" },
                      { time: "11:00", label: "11:00 AM" },
                      { time: "12:30", label: "12:30 PM" },
                      { time: "14:00", label: "02:00 PM" },
                      { time: "15:30", label: "03:30 PM" },
                      { time: "17:00", label: "05:00 PM" },
                      { time: "18:30", label: "06:30 PM" },
                    ].map((slot) => {
                      const isSelected = rescheduleModal.newSlot === slot.time;
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() =>
                            setRescheduleModal({ ...rescheduleModal, newSlot: slot.time })
                          }
                          className={`p-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                            isSelected
                              ? "bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-600/30"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          {slot.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Force override option */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="forceOverride"
                    checked={rescheduleModal.force}
                    onChange={(e) =>
                      setRescheduleModal({ ...rescheduleModal, force: e.target.checked })
                    }
                    className="rounded bg-white border-slate-300 text-sky-600 focus:ring-0"
                  />
                  <label htmlFor="forceOverride" className="text-[11px] text-slate-600 cursor-pointer">
                    Force override capacity limit if slot is fully booked
                  </label>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setRescheduleModal(null)}
                    disabled={actionLoading}
                    className="px-3.5 py-2 rounded-xl text-xs text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRescheduleBooking}
                    disabled={actionLoading}
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-sky-600/30 transition-all"
                  >
                    {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirm Reschedule</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. MARK SERVICE COMPLETED MODAL                                           */}
          {/* ========================================================================= */}
          {completeModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white p-6 rounded-3xl max-w-md w-full space-y-5 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Mark Service Completed</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {completeModal.booking.booking_reference} &bull; {completeModal.booking.customer_name}
                    </p>
                  </div>
                  <button
                    onClick={() => setCompleteModal(null)}
                    className="text-slate-400 hover:text-slate-700 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Package:</span>
                    <span className="font-bold text-slate-900">{completeModal.booking.service_package_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Vehicle:</span>
                    <span className="font-semibold text-sky-700">{completeModal.booking.vehicle_type_name}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-1 border-t border-emerald-200/60">
                    <span className="text-slate-900">Amount:</span>
                    <span className="text-emerald-600">₹{completeModal.booking.final_amount}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">Completion Notes</label>
                  <textarea
                    rows={2}
                    value={completeModal.notes}
                    onChange={(e) =>
                      setCompleteModal({ ...completeModal, notes: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                    placeholder="Notes regarding job quality, customer feedback, etc."
                  />
                </div>

                <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <input
                    type="checkbox"
                    id="markPaidCheckbox"
                    checked={completeModal.markPaid}
                    onChange={(e) =>
                      setCompleteModal({ ...completeModal, markPaid: e.target.checked })
                    }
                    className="rounded bg-white border-slate-300 text-emerald-600 focus:ring-0"
                  />
                  <label htmlFor="markPaidCheckbox" className="text-xs text-slate-700 font-medium cursor-pointer">
                    Mark Payment Status as <span className="font-bold text-emerald-600">PAID</span> (Cash / UPI collected)
                  </label>
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setCompleteModal(null)}
                    disabled={actionLoading}
                    className="px-3.5 py-2 rounded-xl text-xs text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCompleteBooking}
                    disabled={actionLoading}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all"
                  >
                    {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirm Completed</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. CANCEL BOOKING MODAL                                                   */}
          {/* ========================================================================= */}
          {cancelModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white p-6 rounded-3xl max-w-md w-full space-y-5 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span>Cancel Appointment</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {cancelModal.reference} &bull; {cancelModal.customerName}
                    </p>
                  </div>
                  <button
                    onClick={() => setCancelModal(null)}
                    className="text-slate-400 hover:text-slate-700 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  <span>Warning: Cancelling will mark this appointment as cancelled and release the technician / slot capacity.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">Select Reason</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value !== "Custom") {
                        setCancelModal({ ...cancelModal, reason: e.target.value });
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white mb-2"
                  >
                    <option value="Customer requested cancellation">Customer requested cancellation</option>
                    <option value="Customer unreachable / Phone switched off">Customer unreachable / Phone switched off</option>
                    <option value="Severe weather / Heavy rain">Severe weather / Heavy rain</option>
                    <option value="Address out of operational zone">Address out of operational zone</option>
                    <option value="Vehicle unavailable at location">Vehicle unavailable at location</option>
                    <option value="Custom">Other (type custom note below)</option>
                  </select>

                  <textarea
                    rows={2}
                    placeholder="Enter cancellation reason or additional notes..."
                    value={cancelModal.reason}
                    onChange={(e) =>
                      setCancelModal({ ...cancelModal, reason: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setCancelModal(null)}
                    disabled={actionLoading}
                    className="px-3.5 py-2 rounded-xl text-xs text-slate-600 hover:text-slate-900"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCancelBooking}
                    disabled={actionLoading}
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-red-600/30 transition-all"
                  >
                    {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirm Cancellation</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 5. ASSIGN TECHNICIAN MODAL                                                */}
          {/* ========================================================================= */}
          {assignModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-4 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-sky-600" />
                      <span>Assign Technician</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{assignModal.reference}</p>
                  </div>
                  <button
                    onClick={() => setAssignModal(null)}
                    className="text-slate-400 hover:text-slate-700 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-600">
                  Select a technician for this doorstep wash. They will receive automated assignment alert.
                </p>

                <select
                  value={assignModal.staffId}
                  onChange={(e) =>
                    setAssignModal({
                      ...assignModal,
                      staffId: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.phone}) - {s.active_jobs_count} jobs today
                    </option>
                  ))}
                </select>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setAssignModal(null)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:text-slate-900"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleAssignStaff}
                    disabled={actionLoading}
                    className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirm Assignment</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. LEADS CRM TAB */}
      {activeTab === "leads" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search lead name, phone, locality..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchLeads()}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <select
                value={leadFilterStatus}
                onChange={(e) => {
                  setLeadFilterStatus(e.target.value);
                  setTimeout(fetchLeads, 50);
                }}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              >
                <option value="">All Lead Statuses</option>
                <option value="NEW">New</option>
                <option value="CONTACTED">Contacted</option>
                <option value="INTERESTED">Interested</option>
                <option value="BOOKING_PENDING">Booking Pending</option>
                <option value="CONVERTED">Converted</option>
                <option value="LOST">Lost</option>
              </select>

              <button
                onClick={fetchLeads}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm transition-colors"
              >
                Filter
              </button>
            </div>

            <a
              href={`${api.getApiBaseUrl()}/api/admin/leads/export-csv/`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl hover:bg-emerald-100 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Leads CSV</span>
            </a>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-4">Lead ID</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Vehicle &amp; Package</th>
                    <th className="p-4">Locality</th>
                    <th className="p-4">Source</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Update Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {loadingLeads ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-500" />
                        Loading CRM leads...
                      </td>
                    </tr>
                  ) : leadsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No leads recorded yet.
                      </td>
                    </tr>
                  ) : (
                    leadsList.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-4 font-mono font-bold text-sky-600">
                          {lead.lead_id}
                          {lead.booking_reference && (
                            <span className="block text-[10px] text-slate-400 font-mono">
                              Ref: {lead.booking_reference}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="font-semibold block text-slate-900">{lead.customer_name}</span>
                          <span className="text-slate-500">{lead.mobile_number}</span>
                        </td>
                        <td className="p-4">
                          <span className="block font-medium text-slate-900">
                            {lead.service_package_name || "General Enquiry"}
                          </span>
                          <span className="text-slate-500 text-[11px]">
                            {lead.vehicle_type_name || "—"}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600">{lead.locality || "—"}</td>
                        <td className="p-4">
                          <span className="text-[11px] text-slate-500 font-mono">{lead.source}</span>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                            {lead.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <select
                            value={lead.status}
                            onChange={(e) => handleUpdateLead(lead.id, e.target.value)}
                            className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-[11px] text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none"
                          >
                            <option value="NEW">New</option>
                            <option value="CONTACTED">Contacted</option>
                            <option value="INTERESTED">Interested</option>
                            <option value="BOOKING_PENDING">Pending</option>
                            <option value="CONVERTED">Converted</option>
                            <option value="LOST">Lost</option>
                          </select>
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

      {/* 4. TECHNICIANS & STAFF TAB */}
      {activeTab === "staff" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Technicians &amp; Van Roster</h2>
              <p className="text-xs text-slate-500">
                Staff capacity controls max concurrent booking slots in the scheduling engine.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {staffList.map((s) => (
              <div key={s.id} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{s.name}</h3>
                    <p className="text-xs text-slate-500">{s.phone}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      s.is_active
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {s.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-700 pt-2 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Daily Job Limit:</span>
                    <span className="font-semibold text-slate-900">{s.max_daily_jobs} Cars/Day</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Assigned Today:</span>
                    <span className="font-semibold text-sky-600">{s.active_jobs_count} Jobs</span>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-[11px] text-slate-500 block font-semibold mb-1">
                    Coverage Hubs:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {s.assigned_areas_details && s.assigned_areas_details.length > 0 ? (
                      s.assigned_areas_details.map((area) => (
                        <span
                          key={area.id}
                          className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] text-slate-700 font-medium"
                        >
                          {area.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">All Areas (Global)</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. CAPACITY & SETTINGS TAB */}
      {activeTab === "settings" && configData && (
        <div className="max-w-2xl bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">Scheduling &amp; Business Rules</h2>
            <p className="text-xs text-slate-500">
              Changes update the live scheduling engine immediately.
            </p>
          </div>

          {configSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Configuration successfully saved to database.</span>
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Opening Time
                </label>
                <input
                  type="text"
                  value={configData.day_open_time}
                  onChange={(e) =>
                    setConfigData({ ...configData, day_open_time: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Closing Time
                </label>
                <input
                  type="text"
                  value={configData.day_close_time}
                  onChange={(e) =>
                    setConfigData({ ...configData, day_close_time: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Slot Interval (Minutes)
                </label>
                <input
                  type="number"
                  value={configData.slot_interval_minutes}
                  onChange={(e) =>
                    setConfigData({
                      ...configData,
                      slot_interval_minutes: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Buffer &amp; Travel Time (Minutes)
                </label>
                <input
                  type="number"
                  value={configData.default_buffer_minutes}
                  onChange={(e) =>
                    setConfigData({
                      ...configData,
                      default_buffer_minutes: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Min Advance Notice (Hours)
                </label>
                <input
                  type="number"
                  value={configData.min_advance_hours}
                  onChange={(e) =>
                    setConfigData({
                      ...configData,
                      min_advance_hours: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Max Booking Advance (Days)
                </label>
                <input
                  type="number"
                  value={configData.max_advance_days}
                  onChange={(e) =>
                    setConfigData({
                      ...configData,
                      max_advance_days: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                />
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={configData.auto_confirm_bookings}
                  onChange={(e) =>
                    setConfigData({
                      ...configData,
                      auto_confirm_bookings: e.target.checked,
                    })
                  }
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-xs text-slate-700 font-semibold">
                  Auto-confirm new customer booking submissions immediately
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={configData.same_day_booking_allowed}
                  onChange={(e) =>
                    setConfigData({
                      ...configData,
                      same_day_booking_allowed: e.target.checked,
                    })
                  }
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-xs text-slate-700 font-semibold">
                  Allow same-day booking requests (subject to advance notice window)
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={savingConfig}
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all shadow-md flex items-center gap-2"
            >
              {savingConfig ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>Save Scheduling Configuration</span>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
