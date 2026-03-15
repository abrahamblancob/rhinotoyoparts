import { query, supabase, resolveAggregatorOrgIds, applyOrgScope } from './base.ts';
import type { PackSession, PackSessionItem } from '@/types/warehouse.ts';

export async function getPackSessions(opts?: { orgId?: string; isPlatform?: boolean; isAggregator?: boolean; warehouseId?: string; status?: string }) {
  const aggregatorOrgIds = await resolveAggregatorOrgIds(opts);

  return query<PackSession[]>((sb) => {
    let q = sb.from('pack_sessions')
      .select('*, order:orders(order_number, status), packer:profiles!pack_sessions_packed_by_fkey(full_name)')
      .order('created_at', { ascending: false });

    q = applyOrgScope(q, opts, aggregatorOrgIds);
    if (opts?.warehouseId) q = q.eq('warehouse_id', opts.warehouseId);
    if (opts?.status) q = q.eq('status', opts.status);
    return q;
  });
}

export async function getPackSession(id: string) {
  return query<PackSession>((sb) =>
    sb.from('pack_sessions')
      .select('*, order:orders(order_number, status), packer:profiles!pack_sessions_packed_by_fkey(full_name)')
      .eq('id', id)
      .single()
  );
}

export async function getPackSessionForOrder(orderId: string) {
  return query<PackSession>((sb) =>
    sb.from('pack_sessions')
      .select('*, order:orders(order_number, status), packer:profiles!pack_sessions_packed_by_fkey(full_name)')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
  );
}

export async function getPackSessionItems(sessionId: string) {
  return query<PackSessionItem[]>((sb) =>
    sb.from('pack_session_items')
      .select('*, product:products(name, sku)')
      .eq('pack_session_id', sessionId)
  );
}

export async function createPackSessionForOrder(orderId: string) {
  return query<string>((sb) =>
    sb.rpc('create_pack_session_for_order', { p_order_id: orderId })
  );
}

export async function assignPacker(sessionId: string, userId: string) {
  return query<PackSession>((sb) =>
    sb.from('pack_sessions')
      .update({ packed_by: userId, status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', sessionId)
      .select()
      .single()
  );
}

export async function verifyPackItem(itemId: string, quantityVerified: number) {
  return query<PackSessionItem>((sb) =>
    sb.from('pack_session_items')
      .update({
        quantity_verified: quantityVerified,
        scan_verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .select()
      .single()
  );
}

export async function completePackSession(sessionId: string, data: {
  package_weight_kg?: number;
  package_photo_url?: string;
}) {
  const result = await query<PackSession>((sb) =>
    sb.from('pack_sessions')
      .update({
        ...data,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single()
  );

  // Auto-transition order to 'packed' after packing is complete
  if (result.data) {
    const orderId = result.data.order_id;
    try {
      await supabase.rpc('change_order_status', {
        p_order_id: orderId,
        p_new_status: 'packed',
        p_notes: 'Packing completado',
        p_metadata: {},
      });
    } catch (err) {
      console.error('Auto-transition to packed failed:', err);
    }
  }

  return result;
}

export async function confirmDeliveryStock(orderId: string) {
  return query<void>((sb) =>
    sb.rpc('confirm_delivery_stock', { p_order_id: orderId })
  );
}

export function subscribeToPackSessions(orgId: string, callback: () => void) {
  return supabase
    .channel(`pack-sessions-${orgId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'pack_sessions',
      filter: `org_id=eq.${orgId}`,
    }, callback)
    .subscribe();
}
