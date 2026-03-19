import { query, supabase } from './base.ts';
import type { ReceivingOrder, ReceivingOrderItem } from '@/types/warehouse.ts';

export async function getReceivingOrders(opts?: { orgId?: string; isPlatform?: boolean; warehouseId?: string; status?: string; includeChildren?: boolean }) {
  // Resolve child org IDs if includeChildren
  let scopeOrgIds: string[] | null = null;
  if (opts?.includeChildren && opts?.orgId) {
    const { data: hierarchy } = await supabase
      .from('org_hierarchy').select('child_id').eq('parent_id', opts.orgId);
    const childIds = (hierarchy ?? []).map((h: { child_id: string }) => h.child_id);
    scopeOrgIds = [opts.orgId, ...childIds];
  }

  return query<ReceivingOrder[]>((sb) => {
    let q = sb.from('receiving_orders')
      .select('*, warehouse:warehouses(name, org_id), receiver:profiles!receiving_orders_received_by_fkey(full_name), supplier:suppliers(name), organization:organizations(name, type)')
      .order('created_at', { ascending: false });
    if (scopeOrgIds) {
      q = q.in('org_id', scopeOrgIds);
    } else if (!opts?.isPlatform && opts?.orgId) {
      q = q.eq('org_id', opts.orgId);
    }
    if (opts?.warehouseId) q = q.eq('warehouse_id', opts.warehouseId);
    if (opts?.status) q = q.eq('status', opts.status);
    return q;
  });
}

export async function getReceivingOrder(id: string) {
  return query<ReceivingOrder>((sb) =>
    sb.from('receiving_orders')
      .select('*, warehouse:warehouses(name, org_id), receiver:profiles!receiving_orders_received_by_fkey(full_name), supplier:suppliers(name)')
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
  supplier_id?: string;
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
  const result = await query<ReceivingOrderItem>((sb) =>
    sb.from('receiving_order_items').insert(data).select().single()
  );
  // Translate UNIQUE constraint error to user-friendly message
  if (result.error && result.error.includes('uq_receiving_order_product')) {
    return { data: null, error: 'Este producto ya fue agregado a esta orden de recepcion.' };
  }
  return result;
}

export async function deleteReceivingItem(itemId: string) {
  return query<null>((sb) =>
    sb.from('receiving_order_items')
      .delete()
      .eq('id', itemId)
      .eq('status', 'pending')
  );
}

export async function receiveItem(itemId: string, data: {
  product_id: string;
  received_quantity: number;
  assigned_location_id?: string;
  warehouse_id: string;
  org_id: string;
  lot_number?: string;
  status: 'received' | 'partial' | 'damaged';
}) {
  return query<null>((sb) =>
    sb.rpc('receive_item_to_warehouse', {
      p_item_id: itemId,
      p_product_id: data.product_id,
      p_received_quantity: data.received_quantity,
      p_location_id: data.assigned_location_id ?? null,
      p_warehouse_id: data.warehouse_id,
      p_org_id: data.org_id,
      p_lot_number: data.lot_number ?? null,
      p_status: data.status,
    })
  );
}

export async function deleteReceivingOrder(orderId: string) {
  // First delete all items, then the order itself
  const itemsResult = await query<null>((sb) =>
    sb.from('receiving_order_items').delete().eq('receiving_order_id', orderId)
  );
  if (itemsResult.error) return itemsResult;

  return query<null>((sb) =>
    sb.from('receiving_orders')
      .delete()
      .eq('id', orderId)
      .neq('status', 'completed')
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
