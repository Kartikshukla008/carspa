export interface VehicleType {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon_name: string;
  image_url?: string;
  sort_order: number;
  is_active: boolean;
}

export interface ServicePackagePrice {
  id: number;
  vehicle_type: number;
  vehicle_type_name: string;
  base_price: string;
  discounted_price: string | null;
  effective_price: string;
  is_active: boolean;
}

export interface ServiceAddon {
  id: string;
  name: string;
  short_description: string;
  price: number;
  duration_minutes: number;
  badge?: string;
  icon?: string;
}

export interface ServicePackage {
  id: number;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  estimated_duration_minutes: number;
  features: string[];
  is_popular: boolean;
  badge_text: string;
  sort_order: number;
  is_active: boolean;
  prices: ServicePackagePrice[];
}

export interface ServiceArea {
  id: number;
  name: string;
  city: string;
  pincode_prefix: string;
  is_active: boolean;
  notes: string;
}

export interface TimeSlot {
  time: string;
  label: string;
  end_time: string;
  end_label: string;
  available: boolean;
  remaining_capacity: number;
  unavailable_reason: string | null;
}

export interface BookingResponse {
  id: number;
  user_id?: string | null;
  booking_reference: string;
  service_date: string;
  slot_start_time: string;
  slot_end_time: string;
  estimated_duration_minutes: number;
  status: string;
  status_display: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  address_line: string;
  locality: string;
  landmark: string;
  pincode: string;
  special_instructions: string;
  selected_addons?: { id: string; name: string; price: string }[];
  price_snapshot: string;
  tax_amount: string;
  discount_amount: string;
  final_amount: string;
  payment_method: string;
  payment_method_display: string;
  payment_status: string;
  vehicle_type: number;
  vehicle_type_name: string;
  service_package: number;
  service_package_name: string;
  service_area: number | null;
  service_area_name: string | null;
  assigned_staff: number | null;
  assigned_staff_name: string | null;
  cancellation_reason: string;
  cancelled_at: string | null;
  admin_notes: string;
  payment_details?: PaymentDetails | null;
  razorpay_order?: RazorpayOrderData | null;
  razorpay_order_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RazorpayOrderData {
  enabled: boolean;
  key_id: string;
  order_id: string;
  amount: number;
  currency: string;
  booking_reference: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  service_name?: string;
  vehicle_name?: string;
  payment_id?: number;
}

export interface PaymentDetails {
  id: number;
  provider: string;
  amount: string;
  currency: string;
  order_id: string;
  payment_id: string;
  status: string;
  created_at: string;
}

export interface RazorpayConfig {
  enabled: boolean;
  key_id: string;
  currency: string;
}

export interface Lead {
  id: number;
  lead_id: string;
  customer_name: string;
  mobile_number: string;
  email: string;
  vehicle_type: number | null;
  vehicle_type_name: string | null;
  service_package: number | null;
  service_package_name: string | null;
  requested_date: string | null;
  requested_slot: string;
  locality: string;
  address: string;
  pincode: string;
  source: string;
  status: string;
  admin_notes: string;
  booking_reference: string;
  created_at: string;
  updated_at: string;
}

export interface StaffMember {
  id: number;
  name: string;
  phone: string;
  email: string;
  is_active: boolean;
  max_daily_jobs: number;
  assigned_areas: number[];
  assigned_areas_details: ServiceArea[];
  active_jobs_count: number;
}

export interface DashboardMetrics {
  total_bookings: number;
  today_bookings_count: number;
  pending_confirmations: number;
  confirmed_bookings: number;
  completed_jobs: number;
  cancelled_bookings: number;
  total_revenue: string;
  total_leads: number;
  new_leads: number;
  conversion_rate: string;
}

export interface UserProfile {
  user_id: string; // Permanent User ID e.g. CARSPA-USER-10001
  full_name: string;
  email: string;
  phone: string;
  username: string;
  role?: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "STAFF" | "CUSTOMER";
  account_status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
  is_phone_verified: boolean;
  is_email_verified: boolean;
  date_joined: string;
  last_login?: string | null;
  is_staff: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminAuditLogItem {
  id: number;
  user: number | null;
  user_name: string;
  user_email: string;
  user_username?: string;
  user_role?: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: Record<string, any>;
  description?: string;
  ip_address: string | null;
  created_at: string;
  timestamp?: string;
}

export interface AdminTeamMember {
  id: number;
  user_id: string;
  username: string;
  email: string;
  full_name: string;
  phone: string;
  role: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "STAFF";
  role_display?: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  last_login: string | null;
  date_joined: string;
}

export interface AdminPaymentRecord {
  id: number;
  order_id: string;
  payment_id: string;
  booking_reference: string;
  customer_name: string;
  customer_phone: string;
  customer_user_id: string | null;
  service_package_name: string;
  amount: string;
  currency: string;
  provider: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerAddress {
  id: number;
  house_building: string;
  street_locality: string;
  city: string;
  state: string;
  pincode: string;
  address_type: "HOME" | "WORK" | "OTHER";
  landmark?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerVehicle {
  id: number;
  vehicle_type: number;
  vehicle_type_name: string;
  brand: string;
  model_name: string;
  license_plate: string;
  color?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerPaymentItem {
  id: number;
  amount: string;
  currency: string;
  provider: string;
  status: string;
  order_id: string;
  payment_id: string;
  created_at: string;
  booking_reference: string;
  service_package_name: string;
  service_date: string | null;
}

export interface CustomerDashboardData {
  profile: UserProfile;
  metrics: {
    total_bookings: number;
    active_bookings: number;
    completed_bookings: number;
    total_spent: string;
    saved_addresses_count: number;
    saved_vehicles_count: number;
  };
  recent_bookings: BookingResponse[];
  saved_addresses: CustomerAddress[];
  saved_vehicles: CustomerVehicle[];
}
