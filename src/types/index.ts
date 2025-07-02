export interface Company {
  id: string;
  name: string;
  logo_url?: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
}

export interface CompanyUser {
  id: string;
  company_id: string;
  user_id: string;
  role: string;
  created_at: string;
  user_email?: string;
  user?: User;
}

export interface Room {
  id: string;
  company_id: string;
  name: string;
  price: number;
  capacity: number;
  created_at: string;
}

export interface Booking {
  id: string;
  company_id: string;
  room_id: string;
  check_in_date: string;
  check_out_date: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  is_paid: boolean;
  total_amount: number;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  advance_paid: number;
  referred_by?: string;
  notes?: string;
  created_at: string;
  room?: Room;
}