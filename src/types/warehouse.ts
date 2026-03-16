// ═══════════════════════════════════════
// WMS Types - Warehouse Management System
// ═══════════════════════════════════════

export type ZoneType = 'storage' | 'receiving' | 'packing' | 'dispatch' | 'returns';
export type LocationType = 'standard' | 'bulk' | 'high_value' | 'temperature_controlled';
export type RackOrientation = 'vertical' | 'horizontal';
export type PickListStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
export type PickItemStatus = 'pending' | 'picked' | 'short' | 'substituted';
export type PackSessionStatus = 'pending' | 'in_progress' | 'verified' | 'labelled' | 'completed';
export type ReceivingStatus = 'pending' | 'receiving' | 'completed' | 'cancelled';
export type ReceivingItemStatus = 'pending' | 'received' | 'partial' | 'damaged';

export interface Warehouse {
  id: string;
  org_id: string;
  name: string;
  code: string;
  address: string | null;
  total_area_sqm: number | null;
  usable_area_sqm: number | null;
  latitude: number | null;
  longitude: number | null;
  width_m: number | null;
  length_m: number | null;
  height_m: number | null;
  pick_expiry_minutes: number;
  is_active: boolean;
  created_at: string;
}

export interface WarehouseZone {
  id: string;
  warehouse_id: string;
  name: string;
  code: string;
  zone_type: ZoneType;
  area_sqm: number | null;
  color: string | null;
  position_x: number | null;
  position_y: number | null;
  width: number | null;
  height: number | null;
  is_active: boolean;
  created_at: string;
}

export interface WarehouseAisle {
  id: string;
  warehouse_id: string;
  zone_id: string | null;
  name: string;
  code: string;
  width_m: number;
  position_x: number | null;
  position_y: number | null;
  length_cells: number | null;
  orientation: 'vertical' | 'horizontal';
  is_active: boolean;
  created_at: string;
}

export interface WarehouseRack {
  id: string;
  zone_id: string | null;
  warehouse_id: string;
  aisle_id: string | null;
  name: string;
  code: string;
  levels: number;
  positions_per_level: number;
  max_weight_kg: number | null;
  rack_width_m: number | null;
  rack_depth_m: number | null;
  position_x: number | null;
  position_y: number | null;
  orientation: RackOrientation;
  is_active: boolean;
  created_at: string;
}

export interface WarehouseLocation {
  id: string;
  rack_id: string;
  warehouse_id: string;
  code: string;
  level: number;
  position: number;
  location_type: LocationType;
  max_weight_kg: number | null;
  max_volume_cm3: number | null;
  is_occupied: boolean;
  is_active: boolean;
  qr_code: string | null;
  label_data: Record<string, unknown> | null;
  created_at: string;
}

export interface InventoryStock {
  id: string;
  product_id: string;
  location_id: string | null;
  warehouse_id: string;
  org_id: string;
  quantity: number;
  reserved_quantity: number;
  lot_number: string | null;
  expiry_date: string | null;
  received_at: string;
  last_counted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  product?: { name: string; sku: string; brand: string | null };
  location?: { code: string };
}

export interface AvailableStock {
  product_id: string;
  warehouse_id: string;
  org_id: string;
  total_stock: number;
  total_reserved: number;
  available: number;
}

// ── Picking ──

export interface PickList {
  id: string;
  order_id: string;
  warehouse_id: string;
  org_id: string;
  assigned_to: string | null;
  status: PickListStatus;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  total_items: number;
  picked_items: number;
  route_sequence: PickRouteStep[] | null;
  created_at: string;
  // Joined fields
  order?: { order_number: string; status: string };
  assignee?: { full_name: string };
}

export interface PickRouteStep {
  seq: number;
  item_id: string;
  location: string;
  product: string;
  qty: number;
}

export interface PickListItem {
  id: string;
  pick_list_id: string;
  order_item_id: string;
  product_id: string;
  source_location_id: string;
  quantity_required: number;
  quantity_picked: number;
  status: PickItemStatus;
  sequence_order: number | null;
  picked_at: string | null;
  picked_by: string | null;
  scan_verified: boolean;
  notes: string | null;
  // Joined fields
  product?: { name: string; sku: string };
  location?: { code: string };
}

// ── Packing ──

export interface PackSession {
  id: string;
  order_id: string;
  pick_list_id: string;
  warehouse_id: string;
  org_id: string;
  packed_by: string | null;
  status: PackSessionStatus;
  total_items: number;
  verified_items: number;
  package_weight_kg: number | null;
  package_count: number;
  package_photo_url: string | null;
  shipping_label_printed: boolean;
  packing_slip_printed: boolean;
  shipping_label_data: Record<string, unknown> | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  // Joined fields
  order?: { order_number: string; status: string };
  packer?: { full_name: string };
}

export interface PackSessionItem {
  id: string;
  pack_session_id: string;
  product_id: string;
  quantity_expected: number;
  quantity_verified: number;
  scan_verified: boolean;
  verified_at: string | null;
  notes: string | null;
  // Joined fields
  product?: { name: string; sku: string };
}

// ── Receiving ──

export interface ReceivingOrder {
  id: string;
  warehouse_id: string;
  org_id: string;
  supplier_id: string | null;
  supplier_name: string | null;
  reference_number: string | null;
  status: ReceivingStatus;
  received_by: string | null;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  // Joined fields
  warehouse?: { name: string; org_id: string };
  receiver?: { full_name: string };
  supplier?: { name: string };
}

export interface ReceivingOrderItem {
  id: string;
  receiving_order_id: string;
  product_id: string;
  expected_quantity: number;
  received_quantity: number;
  assigned_location_id: string | null;
  lot_number: string | null;
  status: ReceivingItemStatus;
  notes: string | null;
  scanned_at: string | null;
  // Joined fields
  product?: { name: string; sku: string };
  location?: { code: string };
}

// ── Returns ──

export type ReturnOrderStatus = 'pending' | 'inspecting' | 'completed';
export type ReturnItemDisposition = 'pending' | 'replenish' | 'defective' | 'damaged';
export type ReturnReason =
  | 'wrong_product' | 'damaged_in_transit' | 'defective'
  | 'incomplete_order' | 'customer_changed_mind' | 'wrong_quantity'
  | 'warranty_claim' | 'other';

export interface ReturnOrder {
  id: string;
  org_id: string;
  warehouse_id: string;
  order_id: string;
  order_number: string;
  package_count: number;
  photo_urls: string[];
  status: ReturnOrderStatus;
  received_by: string | null;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  // Joined fields
  receiver?: { full_name: string };
}

export interface ReturnOrderItem {
  id: string;
  return_order_id: string;
  product_id: string;
  quantity: number;
  return_reason: ReturnReason;
  observation: string | null;
  disposition: ReturnItemDisposition;
  inventory_stock_id: string | null;
  created_at: string;
  // Joined fields
  product?: { name: string; sku: string };
}

// ── Wizard & Forms ──

export interface WarehouseFormData {
  name: string;
  code: string;
  address: string;
  total_area_sqm: number | null;
  usable_area_sqm: number | null;
  latitude: number | null;
  longitude: number | null;
  width_m: number | null;
  length_m: number | null;
  height_m: number | null;
  pick_expiry_minutes: number;
}

export interface ZoneFormData {
  name: string;
  code: string;
  zone_type: ZoneType;
  area_sqm: number | null;
  color: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
}

export interface AisleFormData {
  name: string;
  code: string;
  width_m: number;
  position_x: number | null;
  position_y: number | null;
  length_cells: number | null;
  orientation: 'vertical' | 'horizontal';
}

export interface RackFormData {
  name: string;
  code: string;
  zone_id: string | null;
  aisle_id: string | null;
  levels: number;
  positions_per_level: number;
  max_weight_kg: number | null;
  rack_width_m: number | null;
  rack_depth_m: number | null;
}
