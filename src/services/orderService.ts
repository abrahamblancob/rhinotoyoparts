import { query, supabase, resolveAggregatorOrgIds, applyOrgScope } from './base.ts';
import type { Order } from '@/lib/database.types.ts';

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
  const aggregatorOrgIds = await resolveAggregatorOrgIds(opts);

  return query<OrderWithCustomer[]>((sb) => {
    let q = sb
      .from('orders')
      .select('*, customers(name)')
      .order('created_at', { ascending: false });

    q = applyOrgScope(q, opts, aggregatorOrgIds);
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
