import { query, supabase } from './base.ts';
import type { Warehouse, WarehouseZone, PickList, PickListItem, WarehouseLocation, WarehouseRack } from '@/types/warehouse.ts';

export async function getPickLists(opts?: { orgId?: string; isPlatform?: boolean; isAggregator?: boolean; warehouseId?: string; status?: string }) {
  // If aggregator, fetch child org IDs to include their pick lists
  let aggregatorOrgIds: string[] | null = null;
  if (opts?.isAggregator && opts?.orgId) {
    const { data: hierarchy } = await supabase
      .from('org_hierarchy')
      .select('child_id')
      .eq('parent_id', opts.orgId);
    const childIds = (hierarchy ?? []).map((h: { child_id: string }) => h.child_id);
    aggregatorOrgIds = [opts.orgId, ...childIds];
  }

  return query<PickList[]>((sb) => {
    let q = sb.from('pick_lists')
      .select('*, order:orders(order_number, status), assignee:profiles!pick_lists_assigned_to_fkey(full_name)')
      .order('created_at', { ascending: false });

    if (opts?.isPlatform) {
      // Platform sees everything
    } else if (aggregatorOrgIds) {
      // Aggregator sees own + child org pick lists
      q = q.in('org_id', aggregatorOrgIds);
    } else if (opts?.orgId) {
      q = q.eq('org_id', opts.orgId);
    }

    if (opts?.warehouseId) q = q.eq('warehouse_id', opts.warehouseId);
    if (opts?.status) q = q.eq('status', opts.status);
    return q;
  });
}

export async function getPickList(id: string) {
  return query<PickList>((sb) =>
    sb.from('pick_lists')
      .select('*, order:orders(order_number, status), assignee:profiles!pick_lists_assigned_to_fkey(full_name)')
      .eq('id', id)
      .single()
  );
}

export async function getPickListItems(pickListId: string) {
  return query<PickListItem[]>((sb) =>
    sb.from('pick_list_items')
      .select('*, product:products(name, sku), location:warehouse_locations(code)')
      .eq('pick_list_id', pickListId)
      .order('sequence_order')
  );
}

export async function getPickListForOrder(orderId: string) {
  return query<PickList>((sb) =>
    sb.from('pick_lists')
      .select('*, order:orders(order_number, status), assignee:profiles!pick_lists_assigned_to_fkey(full_name)')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
  );
}

export async function createPickListForOrder(orderId: string, warehouseId: string, assignedTo?: string) {
  return query<string>((sb) =>
    sb.rpc('create_pick_list_for_order', {
      p_order_id: orderId,
      p_warehouse_id: warehouseId,
      p_assigned_to: assignedTo ?? null,
    })
  );
}

export async function assignPicker(pickListId: string, userId: string) {
  return query<PickList>((sb) =>
    sb.from('pick_lists')
      .update({ assigned_to: userId, status: 'assigned' })
      .eq('id', pickListId)
      .select()
      .single()
  );
}

export async function startPicking(pickListId: string) {
  return query<PickList>((sb) =>
    sb.from('pick_lists')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', pickListId)
      .select()
      .single()
  );
}

export async function claimPickList(pickListId: string, userId: string) {
  return query<PickList>((sb) =>
    sb.from('pick_lists')
      .update({ assigned_to: userId, status: 'assigned' })
      .eq('id', pickListId)
      .eq('status', 'pending') // concurrency guard: fails if already taken
      .select()
      .single()
  );
}

export async function getPickListLocations(locationIds: string[]) {
  if (locationIds.length === 0) return { data: [], error: null };
  return query<(WarehouseLocation & { rack: WarehouseRack | null })[]>((sb) =>
    sb.from('warehouse_locations')
      .select('*, rack:warehouse_racks(id, name, code, levels, positions_per_level)')
      .in('id', locationIds)
  );
}

export async function getWarehouseRacks(warehouseId: string) {
  return query<WarehouseRack[]>((sb) =>
    sb.from('warehouse_racks')
      .select('id, name, code, levels, positions_per_level, position_x, position_y, rack_width_m, rack_depth_m, orientation')
      .eq('warehouse_id', warehouseId)
      .eq('is_active', true)
      .order('name')
  );
}

export async function getWarehouseDetail(warehouseId: string) {
  return query<Warehouse>((sb) =>
    sb.from('warehouses')
      .select('*')
      .eq('id', warehouseId)
      .single()
  );
}

export async function getWarehouseZones(warehouseId: string) {
  return query<WarehouseZone[]>((sb) =>
    sb.from('warehouse_zones')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .eq('is_active', true)
      .order('name')
  );
}

export async function pickItem(itemId: string, quantityPicked: number, pickedBy: string) {
  return query<PickListItem>((sb) =>
    sb.from('pick_list_items')
      .update({
        quantity_picked: quantityPicked,
        status: 'picked',
        picked_at: new Date().toISOString(),
        picked_by: pickedBy,
        scan_verified: true,
      })
      .eq('id', itemId)
      .select()
      .single()
  );
}

export async function completePickList(pickListId: string) {
  return query<PickList>((sb) =>
    sb.from('pick_lists')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', pickListId)
      .select()
      .single()
  );
}

export function subscribeToPickLists(orgId: string, callback: () => void) {
  return supabase
    .channel(`pick-lists-${orgId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'pick_lists',
      filter: `org_id=eq.${orgId}`,
    }, callback)
    .subscribe();
}
