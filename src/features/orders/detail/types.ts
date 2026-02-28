import type { Order, OrderItem, OrderStatusHistory, Customer, Profile, Carrier } from '@/lib/database.types.ts';

export interface OrderItemWithProduct extends OrderItem {
  products: { name: string; sku: string; image_url: string | null } | null;
}

export interface StatusHistoryWithUser extends OrderStatusHistory {
  profiles: { full_name: string } | null;
}

export interface OrderQr {
  qr_code: string;
  scanned_at: string | null;
  scanned_by: string | null;
  is_valid: boolean;
}

export type RealtimeStatus = 'connecting' | 'connected' | 'error';

export type { Order, Customer, Profile, Carrier };
