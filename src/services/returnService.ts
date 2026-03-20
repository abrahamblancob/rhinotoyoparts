import { query, supabase, resolveAggregatorOrgIds, applyOrgScope } from './base.ts';
import type { ReturnOrder, ReturnOrderItem } from '@/types/warehouse.ts';

export async function getReturnOrders(opts?: {
  orgId?: string; isPlatform?: boolean; isAggregator?: boolean; status?: string; includeChildren?: boolean;
}) {
  // Resolve child org IDs if includeChildren (platform super admin)
  let scopeOrgIds: string[] | null = null;
  if (opts?.includeChildren && opts?.orgId) {
    const { data: hierarchy } = await supabase
      .from('org_hierarchy').select('child_id').eq('parent_id', opts.orgId);
    const childIds = (hierarchy ?? []).map((h: { child_id: string }) => h.child_id);
    scopeOrgIds = [opts.orgId, ...childIds];
  }

  const aggregatorOrgIds = scopeOrgIds ?? await resolveAggregatorOrgIds(opts);

  return query<ReturnOrder[]>((sb) => {
    let q = sb.from('return_orders')
      .select('*, receiver:profiles!return_orders_received_by_fkey(full_name), organization:organizations(name, type), order:orders!return_orders_order_id_fkey(order_number)')
      .order('created_at', { ascending: false });

    if (aggregatorOrgIds) {
      q = q.in('org_id', aggregatorOrgIds);
    } else {
      q = applyOrgScope(q, opts);
    }
    if (opts?.status) q = q.eq('status', opts.status);
    return q;
  });
}

export async function getReturnOrder(id: string) {
  return query<ReturnOrder>((sb) =>
    sb.from('return_orders')
      .select('*, receiver:profiles!return_orders_received_by_fkey(full_name), order:orders!return_orders_order_id_fkey(order_number)')
      .eq('id', id)
      .single()
  );
}

export async function getReturnOrderItems(returnOrderId: string) {
  return query<ReturnOrderItem[]>((sb) =>
    sb.from('return_order_items')
      .select('*, product:products(name, sku)')
      .eq('return_order_id', returnOrderId)
  );
}

export async function getReturnOrderForOrder(orderId: string) {
  return query<ReturnOrder>((sb) =>
    sb.from('return_orders')
      .select('*, receiver:profiles!return_orders_received_by_fkey(full_name), order:orders!return_orders_order_id_fkey(order_number)')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
  );
}

export function subscribeToReturnOrders(orgId: string, callback: () => void) {
  return supabase
    .channel(`return-orders-${orgId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'return_orders',
      filter: `org_id=eq.${orgId}`,
    }, callback)
    .subscribe();
}
