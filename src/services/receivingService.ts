import { query } from './base.ts';
import type { ReceivingOrder, ReceivingOrderItem } from '@/types/warehouse.ts';

export async function getReceivingOrders(opts?: { orgId?: string; isPlatform?: boolean; warehouseId?: string; status?: string }) {
  return query<ReceivingOrder[]>((sb) => {
    let q = sb.from('receiving_orders')
      .select('*, warehouse:warehouses(name), receiver:profiles!receiving_orders_received_by_fkey(full_name)')
      .order('created_at', { ascending: false });
    if (!opts?.isPlatform && opts?.orgId) q = q.eq('org_id', opts.orgId);
    if (opts?.warehouseId) q = q.eq('warehouse_id', opts.warehouseId);
    if (opts?.status) q = q.eq('status', opts.status);
    return q;
  });
}

export async function getReceivingOrder(id: string) {
  return query<ReceivingOrder>((sb) =>
    sb.from('receiving_orders')
      .select('*, warehouse:warehouses(name), receiver:profiles!receiving_orders_received_by_fkey(full_name)')
      .eq('id', id)
      .single()
  );
}

export async function getReceivingOrderItems(orderId: string) {
  return query<ReceivingOrderItem[]>((sb) =>
    sb.from('receiving_order_items')
      .select('*, product:products(name, sku), location:warehouse_locations(code)')
      .eq('receiving_order_id', orderId)
  );
}

export async function createReceivingOrder(data: {
  warehouse_id: string;
  org_id: string;
  supplier_name?: string;
  reference_number?: string;
  notes?: string;
}) {
  return query<ReceivingOrder>((sb) =>
    sb.from('receiving_orders').insert(data).select().single()
  );
}

export async function addReceivingItem(data: {
  receiving_order_id: string;
  product_id: string;
  expected_quantity: number;
}) {
  return query<ReceivingOrderItem>((sb) =>
    sb.from('receiving_order_items').insert(data).select().single()
  );
}

export async function receiveItem(itemId: string, data: {
  received_quantity: number;
  assigned_location_id: string;
  lot_number?: string;
  status: 'received' | 'partial' | 'damaged';
}) {
  return query<ReceivingOrderItem>((sb) =>
    sb.from('receiving_order_items')
      .update({ ...data, scanned_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single()
  );
}

export async function completeReceiving(orderId: string, receivedBy: string) {
  return query<ReceivingOrder>((sb) =>
    sb.from('receiving_orders')
      .update({
        status: 'completed',
        received_by: receivedBy,
        completed_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single()
  );
}
