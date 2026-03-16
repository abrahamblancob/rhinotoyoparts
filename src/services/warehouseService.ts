import { query, supabase } from './base.ts';
import type {
  Warehouse,
  WarehouseZone,
  WarehouseAisle,
  WarehouseRack,
  WarehouseLocation,
  InventoryStock,
  WarehouseFormData,
  ZoneFormData,
  AisleFormData,
  RackFormData,
} from '@/types/warehouse.ts';

// ── Warehouses ──

export async function getWarehouses(opts?: { orgId?: string; isPlatform?: boolean }) {
  return query<Warehouse[]>((sb) => {
    let q = sb.from('warehouses').select('*').order('created_at', { ascending: false });
    if (!opts?.isPlatform && opts?.orgId) {
      q = q.eq('org_id', opts.orgId);
    }
    return q;
  });
}

export async function getWarehouse(id: string) {
  return query<Warehouse>((sb) =>
    sb.from('warehouses').select('*').eq('id', id).single()
  );
}

export async function saveWarehouse(data: WarehouseFormData & { org_id: string }, editId?: string) {
  if (editId) {
    return query<Warehouse>((sb) =>
      sb.from('warehouses').update(data).eq('id', editId).select().single()
    );
  }
  return query<Warehouse>((sb) =>
    sb.from('warehouses').insert(data).select().single()
  );
}

export async function deleteWarehouse(id: string) {
  // Delete in dependency order: stock → locations → racks → aisles → zones → warehouse
  const steps: { table: string; filter: { col: string; val: string } }[] = [
    { table: 'inventory_stock', filter: { col: 'warehouse_id', val: id } },
    { table: 'warehouse_locations', filter: { col: 'warehouse_id', val: id } },
    { table: 'warehouse_racks', filter: { col: 'warehouse_id', val: id } },
    { table: 'warehouse_aisles', filter: { col: 'warehouse_id', val: id } },
    { table: 'warehouse_zones', filter: { col: 'warehouse_id', val: id } },
  ];

  for (const step of steps) {
    const { error } = await supabase.from(step.table).delete().eq(step.filter.col, step.filter.val);
    if (error) {
      return { data: null, error: `Error eliminando ${step.table}: ${error.message}` };
    }
  }

  return query<null>((sb) => sb.from('warehouses').delete().eq('id', id));
}

export async function getWarehouseCount(orgId?: string) {
  let q = supabase.from('warehouses').select('id', { count: 'exact', head: true });
  if (orgId) q = q.eq('org_id', orgId);
  const { count } = await q;
  return count ?? 0;
}

// ── Zones ──

export async function getZones(warehouseId: string) {
  return query<WarehouseZone[]>((sb) =>
    sb.from('warehouse_zones').select('*').eq('warehouse_id', warehouseId).order('code')
  );
}

export async function saveZone(data: ZoneFormData & { warehouse_id: string }, editId?: string) {
  if (editId) {
    return query<WarehouseZone>((sb) =>
      sb.from('warehouse_zones').update(data).eq('id', editId).select().single()
    );
  }
  return query<WarehouseZone>((sb) =>
    sb.from('warehouse_zones').insert(data).select().single()
  );
}

export async function deleteZone(id: string) {
  // Unlink racks and aisles from this zone (don't delete them — the wizard will reassign)
  await supabase.from('warehouse_racks').update({ zone_id: null }).eq('zone_id', id);
  await supabase.from('warehouse_aisles').update({ zone_id: null }).eq('zone_id', id);
  return query<null>((sb) => sb.from('warehouse_zones').delete().eq('id', id));
}

// ── Aisles ──

export async function getAisles(warehouseId: string) {
  return query<WarehouseAisle[]>((sb) =>
    sb.from('warehouse_aisles').select('*').eq('warehouse_id', warehouseId).order('code')
  );
}

export async function saveAisle(data: AisleFormData & { warehouse_id: string; zone_id?: string | null }, editId?: string) {
  if (editId) {
    return query<WarehouseAisle>((sb) =>
      sb.from('warehouse_aisles').update(data).eq('id', editId).select().single()
    );
  }
  return query<WarehouseAisle>((sb) =>
    sb.from('warehouse_aisles').insert(data).select().single()
  );
}

export async function deleteAisle(id: string) {
  // Nullify aisle_id on racks that reference this aisle (don't delete the racks)
  await supabase.from('warehouse_racks').update({ aisle_id: null }).eq('aisle_id', id);
  return query<null>((sb) => sb.from('warehouse_aisles').delete().eq('id', id));
}

// ── Racks ──

export async function getRacks(warehouseId: string, zoneId?: string) {
  return query<WarehouseRack[]>((sb) => {
    let q = sb.from('warehouse_racks').select('*').eq('warehouse_id', warehouseId).order('code');
    if (zoneId) q = q.eq('zone_id', zoneId);
    return q;
  });
}

export async function saveRack(
  data: RackFormData & { warehouse_id: string },
  editId?: string
) {
  if (editId) {
    return query<WarehouseRack>((sb) =>
      sb.from('warehouse_racks').update(data).eq('id', editId).select().single()
    );
  }
  return query<WarehouseRack>((sb) =>
    sb.from('warehouse_racks').insert(data).select().single()
  );
}

export async function deleteRack(id: string) {
  const { data: locs } = await supabase.from('warehouse_locations').select('id').eq('rack_id', id);
  if (locs && locs.length > 0) {
    const locIds = locs.map((l: { id: string }) => l.id);
    await supabase.from('inventory_stock').delete().in('location_id', locIds);
  }
  await supabase.from('warehouse_locations').delete().eq('rack_id', id);
  return query<null>((sb) => sb.from('warehouse_racks').delete().eq('id', id));
}

export async function updateRackPosition(
  id: string,
  data: { position_x: number; position_y: number; orientation: string },
) {
  return query<WarehouseRack>((sb) =>
    sb.from('warehouse_racks').update(data).eq('id', id).select().single()
  );
}

export async function updateRackAisle(id: string, aisle_id: string | null) {
  return query<WarehouseRack>((sb) =>
    sb.from('warehouse_racks').update({ aisle_id }).eq('id', id).select().single()
  );
}

// ── Locations ──

export async function getLocations(warehouseId: string, rackId?: string) {
  return query<WarehouseLocation[]>((sb) => {
    let q = sb.from('warehouse_locations').select('*').eq('warehouse_id', warehouseId).order('code');
    if (rackId) q = q.eq('rack_id', rackId);
    return q;
  });
}

export async function getAvailableLocations(warehouseId: string) {
  return query<WarehouseLocation[]>((sb) =>
    sb.from('warehouse_locations')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .eq('is_occupied', false)
      .eq('is_active', true)
      .order('code')
  );
}

export async function updateLocation(id: string, data: Partial<WarehouseLocation>) {
  return query<WarehouseLocation>((sb) =>
    sb.from('warehouse_locations').update(data).eq('id', id).select().single()
  );
}

// ── Inventory Stock ──

export async function getStockByWarehouse(warehouseId: string) {
  return query<InventoryStock[]>((sb) =>
    sb.from('inventory_stock')
      .select('*, product:products(name, sku, brand), location:warehouse_locations(code)')
      .eq('warehouse_id', warehouseId)
      .order('created_at', { ascending: false })
  );
}

export async function getStockByProduct(productId: string, warehouseId?: string) {
  return query<InventoryStock[]>((sb) => {
    let q = sb.from('inventory_stock')
      .select('*, location:warehouse_locations(code)')
      .eq('product_id', productId);
    if (warehouseId) q = q.eq('warehouse_id', warehouseId);
    return q;
  });
}

export async function getStockByOrg(orgId: string) {
  return query<InventoryStock[]>((sb) =>
    sb.from('inventory_stock')
      .select('*, product:products(name, sku, brand), location:warehouse_locations(code)')
      .eq('org_id', orgId)
      .not('warehouse_id', 'is', null)
      .order('updated_at', { ascending: false })
  );
}

export async function assignProductToLocation(data: {
  product_id: string;
  location_id: string;
  warehouse_id: string;
  org_id: string;
  quantity: number;
  lot_number?: string;
}) {
  return query<InventoryStock>((sb) =>
    sb.from('inventory_stock').insert(data).select().single()
  );
}

export async function updateStock(id: string, data: Partial<InventoryStock>) {
  return query<InventoryStock>((sb) =>
    sb.from('inventory_stock').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  );
}

export async function removeProductFromLocation(
  stockId: string,
  locationId: string,
  productId: string,
  quantity: number,
) {
  const { error } = await supabase.rpc('return_stock_to_catalog', {
    p_stock_id: stockId,
    p_product_id: productId,
    p_quantity: quantity,
    p_location_id: locationId,
  });

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: null, error: null };
}

export async function deleteStockRecord(stockId: string, locationId: string) {
  const result = await query<null>((sb) =>
    sb.from('inventory_stock').delete().eq('id', stockId)
  );
  if (result.error) return result;

  const remaining = await query<InventoryStock[]>((sb) =>
    sb.from('inventory_stock').select('id').eq('location_id', locationId).limit(1)
  );
  if (!remaining.data?.length) {
    await query<WarehouseLocation>((sb) =>
      sb.from('warehouse_locations')
        .update({ is_occupied: false })
        .eq('id', locationId)
        .select()
        .single()
    );
  }

  return { data: null, error: null };
}

// ── Warehouse Stats ──

export async function getWarehouseStats(warehouseId: string) {
  const [zones, aisles, racks, locations, stock] = await Promise.all([
    query<WarehouseZone[]>((sb) => sb.from('warehouse_zones').select('id').eq('warehouse_id', warehouseId)),
    query<WarehouseAisle[]>((sb) => sb.from('warehouse_aisles').select('id').eq('warehouse_id', warehouseId)),
    query<WarehouseRack[]>((sb) => sb.from('warehouse_racks').select('id').eq('warehouse_id', warehouseId)),
    query<WarehouseLocation[]>((sb) => sb.from('warehouse_locations').select('id, is_occupied').eq('warehouse_id', warehouseId)),
    query<InventoryStock[]>((sb) => sb.from('inventory_stock').select('id, quantity').eq('warehouse_id', warehouseId)),
  ]);

  const totalLocations = locations.data?.length ?? 0;
  const occupiedLocations = locations.data?.filter((l) => l.is_occupied).length ?? 0;

  return {
    zones: zones.data?.length ?? 0,
    aisles: aisles.data?.length ?? 0,
    racks: racks.data?.length ?? 0,
    totalLocations,
    occupiedLocations,
    occupancyRate: totalLocations > 0 ? Math.round((occupiedLocations / totalLocations) * 100) : 0,
    totalStock: stock.data?.reduce((sum, s) => sum + s.quantity, 0) ?? 0,
  };
}

// ── Realtime ──

export function subscribeToLocations(warehouseId: string, callback: () => void) {
  return supabase
    .channel(`wh-locations-${warehouseId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'warehouse_locations',
      filter: `warehouse_id=eq.${warehouseId}`,
    }, callback)
    .subscribe();
}

export function subscribeToStock(warehouseId: string, callback: () => void) {
  return supabase
    .channel(`wh-stock-${warehouseId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'inventory_stock',
      filter: `warehouse_id=eq.${warehouseId}`,
    }, callback)
    .subscribe();
}
