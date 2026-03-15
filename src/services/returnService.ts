import { query, supabase, resolveAggregatorOrgIds, applyOrgScope } from './base.ts';
import type { ReturnOrder, ReturnOrderItem } from '@/types/warehouse.ts';

export async function getReturnOrders(opts?: {
  orgId?: string; isPlatform?: boolean; isAggregator?: boolean; status?: string;
}) {
  const aggregatorOrgIds = await resolveAggregatorOrgIds(opts);

  return query<ReturnOrder[]>((sb) => {
    let q = sb.from('return_orders')
      .select('*, receiver:profiles!return_orders_received_by_fkey(full_name)')
      .order('created_at', { ascending: false });

    q = applyOrgScope(q, opts, aggregatorOrgIds);
    if (opts?.status) q = q.eq('status', opts.status);
    return q;
  });
}

export async function getReturnOrder(id: string) {
  return query<ReturnOrder>((sb) =>
    sb.from('return_orders')
      .select('*, receiver:profiles!return_orders_received_by_fkey(full_name)')
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
      .select('*, receiver:profiles!return_orders_received_by_fkey(full_name)')
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
