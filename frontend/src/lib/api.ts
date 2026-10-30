const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const csrfToken = getCsrfToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    ...(options.headers as any),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // For session-based authentication
  });

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      if (typeof errorData === "string") {
        errorMessage = errorData;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      } else if (errorData.detail) {
        errorMessage = errorData.detail;
      } else {
        // Collect field validation errors
        const messages = Object.entries(errorData)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(" | ");
        if (messages) errorMessage = messages;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

function normalizeList<T>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

export const api = {
  // Public
  getVehicleTypes: () =>
    request<any>("/api/vehicle-types/").then((data) => normalizeList<import("../types").VehicleType>(data)),
  getServicePackages: () =>
    request<any>("/api/services/").then((data) => normalizeList<import("../types").ServicePackage>(data)),
  getServiceAddons: () =>
    request<any>("/api/services/addons/").then((data) => normalizeList<import("../types").ServiceAddon>(data)),
  getServiceAreas: () =>
    request<any>("/api/service-areas/").then((data) => normalizeList<import("../types").ServiceArea>(data)),
  getAvailability: (date: string, serviceId: number, vehicleTypeId?: number, areaId?: number) => {
    const params = new URLSearchParams({
      date,
      service_id: serviceId.toString(),
    });
    if (vehicleTypeId) params.append("vehicle_type_id", vehicleTypeId.toString());
    if (areaId) params.append("area_id", areaId.toString());
    return request<{ date: string; service_id: number; slots: import("../types").TimeSlot[] }>(
      `/api/availability/?${params.toString()}`
    );
  },
  createLead: (data: any) => request<import("../types").Lead>("/api/leads/", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  createBooking: (data: any) => request<import("../types").BookingResponse>("/api/bookings/", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  lookupBooking: (reference: string) =>
    request<import("../types").BookingResponse>(`/api/bookings/lookup/?reference=${encodeURIComponent(reference)}`),

  // Razorpay Payments
  getRazorpayConfig: () =>
    request<import("../types").RazorpayConfig>("/api/payments/razorpay/config/"),
  createRazorpayOrder: (bookingReference: string) =>
    request<import("../types").RazorpayOrderData>("/api/payments/razorpay/create-order/", {
      method: "POST",
      body: JSON.stringify({ booking_reference: bookingReference }),
    }),
  verifyRazorpayPayment: (data: {
    booking_reference: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) =>
    request<{
      success: boolean;
      message: string;
      booking: import("../types").BookingResponse;
      payment: any;
    }>("/api/payments/razorpay/verify/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  reportRazorpayPaymentFailed: (data: {
    booking_reference: string;
    razorpay_order_id: string;
    error_code?: string;
    error_description?: string;
    error_metadata?: any;
  }) =>
    request<{ status: string; message: string }>("/api/payments/razorpay/failed/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Admin
  adminLogin: (credentials: { username: string; password: string }) =>
    request<{ message: string; user: any }>("/api/admin/login/", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),
  adminLogout: () => request<{ message: string }>("/api/admin/logout/", { method: "POST" }),
  adminMe: () => request<any>("/api/admin/me/"),
  getAdminDashboard: () =>
    request<{ metrics: import("../types").DashboardMetrics; upcoming_appointments: import("../types").BookingResponse[] }>(
      "/api/admin/dashboard/"
    ),
  getAdminBookings: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<any>(`/api/admin/bookings/?${query}`);
  },
  confirmBooking: (id: number, notes?: string) =>
    request<import("../types").BookingResponse>(`/api/admin/bookings/${id}/confirm/`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    }),
  assignStaff: (id: number, staffId: number, notes?: string) =>
    request<import("../types").BookingResponse>(`/api/admin/bookings/${id}/assign/`, {
      method: "POST",
      body: JSON.stringify({ staff_id: staffId, notes }),
    }),
  getApiBaseUrl: () => API_BASE_URL,
  rescheduleBooking: (id: number, date: string, slotTime: string, force: boolean = false) =>
    request<import("../types").BookingResponse>(`/api/admin/bookings/${id}/reschedule/`, {
      method: "POST",
      body: JSON.stringify({ service_date: date, slot_time: slotTime, force }),
    }),
  completeBooking: (id: number, notes?: string, markPaid: boolean = true) =>
    request<import("../types").BookingResponse>(`/api/admin/bookings/${id}/complete/`, {
      method: "POST",
      body: JSON.stringify({ notes, mark_paid: markPaid }),
    }),
  updatePaymentStatus: (id: number, paymentStatus: string) =>
    request<import("../types").BookingResponse>(`/api/admin/bookings/${id}/update-payment/`, {
      method: "POST",
      body: JSON.stringify({ payment_status: paymentStatus }),
    }),
  cancelBooking: (id: number, reason: string) =>
    request<import("../types").BookingResponse>(`/api/admin/bookings/${id}/cancel/`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  getAdminLeads: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<any>(`/api/admin/leads/?${query}`);
  },
  updateLeadStatus: (id: number, status: string, notes?: string) =>
    request<import("../types").Lead>(`/api/admin/leads/${id}/update-status/`, {
      method: "POST",
      body: JSON.stringify({ status, notes }),
    }),
  getAdminStaff: () => request<any>("/api/admin/staff/"),
  getAdminConfig: () => request<any>("/api/admin/config/"),
  updateAdminConfig: (data: any) =>
    request<any>("/api/admin/config/", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  updateAdminPrice: (
    id: number,
    data: { base_price?: string | number; discounted_price?: string | number | null }
  ) =>
    request<any>(`/api/admin/prices/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};
