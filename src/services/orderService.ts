import { query } from './base.ts';
import type { Order } from '@/lib/database.types.ts';
import { supabase } from '@/lib/supabase.ts';

interface OrderWithCustomer extends Order {
  customers: { name: string } | null;
}

export async function getOrders(opts?: {
  orgId?: string;
  isPlatform?: boolean;
  isAggregator?: boolean;
  isDispatcher?: boolean;
  assignedTo?: string;
  status?: string;
}) {
  // If aggregator, first fetch child org IDs to include their orders
  let aggregatorOrgIds: string[] | null = null;
  if (opts?.isAggregator && opts?.orgId) {
    const { data: hierarchy } = await supabase
      .from('org_hierarchy')
      .select('child_id')
      .eq('parent_id', opts.orgId);
    const childIds = (hierarchy ?? []).map((h: { child_id: string }) => h.child_id);
    aggregatorOrgIds = [opts.orgId, ...childIds];
  }

  return query<OrderWithCustomer[]>((sb) => {
    let q = sb
      .from('orders')
      .select('*, customers(name)')
      .order('created_at', { ascending: false });

    if (opts?.isPlatform) {
      // Platform sees everything
    } else if (aggregatorOrgIds) {
      // Aggregator sees own + child org orders
      q = q.in('org_id', aggregatorOrgIds);
    } else if (opts?.orgId) {
      q = q.eq('org_id', opts.orgId);
    }
    if (opts?.isDispatcher && opts?.assignedTo) {
      q = q.eq('assigned_to', opts.assignedTo);
    }
    if (opts?.status && opts.status !== 'all') {
      q = q.eq('status', opts.status);
    }
    return q;
  });
}

export async function reserveOrderStock(orderId: string, warehouseId: string) {
  const { data, error } = await supabase.rpc('reserve_order_stock', {
    p_order_id: orderId,
    p_warehouse_id: warehouseId,
  });
  if (error) throw error;
  return data as { success: boolean; error?: string; message?: string };
}

export async function unreserveOrderStock(orderId: string) {
  const { data, error } = await supabase.rpc('unreserve_order_stock', {
    p_order_id: orderId,
  });
  if (error) throw error;
  return data as { success: boolean; error?: string; message?: string };
}
