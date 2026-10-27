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
  MapPin,
  Car,
  DollarSign,
  TrendingUp,
  RefreshCw,
  LogOut,
  Plus
} from "lucide-react";
import { api } from "@/lib/api";
import { DashboardMetrics, BookingResponse, Lead, StaffMember } from "@/types";

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
  const [bookingSearch, setBookingSearch] = useState<string>("");
  const [loadingBookings, setLoadingBookings] = useState(false);

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

  // Modals / Action States
  const [assignModal, setAssignModal] = useState<{ bookingId: number; staffId: number } | null>(null);
  const [cancelModal, setCancelModal] = useState<{ bookingId: number; reason: string } | null>(null);

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
      if (bookingSearch) params.search = bookingSearch;
      const data = await api.getAdminBookings(params);
      setBookingsList(data.results || data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBookings(false);
    }
  };

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
    try {
      await api.confirmBooking(id, "Confirmed via admin dashboard");
      fetchBookings();
      if (activeTab === "overview") fetchDashboardMetrics();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAssignStaff = async () => {
    if (!assignModal || !assignModal.staffId) return;
    try {
      await api.assignStaff(assignModal.bookingId, assignModal.staffId);
      setAssignModal(null);
      fetchBookings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelModal) return;
    try {
      await api.cancelBooking(cancelModal.bookingId, cancelModal.reason || "Cancelled by admin");
      setCancelModal(null);
      fetchBookings();
    } catch (err: any) {
      alert(err.message);
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
        <div className="glass-card p-8 rounded-3xl border-gray-800 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-sky-950 border border-sky-800 text-sky-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-white">Administrator Login</h2>
            <p className="text-xs text-gray-400">
              Access booking controls, capacity engine &amp; CRM.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 block">Username</label>
              <input
                type="text"
                required
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 block">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-800 gap-4">
        <div>
          <span className="text-[11px] font-bold text-sky-400 uppercase tracking-widest">
            Control Center
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Operations &amp; Booking Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-white block">
              {adminUser?.username || "Administrator"}
            </span>
            <span className="text-[11px] text-emerald-400 font-medium">Session Active</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-red-400 bg-gray-900 border border-gray-800 px-3.5 py-2 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-2">
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
                  : "text-gray-400 hover:text-white hover:bg-gray-900"
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
            <div className="glass-card p-5 rounded-2xl border-gray-800 space-y-1">
              <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
                Total Bookings
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-white">
                {metrics ? metrics.total_bookings : "—"}
              </p>
              <span className="text-[11px] text-sky-400">
                {metrics ? metrics.today_bookings_count : 0} scheduled today
              </span>
            </div>

            <div className="glass-card p-5 rounded-2xl border-gray-800 space-y-1">
              <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
                Pending Approval
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-amber-400">
                {metrics ? metrics.pending_confirmations : "—"}
              </p>
              <span className="text-[11px] text-gray-400">Requires confirmation</span>
            </div>

            <div className="glass-card p-5 rounded-2xl border-gray-800 space-y-1">
              <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
                Gross Revenue
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
                ₹{metrics ? metrics.total_revenue : "0.00"}
              </p>
              <span className="text-[11px] text-gray-400">Completed &amp; settled</span>
            </div>

            <div className="glass-card p-5 rounded-2xl border-gray-800 space-y-1">
              <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
                Lead Conversion
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-cyan-400">
                {metrics ? metrics.conversion_rate : "0%"}
              </p>
              <span className="text-[11px] text-gray-400">
                {metrics ? metrics.total_leads : 0} total leads
              </span>
            </div>
          </div>

          {/* Upcoming appointments */}
          <div className="glass-card rounded-2xl border-gray-800 overflow-hidden">
            <div className="p-5 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-white">Upcoming Appointments</h3>
                <p className="text-xs text-gray-400">Next scheduled doorstep jobs</p>
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
                <thead className="bg-gray-900/80 text-gray-400 uppercase tracking-wider text-[10px]">
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
                <tbody className="divide-y divide-gray-800/60 text-gray-200">
                  {upcomingBookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-gray-500">
                        No upcoming bookings found.
                      </td>
                    </tr>
                  ) : (
                    upcomingBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-900/40">
                        <td className="p-4 font-mono font-bold text-sky-400">
                          {b.booking_reference}
                        </td>
                        <td className="p-4">
                          <span className="font-semibold block">{b.service_date}</span>
                          <span className="text-gray-400">{b.slot_start_time}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold block">{b.customer_name}</span>
                          <span className="text-gray-400">{b.customer_phone}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold block text-white">
                            {b.service_package_name}
                          </span>
                          <span className="text-gray-400">{b.vehicle_type_name}</span>
                        </td>
                        <td className="p-4">{b.locality}</td>
                        <td className="p-4">
                          {b.assigned_staff_name ? (
                            <span className="text-emerald-400 font-medium">
                              {b.assigned_staff_name}
                            </span>
                          ) : (
                            <span className="text-gray-500 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-800 border border-gray-700">
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
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search ref, customer, phone..."
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchBookings()}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <select
                value={bookingFilterStatus}
                onChange={(e) => {
                  setBookingFilterStatus(e.target.value);
                  setTimeout(fetchBookings, 50);
                }}
                className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <button
                onClick={fetchBookings}
                className="bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-2 rounded-xl"
              >
                Apply
              </button>
            </div>

            <a
              href="http://localhost:8000/api/admin/bookings/export-csv/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-800/80 px-3.5 py-2 rounded-xl hover:bg-emerald-900/60 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>
          </div>

          {/* Bookings Table */}
          <div className="glass-card rounded-2xl border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-900/90 text-gray-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Reference</th>
                    <th className="p-4">Schedule</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Car &amp; Package</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Technician</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 text-gray-200">
                  {loadingBookings ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
                        Loading bookings...
                      </td>
                    </tr>
                  ) : bookingsList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-500">
                        No bookings matching filters.
                      </td>
                    </tr>
                  ) : (
                    bookingsList.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-900/30">
                        <td className="p-4 font-mono font-bold text-sky-400">
                          {b.booking_reference}
                        </td>
                        <td className="p-4">
                          <span className="font-semibold block">{b.service_date}</span>
                          <span className="text-gray-400">{b.slot_start_time}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold block">{b.customer_name}</span>
                          <span className="text-gray-400">{b.customer_phone}</span>
                          <span className="text-[10px] text-gray-500 block truncate max-w-[160px]">
                            {b.address_line}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold block text-white">
                            {b.service_package_name}
                          </span>
                          <span className="text-sky-400 text-[11px]">{b.vehicle_type_name}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-emerald-400 block">
                            ₹{b.final_amount}
                          </span>
                          <span className="text-[10px] text-gray-500">{b.payment_status}</span>
                        </td>
                        <td className="p-4">
                          {b.assigned_staff_name ? (
                            <span className="text-emerald-400 font-medium">
                              {b.assigned_staff_name}
                            </span>
                          ) : (
                            <span className="text-gray-500 italic">None</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-800 border border-gray-700">
                            {b.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {b.status === "PENDING" && (
                              <button
                                onClick={() => handleConfirmBooking(b.id)}
                                className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] uppercase tracking-wider"
                              >
                                Confirm
                              </button>
                            )}
                            <button
                              onClick={() =>
                                setAssignModal({
                                  bookingId: b.id,
                                  staffId: b.assigned_staff || (staffList[0]?.id || 1),
                                })
                              }
                              className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 text-[10px] font-semibold"
                            >
                              Assign
                            </button>
                            {b.status !== "CANCELLED" && b.status !== "COMPLETED" && (
                              <button
                                onClick={() =>
                                  setCancelModal({
                                    bookingId: b.id,
                                    reason: "",
                                  })
                                }
                                className="px-2 py-1 rounded bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 text-[10px]"
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

          {/* Assign Staff Modal */}
          {assignModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="glass-card p-6 rounded-2xl max-w-sm w-full space-y-4 border-gray-700">
                <h3 className="text-base font-bold text-white">Assign Technician</h3>
                <p className="text-xs text-gray-400">
                  Select technician for this doorstep wash. They will receive automated WhatsApp notification.
                </p>

                <select
                  value={assignModal.staffId}
                  onChange={(e) =>
                    setAssignModal({
                      ...assignModal,
                      staffId: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.phone}) - {s.active_jobs_count} jobs today
                    </option>
                  ))}
                </select>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setAssignModal(null)}
                    className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleAssignStaff}
                    className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
                  >
                    Confirm Assignment
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cancel Modal */}
          {cancelModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="glass-card p-6 rounded-2xl max-w-sm w-full space-y-4 border-red-900">
                <h3 className="text-base font-bold text-white">Cancel Appointment</h3>
                <p className="text-xs text-gray-400">
                  State the cancellation reason. The slot capacity will be instantly released.
                </p>

                <textarea
                  rows={2}
                  placeholder="e.g. Customer rescheduled for next week."
                  value={cancelModal.reason}
                  onChange={(e) =>
                    setCancelModal({ ...cancelModal, reason: e.target.value })
                  }
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500"
                />

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setCancelModal(null)}
                    className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCancelBooking}
                    className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
                  >
                    Confirm Cancellation
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
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search lead name, phone, locality..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchLeads()}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <select
                value={leadFilterStatus}
                onChange={(e) => {
                  setLeadFilterStatus(e.target.value);
                  setTimeout(fetchLeads, 50);
                }}
                className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
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
                className="bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-2 rounded-xl"
              >
                Filter
              </button>
            </div>

            <a
              href="http://localhost:8000/api/admin/leads/export-csv/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-800/80 px-3.5 py-2 rounded-xl hover:bg-emerald-900/60 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Leads CSV</span>
            </a>
          </div>

          <div className="glass-card rounded-2xl border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-900/90 text-gray-400 uppercase tracking-wider text-[10px]">
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
                <tbody className="divide-y divide-gray-800/60 text-gray-200">
                  {loadingLeads ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
                        Loading CRM leads...
                      </td>
                    </tr>
                  ) : leadsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500">
                        No leads recorded yet.
                      </td>
                    </tr>
                  ) : (
                    leadsList.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-900/30">
                        <td className="p-4 font-mono font-bold text-sky-400">
                          {lead.lead_id}
                          {lead.booking_reference && (
                            <span className="block text-[10px] text-gray-500 font-mono">
                              Ref: {lead.booking_reference}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="font-semibold block">{lead.customer_name}</span>
                          <span className="text-gray-400">{lead.mobile_number}</span>
                        </td>
                        <td className="p-4">
                          <span className="block text-white">
                            {lead.service_package_name || "General Enquiry"}
                          </span>
                          <span className="text-gray-400 text-[11px]">
                            {lead.vehicle_type_name || "—"}
                          </span>
                        </td>
                        <td className="p-4">{lead.locality || "—"}</td>
                        <td className="p-4">
                          <span className="text-[11px] text-gray-400">{lead.source}</span>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-800 border border-gray-700">
                            {lead.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <select
                            value={lead.status}
                            onChange={(e) => handleUpdateLead(lead.id, e.target.value)}
                            className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-[11px] text-white"
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
              <h2 className="text-xl font-bold text-white">Technicians &amp; Van Roster</h2>
              <p className="text-xs text-gray-400">
                Staff capacity controls max concurrent booking slots in the scheduling engine.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {staffList.map((s) => (
              <div key={s.id} className="glass-card p-6 rounded-2xl border-gray-800 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-white">{s.name}</h3>
                    <p className="text-xs text-gray-400">{s.phone}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      s.is_active
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : "bg-red-950 text-red-400"
                    }`}
                  >
                    {s.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-gray-300 pt-2 border-t border-gray-800">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Daily Job Limit:</span>
                    <span className="font-semibold">{s.max_daily_jobs} Cars/Day</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Assigned Today:</span>
                    <span className="font-semibold text-sky-400">{s.active_jobs_count} Jobs</span>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-[11px] text-gray-400 block font-semibold mb-1">
                    Coverage Hubs:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {s.assigned_areas_details && s.assigned_areas_details.length > 0 ? (
                      s.assigned_areas_details.map((area) => (
                        <span
                          key={area.id}
                          className="px-2 py-0.5 rounded bg-gray-900 border border-gray-800 text-[10px] text-gray-300"
                        >
                          {area.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-gray-500 italic">All Areas (Global)</span>
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
        <div className="max-w-2xl glass-card p-8 rounded-3xl border-gray-800 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">Scheduling &amp; Business Rules</h2>
            <p className="text-xs text-gray-400">
              Changes update the live scheduling engine immediately.
            </p>
          </div>

          {configSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Configuration successfully saved to database.</span>
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 block">
                  Opening Time
                </label>
                <input
                  type="text"
                  value={configData.day_open_time}
                  onChange={(e) =>
                    setConfigData({ ...configData, day_open_time: e.target.value })
                  }
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 block">
                  Closing Time
                </label>
                <input
                  type="text"
                  value={configData.day_close_time}
                  onChange={(e) =>
                    setConfigData({ ...configData, day_close_time: e.target.value })
                  }
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 block">
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
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 block">
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
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 block">
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
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 block">
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
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
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
                  className="rounded bg-gray-900 border-gray-700 text-sky-500"
                />
                <span className="text-xs text-gray-300 font-semibold">
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
                  className="rounded bg-gray-900 border-gray-700 text-sky-500"
                />
                <span className="text-xs text-gray-300 font-semibold">
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
