import { query, supabase, resolveAggregatorOrgIds, applyOrgScope } from './base.ts';
import type { Order } from '@/lib/database.types.ts';

interface OrderWithCustomer extends Order {
  customers: { name: string } | null;
  organizations: { name: string; type: string } | null;
}

export async function getOrders(opts?: {
  orgId?: string;
  isPlatform?: boolean;
  isAggregator?: boolean;
  isDispatcher?: boolean;
  assignedTo?: string;
  status?: string;
  includeChildren?: boolean;
}) {
  // If platform user selected an aggregator, resolve child org IDs to include
  let scopeOrgIds: string[] | null = null;
  if (opts?.includeChildren && opts?.orgId) {
    const { data: hierarchy } = await supabase
      .from('org_hierarchy').select('child_id').eq('parent_id', opts.orgId);
    const childIds = (hierarchy ?? []).map((h: { child_id: string }) => h.child_id);
    scopeOrgIds = [opts.orgId, ...childIds];
  }

  const aggregatorOrgIds = scopeOrgIds ? null : await resolveAggregatorOrgIds(opts);

  return query<OrderWithCustomer[]>((sb) => {
    let q = sb
      .from('orders')
      .select('*, customers(name), organizations(name, type)')
      .order('created_at', { ascending: false });

    if (scopeOrgIds) {
      q = q.in('org_id', scopeOrgIds);
    } else {
      q = applyOrgScope(q, opts, aggregatorOrgIds);
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
