import type { OrgType, OrderStatus, ProductStatus } from './constants.ts';

export interface Organization {
  id: string;
  name: string;
  type: OrgType;
  rif: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  state: string | null;
  city: string | null;
  commission_pct: number;
  status: 'active' | 'suspended' | 'pending';
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  org_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  display_name: string;
  org_type: OrgType;
  description: string | null;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_at: string;
}

export interface Permission {
  id: string;
  module: string;
  action: string;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
}

export interface OrgHierarchy {
  id: string;
  parent_id: string;
  child_id: string;
  created_at: string;
}

export interface Category {
  id: string;
  org_id: string | null;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
}

export interface Product {
  id: string;
  org_id: string;
  category_id: string | null;
  sku: string;
  name: string;
  description: string | null;
  brand: string | null;
  oem_number: string | null;
  price: number;
  cost: number | null;
  stock: number;
  min_stock: number;
  status: ProductStatus;
  image_url: string | null;
  supplier_id: string | null;
  compatible_models: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  org_id: string;
  name: string;
  rif: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  org_id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  org_id: string;
  customer_id: string | null;
  order_number: string;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes: string | null;
  created_by: string;
  assigned_to: string | null;
  assigned_at: string | null;
  confirmed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  tracking_number: string | null;
  carrier_id: string | null;
  shipping_address: Record<string, string> | null;
  customer_phone: string | null;
  source: 'manual' | 'whatsapp' | 'rhino_vision' | 'catalog';
  tracking_code: string | null;
  tracking_is_public: boolean;
  estimated_duration_min: number | null;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  dispatcher_current_lat: number | null;
  dispatcher_current_lng: number | null;
  dispatcher_last_update: string | null;
  receiver_name: string | null;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  estimated_distance_km: number | null;
  actual_pickup_at: string | null;
  actual_delivery_at: string | null;
  receiver_phone: string | null;
  receiver_id_number: string | null;
  receiver_relationship: string | null;
  delivery_notes: string | null;
  requires_id_check: boolean;
  shipping_address_id: string | null;
  delivery_photo_url: string | null;
  warehouse_id: string | null;
  stock_reserved: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  org_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  changed_by: string;
  note: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface OrderAssignment {
  id: string;
  order_id: string;
  org_id: string;
  assigned_to: string;
  assigned_by: string;
  status: 'active' | 'reassigned' | 'completed';
  accepted_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  org_id: string;
  order_id: string | null;
  invoice_number: string;
  type: 'sale' | 'commission' | 'credit_note';
  amount: number;
  tax: number;
  total: number;
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled';
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface BulkUpload {
  id: string;
  org_id: string;
  uploaded_by: string;
  file_name: string;
  file_url: string | null;
  total_rows: number;
  success_rows: number;
  error_rows: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errors_json: Record<string, unknown>[] | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  org_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  // Joined fields (optional)
  profiles?: { full_name: string; email: string; avatar_url: string | null };
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export interface Carrier {
  id: string;
  name: string;
  code: string;
  tracking_url: string | null;
  is_active: boolean;
}
