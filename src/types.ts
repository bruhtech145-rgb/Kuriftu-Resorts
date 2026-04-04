export interface Member {
  id: string;
  email: string;
  full_name: string;
  loyalty_tier: "Explorer" | "Trekker" | "Summit" | "Pinnacle";
  points_balance: number;
  onboarding_completed: boolean;
  avatar_url?: string;
}

export interface Service {
  id: string;
  category_id: string;
  name: string;
  description: string;
  base_price: number;
  duration_minutes: number;
  max_capacity: number;
  is_bookable: boolean;
  status: "Active" | "Draft" | "Archived";
  tags: string[];
  images: string[];
}

export interface Booking {
  id: string;
  member_id: string;
  service_id: string;
  start_date: string;
  end_date: string;
  guest_count: number;
  final_price: number;
  status: "Confirmed" | "Pending" | "Cancelled" | "Completed";
  payment_status: "Paid" | "Unpaid" | "Refunded";
}

export interface PricingRule {
  id: string;
  name: string;
  description: string;
  type: "occupancy" | "seasonal" | "event";
  condition_value: number | string;
  adjustment_type: "percentage" | "fixed";
  adjustment_value: number;
  is_active: boolean;
  created_at: string;
}

export interface Preferences {
  activities: string[];
  dining: string[];
  wellness: string[];
  budget_tier: "Low" | "Mid" | "Premium" | "Luxury";
  ai_segment?: string;
  tagline?: string;
  recommended_services?: string[];
}

export interface Room {
  id: string;
  name: string;
  type: string;
  price: number;
  suggested_price?: number;
  capacity: number;
  status: 'Available' | 'Maintenance' | 'Booked' | string;
  description?: string;
  created_at?: string;
}
