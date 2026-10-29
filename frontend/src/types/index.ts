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
