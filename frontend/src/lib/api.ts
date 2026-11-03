const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : null;
}

function getAuthToken(path: string): string | null {
  if (typeof window === "undefined") return null;
  // Admin endpoints (except public login)
  if (path.startsWith("/api/admin/")) {
    if (path === "/api/admin/login/") return null;
    return localStorage.getItem("carspa_admin_token");
  }

  // Customer endpoints that strictly require user authentication
  if (
    path.startsWith("/api/customer/") ||
    path.startsWith("/api/accounts/profile/") ||
    path.startsWith("/api/accounts/change-password/") ||
    path.startsWith("/api/accounts/logout/") ||
    path.startsWith("/api/accounts/me/")
  ) {
    return localStorage.getItem("carspa_auth_token");
  }

  // For booking creation, attach customer token if customer is logged in
  if (path === "/api/bookings/") {
    return localStorage.getItem("carspa_auth_token");
  }

  // All other endpoints are public (lookup, packages, vehicle types, slots, payment config, etc.)
  return null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const csrfToken = getCsrfToken();
  const token = getAuthToken(path);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    ...(token ? { Authorization: `Token ${token}` } : {}),
    ...(options.headers as any),
  };

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: "include", // For session-based authentication
    });
  } catch (err: any) {
    const errStr = String(err?.message || err);
    if (
      err?.name === "TypeError" ||
      errStr.includes("NetworkError") ||
      errStr.includes("Failed to fetch") ||
      errStr.includes("Network request failed")
    ) {
      throw new Error(
        "Unable to connect to CARSPA server. The backend may be waking up from idle (please allow a few seconds) or check your internet connection."
      );
    }
    throw err;
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      if (response.status === 401 && (errorData?.detail === "Invalid token." || errorData?.detail?.includes("token"))) {
        if (typeof window !== "undefined") {
          if (path.startsWith("/api/admin/")) {
            localStorage.removeItem("carspa_admin_token");
          } else {
            localStorage.removeItem("carspa_auth_token");
          }
        }
      }
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
  createBooking: (data: any, idempotencyKey?: string) => request<import("../types").BookingResponse>("/api/bookings/", {
    method: "POST",
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
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
  adminLogin: async (credentials: { username: string; password: string }) => {
    const res = await request<{ message: string; user: any; token?: string }>("/api/admin/login/", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    if (res.token && typeof window !== "undefined") {
      localStorage.setItem("carspa_admin_token", res.token);
    }
    return res;
  },
  adminLogout: async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("carspa_admin_token");
    }
    return request<{ message: string }>("/api/admin/logout/", { method: "POST" });
  },
  adminMe: () => request<any>("/api/admin/me/"),
  getAdminDashboard: () =>
    request<{
      metrics: any;
      charts?: any;
      recent_activity?: any;
      upcoming_appointments: import("../types").BookingResponse[];
    }>("/api/admin/dashboard/"),
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

  // Customer Authentication
  register: (data: any) =>
    request<{ message: string; token: string; user: import("../types").UserProfile }>("/api/auth/register/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  login: (data: { identifier: string; password: string; remember_me?: boolean }) =>
    request<{ message: string; token: string; user: import("../types").UserProfile }>("/api/auth/login/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  logout: () =>
    request<{ message: string }>("/api/auth/logout/", {
      method: "POST",
    }),
  getProfile: () => request<import("../types").UserProfile>("/api/auth/profile/"),
  updateProfile: (data: Partial<import("../types").UserProfile>) =>
    request<import("../types").UserProfile>("/api/auth/profile/", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  changePassword: (data: { old_password: string; new_password: string; confirm_password: string }) =>
    request<{ message: string; token?: string }>("/api/auth/profile/change-password/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  requestPasswordReset: (identifier: string) =>
    request<{ message: string; reset_token?: string }>("/api/auth/password-reset/", {
      method: "POST",
      body: JSON.stringify({ identifier }),
    }),
  confirmPasswordReset: (data: { token: string; new_password: string; confirm_password: string }) =>
    request<{ message: string }>("/api/auth/password-reset-confirm/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Customer Dashboard & Self-Service
  getCustomerDashboard: () =>
    request<import("../types").CustomerDashboardData>("/api/customer/dashboard/"),
  getCustomerBookings: (status?: string) => {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    return request<import("../types").BookingResponse[]>(`/api/customer/bookings/${q}`);
  },
  getCustomerBooking: (reference: string) =>
    request<import("../types").BookingResponse>(`/api/customer/bookings/${encodeURIComponent(reference)}/`),
  getCustomerPayments: () =>
    request<import("../types").CustomerPaymentItem[]>("/api/customer/payments/"),

  // Customer Saved Addresses
  getCustomerAddresses: () =>
    request<import("../types").CustomerAddress[]>("/api/customer/addresses/"),
  createCustomerAddress: (data: Partial<import("../types").CustomerAddress>) =>
    request<import("../types").CustomerAddress>("/api/customer/addresses/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCustomerAddress: (id: number, data: Partial<import("../types").CustomerAddress>) =>
    request<import("../types").CustomerAddress>(`/api/customer/addresses/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteCustomerAddress: (id: number) =>
    request<{ success: boolean }>(`/api/customer/addresses/${id}/`, {
      method: "DELETE",
    }),

  // Customer Saved Vehicles
  getCustomerVehicles: () =>
    request<import("../types").CustomerVehicle[]>("/api/customer/vehicles/"),
  createCustomerVehicle: (data: Partial<import("../types").CustomerVehicle>) =>
    request<import("../types").CustomerVehicle>("/api/customer/vehicles/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCustomerVehicle: (id: number, data: Partial<import("../types").CustomerVehicle>) =>
    request<import("../types").CustomerVehicle>(`/api/customer/vehicles/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteCustomerVehicle: (id: number) =>
    request<{ success: boolean }>(`/api/customer/vehicles/${id}/`, {
      method: "DELETE",
    }),

  // Admin Customer Management
  getAdminCustomers: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<any>(`/api/admin/customers/?${query}`);
  },
  getAdminCustomer: (id: number) =>
    request<any>(`/api/admin/customers/${id}/`),
  toggleAdminCustomerStatus: (id: number, status: string) =>
    request<any>(`/api/admin/customers/${id}/toggle-status/`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),
  adminUpdateCustomer: (id: number, data: any) =>
    request<any>(`/api/admin/customers/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Admin Bookings Extra Actions
  adminCreateBooking: (data: any) =>
    request<any>("/api/admin/bookings/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  adminTransitionBookingStatus: (id: number, status: string, notes?: string, force: boolean = false) =>
    request<any>(`/api/admin/bookings/${id}/transition-status/`, {
      method: "POST",
      body: JSON.stringify({ status, notes, force }),
    }),
  adminGetBookingHistory: (id: number) =>
    request<any[]>(`/api/admin/bookings/${id}/history/`),

  // Admin Payments (Razorpay)
  adminGetPayments: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<any>(`/api/admin/payments/?${query}`);
  },
  adminRefundPayment: (id: number, reason: string) =>
    request<any>(`/api/admin/payments/${id}/mark-refunded/`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  // Admin Audit Logs & Team
  adminGetAuditLogs: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<any>(`/api/admin/audit-logs/?${query}`);
  },
  adminGetTeam: () => request<any[]>("/api/admin/team/"),
  adminCreateTeamMember: (data: any) =>
    request<any>("/api/admin/team/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  adminToggleTeamMember: (id: number) =>
    request<any>(`/api/admin/team/${id}/toggle-active/`, {
      method: "POST",
    }),
  adminUpdateTeamRole: (id: number, role: string) =>
    request<any>(`/api/admin/team/${id}/update-role/`, {
      method: "POST",
      body: JSON.stringify({ role }),
    }),
};
