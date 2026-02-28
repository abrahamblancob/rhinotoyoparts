import type { Product, Organization } from '@/lib/database.types.ts';

export interface OrderItem {
  product: Product;
  quantity: number;
}

export interface EditOrderItem {
  product_id: string;
  quantity: number;
  unit_price: number;
}

export type { Product, Organization };
