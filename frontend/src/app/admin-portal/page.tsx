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
  Pencil,
  Tag,
  Send,
  UserCheck,
  BarChart3,
  PieChart,
  Layers,
  Lock,
  Shield,
  Activity,
  ArrowUpRight,
  Briefcase,
  EyeOff,
  Bell,
  Radio,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAdminWebSocket, DashboardEvent } from "@/hooks/useAdminWebSocket";
import {
  DashboardMetrics,
  BookingResponse,
  Lead,
  StaffMember,
  ServicePackage,
  VehicleType,
  AdminAuditLogItem,
  AdminTeamMember,
  AdminPaymentRecord,
} from "@/types";

function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.04 3.67C14.24 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.16 12.04 20.16C10.67 20.16 9.32 19.8 8.13 19.1L7.85 18.93L4.72 19.75L5.55 16.7L5.36 16.4C4.6 15.18 4.2 13.56 4.2 11.92C4.2 7.38 7.9 3.67 12.04 3.67ZM9.12 7.02C8.95 7.02 8.78 7.08 8.64 7.33C8.44 7.68 7.89 8.2 7.89 9.25C7.89 10.3 8.66 11.31 8.76 11.45C8.87 11.59 10.28 13.77 12.44 14.71C14.23 15.48 14.6 15.33 14.98 15.3C15.54 15.25 16.77 14.56 17.02 13.85C17.28 13.14 17.28 12.53 17.2 12.41C17.12 12.29 16.92 12.22 16.63 12.07C16.33 11.92 14.88 11.21 14.61 11.11C14.34 11.01 14.15 10.96 13.95 11.25C13.76 11.54 13.2 12.22 13.03 12.41C12.86 12.61 12.69 12.63 12.39 12.48C12.1 12.33 11.15 12.02 10.02 11.01C9.14 10.22 8.54 9.25 8.37 8.96C8.2 8.67 8.35 8.51 8.5 8.36C8.63 8.23 8.79 8.01 8.94 7.84C9.09 7.67 9.14 7.54 9.24 7.34C9.34 7.14 9.29 6.97 9.21 6.82C9.14 6.67 8.54 5.2 8.29 4.61C8.05 4.03 7.8 4.11 7.62 4.1C7.45 4.1 7.25 4.09 7.05 4.09" />
    </svg>
  );
}

function getWhatsAppCleanPhone(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function getWhatsAppTemplate(
  type: "dispatch" | "confirmed" | "completed" | "rescheduled" | "custom",
  booking: BookingResponse
): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://carspa-seven.vercel.app";
  const trackingUrl = `${origin}/track?ref=${encodeURIComponent(booking.booking_reference)}`;

  if (type === "dispatch") {
    const techName = booking.assigned_staff_name || "CARSPA Mobile Detailing Crew";
    return `Hello ${booking.customer_name}! 🚗\n\nGreat news — our CARSPA mobile detailing van is *ON THE WAY* to your doorstep!\n\n📋 *Booking Ref:* #${booking.booking_reference}\n🚘 *Vehicle:* ${booking.vehicle_type_name} (${booking.service_package_name})\n📍 *Location:* ${booking.address_line}, ${booking.locality}\n👨‍🔧 *Technician:* ${techName}\n\n🕒 *Estimated Arrival:* Next 15–20 minutes\n\nPlease ensure your vehicle is parked with adequate space for our wash van.\n\n📍 *Live Track Your Service:* ${trackingUrl}\n\nCARSPA Doorstep Detailing Tricity 🚿`;
  }

  if (type === "confirmed") {
    return `Hello ${booking.customer_name}! ✅\n\nYour CARSPA doorstep car detailing booking is *CONFIRMED*!\n\n📋 *Booking Ref:* #${booking.booking_reference}\n📅 *Date:* ${booking.service_date}\n⏰ *Slot Window:* ${booking.slot_start_time.slice(0, 5)} - ${booking.slot_end_time.slice(0, 5)}\n🚘 *Vehicle:* ${booking.vehicle_type_name}\n✨ *Package:* ${booking.service_package_name}\n📍 *Service Address:* ${booking.address_line}, ${booking.locality}\n💰 *Total:* ₹${booking.final_amount} (${booking.payment_status})\n\n📍 *Track or View Details:* ${trackingUrl}\n\nSee you on ${booking.service_date}! Thank you for choosing CARSPA. 🚗✨`;
  }

  if (type === "completed") {
    return `Hello ${booking.customer_name}! 🌟\n\nYour CARSPA doorstep car detailing for *#${booking.booking_reference}* is now *COMPLETED*!\n\nWe hope you love the mirror-shine reflection and spotless interior. 🚗💎\n\n🧾 *Download Tax Invoice & Service Receipt:*\n${trackingUrl}\n\nHave feedback or need assistance? Reply directly to this WhatsApp chat or call us at +91 70878 11881.\n\nThank you for choosing CARSPA! 🚿✨`;
  }

  if (type === "rescheduled") {
    return `Hello ${booking.customer_name}! ⏰\n\nYour CARSPA doorstep appointment *#${booking.booking_reference}* has been *RESCHEDULED*.\n\n📅 *New Date:* ${booking.service_date}\n⏰ *New Slot Window:* ${booking.slot_start_time.slice(0, 5)} - ${booking.slot_end_time.slice(0, 5)}\n🚘 *Package:* ${booking.service_package_name}\n📍 *Location:* ${booking.address_line}, ${booking.locality}\n\n📍 *Track Live Status:* ${trackingUrl}\n\nIf you have any questions or need further changes, simply reply here! 🙏`;
  }

  return `Hello ${booking.customer_name}! This is CARSPA doorstep detailing regarding your booking #${booking.booking_reference}. How can we assist you today?`;
}

function getLeadWhatsAppTemplate(lead: Lead): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://carspa-seven.vercel.app";
  return `Hello ${lead.customer_name}! 👋\n\nThank you for checking out CARSPA Doorstep Car Detailing!\n\nWe bring professional studio-grade foam wash and interior detailing right to your home or office parking spot in ${lead.locality || "Tricity"}. 🚗✨\n\nWould you like help picking the perfect package for your ${lead.vehicle_type_name || "vehicle"}?\n\n👉 *Book Online in 60 seconds:* ${origin}/book\nOr feel free to reply directly here with your preferred date!`;
}

function formatWhatsAppPreview(text: string) {
  return text.split("\n").map((line, idx) => {
    const parts = line.split(/(\*[^*]+\*)/g);
    return (
      <span key={idx} className="block min-h-[1.25em]">
        {parts.map((p, i) => {
          if (p.startsWith("*") && p.endsWith("*") && p.length > 2) {
            return (
              <strong key={i} className="font-bold text-white">
                {p.slice(1, -1)}
              </strong>
            );
          }
          return <span key={i}>{p}</span>;
        })}
      </span>
    );
  });
}

export default function AdminPortalPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  // Active Tab: overview | bookings | orders | payments | customers | leads | staff | settings | team | audit
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Dashboard Data & Charts
  const [metrics, setMetrics] = useState<any | null>(null);
  const [dashboardCharts, setDashboardCharts] = useState<any | null>(null);
  const [recentActivity, setRecentActivity] = useState<any | null>(null);
  const [revenueChartRange, setRevenueChartRange] = useState<"daily" | "weekly" | "monthly">("daily");
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

  // Payments State
  const [paymentsList, setPaymentsList] = useState<AdminPaymentRecord[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentFilterStatus, setPaymentFilterStatus] = useState("ALL");
  const [refundModal, setRefundModal] = useState<{ isOpen: boolean; payment: AdminPaymentRecord | null; reason: string }>({
    isOpen: false,
    payment: null,
    reason: "",
  });
  const [processingRefund, setProcessingRefund] = useState(false);

  // Audit Logs State
  const [auditLogsList, setAuditLogsList] = useState<AdminAuditLogItem[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [auditLogSearch, setAuditLogSearch] = useState("");
  const [auditLogFilterAction, setAuditLogFilterAction] = useState("ALL");

  // Team & RBAC State
  const [teamList, setTeamList] = useState<AdminTeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [newTeamForm, setNewTeamForm] = useState({
    username: "",
    email: "",
    full_name: "",
    phone: "",
    password: "",
    role: "ADMIN",
  });
  const [savingTeam, setSavingTeam] = useState(false);
  const [updatingTeamId, setUpdatingTeamId] = useState<number | null>(null);

  // Manual Booking Creation Modal State
  const [showCreateBookingModal, setShowCreateBookingModal] = useState(false);
  const [manualBookingForm, setManualBookingForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    vehicle_type_id: 0,
    service_package_id: 0,
    service_area_id: 0,
    service_date: "",
    slot_time: "10:00",
    address_line: "",
    locality: "",
    landmark: "",
    pincode: "",
    payment_method: "PAY_ON_SERVICE",
    special_instructions: "",
  });
  const [creatingBooking, setCreatingBooking] = useState(false);

  // Status History Modal State
  const [selectedBookingHistory, setSelectedBookingHistory] = useState<{ booking: BookingResponse; history: any[] } | null>(null);
  const [loadingBookingHistory, setLoadingBookingHistory] = useState(false);

  // Customer Edit Modal State
  const [customerEditModal, setCustomerEditModal] = useState<{
    isOpen: boolean;
    customerId: number;
    full_name: string;
    email: string;
    phone: string;
  }>({
    isOpen: false,
    customerId: 0,
    full_name: "",
    email: "",
    phone: "",
  });
  const [savingCustomerEdit, setSavingCustomerEdit] = useState(false);

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

  // Pricing Matrix Inline Editor
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [priceEditValues, setPriceEditValues] = useState<{ base_price: string; discounted_price: string }>({
    base_price: "",
    discounted_price: "",
  });
  const [savingPriceId, setSavingPriceId] = useState<number | null>(null);

  // Toast helper
  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Real-time WebSocket connection for live Admin Operations
  const [showNotifications, setShowNotifications] = useState(false);
  const {
    isConnected: isWsLive,
    recentEvents,
    unreadCount,
    clearUnread,
  } = useAdminWebSocket({
    enabled: isAuthenticated === true,
    onEvent: (evt) => {
      if (evt.event === "booking_created") {
        showToast("success", `⚡ Live: New Booking #${evt.payload.booking_reference} received from ${evt.payload.customer_name}!`);
        setBookingsList((prev) => {
          if (prev.some((b) => b.booking_reference === evt.payload.booking_reference)) return prev;
          const newBooking: any = {
            id: evt.payload.booking_id,
            booking_reference: evt.payload.booking_reference,
            customer_name: evt.payload.customer_name,
            customer_phone: evt.payload.customer_phone,
            customer_email: "",
            service_package_name: evt.payload.package_name,
            vehicle_type_name: evt.payload.vehicle_name,
            service_date: evt.payload.service_date,
            slot_start_time: evt.payload.slot?.split(" - ")[0] || "10:00",
            slot_end_time: evt.payload.slot?.split(" - ")[1] || "11:00",
            address_line: evt.payload.locality || "",
            locality: evt.payload.locality || "",
            landmark: "",
            pincode: "",
            final_amount: evt.payload.final_amount,
            status: evt.payload.status || "PENDING",
            status_display: evt.payload.status || "Pending Confirmation",
            payment_status: "PENDING",
            payment_method: "PAY_ON_SERVICE",
            payment_method_display: "Pay on Arrival",
            estimated_duration_minutes: 60,
            assigned_staff_name: null,
            created_at: new Date().toISOString(),
          };
          return [newBooking, ...prev];
        });

        // Live KPI update
        setMetrics((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            bookings: {
              ...prev.bookings,
              total: (prev.bookings?.total || 0) + 1,
              pending: (prev.bookings?.pending || 0) + 1,
            },
          };
        });
      } else if (evt.event === "booking_status_updated") {
        showToast("success", `⚡ Status updated: #${evt.payload.booking_reference} is now ${evt.payload.new_status}`);
        setBookingsList((prev) =>
          prev.map((b) =>
            b.booking_reference === evt.payload.booking_reference
              ? { ...b, status: evt.payload.new_status, status_display: evt.payload.new_status }
              : b
          )
        );
      } else if (evt.event === "payment_received") {
        showToast("success", `⚡ Payment Confirmed: #${evt.payload.booking_reference} marked as PAID`);
        setBookingsList((prev) =>
          prev.map((b) =>
            b.booking_reference === evt.payload.booking_reference
              ? { ...b, payment_status: "PAID" }
              : b
          )
        );
      }
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedRef(text);
    showToast("success", `Copied "${text}" to clipboard`);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // WhatsApp Customer Dispatch & Notification Modal State
  const [whatsAppModal, setWhatsAppModal] = useState<{
    isOpen: boolean;
    phone: string;
    customerName: string;
    bookingRef?: string;
    templateType: "dispatch" | "confirmed" | "completed" | "rescheduled" | "lead" | "custom";
    message: string;
    booking?: BookingResponse | null;
    lead?: Lead | null;
  } | null>(null);
  const [copiedWAMessage, setCopiedWAMessage] = useState(false);

  const openWhatsAppModal = (
    booking: BookingResponse,
    defaultType?: "dispatch" | "confirmed" | "completed" | "rescheduled" | "custom"
  ) => {
    let type: "dispatch" | "confirmed" | "completed" | "rescheduled" | "custom" = defaultType || "dispatch";
    if (!defaultType) {
      if (booking.status === "PENDING") type = "confirmed";
      else if (booking.status === "CONFIRMED") type = "dispatch";
      else if (booking.status === "COMPLETED") type = "completed";
      else type = "custom";
    }
    const initialMsg = getWhatsAppTemplate(type, booking);
    setWhatsAppModal({
      isOpen: true,
      phone: booking.customer_phone,
      customerName: booking.customer_name,
      bookingRef: booking.booking_reference,
      templateType: type,
      message: initialMsg,
      booking,
      lead: null,
    });
  };

  const openLeadWhatsAppModal = (lead: Lead) => {
    const initialMsg = getLeadWhatsAppTemplate(lead);
    setWhatsAppModal({
      isOpen: true,
      phone: lead.mobile_number,
      customerName: lead.customer_name,
      bookingRef: lead.booking_reference,
      templateType: "lead",
      message: initialMsg,
      booking: null,
      lead,
    });
  };

  const handleSwitchTemplate = (type: "dispatch" | "confirmed" | "completed" | "rescheduled" | "custom") => {
    if (!whatsAppModal || !whatsAppModal.booking) return;
    const newMsg = getWhatsAppTemplate(type, whatsAppModal.booking);
    setWhatsAppModal({
      ...whatsAppModal,
      templateType: type,
      message: newMsg,
    });
  };

  const handleSendWhatsApp = () => {
    if (!whatsAppModal) return;
    const fullPhone = getWhatsAppCleanPhone(whatsAppModal.phone);
    const encoded = encodeURIComponent(whatsAppModal.message);
    const url = `https://wa.me/${fullPhone}?text=${encoded}`;
    window.open(url, "_blank", "noopener,noreferrer");
    showToast("success", `WhatsApp window opened for ${whatsAppModal.customerName}`);
  };

  const handleCopyWAMessage = () => {
    if (!whatsAppModal) return;
    navigator.clipboard.writeText(whatsAppModal.message);
    setCopiedWAMessage(true);
    setTimeout(() => setCopiedWAMessage(false), 2000);
    showToast("success", "Message copied to clipboard!");
  };

  // Close WhatsApp Modal on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && whatsAppModal?.isOpen) {
        setWhatsAppModal(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [whatsAppModal]);

  // Registered Customers State
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerStatusFilter, setCustomerStatusFilter] = useState("ALL");
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<any | null>(null);
  const [loadingCustomerDetail, setLoadingCustomerDetail] = useState(false);
  const [togglingStatusId, setTogglingStatusId] = useState<number | null>(null);
  const [customerModalTab, setCustomerModalTab] = useState<"bookings" | "payments" | "vehicles" | "addresses">("bookings");

  const fetchCustomers = async (searchQuery = customerSearch, statusVal = customerStatusFilter) => {
    setLoadingCustomers(true);
    try {
      const params: Record<string, string> = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusVal !== "ALL") params.status = statusVal;
      const res = await api.getAdminCustomers(params);
      const list = Array.isArray(res) ? res : (res as any)?.results || [];
      setCustomers(list);
    } catch {
      showToast("error", "Failed to fetch registered customers");
    } finally {
      setLoadingCustomers(false);
    }
  };

  const viewCustomerDetail = async (id: number) => {
    setLoadingCustomerDetail(true);
    setSelectedCustomerDetail(null);
    setCustomerModalTab("bookings");
    try {
      const data = await api.getAdminCustomer(id);
      setSelectedCustomerDetail(data);
    } catch {
      showToast("error", "Failed to load customer profile details");
    } finally {
      setLoadingCustomerDetail(false);
    }
  };

  const handleToggleCustomerStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setTogglingStatusId(id);
    try {
      await api.toggleAdminCustomerStatus(id, nextStatus);
      showToast("success", `Customer status changed to ${nextStatus}`);
      setCustomers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, account_status: nextStatus } : c))
      );
      if (selectedCustomerDetail && selectedCustomerDetail.profile?.id === id) {
        setSelectedCustomerDetail((prev: any) => ({
          ...prev,
          profile: { ...prev.profile, account_status: nextStatus },
        }));
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to toggle status");
    } finally {
      setTogglingStatusId(null);
    }
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
    } else if (activeTab === "bookings" || activeTab === "orders") {
      fetchBookings();
      fetchStaff();
    } else if (activeTab === "payments") {
      fetchPayments();
    } else if (activeTab === "customers") {
      fetchCustomers();
    } else if (activeTab === "leads") {
      fetchLeads();
    } else if (activeTab === "staff") {
      fetchStaff();
    } else if (activeTab === "settings") {
      fetchConfig();
    } else if (activeTab === "team") {
      fetchTeam();
    } else if (activeTab === "audit") {
      fetchAuditLogs();
    }
  }, [isAuthenticated, activeTab]);

  // Re-fetch customers when status filter changes
  useEffect(() => {
    if (!isAuthenticated || activeTab !== "customers") return;
    fetchCustomers(customerSearch, customerStatusFilter);
  }, [customerStatusFilter]);

  // Re-fetch payments when payment filter changes
  useEffect(() => {
    if (!isAuthenticated || activeTab !== "payments") return;
    fetchPayments(paymentSearch, paymentFilterStatus);
  }, [paymentFilterStatus]);

  // Re-fetch audit logs when action filter changes
  useEffect(() => {
    if (!isAuthenticated || activeTab !== "audit") return;
    fetchAuditLogs(auditLogSearch, auditLogFilterAction);
  }, [auditLogFilterAction]);

  // Re-fetch bookings when filters change
  useEffect(() => {
    if (!isAuthenticated || (activeTab !== "bookings" && activeTab !== "orders")) return;
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
      setDashboardCharts(data.charts || null);
      setRecentActivity(data.recent_activity || null);
      setUpcomingBookings(data.upcoming_appointments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const fetchPayments = async (searchQuery = paymentSearch, statusVal = paymentFilterStatus) => {
    setLoadingPayments(true);
    try {
      const params: Record<string, string> = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusVal !== "ALL") params.status = statusVal;
      const res = await api.adminGetPayments(params);
      const list = Array.isArray(res) ? res : (res as any)?.results || [];
      setPaymentsList(list);
    } catch {
      showToast("error", "Failed to load payment transactions");
    } finally {
      setLoadingPayments(false);
    }
  };

  const fetchAuditLogs = async (searchQuery = auditLogSearch, actionVal = auditLogFilterAction) => {
    setLoadingAuditLogs(true);
    try {
      const params: Record<string, string> = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (actionVal !== "ALL") params.action = actionVal;
      const res = await api.adminGetAuditLogs(params);
      const list = Array.isArray(res) ? res : (res as any)?.results || [];
      setAuditLogsList(list);
    } catch {
      showToast("error", "Failed to load administrative audit logs");
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  const fetchTeam = async () => {
    setLoadingTeam(true);
    try {
      const res = await api.adminGetTeam();
      const list = Array.isArray(res) ? res : (res as any)?.results || [];
      setTeamList(list);
    } catch {
      showToast("error", "Failed to load administrative team accounts");
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleManualBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBookingForm.customer_name || !manualBookingForm.customer_phone || !manualBookingForm.service_date || !manualBookingForm.slot_time) {
      showToast("error", "Please fill in all required customer, date, and slot details.");
      return;
    }
    setCreatingBooking(true);
    try {
      const res = await api.adminCreateBooking(manualBookingForm);
      showToast("success", `Booking #${res.booking_reference} created successfully for ${res.customer_name}!`);
      setShowCreateBookingModal(false);
      setManualBookingForm({
        customer_name: "",
        customer_phone: "",
        customer_email: "",
        vehicle_type_id: vehicleTypes[0]?.id || 0,
        service_package_id: servicePackages[0]?.id || 0,
        service_area_id: 0,
        service_date: "",
        slot_time: "10:00",
        address_line: "",
        locality: "",
        landmark: "",
        pincode: "",
        payment_method: "PAY_ON_SERVICE",
        special_instructions: "",
      });
      fetchBookings();
      fetchDashboardMetrics();
    } catch (err: any) {
      showToast("error", err.message || "Failed to create booking.");
    } finally {
      setCreatingBooking(false);
    }
  };

  const handleTransitionBookingStatus = async (bookingId: number, newStatus: string, notes = "") => {
    try {
      const updated = await api.adminTransitionBookingStatus(bookingId, newStatus, notes);
      showToast("success", `Booking #${updated.booking_reference} status changed to ${newStatus}!`);
      fetchBookings();
      fetchDashboardMetrics();
    } catch (err: any) {
      showToast("error", err.message || "Failed to update booking status.");
    }
  };

  const handleViewBookingHistory = async (booking: BookingResponse) => {
    setLoadingBookingHistory(true);
    setSelectedBookingHistory({ booking, history: [] });
    try {
      const history = await api.adminGetBookingHistory(booking.id);
      setSelectedBookingHistory({ booking, history });
    } catch {
      showToast("error", "Failed to load status change history");
    } finally {
      setLoadingBookingHistory(false);
    }
  };

  const handleSaveCustomerEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerEditModal.full_name || !customerEditModal.phone) {
      showToast("error", "Name and mobile number are required.");
      return;
    }
    setSavingCustomerEdit(true);
    try {
      const updated = await api.adminUpdateCustomer(customerEditModal.customerId, {
        full_name: customerEditModal.full_name,
        email: customerEditModal.email,
        phone: customerEditModal.phone,
      });
      showToast("success", `Customer ${updated.full_name} profile updated successfully.`);
      setCustomerEditModal({ isOpen: false, customerId: 0, full_name: "", email: "", phone: "" });
      fetchCustomers();
      if (selectedCustomerDetail && selectedCustomerDetail.profile?.id === customerEditModal.customerId) {
        setSelectedCustomerDetail((prev: any) => ({ ...prev, profile: updated }));
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to update customer profile.");
    } finally {
      setSavingCustomerEdit(false);
    }
  };

  const handleRefundPaymentSubmit = async () => {
    if (!refundModal.payment) return;
    setProcessingRefund(true);
    try {
      await api.adminRefundPayment(refundModal.payment.id, refundModal.reason || "Refund issued by admin");
      showToast("success", `Payment #${refundModal.payment.payment_id || refundModal.payment.id} marked as REFUNDED.`);
      setRefundModal({ isOpen: false, payment: null, reason: "" });
      fetchPayments();
      fetchBookings();
      fetchDashboardMetrics();
    } catch (err: any) {
      showToast("error", err.message || "Failed to process refund.");
    } finally {
      setProcessingRefund(false);
    }
  };

  const handleCreateTeamMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamForm.username || !newTeamForm.password || !newTeamForm.email) {
      showToast("error", "Username, email, and password are required.");
      return;
    }
    setSavingTeam(true);
    try {
      const created = await api.adminCreateTeamMember(newTeamForm);
      showToast("success", `Admin account "${created.username}" (${created.role}) created successfully!`);
      setShowAddTeamModal(false);
      setNewTeamForm({ username: "", email: "", full_name: "", phone: "", password: "", role: "ADMIN" });
      fetchTeam();
    } catch (err: any) {
      showToast("error", err.message || "Failed to create admin account.");
    } finally {
      setSavingTeam(false);
    }
  };

  const handleToggleTeamMember = async (id: number) => {
    setUpdatingTeamId(id);
    try {
      const res = await api.adminToggleTeamMember(id);
      showToast("success", res.message || "Status updated.");
      fetchTeam();
    } catch (err: any) {
      showToast("error", err.message || "Failed to toggle status.");
    } finally {
      setUpdatingTeamId(null);
    }
  };

  const handleUpdateTeamRole = async (id: number, newRole: string) => {
    setUpdatingTeamId(id);
    try {
      const res = await api.adminUpdateTeamRole(id, newRole);
      showToast("success", res.message || "Role updated.");
      fetchTeam();
    } catch (err: any) {
      showToast("error", err.message || "Failed to update role.");
    } finally {
      setUpdatingTeamId(null);
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

  const handleStartEditPrice = (price: any) => {
    setEditingPriceId(price.id);
    setPriceEditValues({
      base_price: price.base_price !== undefined && price.base_price !== null ? String(price.base_price) : "",
      discounted_price: price.discounted_price ? String(price.discounted_price) : "",
    });
  };

  const handleCancelEditPrice = () => {
    setEditingPriceId(null);
    setPriceEditValues({ base_price: "", discounted_price: "" });
  };

  const handleSavePrice = async (priceId: number) => {
    setSavingPriceId(priceId);
    try {
      const payload: any = {
        base_price: priceEditValues.base_price,
        discounted_price:
          priceEditValues.discounted_price.trim() === ""
            ? null
            : priceEditValues.discounted_price,
      };
      await api.updateAdminPrice(priceId, payload);
      showToast("success", "Service package rate updated successfully");
      setEditingPriceId(null);
      // Refresh package data
      const updatedPackages = await api.getServicePackages();
      setServicePackages(updatedPackages);
    } catch (err: any) {
      showToast("error", err.message || "Failed to update package rate");
    } finally {
      setSavingPriceId(null);
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
      <div className="max-w-md mx-auto px-4 py-28 relative">
        <div className="absolute -top-12 -left-12 w-72 h-72 bg-cyan-500/10 blur-[90px] rounded-full pointer-events-none" />
        <div className="bg-[#0B1220]/90 backdrop-blur-md p-8 rounded-3xl border border-white/10 space-y-6 shadow-2xl relative z-10">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto shadow-inner shadow-cyan-500/20">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Administrator Login</h2>
            <p className="text-xs text-slate-400">
              Access booking controls, capacity engine, user management &amp; CRM.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Username or Email</label>
              <input
                type="text"
                required
                placeholder="admin or admin@carspa.in"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Password</label>
              <div className="relative">
                <input
                  type={showLoginPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full bg-[#060A14] border border-white/10 rounded-xl pl-3 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2"
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

      {/* Top Header with Role & Quick Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-white/10 gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-black text-cyan-400 uppercase tracking-widest">
              Control Center
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                adminUser?.role === "SUPER_ADMIN"
                  ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                  : adminUser?.role === "ADMIN"
                  ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                  : adminUser?.role === "MANAGER"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              }`}
            >
              {adminUser?.role ? adminUser.role.replace("_", " ") : "SUPER ADMIN"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5">
            Operations &amp; Management Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-white block">
              {adminUser?.full_name || adminUser?.username || "Administrator"}
            </span>
            <span className="text-[11px] text-emerald-400 font-semibold flex items-center justify-end gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Authenticated Session
            </span>
          </div>

          {/* Live WebSocket Operations Stream Indicator */}
          <div
            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${
              isWsLive
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-slate-800/40 border-slate-700 text-slate-400"
            }`}
            title={isWsLive ? "Connected to Django Channels WebSocket" : "Connecting to Real-time Stream..."}
          >
            <span className="relative flex h-2 w-2">
              {isWsLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isWsLive ? "bg-emerald-400" : "bg-slate-500"}`} />
            </span>
            <span>{isWsLive ? "Live Stream Active" : "Connecting..."}</span>
          </div>

          {/* Real-time Notification Bell Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowNotifications((prev) => !prev);
                clearUnread();
              }}
              className="relative flex items-center justify-center p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Real-time Event Feed"
            >
              <Bell className="w-4 h-4 text-cyan-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-cyan-500 text-[#060B13] font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-bounce shadow-md shadow-cyan-500/50">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-[#0B1220]/95 border border-cyan-500/30 rounded-2xl shadow-2xl p-4 z-50 backdrop-blur-xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Live Operations Stream
                    </span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    {recentEvents.length} events
                  </span>
                </div>
                {recentEvents.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    Listening for incoming bookings, payments, and driver dispatches...
                  </p>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {recentEvents.map((evt, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-cyan-300 text-[11px] uppercase">
                            {evt.event.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {evt.timestamp}
                          </span>
                        </div>
                        <p className="text-slate-300 text-[11px]">
                          {evt.event === "booking_created"
                            ? `Ref: #${evt.payload.booking_reference} • ${evt.payload.customer_name} • ₹${evt.payload.final_amount}`
                            : evt.event === "booking_status_updated"
                            ? `Ref: #${evt.payload.booking_reference} ➔ ${evt.payload.new_status}`
                            : evt.event === "payment_received"
                            ? `Payment confirmed for #${evt.payload.booking_reference}`
                            : JSON.stringify(evt.payload)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (activeTab === "overview") fetchDashboardMetrics();
              else if (activeTab === "bookings" || activeTab === "orders") fetchBookings();
              else if (activeTab === "payments") fetchPayments();
              else if (activeTab === "customers") fetchCustomers();
              else if (activeTab === "leads") fetchLeads();
              else if (activeTab === "staff") fetchStaff();
              else if (activeTab === "settings") fetchConfig();
              else if (activeTab === "team") fetchTeam();
              else if (activeTab === "audit") fetchAuditLogs();
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 px-3 py-2 rounded-xl transition-all shadow-sm"
            title="Refresh current tab"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-rose-400 bg-white/[0.04] hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 px-3.5 py-2 rounded-xl transition-all shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation (10 Centralized Tabs) */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3 relative z-10 overflow-x-auto">
        {[
          { id: "overview", label: "Overview & Analytics", icon: TrendingUp },
          { id: "bookings", label: "Bookings", icon: Calendar },
          { id: "orders", label: "Orders & Packages", icon: Layers },
          { id: "payments", label: "Payments (Razorpay)", icon: CreditCard },
          { id: "customers", label: "Customers", icon: UserCheck },
          { id: "leads", label: "CRM Leads", icon: FileText },
          { id: "staff", label: "Technicians & Staff", icon: Users },
          { id: "settings", label: "Capacity & Pricing", icon: Settings },
          { id: "team", label: "Admin Team & RBAC", icon: Shield },
          { id: "audit", label: "Audit Logs", icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 font-bold border border-cyan-400/30"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.06] border border-transparent"
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
        <div className="space-y-8 relative z-10">
          {/* Top 4 Real-time KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Users */}
            <div className="bg-[#0B1220]/90 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl shadow-black/30 space-y-2 hover:border-cyan-500/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Registered Customers
                </span>
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white">
                {metrics ? metrics.total_users : "—"}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                <span className="text-cyan-400 font-semibold">+{metrics?.new_users_today || 0} today</span>
                <span>•</span>
                <span>+{metrics?.new_users_this_week || 0} this week</span>
                <span>•</span>
                <span>+{metrics?.new_users_this_month || 0} month</span>
              </div>
            </div>

            {/* Card 2: Revenue */}
            <div className="bg-[#0B1220]/90 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl shadow-black/30 space-y-2 hover:border-emerald-500/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Collected Revenue (PAID)
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-400">
                ₹{metrics ? metrics.total_revenue : "0.00"}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                <span className="text-emerald-400 font-semibold">₹{metrics?.today_revenue || "0.00"} today</span>
                <span>•</span>
                <span>₹{metrics?.this_month_revenue || "0.00"} month</span>
                <span>•</span>
                <span>Avg ₹{metrics?.avg_booking_value || "0"}</span>
              </div>
            </div>

            {/* Card 3: Bookings */}
            <div className="bg-[#0B1220]/90 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl shadow-black/30 space-y-2 hover:border-amber-500/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Total Bookings
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white">
                {metrics ? metrics.total_bookings : "—"}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                <span className="text-amber-400 font-semibold">{metrics?.pending_confirmations || 0} pending</span>
                <span>•</span>
                <span className="text-cyan-400">{metrics?.confirmed_count || 0} confirmed</span>
                <span>•</span>
                <span className="text-emerald-400">{metrics?.completed_count || 0} completed</span>
              </div>
            </div>

            {/* Card 4: Payments & Conversion */}
            <div className="bg-[#0B1220]/90 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl shadow-black/30 space-y-2 hover:border-purple-500/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Payment Health &amp; CRM
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-purple-300">
                {metrics ? `${metrics.payments_paid} Paid` : "—"}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                <span className="text-amber-400">{metrics?.payments_pending || 0} pending</span>
                <span>•</span>
                <span className="text-rose-400">{metrics?.payments_failed || 0} failed</span>
                <span>•</span>
                <span className="text-cyan-400">{metrics?.conversion_rate || "0%"} conv</span>
              </div>
            </div>
          </div>

          {/* Performance & Revenue Trend Visual Chart */}
          <div className="bg-[#0B1220]/90 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  <span>Revenue &amp; Booking Performance Trends</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Database-verified timeline of collected revenue and appointment volume.
                </p>
              </div>

              {/* Time Range Pills */}
              <div className="flex items-center bg-[#060A14] p-1 rounded-xl border border-white/10 self-start sm:self-auto">
                {(["daily", "weekly", "monthly"] as const).map((rng) => (
                  <button
                    key={rng}
                    onClick={() => setRevenueChartRange(rng)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                      revenueChartRange === rng
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {rng === "daily" ? "Daily (14D)" : rng === "weekly" ? "Weekly (8W)" : "Monthly (6M)"}
                  </button>
                ))}
              </div>
            </div>

            {/* Bar Chart Visualization */}
            <div className="pt-4">
              {(() => {
                const chartData = dashboardCharts ? dashboardCharts[revenueChartRange] || [] : [];
                if (chartData.length === 0) {
                  return (
                    <div className="p-12 text-center text-xs text-slate-500">
                      No trend data available for this timeline.
                    </div>
                  );
                }
                const maxRev = Math.max(...chartData.map((d: any) => d.revenue || 0), 100);
                return (
                  <div className="space-y-2">
                    <div className="h-44 flex items-end gap-2 sm:gap-3 pt-6 pb-2 border-b border-white/10 overflow-x-auto">
                      {chartData.map((item: any, idx: number) => {
                        const rev = item.revenue || 0;
                        const heightPct = Math.max(Math.round((rev / maxRev) * 100), 8);
                        const label = item.date ? item.date.slice(5) : item.week || item.month || `#${idx + 1}`;
                        return (
                          <div
                            key={idx}
                            className="flex-1 min-w-[28px] sm:min-w-[40px] flex flex-col items-center gap-1 group relative h-full justify-end"
                          >
                            {/* Hover Tooltip */}
                            <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-cyan-500/30 px-2 py-1 rounded-lg text-[10px] text-white whitespace-nowrap shadow-lg pointer-events-none z-20">
                              <span className="font-bold text-cyan-400">₹{rev}</span> • {item.bookings || 0} jobs
                            </div>

                            {/* Bar */}
                            <div
                              style={{ height: `${heightPct}%` }}
                              className="w-full rounded-t-lg bg-gradient-to-t from-cyan-600/70 to-blue-500/90 group-hover:from-cyan-400 group-hover:to-blue-400 transition-all shadow-md shadow-cyan-500/10"
                            />
                            {/* X-axis Label */}
                            <span className="text-[10px] text-slate-400 truncate w-full text-center">
                              {label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>Low: ₹0</span>
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500" />
                        <span>Revenue (₹) &amp; Booking Volume</span>
                      </span>
                      <span>Peak: ₹{maxRev}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Breakdown Distributions: 2 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Status Distributions */}
            <div className="bg-[#0B1220]/90 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-cyan-400" />
                <span>Booking &amp; Payment Status Breakdown</span>
              </h4>

              <div className="space-y-4">
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block mb-2">
                    Booking Lifecycle Stages
                  </span>
                  <div className="space-y-2">
                    {(dashboardCharts?.status_distribution || [
                      { status: "CONFIRMED", count: metrics?.confirmed_count || 0, color: "bg-cyan-500" },
                      { status: "COMPLETED", count: metrics?.completed_count || 0, color: "bg-emerald-500" },
                      { status: "PENDING", count: metrics?.pending_confirmations || 0, color: "bg-amber-500" },
                      { status: "CANCELLED", count: metrics?.cancelled_count || 0, color: "bg-rose-500" },
                    ]).map((st: any) => {
                      const total = Number(metrics?.total_bookings) || 1;
                      const pct = Math.round((Number(st.count || 0) / total) * 100);
                      return (
                        <div key={st.status} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-slate-300">{st.status}</span>
                            <span className="text-slate-400 font-mono">{st.count} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                            <div style={{ width: `${pct}%` }} className={`h-full rounded-full ${st.color || "bg-cyan-500"}`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block mb-2">
                    Payment Gateway Records (Razorpay)
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                      <span className="text-[10px] text-emerald-400 uppercase font-bold block">Paid / Settled</span>
                      <span className="text-lg font-black text-white">{metrics?.payments_paid || 0}</span>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
                      <span className="text-[10px] text-amber-400 uppercase font-bold block">Pending</span>
                      <span className="text-lg font-black text-white">{metrics?.payments_pending || 0}</span>
                    </div>
                    <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                      <span className="text-[10px] text-rose-400 uppercase font-bold block">Failed</span>
                      <span className="text-lg font-black text-white">{metrics?.payments_failed || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Popular Services & Vehicles */}
            <div className="bg-[#0B1220]/90 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-cyan-400" />
                <span>Service Popularity &amp; Vehicle Demand</span>
              </h4>

              <div className="space-y-4">
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block mb-2">
                    Most Booked Detailing Packages
                  </span>
                  <div className="space-y-2.5">
                    {(dashboardCharts?.popular_services || []).length === 0 ? (
                      <span className="text-xs text-slate-500">No package data available yet.</span>
                    ) : (
                      dashboardCharts.popular_services.map((item: any, i: number) => {
                        const maxCount = Math.max(...dashboardCharts.popular_services.map((s: any) => s.count), 1);
                        const pct = Math.round((item.count / maxCount) * 100);
                        return (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-semibold text-white truncate pr-2">{item.name}</span>
                              <span className="text-cyan-400 font-bold shrink-0">{item.count} bookings</span>
                            </div>
                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                              <div style={{ width: `${pct}%` }} className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block mb-2">
                    Vehicle Type Distribution
                  </span>
                  <div className="space-y-2">
                    {(dashboardCharts?.popular_vehicles || []).length === 0 ? (
                      <span className="text-xs text-slate-500">No vehicle data available yet.</span>
                    ) : (
                      dashboardCharts.popular_vehicles.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-white/[0.02] p-2 rounded-xl border border-white/5">
                          <span className="text-slate-300 font-medium">{item.name}</span>
                          <span className="text-slate-400 font-mono text-[11px] font-bold">{item.count} orders</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 360 Recent Activity Streams (3 Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stream 1: Recent Bookings */}
            <div className="bg-[#0B1220]/90 backdrop-blur-md p-5 rounded-3xl border border-white/10 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Recent Bookings</span>
                </span>
                <button onClick={() => setActiveTab("bookings")} className="text-[10px] text-cyan-400 hover:underline">
                  View all
                </button>
              </div>
              <div className="space-y-2.5">
                {(recentActivity?.recent_bookings || []).length === 0 ? (
                  <p className="text-xs text-slate-500 p-2">No bookings recorded yet.</p>
                ) : (
                  recentActivity.recent_bookings.map((b: any) => (
                    <div key={b.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-cyan-400 font-bold">{b.reference}</span>
                        <span className="text-emerald-400 font-bold">₹{b.amount}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-300">
                        <span>{b.customer_name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-300 font-semibold">
                          {b.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 block truncate">{b.service}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Stream 2: Recent Customer Signups */}
            <div className="bg-[#0B1220]/90 backdrop-blur-md p-5 rounded-3xl border border-white/10 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>New Customer Signups</span>
                </span>
                <button onClick={() => setActiveTab("customers")} className="text-[10px] text-cyan-400 hover:underline">
                  View all
                </button>
              </div>
              <div className="space-y-2.5">
                {(recentActivity?.recent_users || []).length === 0 ? (
                  <p className="text-xs text-slate-500 p-2">No customers registered yet.</p>
                ) : (
                  recentActivity.recent_users.map((u: any) => (
                    <div key={u.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-white">{u.name}</span>
                        <span className="font-mono text-[10px] text-cyan-400 font-bold">{u.user_id}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{u.email || u.phone}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Stream 3: Recent Payments */}
            <div className="bg-[#0B1220]/90 backdrop-blur-md p-5 rounded-3xl border border-white/10 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                  <span>Razorpay Transactions</span>
                </span>
                <button onClick={() => setActiveTab("payments")} className="text-[10px] text-cyan-400 hover:underline">
                  View all
                </button>
              </div>
              <div className="space-y-2.5">
                {(recentActivity?.recent_payments || []).length === 0 ? (
                  <p className="text-xs text-slate-500 p-2">No transactions recorded yet.</p>
                ) : (
                  recentActivity.recent_payments.map((p: any) => (
                    <div key={p.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-[11px] text-slate-300 truncate max-w-[130px]">
                          {p.payment_id || p.order_id || `#${p.id}`}
                        </span>
                        <span className="text-emerald-400 font-bold">₹{p.amount}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400 truncate">{p.customer}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          p.status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-300"
                            : p.status === "REFUNDED"
                            ? "bg-purple-500/10 text-purple-300"
                            : "bg-amber-500/10 text-amber-300"
                        }`}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Upcoming appointments */}
          <div className="bg-[#0B1220]/90 backdrop-blur-md rounded-3xl border border-white/10 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <div>
                <h3 className="text-base font-bold text-white">Upcoming Doorstep Appointments</h3>
                <p className="text-xs text-slate-400">Next scheduled detailing units ready for dispatch</p>
              </div>
              <button
                onClick={fetchDashboardMetrics}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
                title="Refresh Metrics"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#080D1A] text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/10">
                  <tr>
                    <th className="p-4">Reference</th>
                    <th className="p-4">Date &amp; Slot</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Car &amp; Package</th>
                    <th className="p-4">Locality</th>
                    <th className="p-4">Technician</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Dispatch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {upcomingBookings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        No upcoming bookings found.
                      </td>
                    </tr>
                  ) : (
                    upcomingBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="p-4 font-mono font-bold text-cyan-400">
                          {b.booking_reference}
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-white block">{b.service_date}</span>
                          <span className="text-slate-400 text-[11px]">{b.slot_start_time}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-white block">{b.customer_name}</span>
                          <span className="text-slate-400 font-mono text-[11px]">{b.customer_phone}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold block text-white">
                            {b.service_package_name}
                          </span>
                          <span className="text-slate-400 text-[11px]">{b.vehicle_type_name}</span>
                        </td>
                        <td className="p-4 text-slate-300">{b.locality}</td>
                        <td className="p-4">
                          {b.assigned_staff_name ? (
                            <span className="text-emerald-400 font-medium">
                              {b.assigned_staff_name}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                            {b.status_display}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => openWhatsAppModal(b, b.status === "CONFIRMED" ? "dispatch" : "confirmed")}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-semibold text-[11px] inline-flex items-center gap-1.5 transition-all shadow-sm"
                            title="1-Click WhatsApp Dispatch & Notification"
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>
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
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">Customer Bookings</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-semibold">
                  {bookingsList.length} {bookingsList.length === 1 ? "booking" : "bookings"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Real-time doorstep appointments submitted through the website. Confirm, reschedule, assign, and mark completed.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setManualBookingForm({
                    customer_name: "",
                    customer_phone: "",
                    customer_email: "",
                    vehicle_type_id: vehicleTypes[0]?.id || 0,
                    service_package_id: servicePackages[0]?.id || 0,
                    service_area_id: 0,
                    service_date: new Date().toISOString().split("T")[0],
                    slot_time: "10:00",
                    address_line: "",
                    locality: "",
                    landmark: "",
                    pincode: "",
                    payment_method: "PAY_ON_SERVICE",
                    special_instructions: "",
                  });
                  setShowCreateBookingModal(true);
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 px-3.5 py-2 rounded-xl transition-all shadow-md shadow-cyan-500/25 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Create Booking</span>
              </button>

              <button
                onClick={fetchBookings}
                disabled={loadingBookings}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 px-3 py-2 rounded-xl transition-all shadow-sm"
                title="Refresh Bookings"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingBookings ? "animate-spin text-sky-600" : ""}`} />
                <span>Refresh</span>
              </button>

              <a
                href={`${api.getApiBaseUrl()}/api/admin/bookings/export-csv/`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-xl hover:bg-emerald-500/20 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </a>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-[#0B1220]/90 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-3 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
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
                  className="w-full bg-[#060A14] border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-colors"
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
                  className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-colors"
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
                  className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-colors"
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
                  className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-colors"
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
                  className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-colors"
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
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/10 text-xs">
              <span className="text-[11px] text-slate-400 font-medium">Filter Date:</span>
              <input
                type="date"
                value={bookingFilterDate}
                onChange={(e) => setBookingFilterDate(e.target.value)}
                className="bg-[#060A14] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-400 transition-colors"
              />
              <button
                type="button"
                onClick={() => {
                  const today = new Date().toISOString().split("T")[0];
                  setBookingFilterDate(today);
                }}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/5 text-[11px] font-medium transition-colors"
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
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/5 text-[11px] font-medium transition-colors"
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
                className="ml-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-md shadow-cyan-500/20"
              >
                Apply Filters
              </button>
            </div>
          </div>

          {/* Bookings Table / List */}
          <div className="bg-[#0B1220]/90 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#080D1A] text-slate-400 uppercase tracking-wider text-[10px] border-b border-white/10 font-bold">
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
                <tbody className="divide-y divide-white/5 text-slate-300">
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
                        <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-3 text-slate-400">
                          <Calendar className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-white mb-1">No bookings found</p>
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
                        className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                        onClick={() => setSelectedBooking(b)}
                      >
                        {/* Reference */}
                        <td className="p-3.5 align-top">
                          <div className="flex items-center gap-1.5 font-mono font-bold text-cyan-400 text-xs">
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
                          <span className="font-bold text-white block text-xs">
                            {b.customer_name}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-slate-500 font-mono text-[11px]">
                              {b.customer_phone}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openWhatsAppModal(b);
                              }}
                              className="text-emerald-400 hover:text-emerald-300 text-[10px] p-0.5 rounded hover:bg-emerald-500/10 transition-colors inline-flex items-center"
                              title="1-Click WhatsApp Dispatch & Notification"
                            >
                              <WhatsAppIcon className="w-3.5 h-3.5" />
                            </button>
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
                          <span className="font-bold text-white block text-xs">
                            {b.service_package_name}
                          </span>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                            {b.vehicle_type_name}
                          </span>
                        </td>

                        {/* Date & Slot */}
                        <td className="p-3.5 align-top whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-semibold text-white text-xs">
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
                          <span className="font-semibold text-white block text-xs truncate">
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
                          <span className="font-black text-emerald-400 block text-sm">
                            ₹{b.final_amount}
                          </span>
                          <div className="mt-1 flex items-center gap-1.5">
                            {b.payment_status === "PAID" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                Paid
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                {b.payment_status}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Booking Status */}
                        <td className="p-3.5 align-top whitespace-nowrap">
                          {b.status === "PENDING" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              <Clock className="w-3 h-3" />
                              <span>Pending</span>
                            </span>
                          )}
                          {b.status === "CONFIRMED" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Confirmed</span>
                            </span>
                          )}
                          {b.status === "ASSIGNED" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                              <User className="w-3 h-3" />
                              <span>Assigned</span>
                            </span>
                          )}
                          {b.status === "IN_PROGRESS" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>In Progress</span>
                            </span>
                          )}
                          {b.status === "COMPLETED" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <Check className="w-3 h-3" />
                              <span>Completed</span>
                            </span>
                          )}
                          {b.status === "CANCELLED" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              <XCircle className="w-3 h-3" />
                              <span>Cancelled</span>
                            </span>
                          )}

                          {b.assigned_staff_name && (
                            <span className="text-[10px] text-slate-500 block mt-1 font-medium">
                              Tech: {b.assigned_staff_name}
                            </span>
                          )}

                          {/* Quick Status Transition Dropdown */}
                          <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={b.status}
                              onChange={(e) => handleTransitionBookingStatus(b.id, e.target.value)}
                              className="bg-[#060A14] border border-white/10 rounded-lg px-2 py-0.5 text-[10px] font-semibold text-slate-300 focus:outline-none focus:border-cyan-400 cursor-pointer"
                              title="Transition booking status"
                            >
                              <option value="PENDING">PENDING</option>
                              <option value="CONFIRMED">CONFIRMED</option>
                              <option value="ASSIGNED">ASSIGNED</option>
                              <option value="IN_PROGRESS">IN_PROGRESS</option>
                              <option value="COMPLETED">COMPLETED</option>
                              <option value="CANCELLED">CANCELLED</option>
                            </select>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 align-top text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* View Details */}
                            <button
                              onClick={() => setSelectedBooking(b)}
                              className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-[11px] font-semibold flex items-center gap-1 border border-white/10 shadow-sm transition-colors"
                              title="View full booking details"
                            >
                              <Eye className="w-3 h-3 text-sky-600" />
                              <span>View</span>
                            </button>

                            {/* View Status History */}
                            <button
                              onClick={() => handleViewBookingHistory(b)}
                              className="px-2 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-300 text-[10px] font-semibold flex items-center gap-1 shadow-sm transition-all"
                              title="Audit Status Transition History"
                            >
                              <Activity className="w-3 h-3 text-cyan-400" />
                              <span>History</span>
                            </button>

                            {/* 1-Click WhatsApp Dispatch */}
                            <button
                              onClick={() => openWhatsAppModal(b)}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm transition-all"
                              title="1-Click WhatsApp Customer Dispatch & Notification"
                            >
                              <WhatsAppIcon className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </button>

                            {/* Confirm Action */}
                            {b.status === "PENDING" && (
                              <button
                                onClick={() => handleConfirmBooking(b.id)}
                                disabled={actionLoading}
                                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-[10px] uppercase tracking-wider transition-all shadow-md shadow-cyan-500/20 flex items-center gap-1"
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
                                className="px-2.5 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-[10px] font-semibold transition-all"
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
                                className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[10px] font-semibold transition-all"
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
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-[#0B1220] max-w-3xl w-full rounded-3xl border border-white/10 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
                {/* Modal Header */}
                <div className="p-6 border-b border-white/10 bg-white/[0.02] flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-lg font-extrabold text-cyan-400">
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
                    <p className="text-xs text-slate-400 mt-1">
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
                    <div className="bg-[#060A14] border border-white/10 p-3.5 rounded-2xl">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Date</span>
                      <span className="text-sm font-bold text-white block mt-0.5">{selectedBooking.service_date}</span>
                    </div>
                    <div className="bg-[#060A14] border border-white/10 p-3.5 rounded-2xl">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Time Slot</span>
                      <span className="text-sm font-bold text-sky-600 block mt-0.5">
                        {selectedBooking.slot_start_time.slice(0, 5)} - {selectedBooking.slot_end_time.slice(0, 5)}
                      </span>
                    </div>
                    <div className="bg-[#060A14] border border-white/10 p-3.5 rounded-2xl">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Amount</span>
                      <span className="text-sm font-bold text-emerald-600 block mt-0.5">₹{selectedBooking.final_amount}</span>
                    </div>
                    <div className="bg-[#060A14] border border-white/10 p-3.5 rounded-2xl">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Payment Status</span>
                      <span className="text-sm font-bold text-amber-600 block mt-0.5">{selectedBooking.payment_status}</span>
                    </div>
                  </div>

                  {/* 2-Column Detail Sections */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Customer Info Card */}
                    <div className="bg-[#060A14] border border-white/10 p-4 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2 text-white font-bold text-xs">
                          <User className="w-4 h-4 text-sky-600" />
                          <span>Customer Details</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openWhatsAppModal(selectedBooking)}
                            className="flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-lg hover:bg-emerald-500/25 transition-colors"
                            title="1-Click WhatsApp Customer Dispatch & Notification"
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>
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
                          <span className="font-bold text-white">{selectedBooking.customer_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Phone:</span>
                          <span className="font-mono text-slate-300">{selectedBooking.customer_phone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Email:</span>
                          <span className="text-slate-300">{selectedBooking.customer_email || "Not provided"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Vehicle & Package Card */}
                    <div className="bg-[#060A14] border border-white/10 p-4 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 text-white font-bold text-xs border-b border-white/10 pb-2">
                        <Car className="w-4 h-4 text-sky-600" />
                        <span>Vehicle &amp; Service Package</span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Vehicle Type:</span>
                          <span className="font-bold text-cyan-400">{selectedBooking.vehicle_type_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Package:</span>
                          <span className="font-bold text-white">{selectedBooking.service_package_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Estimated Duration:</span>
                          <span className="text-slate-300">~{selectedBooking.estimated_duration_minutes} minutes</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Service Area:</span>
                          <span className="text-slate-300">{selectedBooking.service_area_name || selectedBooking.locality}</span>
                        </div>
                      </div>
                    </div>

                    {/* Doorstep Location Card */}
                    <div className="bg-[#060A14] border border-white/10 p-4 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 text-white font-bold text-xs border-b border-white/10 pb-2">
                        <MapPin className="w-4 h-4 text-sky-600" />
                        <span>Doorstep Service Address</span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Address Line</span>
                          <span className="text-slate-200 block font-medium mt-0.5">{selectedBooking.address_line}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <span className="text-slate-500 block text-[10px]">Locality / Sector</span>
                            <span className="text-slate-200 font-semibold">{selectedBooking.locality}</span>
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
                    <div className="bg-[#060A14] border border-white/10 p-4 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 text-white font-bold text-xs border-b border-white/10 pb-2">
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        <span>Financial Snapshot &amp; Status</span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Base Price:</span>
                          <span className="text-slate-200">₹{selectedBooking.price_snapshot}</span>
                        </div>
                        {Number(selectedBooking.tax_amount) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">GST / Tax:</span>
                            <span className="text-slate-800">₹{selectedBooking.tax_amount}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-1.5">
                          <span className="text-white">Total Amount:</span>
                          <span className="text-emerald-600">₹{selectedBooking.final_amount}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                          <span className="text-slate-500">Payment Method:</span>
                          <span className="font-semibold text-slate-200">{selectedBooking.payment_method_display || selectedBooking.payment_method}</span>
                        </div>
                        {selectedBooking.payment_details && (
                          <div className="pt-2 border-t border-white/10 space-y-1 text-[11px]">
                            {selectedBooking.payment_details.order_id && (
                              <div className="flex justify-between">
                                <span className="text-slate-500">Razorpay Order:</span>
                                <span className="font-mono text-cyan-300 font-semibold">{selectedBooking.payment_details.order_id}</span>
                              </div>
                            )}
                            {selectedBooking.payment_details.payment_id && (
                              <div className="flex justify-between">
                                <span className="text-slate-500">Razorpay Payment ID:</span>
                                <span className="font-mono text-emerald-400 font-semibold">{selectedBooking.payment_details.payment_id}</span>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-slate-500">Update Payment:</span>
                          <select
                            value={selectedBooking.payment_status}
                            onChange={(e) => handleUpdatePaymentStatus(selectedBooking.id, e.target.value)}
                            disabled={actionLoading}
                            className="bg-[#060A14] border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
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
                  <div className="bg-[#060A14] border border-white/10 p-4 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2 text-white font-bold text-xs">
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
                        className="flex-1 w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
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
                <div className="p-5 border-t border-white/10 bg-white/[0.02] flex flex-wrap items-center justify-between gap-3">
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

                    {/* WhatsApp Customer Dispatch & Notification */}
                    <button
                      onClick={() => openWhatsAppModal(selectedBooking)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                      title="Open 1-Click WhatsApp Notification Manager"
                    >
                      <WhatsAppIcon className="w-4 h-4" />
                      <span>WhatsApp Customer</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold border border-white/10 transition-colors"
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
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-[#0B1220] p-6 rounded-3xl max-w-md w-full space-y-5 border border-white/10 shadow-2xl animate-in fade-in zoom-in-95">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
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
                  <label className="text-xs font-semibold text-slate-300 block">Select New Date</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={rescheduleModal.newDate}
                    onChange={(e) =>
                      setRescheduleModal({ ...rescheduleModal, newDate: e.target.value })
                    }
                    className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Time Slot Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">Select New Time Slot</label>
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
                              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-400 shadow-md shadow-cyan-500/20 font-bold"
                              : "bg-white/[0.03] text-slate-300 border-white/10 hover:border-white/20 hover:bg-white/[0.06]"
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
                    className="rounded bg-[#060A14] border-white/20 text-cyan-500 focus:ring-0"
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
                    className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
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
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-[#0B1220] p-6 rounded-3xl max-w-md w-full space-y-5 border border-white/10 shadow-2xl animate-in fade-in zoom-in-95">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
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

                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Package:</span>
                    <span className="font-bold text-white">{completeModal.booking.service_package_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Vehicle:</span>
                    <span className="font-semibold text-sky-700">{completeModal.booking.vehicle_type_name}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-1 border-t border-emerald-200/60">
                    <span className="text-white">Amount:</span>
                    <span className="text-emerald-600">₹{completeModal.booking.final_amount}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">Completion Notes</label>
                  <textarea
                    rows={2}
                    value={completeModal.notes}
                    onChange={(e) =>
                      setCompleteModal({ ...completeModal, notes: e.target.value })
                    }
                    className="w-full bg-[#060A14] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                    placeholder="Notes regarding job quality, customer feedback, etc."
                  />
                </div>

                <div className="flex items-center gap-2 p-3 rounded-xl bg-[#060A14] border border-white/10">
                  <input
                    type="checkbox"
                    id="markPaidCheckbox"
                    checked={completeModal.markPaid}
                    onChange={(e) =>
                      setCompleteModal({ ...completeModal, markPaid: e.target.checked })
                    }
                    className="rounded bg-[#060A14] border-white/20 text-emerald-500 focus:ring-0"
                  />
                  <label htmlFor="markPaidCheckbox" className="text-xs text-slate-700 font-medium cursor-pointer">
                    Mark Payment Status as <span className="font-bold text-emerald-600">PAID</span> (Cash / UPI collected)
                  </label>
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setCompleteModal(null)}
                    disabled={actionLoading}
                    className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
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
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-[#0B1220] p-6 rounded-3xl max-w-md w-full space-y-5 border border-white/10 shadow-2xl animate-in fade-in zoom-in-95">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
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
                  <label className="text-xs font-semibold text-slate-300 block">Select Reason</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value !== "Custom") {
                        setCancelModal({ ...cancelModal, reason: e.target.value });
                      }
                    }}
                    className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400 mb-2"
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
                    className="w-full bg-[#060A14] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setCancelModal(null)}
                    disabled={actionLoading}
                    className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
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
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-[#0B1220] p-6 rounded-3xl max-w-sm w-full space-y-4 border border-white/10 shadow-2xl animate-in fade-in zoom-in-95">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
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

                <p className="text-xs text-slate-400">
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
                  className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
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
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
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

      {/* 2.5 REGISTERED CUSTOMERS TAB */}
      {activeTab === "customers" && (
        <div className="space-y-6">
          {/* Header & Subtitle */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
            <div>
              <span className="text-[11px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                Customer Account Management
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight mt-0.5">
                Registered Customers &amp; User IDs
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect customer profiles, booking history, payment transactions, and manage account statuses.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                {customers.length} Registered Accounts
              </span>
              <a
                href={`${api.getApiBaseUrl()}/api/admin/customers/export_csv/`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-xl hover:bg-emerald-500/20 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </a>
              <button
                type="button"
                onClick={() => fetchCustomers()}
                disabled={loadingCustomers}
                className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 transition-all"
                title="Refresh customer list"
              >
                <RefreshCw className={`w-4 h-4 ${loadingCustomers ? "animate-spin text-cyan-400" : ""}`} />
              </button>
            </div>
          </div>

          {/* Filters & Search Bar */}
          <div className="bg-[#0B1220]/90 p-4 rounded-2xl border border-white/10 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchCustomers(customerSearch, customerStatusFilter);
              }}
              className="relative w-full sm:w-96"
            >
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by Name, Email, Mobile (+91), or User ID..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full bg-[#060A14] border border-white/10 rounded-xl pl-9 pr-20 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[11px] font-bold transition-all"
              >
                Search
              </button>
            </form>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-400 hidden sm:inline">Status:</span>
              <div className="flex bg-[#060A14] p-1 rounded-xl border border-white/10 w-full sm:w-auto">
                {["ALL", "ACTIVE", "SUSPENDED"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setCustomerStatusFilter(st)}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      customerStatusFilter === st
                        ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {st === "ALL" ? "All" : st === "ACTIVE" ? "Active" : "Suspended"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Customers Table */}
          <div className="bg-[#0B1220]/90 rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Customer ID</th>
                    <th className="py-3.5 px-4">Customer Name &amp; Email</th>
                    <th className="py-3.5 px-4">Mobile Number</th>
                    <th className="py-3.5 px-4">Account Status</th>
                    <th className="py-3.5 px-4">Registered On</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loadingCustomers ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                          <span>Loading customer accounts from database...</span>
                        </div>
                      </td>
                    </tr>
                  ) : customers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <UserCheck className="w-8 h-8 text-slate-600" />
                          <span>No registered customers found matching your filters.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    customers.map((c) => (
                      <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(c.user_id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/70 text-cyan-300 font-mono text-[11px] font-bold border border-cyan-500/30 hover:border-cyan-400 transition-all"
                            title="Click to copy User ID"
                          >
                            <span>{c.user_id}</span>
                            <Copy className="w-3 h-3 text-cyan-400/70" />
                          </button>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs shadow-md">
                              {(c.full_name || "C")[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-white text-xs">{c.full_name || "CARSPA Customer"}</p>
                              <p className="text-[11px] text-slate-400">{c.email || "No email"}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-300">{c.phone || "—"}</span>
                            {c.phone && (
                              <a
                                href={`https://wa.me/${getWhatsAppCleanPhone(c.phone)}?text=Hello%20${encodeURIComponent(c.full_name || "Customer")}%2C%20greetings%20from%20CARSPA!`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all"
                                title="Open WhatsApp chat"
                              >
                                <WhatsAppIcon className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {c.account_status === "ACTIVE" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-bold uppercase tracking-wider">
                              <ShieldAlert className="w-3 h-3" />
                              <span>Suspended</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }) : "—"}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => viewCustomerDetail(c.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold text-xs transition-all"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Profile</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setCustomerEditModal({
                                  isOpen: true,
                                  customerId: c.id,
                                  full_name: c.full_name || "",
                                  email: c.email || "",
                                  phone: c.phone || "",
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 font-semibold text-xs transition-all"
                              title="Edit Customer Profile"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              disabled={togglingStatusId === c.id}
                              onClick={() => handleToggleCustomerStatus(c.id, c.account_status)}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                c.account_status === "ACTIVE"
                                  ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30"
                                  : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              }`}
                            >
                              {togglingStatusId === c.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : c.account_status === "ACTIVE" ? (
                                "Suspend"
                              ) : (
                                "Activate"
                              )}
                            </button>
                          </div>
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

      {/* CUSTOMER DETAIL MODAL */}
      {selectedCustomerDetail && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-[#0B1220] border border-white/10 rounded-3xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 my-auto">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-white/10 bg-[#080D1A] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-lg">
                  {(selectedCustomerDetail.profile?.full_name || "C")[0].toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold text-white">
                      {selectedCustomerDetail.profile?.full_name}
                    </h3>
                    <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded-md">
                      {selectedCustomerDetail.profile?.user_id}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        selectedCustomerDetail.profile?.account_status === "ACTIVE"
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                          : "bg-rose-500/15 border-rose-500/30 text-rose-400"
                      }`}
                    >
                      {selectedCustomerDetail.profile?.account_status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-cyan-400" />
                      {selectedCustomerDetail.profile?.email}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-cyan-400" />
                      {selectedCustomerDetail.profile?.phone}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomerDetail(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-white/[0.02] border-b border-white/10 shrink-0">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Bookings</span>
                <span className="text-base font-black text-white">
                  {selectedCustomerDetail.bookings?.length || 0}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Transactions</span>
                <span className="text-base font-black text-cyan-400">
                  {selectedCustomerDetail.payments?.length || 0}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Saved Vehicles</span>
                <span className="text-base font-black text-white">
                  {selectedCustomerDetail.vehicles?.length || 0}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Saved Addresses</span>
                <span className="text-base font-black text-white">
                  {selectedCustomerDetail.addresses?.length || 0}
                </span>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-white/10 px-6 gap-2 bg-[#060A14] shrink-0">
              {[
                { id: "bookings", label: `Bookings (${selectedCustomerDetail.bookings?.length || 0})` },
                { id: "payments", label: `Payments (${selectedCustomerDetail.payments?.length || 0})` },
                { id: "vehicles", label: `Garage (${selectedCustomerDetail.vehicles?.length || 0})` },
                { id: "addresses", label: `Addresses (${selectedCustomerDetail.addresses?.length || 0})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCustomerModalTab(tab.id as any)}
                  className={`py-3 px-3.5 text-xs font-semibold transition-all border-b-2 ${
                    customerModalTab === tab.id
                      ? "border-cyan-400 text-cyan-300 font-bold"
                      : "border-transparent text-slate-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Tab Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* 1. Bookings Tab */}
              {customerModalTab === "bookings" && (
                <div className="space-y-3">
                  {(!selectedCustomerDetail.bookings || selectedCustomerDetail.bookings.length === 0) ? (
                    <p className="text-xs text-slate-400 py-8 text-center">No bookings recorded for this customer yet.</p>
                  ) : (
                    <div className="border border-white/10 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-white/[0.03] text-slate-400 text-[10px] uppercase font-bold border-b border-white/10">
                          <tr>
                            <th className="py-2.5 px-3">Ref #</th>
                            <th className="py-2.5 px-3">Package &amp; Vehicle</th>
                            <th className="py-2.5 px-3">Date &amp; Slot</th>
                            <th className="py-2.5 px-3">Amount</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Payment</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {selectedCustomerDetail.bookings.map((b: any) => (
                            <tr key={b.id} className="hover:bg-white/[0.02]">
                              <td className="py-2.5 px-3 font-mono font-bold text-cyan-300">
                                {b.booking_reference}
                              </td>
                              <td className="py-2.5 px-3">
                                <p className="font-semibold text-white">{b.service_package_name}</p>
                                <p className="text-[10px] text-slate-400">{b.vehicle_type_name}</p>
                              </td>
                              <td className="py-2.5 px-3 text-slate-300">
                                {b.service_date} @ {b.slot_start_time}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-white">
                                ₹{b.final_amount}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-slate-300">
                                  {b.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  b.payment_status === "PAID"
                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                    : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                }`}>
                                  {b.payment_status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 2. Payments Tab */}
              {customerModalTab === "payments" && (
                <div className="space-y-3">
                  {(!selectedCustomerDetail.payments || selectedCustomerDetail.payments.length === 0) ? (
                    <p className="text-xs text-slate-400 py-8 text-center">No payment transactions recorded yet.</p>
                  ) : (
                    <div className="border border-white/10 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-white/[0.03] text-slate-400 text-[10px] uppercase font-bold border-b border-white/10">
                          <tr>
                            <th className="py-2.5 px-3">Payment ID</th>
                            <th className="py-2.5 px-3">Order ID</th>
                            <th className="py-2.5 px-3">Booking Ref</th>
                            <th className="py-2.5 px-3">Amount</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {selectedCustomerDetail.payments.map((p: any) => (
                            <tr key={p.id} className="hover:bg-white/[0.02]">
                              <td className="py-2.5 px-3 font-mono text-cyan-300">
                                {p.payment_id || "—"}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-400">
                                {p.order_id || "—"}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-white font-bold">
                                {p.booking_reference || "—"}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-emerald-400">
                                ₹{p.amount}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  p.status === "PAID"
                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                    : "bg-white/10 text-slate-300"
                                }`}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                                {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Vehicles / Garage Tab */}
              {customerModalTab === "vehicles" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(!selectedCustomerDetail.vehicles || selectedCustomerDetail.vehicles.length === 0) ? (
                    <p className="col-span-2 text-xs text-slate-400 py-8 text-center">No vehicles in garage yet.</p>
                  ) : (
                    selectedCustomerDetail.vehicles.map((v: any) => (
                      <div key={v.id} className="p-4 rounded-2xl bg-[#060A14] border border-white/10 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{v.brand || v.make} {v.model_name || v.model}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 font-bold border border-cyan-500/30">
                            {v.vehicle_type_name || "Vehicle"}
                          </span>
                        </div>
                        <p className="text-xs font-mono font-bold text-cyan-300">
                          {v.license_plate || "No License Plate"}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Color: {v.color || "Standard"} {v.year ? `• Year: ${v.year}` : ""}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 4. Addresses Tab */}
              {customerModalTab === "addresses" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(!selectedCustomerDetail.addresses || selectedCustomerDetail.addresses.length === 0) ? (
                    <p className="col-span-2 text-xs text-slate-400 py-8 text-center">No saved addresses yet.</p>
                  ) : (
                    selectedCustomerDetail.addresses.map((a: any) => (
                      <div key={a.id} className="p-4 rounded-2xl bg-[#060A14] border border-white/10 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            {a.address_type}
                          </span>
                          {a.is_default && (
                            <span className="text-[9px] font-semibold text-emerald-400">Default Address</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 font-semibold">{a.house_building}</p>
                        <p className="text-xs text-slate-400">{a.street_locality}</p>
                        <p className="text-[11px] text-slate-500">
                          {a.city}, {a.state} - {a.pincode}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-white/10 bg-[#080D1A] flex items-center justify-between shrink-0">
              <button
                type="button"
                disabled={togglingStatusId === selectedCustomerDetail.profile?.id}
                onClick={() =>
                  handleToggleCustomerStatus(
                    selectedCustomerDetail.profile?.id,
                    selectedCustomerDetail.profile?.account_status
                  )
                }
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  selectedCustomerDetail.profile?.account_status === "ACTIVE"
                    ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30"
                    : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                }`}
              >
                {togglingStatusId === selectedCustomerDetail.profile?.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : selectedCustomerDetail.profile?.account_status === "ACTIVE" ? (
                  "Suspend Account Access"
                ) : (
                  "Reactivate Account Access"
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedCustomerDetail(null)}
                className="px-5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-semibold transition-all border border-white/10"
              >
                Close
              </button>
            </div>
          </div>
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
                  className="w-full bg-[#060A14] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white shadow-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                />
              </div>

              <select
                value={leadFilterStatus}
                onChange={(e) => {
                  setLeadFilterStatus(e.target.value);
                  setTimeout(fetchLeads, 50);
                }}
                className="bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white shadow-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
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
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md shadow-cyan-500/20 transition-all"
              >
                Filter
              </button>
            </div>

            <a
              href={`${api.getApiBaseUrl()}/api/admin/leads/export-csv/`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-xl hover:bg-emerald-500/20 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Leads CSV</span>
            </a>
          </div>

          <div className="bg-[#0B1220]/90 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#080D1A] text-slate-400 uppercase tracking-wider text-[10px] border-b border-white/10">
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
                <tbody className="divide-y divide-white/5 text-slate-300">
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
                          <span className="font-semibold block text-white">{lead.customer_name}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-slate-500 font-mono text-[11px]">{lead.mobile_number}</span>
                            <button
                              type="button"
                              onClick={() => openLeadWhatsAppModal(lead)}
                              className="text-emerald-400 hover:text-emerald-300 text-[10px] p-0.5 rounded hover:bg-emerald-500/10 transition-colors inline-flex items-center"
                              title="1-Click WhatsApp Follow-Up"
                            >
                              <WhatsAppIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="block font-medium text-white">
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
                        <td className="p-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openLeadWhatsAppModal(lead)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold inline-flex items-center gap-1 shadow-sm transition-all mr-2"
                            title="1-Click WhatsApp Follow-Up"
                          >
                            <WhatsAppIcon className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </button>
                          <select
                            value={lead.status}
                            onChange={(e) => handleUpdateLead(lead.id, e.target.value)}
                            className="bg-[#060A14] border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white shadow-sm focus:border-cyan-400 focus:outline-none"
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
              <p className="text-xs text-slate-500">
                Staff capacity controls max concurrent booking slots in the scheduling engine.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {staffList.map((s) => (
              <div key={s.id} className="bg-[#0B1220]/90 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl space-y-4 hover:border-cyan-500/30 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-white">{s.name}</h3>
                    <p className="text-xs text-slate-500">{s.phone}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      s.is_active
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {s.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-700 pt-2 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Daily Job Limit:</span>
                    <span className="font-semibold text-white">{s.max_daily_jobs} Cars/Day</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Assigned Today:</span>
                    <span className="font-semibold text-cyan-400">{s.active_jobs_count} Jobs</span>
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
                          className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/10 text-[10px] text-slate-300 font-medium"
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

      {/* 5. CAPACITY & PRICING CONFIG TAB */}
      {activeTab === "settings" && configData && (
        <div className="space-y-10 relative z-10">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <span className="text-[11px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                Live Business Rules &amp; Pricing
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight mt-0.5">
                Capacity &amp; Pricing Configuration
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Configure doorstep car wash service rates per vehicle size and operational dispatch rules.
              </p>
            </div>

            <a
              href={`${api.getApiBaseUrl()}/admin/django/services/servicepackage/`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all self-start sm:self-auto"
            >
              <span>Django Service Database</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* PART 1: SERVICE PACKAGES & VEHICLE PRICING CONFIGURATION */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                    ₹
                  </div>
                  <h3 className="text-lg font-black text-white tracking-tight">
                    Service Packages &amp; Vehicle Pricing Matrix
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  Update live prices for any vehicle size. Changes take effect on the booking portal immediately.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {servicePackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="bg-[#0B1220]/90 backdrop-blur-md rounded-2xl border border-white/10 p-5 space-y-4 shadow-xl hover:border-cyan-500/30 transition-all"
                >
                  {/* Package Top */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-white">{pkg.name}</h4>
                        {pkg.is_popular && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                            {pkg.badge_text || "Popular"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                        {pkg.short_description}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] font-bold text-slate-400 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      {pkg.estimated_duration_minutes}m
                    </span>
                  </div>

                  {/* Vehicle Pricing Rows */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Vehicle Rates
                    </span>
                    <div className="divide-y divide-white/5 rounded-xl bg-[#060A14] border border-white/5 overflow-hidden">
                      {pkg.prices && pkg.prices.length > 0 ? (
                        pkg.prices.map((price) => {
                          const isEditing = editingPriceId === price.id;
                          return (
                            <div
                              key={price.id}
                              className="p-3 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Car className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="font-semibold text-slate-200 truncate">
                                  {price.vehicle_type_name || `Vehicle Type #${price.vehicle_type}`}
                                </span>
                              </div>

                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1 bg-[#0B1220] px-2 py-1 rounded-lg border border-cyan-500/40">
                                    <span className="text-[11px] text-slate-400">Base ₹</span>
                                    <input
                                      type="number"
                                      value={priceEditValues.base_price}
                                      onChange={(e) =>
                                        setPriceEditValues({
                                          ...priceEditValues,
                                          base_price: e.target.value,
                                        })
                                      }
                                      className="w-16 bg-transparent text-white text-xs font-bold focus:outline-none"
                                      placeholder="0"
                                    />
                                  </div>

                                  <div className="flex items-center gap-1 bg-[#0B1220] px-2 py-1 rounded-lg border border-cyan-500/40">
                                    <span className="text-[11px] text-slate-400">Offer ₹</span>
                                    <input
                                      type="number"
                                      value={priceEditValues.discounted_price}
                                      onChange={(e) =>
                                        setPriceEditValues({
                                          ...priceEditValues,
                                          discounted_price: e.target.value,
                                        })
                                      }
                                      className="w-16 bg-transparent text-cyan-300 text-xs font-bold focus:outline-none"
                                      placeholder="Optional"
                                    />
                                  </div>

                                  <button
                                    onClick={() => handleSavePrice(price.id)}
                                    disabled={savingPriceId === price.id}
                                    className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold transition-colors disabled:opacity-50"
                                    title="Save Rate"
                                  >
                                    {savingPriceId === price.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <button
                                    onClick={handleCancelEditPrice}
                                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 transition-colors"
                                    title="Cancel"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    {price.discounted_price && Number(price.discounted_price) > 0 ? (
                                      <div className="flex items-center gap-1.5 justify-end">
                                        <span className="text-[11px] text-slate-400 line-through">
                                          ₹{price.base_price}
                                        </span>
                                        <span className="font-black text-cyan-400 text-sm">
                                          ₹{price.discounted_price}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="font-black text-white text-sm">
                                        ₹{price.base_price}
                                      </span>
                                    )}
                                  </div>

                                  <button
                                    onClick={() => handleStartEditPrice(price)}
                                    className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10 transition-colors"
                                    title="Edit price"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-3 text-xs text-slate-500 italic text-center">
                          No rates configured yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PART 2: SCHEDULING & BUSINESS RULES */}
          <div className="bg-[#0B1220]/90 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-black text-white tracking-tight">
                  Scheduling &amp; Business Rules
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Changes update the live scheduling engine, slot limits, and customer booking windows immediately.
              </p>
            </div>

            {configSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Configuration successfully saved to database.</span>
              </div>
            )}

            <form onSubmit={handleSaveConfig} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Opening Time
                  </label>
                  <input
                    type="text"
                    value={configData.day_open_time}
                    onChange={(e) =>
                      setConfigData({ ...configData, day_open_time: e.target.value })
                    }
                    className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Closing Time
                  </label>
                  <input
                    type="text"
                    value={configData.day_close_time}
                    onChange={(e) =>
                      setConfigData({ ...configData, day_close_time: e.target.value })
                    }
                    className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
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
                    className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
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
                    className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
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
                    className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
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
                    className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                  />
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={configData.auto_confirm_bookings}
                    onChange={(e) =>
                      setConfigData({
                        ...configData,
                        auto_confirm_bookings: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-white/10 bg-[#060A14] text-cyan-500 focus:ring-cyan-400/40"
                  />
                  <span className="text-xs text-slate-300 font-semibold">
                    Auto-confirm new customer booking submissions immediately
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={configData.same_day_booking_allowed}
                    onChange={(e) =>
                      setConfigData({
                        ...configData,
                        same_day_booking_allowed: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-white/10 bg-[#060A14] text-cyan-500 focus:ring-cyan-400/40"
                  />
                  <span className="text-xs text-slate-300 font-semibold">
                    Allow same-day booking requests (subject to advance notice window)
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={savingConfig}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all shadow-lg shadow-cyan-500/25 flex items-center gap-2"
              >
                {savingConfig ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Save Scheduling Configuration</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}


      {/* 3. ORDERS & PACKAGES TAB */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
            <div>
              <span className="text-[11px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Orders &amp; Service Fulfillment
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight mt-0.5">
                Service Packages &amp; Job Orders
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Unified ledger of customer orders, selected packages, vehicle types, and door-to-door fulfillment status.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                {bookingsList.length} Total Orders
              </span>
              <button
                type="button"
                onClick={fetchBookings}
                disabled={loadingBookings}
                className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 transition-all"
                title="Refresh orders"
              >
                <RefreshCw className={`w-4 h-4 ${loadingBookings ? "animate-spin text-cyan-400" : ""}`} />
              </button>
            </div>
          </div>

          {/* Orders KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0B1220]/90 p-4 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Orders</span>
              <p className="text-2xl font-black text-white">{bookingsList.length}</p>
              <span className="text-[11px] text-cyan-400">All customer bookings</span>
            </div>
            <div className="bg-[#0B1220]/90 p-4 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Fulfilled &amp; Completed</span>
              <p className="text-2xl font-black text-emerald-400">
                {bookingsList.filter((b) => b.status === "COMPLETED").length}
              </p>
              <span className="text-[11px] text-emerald-400/80">Delivered services</span>
            </div>
            <div className="bg-[#0B1220]/90 p-4 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">In Pipeline / Active</span>
              <p className="text-2xl font-black text-amber-400">
                {bookingsList.filter((b) => b.status === "CONFIRMED" || b.status === "IN_PROGRESS" || b.status === "ASSIGNED").length}
              </p>
              <span className="text-[11px] text-amber-400/80">Scheduled &amp; dispatched</span>
            </div>
            <div className="bg-[#0B1220]/90 p-4 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Paid Orders</span>
              <p className="text-2xl font-black text-cyan-400">
                {bookingsList.filter((b) => b.payment_status === "PAID").length}
              </p>
              <span className="text-[11px] text-cyan-400/80">Settled through gateway</span>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-[#0B1220]/90 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#080D1A] text-slate-400 uppercase tracking-wider text-[10px] border-b border-white/10 font-bold">
                  <tr>
                    <th className="p-3.5">Order Ref</th>
                    <th className="p-3.5">Customer &amp; Account</th>
                    <th className="p-3.5">Service Package &amp; Car</th>
                    <th className="p-3.5">Scheduled Slot</th>
                    <th className="p-3.5">Amount (₹)</th>
                    <th className="p-3.5">Payment</th>
                    <th className="p-3.5">Order Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {bookingsList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-500">
                        No orders recorded yet.
                      </td>
                    </tr>
                  ) : (
                    bookingsList.map((b) => (
                      <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3.5 font-mono font-bold text-cyan-400">{b.booking_reference}</td>
                        <td className="p-3.5">
                          <span className="font-semibold text-white block">{b.customer_name}</span>
                          <span className="font-mono text-[11px] text-slate-400">{b.customer_phone}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-white block">{b.service_package_name}</span>
                          <span className="text-[11px] text-slate-400">{b.vehicle_type_name}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-slate-200 block">{b.service_date}</span>
                          <span className="text-[11px] text-slate-400">{b.slot_start_time.slice(0, 5)} - {b.slot_end_time.slice(0, 5)}</span>
                        </td>
                        <td className="p-3.5 font-bold text-emerald-400 text-sm">₹{b.final_amount}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            b.payment_status === "PAID"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          }`}>
                            {b.payment_status}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                            {b.status_display}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedBooking(b)}
                              className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-[11px] font-semibold border border-white/10"
                            >
                              View
                            </button>
                            <button
                              onClick={() => openWhatsAppModal(b)}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold flex items-center gap-1"
                            >
                              <WhatsAppIcon className="w-3 h-3" />
                              <span>Dispatch</span>
                            </button>
                          </div>
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

      {/* 4. PAYMENTS (RAZORPAY) MANAGEMENT TAB */}
      {activeTab === "payments" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
            <div>
              <span className="text-[11px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                Payment Gateway &amp; Settlements
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight mt-0.5">
                Razorpay Payment Transactions
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time online gateway orders, payment IDs, verification signatures, and administrative refund controls.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-purple-950/80 border border-purple-500/30 text-purple-300">
                {paymentsList.length} Transactions
              </span>
              <button
                type="button"
                onClick={() => fetchPayments()}
                disabled={loadingPayments}
                className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 transition-all"
                title="Refresh payment transactions"
              >
                <RefreshCw className={`w-4 h-4 ${loadingPayments ? "animate-spin text-purple-400" : ""}`} />
              </button>
            </div>
          </div>

          {/* Payments KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0B1220]/90 p-4 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Recorded</span>
              <p className="text-2xl font-black text-white">{paymentsList.length}</p>
              <span className="text-[11px] text-purple-400">All gateway attempts</span>
            </div>
            <div className="bg-[#0B1220]/90 p-4 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Settled (PAID)</span>
              <p className="text-2xl font-black text-emerald-400">
                {paymentsList.filter((p) => p.status === "PAID").length}
              </p>
              <span className="text-[11px] text-emerald-400/80">Successful collections</span>
            </div>
            <div className="bg-[#0B1220]/90 p-4 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Pending Authorization</span>
              <p className="text-2xl font-black text-amber-400">
                {paymentsList.filter((p) => p.status === "PENDING").length}
              </p>
              <span className="text-[11px] text-amber-400/80">Awaiting customer payment</span>
            </div>
            <div className="bg-[#0B1220]/90 p-4 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Refunded / Failed</span>
              <p className="text-2xl font-black text-rose-400">
                {paymentsList.filter((p) => p.status === "FAILED" || p.status === "REFUNDED").length}
              </p>
              <span className="text-[11px] text-rose-400/80">Reversals &amp; drops</span>
            </div>
          </div>

          {/* Search & Status Filter Bar */}
          <div className="bg-[#0B1220]/90 p-4 rounded-2xl border border-white/10 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchPayments(paymentSearch, paymentFilterStatus);
              }}
              className="relative w-full sm:w-96"
            >
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search Payment ID, Order ID, Customer, User ID, or Booking..."
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                className="w-full bg-[#060A14] border border-white/10 rounded-xl pl-9 pr-20 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[11px] font-bold transition-all"
              >
                Search
              </button>
            </form>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <span className="text-xs text-slate-400 hidden sm:inline">Status:</span>
              <div className="flex bg-[#060A14] p-1 rounded-xl border border-white/10">
                {["ALL", "PAID", "PENDING", "FAILED", "REFUNDED"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setPaymentFilterStatus(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      paymentFilterStatus === st
                        ? "bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Payments Table */}
          <div className="bg-[#0B1220]/90 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#080D1A] text-slate-400 uppercase tracking-wider text-[10px] border-b border-white/10 font-bold">
                  <tr>
                    <th className="p-3.5">Payment / Order ID</th>
                    <th className="p-3.5">Booking Ref</th>
                    <th className="p-3.5">Customer &amp; User ID</th>
                    <th className="p-3.5">Amount (₹)</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {loadingPayments ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
                        <span>Loading payment transactions...</span>
                      </td>
                    </tr>
                  ) : paymentsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-500">
                        No payment transactions match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    paymentsList.map((p) => (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3.5">
                          <span className="font-mono font-bold text-white block">
                            {p.payment_id || "Uncaptured"}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500 block">
                            {p.order_id || `#${p.id}`}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-mono font-bold text-cyan-400">
                            {p.booking_reference || "—"}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-white block">{p.customer_name}</span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {p.customer_user_id || "Guest"}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-emerald-400 text-sm">
                          ₹{p.amount}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            p.status === "PAID"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : p.status === "REFUNDED"
                              ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                              : p.status === "FAILED"
                              ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-400 text-[11px]">
                          {p.created_at ? new Date(p.created_at).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }) : "—"}
                        </td>
                        <td className="p-3.5 text-right">
                          {p.status === "PAID" ? (
                            <button
                              type="button"
                              onClick={() => setRefundModal({ isOpen: true, payment: p, reason: "" })}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-semibold transition-all"
                            >
                              Refund
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-600">—</span>
                          )}
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

      {/* 9. ADMIN TEAM & RBAC TAB */}
      {activeTab === "team" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
            <div>
              <span className="text-[11px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Staff Credentials &amp; RBAC Access Controls
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight mt-0.5">
                Administrative Team &amp; Permissions
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage backend administrative users, role hierarchies (Super Admin, Admin, Manager, Staff), and account privileges.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAddTeamModal(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 px-3.5 py-2 rounded-xl transition-all shadow-md shadow-cyan-500/25 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Admin Account</span>
              </button>

              <button
                type="button"
                onClick={fetchTeam}
                disabled={loadingTeam}
                className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 transition-all"
                title="Refresh team accounts"
              >
                <RefreshCw className={`w-4 h-4 ${loadingTeam ? "animate-spin text-cyan-400" : ""}`} />
              </button>
            </div>
          </div>

          {/* RBAC Info Card */}
          <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 text-xs text-slate-300 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <span className="font-bold text-purple-400 block text-[11px] uppercase">Super Admin</span>
              <span className="text-[11px] text-slate-400">Full system authority, team management, pricing configs, audit log inspection.</span>
            </div>
            <div>
              <span className="font-bold text-blue-400 block text-[11px] uppercase">Admin</span>
              <span className="text-[11px] text-slate-400">Manage bookings, view customer details, handle refunds, export data.</span>
            </div>
            <div>
              <span className="font-bold text-amber-400 block text-[11px] uppercase">Manager</span>
              <span className="text-[11px] text-slate-400">Assign technicians, confirm bookings, reschedule, monitor capacity.</span>
            </div>
            <div>
              <span className="font-bold text-emerald-400 block text-[11px] uppercase">Staff / Executive</span>
              <span className="text-[11px] text-slate-400">View assigned doorstep jobs, update status, trigger WhatsApp dispatches.</span>
            </div>
          </div>

          {/* Team Table */}
          <div className="bg-[#0B1220]/90 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#080D1A] text-slate-400 uppercase tracking-wider text-[10px] border-b border-white/10 font-bold">
                  <tr>
                    <th className="p-3.5">Administrator</th>
                    <th className="p-3.5">Email &amp; Mobile</th>
                    <th className="p-3.5">Assigned Role</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Last Login</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {loadingTeam ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                        <span>Loading team accounts...</span>
                      </td>
                    </tr>
                  ) : teamList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-slate-500">
                        No administrative accounts found.
                      </td>
                    </tr>
                  ) : (
                    teamList.map((m) => (
                      <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3.5">
                          <span className="font-bold text-white block">{m.username}</span>
                          <span className="text-[11px] text-slate-400">{m.full_name || "Staff Admin"}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="text-slate-300 block">{m.email}</span>
                          <span className="font-mono text-[11px] text-slate-500">{m.phone || "—"}</span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              m.role === "SUPER_ADMIN"
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                                : m.role === "ADMIN"
                                ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                                : m.role === "MANAGER"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            }`}>
                              {m.role_display || (m.role ? (m.role as string).replace("_", " ") : "ADMIN")}
                            </span>
                            {/* Super Admin can change role */}
                            {adminUser?.role === "SUPER_ADMIN" && (
                              <select
                                value={m.role}
                                onChange={(e) => handleUpdateTeamRole(m.id, e.target.value)}
                                disabled={updatingTeamId === m.id}
                                className="bg-[#060A14] border border-white/10 rounded-lg px-2 py-0.5 text-[10px] text-slate-300 focus:outline-none focus:border-cyan-400"
                              >
                                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                                <option value="ADMIN">ADMIN</option>
                                <option value="MANAGER">MANAGER</option>
                                <option value="STAFF">STAFF</option>
                              </select>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            m.is_active
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                          }`}>
                            {m.is_active ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-400 text-[11px]">
                          {m.last_login
                            ? new Date(m.last_login).toLocaleString("en-IN", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })
                            : "Never"}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleTeamMember(m.id)}
                            disabled={updatingTeamId === m.id || m.username === adminUser?.username}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                              m.is_active
                                ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30"
                                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            } ${m.username === adminUser?.username ? "opacity-40 cursor-not-allowed" : ""}`}
                          >
                            {updatingTeamId === m.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : m.is_active ? (
                              "Disable"
                            ) : (
                              "Enable"
                            )}
                          </button>
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

      {/* 10. AUDIT LOGS TAB */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
            <div>
              <span className="text-[11px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Compliance &amp; Security Timeline
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight mt-0.5">
                Administrative Audit Logs
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Immutable chronological log of all administrative actions, status transitions, user edits, and payment modifications.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                {auditLogsList.length} Logged Actions
              </span>
              <button
                type="button"
                onClick={() => fetchAuditLogs()}
                disabled={loadingAuditLogs}
                className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 transition-all"
                title="Refresh audit logs"
              >
                <RefreshCw className={`w-4 h-4 ${loadingAuditLogs ? "animate-spin text-cyan-400" : ""}`} />
              </button>
            </div>
          </div>

          {/* Search & Action Filter */}
          <div className="bg-[#0B1220]/90 p-4 rounded-2xl border border-white/10 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchAuditLogs(auditLogSearch, auditLogFilterAction);
              }}
              className="relative w-full sm:w-96"
            >
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by User, Resource, Description, or IP..."
                value={auditLogSearch}
                onChange={(e) => setAuditLogSearch(e.target.value)}
                className="w-full bg-[#060A14] border border-white/10 rounded-xl pl-9 pr-20 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[11px] font-bold transition-all"
              >
                Search
              </button>
            </form>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <span className="text-xs text-slate-400 hidden sm:inline">Action:</span>
              <div className="flex bg-[#060A14] p-1 rounded-xl border border-white/10">
                {["ALL", "LOGIN", "STATUS_CHANGE", "UPDATE", "REFUND", "CREATE", "CANCEL"].map((act) => (
                  <button
                    key={act}
                    type="button"
                    onClick={() => setAuditLogFilterAction(act)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      auditLogFilterAction === act
                        ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {act}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-[#0B1220]/90 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#080D1A] text-slate-400 uppercase tracking-wider text-[10px] border-b border-white/10 font-bold">
                  <tr>
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Admin User</th>
                    <th className="p-3.5">Action</th>
                    <th className="p-3.5">Target Resource</th>
                    <th className="p-3.5">Audit Details / Description</th>
                    <th className="p-3.5 text-right">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {loadingAuditLogs ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                        <span>Loading audit logs...</span>
                      </td>
                    </tr>
                  ) : auditLogsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-slate-500">
                        No audit logs found.
                      </td>
                    </tr>
                  ) : (
                    auditLogsList.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3.5 whitespace-nowrap text-slate-400 text-[11px]">
                          {log.created_at || log.timestamp ? new Date(log.created_at || (log.timestamp as string)).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "medium",
                          }) : "—"}
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-white block">{log.user_name || log.user_username || "System"}</span>
                          <span className="text-[10px] text-cyan-400 font-semibold">{log.user_email || log.user_role || "ADMIN"}</span>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            log.action === "LOGIN" || log.action === "LOGOUT"
                              ? "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                              : log.action === "STATUS_CHANGE"
                              ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                              : log.action === "REFUND"
                              ? "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-slate-200 block">{log.resource_type}</span>
                          <span className="font-mono text-[10px] text-slate-400">{log.resource_id || "—"}</span>
                        </td>
                        <td className="p-3.5 max-w-xs text-slate-300 font-mono text-[11px]">
                          {log.description || (log.details ? (typeof log.details === "object" ? JSON.stringify(log.details) : String(log.details)) : "—")}
                        </td>
                        <td className="p-3.5 text-right font-mono text-[10px] text-slate-500">
                          {log.ip_address || "—"}
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

      {/* 6. WHATSAPP CUSTOMER DISPATCH & NOTIFICATION MODAL */}
      {whatsAppModal && whatsAppModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-[#0B1220] border border-white/10 rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 my-auto">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-white/10 bg-[#080D1A] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <WhatsAppIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">
                      WhatsApp Customer Dispatch &amp; Notification
                    </h3>
                    {whatsAppModal.bookingRef && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                        {whatsAppModal.bookingRef}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Send 1-click status updates, dispatch alerts, and invoices directly to customer&apos;s WhatsApp
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWhatsAppModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer Summary Bar */}
            <div className="px-5 py-3 bg-[#060A14] border-b border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 text-white font-semibold">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{whatsAppModal.customerName}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-lg text-[11px]">
                  <Phone className="w-3 h-3 text-emerald-400" />
                  <span>+{getWhatsAppCleanPhone(whatsAppModal.phone)}</span>
                </div>
                {whatsAppModal.booking && (
                  <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    <span>{whatsAppModal.booking.locality}</span>
                    <span className="text-slate-600">•</span>
                    <span>{whatsAppModal.booking.service_date}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Template Selector Pills */}
            <div className="px-5 py-2.5 bg-slate-950/40 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0 mr-1">
                Templates:
              </span>
              {whatsAppModal.booking ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleSwitchTemplate("dispatch")}
                    className={`px-3 py-1.5 rounded-xl font-semibold text-[11px] whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      whatsAppModal.templateType === "dispatch"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                        : "bg-white/[0.04] text-slate-400 hover:text-white border border-white/5 hover:bg-white/[0.08]"
                    }`}
                  >
                    <span>🚗 On The Way / Dispatch</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchTemplate("confirmed")}
                    className={`px-3 py-1.5 rounded-xl font-semibold text-[11px] whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      whatsAppModal.templateType === "confirmed"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                        : "bg-white/[0.04] text-slate-400 hover:text-white border border-white/5 hover:bg-white/[0.08]"
                    }`}
                  >
                    <span>✅ Booking Confirmed</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchTemplate("completed")}
                    className={`px-3 py-1.5 rounded-xl font-semibold text-[11px] whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      whatsAppModal.templateType === "completed"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                        : "bg-white/[0.04] text-slate-400 hover:text-white border border-white/5 hover:bg-white/[0.08]"
                    }`}
                  >
                    <span>🌟 Completed &amp; Invoice</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchTemplate("rescheduled")}
                    className={`px-3 py-1.5 rounded-xl font-semibold text-[11px] whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      whatsAppModal.templateType === "rescheduled"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                        : "bg-white/[0.04] text-slate-400 hover:text-white border border-white/5 hover:bg-white/[0.08]"
                    }`}
                  >
                    <span>⏰ Rescheduled</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchTemplate("custom")}
                    className={`px-3 py-1.5 rounded-xl font-semibold text-[11px] whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      whatsAppModal.templateType === "custom"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                        : "bg-white/[0.04] text-slate-400 hover:text-white border border-white/5 hover:bg-white/[0.08]"
                    }`}
                  >
                    <span>💬 Custom Chat</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl font-semibold text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                >
                  <span>👋 CRM Lead Follow-Up</span>
                </button>
              )}
            </div>

            {/* Modal Body: Two column / preview + editor */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* WhatsApp Message Preview Bubble */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp Chat Bubble Preview</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Live preview as received by customer</span>
                </div>

                <div className="rounded-2xl bg-[#0b141a] p-4 border border-emerald-950/60 shadow-inner relative overflow-hidden">
                  {/* Subtle WhatsApp wallpaper doodle dots */}
                  <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

                  {/* Outgoing Message Bubble */}
                  <div className="relative max-w-lg ml-auto bg-[#005c4b] text-white text-xs rounded-2xl rounded-tr-sm p-3.5 shadow-md space-y-2 border border-emerald-600/30">
                    <div className="text-[12px] leading-relaxed text-slate-100 font-sans whitespace-pre-wrap select-text">
                      {formatWhatsAppPreview(whatsAppModal.message)}
                    </div>
                    <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-200/80 pt-1">
                      <span>Just now</span>
                      <span className="text-cyan-300 font-bold">✓✓</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Message Composer / Editor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Pencil className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Customize Message Content</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {whatsAppModal.message.length} chars
                  </span>
                </div>
                <textarea
                  rows={5}
                  value={whatsAppModal.message}
                  onChange={(e) =>
                    setWhatsAppModal({
                      ...whatsAppModal,
                      message: e.target.value,
                    })
                  }
                  className="w-full bg-[#060A14] border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 leading-relaxed font-sans shadow-inner"
                  placeholder="Type your message here or customize template text..."
                />
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-5 py-3.5 border-t border-white/10 bg-[#080D1A] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={handleCopyWAMessage}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors"
              >
                {copiedWAMessage ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300 font-bold">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Message</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setWhatsAppModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-transparent hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 transition-all cursor-pointer"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  <span>Open in WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MANUAL BOOKING CREATION MODAL */}
      {showCreateBookingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-[#0B1220] border border-white/10 rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 my-auto">
            <div className="px-5 py-4 border-b border-white/10 bg-[#080D1A] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Manual Booking Desk</h3>
                  <p className="text-[11px] text-slate-400">Book doorstep detailing on behalf of phone/walk-in customer</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateBookingModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualBookingSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 block">Customer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={manualBookingForm.customer_name}
                    onChange={(e) => setManualBookingForm({ ...manualBookingForm, customer_name: e.target.value })}
                    className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 block">Mobile Number * (+91)</label>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={manualBookingForm.customer_phone}
                    onChange={(e) => setManualBookingForm({ ...manualBookingForm, customer_phone: e.target.value })}
                    className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 block">Email Address (Optional)</label>
                  <input
                    type="email"
                    placeholder="customer@example.com"
                    value={manualBookingForm.customer_email}
                    onChange={(e) => setManualBookingForm({ ...manualBookingForm, customer_email: e.target.value })}
                    className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 block">Vehicle Type *</label>
                  <select
                    required
                    value={manualBookingForm.vehicle_type_id}
                    onChange={(e) => setManualBookingForm({ ...manualBookingForm, vehicle_type_id: Number(e.target.value) })}
                    className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  >
                    {vehicleTypes.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 block">Detailing Package *</label>
                  <select
                    required
                    value={manualBookingForm.service_package_id}
                    onChange={(e) => setManualBookingForm({ ...manualBookingForm, service_package_id: Number(e.target.value) })}
                    className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  >
                    {servicePackages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 block">Payment Method *</label>
                  <select
                    value={manualBookingForm.payment_method}
                    onChange={(e) => setManualBookingForm({ ...manualBookingForm, payment_method: e.target.value })}
                    className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="PAY_ON_SERVICE">Pay on Service / Cash on Doorstep</option>
                    <option value="RAZORPAY">Razorpay Online Prepayment</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 block">Service Date *</label>
                  <input
                    type="date"
                    required
                    value={manualBookingForm.service_date}
                    onChange={(e) => setManualBookingForm({ ...manualBookingForm, service_date: e.target.value })}
                    className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 block">Time Slot *</label>
                  <select
                    value={manualBookingForm.slot_time}
                    onChange={(e) => setManualBookingForm({ ...manualBookingForm, slot_time: e.target.value })}
                    className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400 font-mono"
                  >
                    {["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">House / Flat / Building Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flat 402, Oakwood Manor, 12th Main Road"
                  value={manualBookingForm.address_line}
                  onChange={(e) => setManualBookingForm({ ...manualBookingForm, address_line: e.target.value })}
                  className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 block">Locality / Sector *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sector 35 / Indiranagar"
                    value={manualBookingForm.locality}
                    onChange={(e) => setManualBookingForm({ ...manualBookingForm, locality: e.target.value })}
                    className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 block">Landmark</label>
                  <input
                    type="text"
                    placeholder="e.g. Near Community Center"
                    value={manualBookingForm.landmark}
                    onChange={(e) => setManualBookingForm({ ...manualBookingForm, landmark: e.target.value })}
                    className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 block">PIN Code</label>
                  <input
                    type="text"
                    placeholder="160036"
                    value={manualBookingForm.pincode}
                    onChange={(e) => setManualBookingForm({ ...manualBookingForm, pincode: e.target.value })}
                    className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">Special Instructions / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Gate code, basement parking spot, pet inside, etc."
                  value={manualBookingForm.special_instructions}
                  onChange={(e) => setManualBookingForm({ ...manualBookingForm, special_instructions: e.target.value })}
                  className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateBookingModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingBooking}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-md shadow-cyan-500/25 flex items-center gap-2"
                >
                  {creatingBooking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm & Create Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. STATUS CHANGE AUDIT HISTORY TIMELINE MODAL */}
      {selectedBookingHistory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-[#0B1220] border border-white/10 rounded-3xl max-w-lg w-full shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 my-auto">
            <div className="px-5 py-4 border-b border-white/10 bg-[#080D1A] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Audit Trail: #{selectedBookingHistory.booking.booking_reference}
                  </h3>
                  <p className="text-[11px] text-slate-400">Status transition and lifecycle log</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBookingHistory(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {loadingBookingHistory ? (
                <div className="p-8 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                  <span>Loading history records...</span>
                </div>
              ) : selectedBookingHistory.history.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No status transitions recorded yet. Initial state: {selectedBookingHistory.booking.status}.
                </div>
              ) : (
                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-white/10 pl-6">
                  {selectedBookingHistory.history.map((h: any, idx: number) => (
                    <div key={idx} className="relative space-y-1">
                      <div className="absolute -left-[19px] top-1.5 w-2.5 h-2.5 rounded-full bg-cyan-400 ring-4 ring-[#0B1220]" />
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white">
                          {h.from_status} → <span className="text-cyan-400">{h.to_status}</span>
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {h.timestamp ? new Date(h.timestamp).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          }) : "—"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Changed by: <span className="text-slate-300 font-semibold">{h.changed_by_name || "Admin"}</span>
                      </div>
                      {h.notes && (
                        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-[11px] text-slate-300 italic">
                          &ldquo;{h.notes}&rdquo;
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10 bg-[#080D1A] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedBookingHistory(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white"
              >
                Close Trail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. RECORD REFUND MODAL */}
      {refundModal.isOpen && refundModal.payment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-[#0B1220] border border-white/10 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 my-auto">
            <div className="px-5 py-4 border-b border-white/10 bg-[#080D1A] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Record Payment Refund</h3>
                  <p className="text-[11px] text-slate-400">Mark transaction refunded &amp; record audit entry</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRefundModal({ isOpen: false, payment: null, reason: "" })}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment ID:</span>
                  <span className="font-mono text-white">{refundModal.payment.payment_id || `#${refundModal.payment.id}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Customer:</span>
                  <span className="text-white font-semibold">{refundModal.payment.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount Paid:</span>
                  <span className="text-emerald-400 font-bold">₹{refundModal.payment.amount}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 block">Refund Reason / Notes *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Customer cancelled appointment; weather condition; duplicate payment."
                  value={refundModal.reason}
                  onChange={(e) => setRefundModal({ ...refundModal, reason: e.target.value })}
                  className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
                />
              </div>

              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300">
                Warning: This updates the transaction status to REFUNDED, marks the booking payment as refunded, and logs an entry to the compliance audit trail.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRefundModal({ isOpen: false, payment: null, reason: "" })}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRefundPaymentSubmit}
                  disabled={processingRefund}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-rose-600/30 flex items-center gap-2"
                >
                  {processingRefund ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Refund"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10. EDIT CUSTOMER PROFILE MODAL */}
      {customerEditModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-[#0B1220] border border-white/10 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 my-auto">
            <div className="px-5 py-4 border-b border-white/10 bg-[#080D1A] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Edit Customer Profile</h3>
                  <p className="text-[11px] text-slate-400">Update verified customer details</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCustomerEditModal({ isOpen: false, customerId: 0, full_name: "", email: "", phone: "" })}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerEdit} className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 block">Full Name *</label>
                <input
                  type="text"
                  required
                  value={customerEditModal.full_name}
                  onChange={(e) => setCustomerEditModal({ ...customerEditModal, full_name: e.target.value })}
                  className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 block">Email Address</label>
                <input
                  type="email"
                  value={customerEditModal.email}
                  onChange={(e) => setCustomerEditModal({ ...customerEditModal, email: e.target.value })}
                  className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 block">Mobile Phone (+91) *</label>
                <input
                  type="tel"
                  required
                  value={customerEditModal.phone}
                  onChange={(e) => setCustomerEditModal({ ...customerEditModal, phone: e.target.value })}
                  className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCustomerEditModal({ isOpen: false, customerId: 0, full_name: "", email: "", phone: "" })}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCustomerEdit}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-cyan-500/25 flex items-center gap-2"
                >
                  {savingCustomerEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 11. ADD ADMIN TEAM MEMBER MODAL */}
      {showAddTeamModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-[#0B1220] border border-white/10 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 my-auto">
            <div className="px-5 py-4 border-b border-white/10 bg-[#080D1A] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Create Admin Account</h3>
                  <p className="text-[11px] text-slate-400">Provision backend staff or executive credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTeamModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTeamMemberSubmit} className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 block">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. jatin_admin"
                  value={newTeamForm.username}
                  onChange={(e) => setNewTeamForm({ ...newTeamForm, username: e.target.value })}
                  className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 block">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jatin Sharma"
                  value={newTeamForm.full_name}
                  onChange={(e) => setNewTeamForm({ ...newTeamForm, full_name: e.target.value })}
                  className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 block">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="jatin@carspa.in"
                  value={newTeamForm.email}
                  onChange={(e) => setNewTeamForm({ ...newTeamForm, email: e.target.value })}
                  className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 block">Mobile Number (+91)</label>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={newTeamForm.phone}
                  onChange={(e) => setNewTeamForm({ ...newTeamForm, phone: e.target.value })}
                  className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 block">Initial Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  value={newTeamForm.password}
                  onChange={(e) => setNewTeamForm({ ...newTeamForm, password: e.target.value })}
                  className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 block">Role &amp; Permissions *</label>
                <select
                  value={newTeamForm.role}
                  onChange={(e) => setNewTeamForm({ ...newTeamForm, role: e.target.value })}
                  className="w-full bg-[#060A14] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="ADMIN">ADMIN — Full Booking, Customer, and Refund Management</option>
                  <option value="MANAGER">MANAGER — Operations, Technician Scheduling &amp; Capacity</option>
                  <option value="STAFF">STAFF — Service Executive &amp; Customer WhatsApp Dispatch</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN — Global Control, Team &amp; Audit Logs</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTeam}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-purple-600/30 flex items-center gap-2"
                >
                  {savingTeam ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
