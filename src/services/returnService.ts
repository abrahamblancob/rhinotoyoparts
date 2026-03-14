import { query, supabase } from './base.ts';
import type { ReturnOrder, ReturnOrderItem } from '@/types/warehouse.ts';

export async function getReturnOrders(opts?: {
  orgId?: string; isPlatform?: boolean; isAggregator?: boolean; status?: string;
}) {
  let aggregatorOrgIds: string[] | null = null;
  if (opts?.isAggregator && opts?.orgId) {
    const { data: hierarchy } = await supabase
      .from('org_hierarchy')
      .select('child_id')
      .eq('parent_id', opts.orgId);
    const childIds = (hierarchy ?? []).map((h: { child_id: string }) => h.child_id);
    aggregatorOrgIds = [opts.orgId, ...childIds];
  }

  return query<ReturnOrder[]>((sb) => {
    let q = sb.from('return_orders')
      .select('*, receiver:profiles!return_orders_received_by_fkey(full_name)')
      .order('created_at', { ascending: false });

    if (opts?.isPlatform) {
      // Platform sees everything
    } else if (aggregatorOrgIds) {
      q = q.in('org_id', aggregatorOrgIds);
    } else if (opts?.orgId) {
      q = q.eq('org_id', opts.orgId);
    }

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
