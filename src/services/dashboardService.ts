import { supabase } from './base.ts';
import {
  LOW_STOCK_THRESHOLD,
  PENDING_ORDER_STATUSES,
  IN_PROGRESS_ORDER_STATUSES,
  PENDING_PICK_STATUSES,
  IN_PROGRESS_PICK_STATUSES,
  PENDING_PACK_STATUSES,
  IN_PROGRESS_PACK_STATUSES,
  PENDING_RECEIVING_STATUSES,
  IN_PROGRESS_RECEIVING_STATUSES,
} from './constants.ts';

interface DashboardStats {
  orgs: number;
  products: number;
  orders: number;
  lowStock: number;
}

export async function getDashboardStats(orgId?: string): Promise<DashboardStats> {
  let productsQuery = supabase.from('products').select('id', { count: 'exact', head: true });
  let ordersQuery = supabase.from('orders').select('id', { count: 'exact', head: true });
  let lowStockQuery = supabase.from('products').select('id', { count: 'exact', head: true }).gt('stock', 0).lte('stock', LOW_STOCK_THRESHOLD);

  if (orgId) {
    productsQuery = productsQuery.eq('org_id', orgId);
    ordersQuery = ordersQuery.eq('org_id', orgId);
    lowStockQuery = lowStockQuery.eq('org_id', orgId);
  }

  const [orgsRes, productsRes, ordersRes, lowStockRes] = await Promise.all([
    supabase.from('organizations').select('id', { count: 'exact', head: true }),
    productsQuery,
    ordersQuery,
    lowStockQuery,
  ]);
  return {
    orgs: orgsRes.count ?? 0,
    products: productsRes.count ?? 0,
    orders: ordersRes.count ?? 0,
    lowStock: lowStockRes.count ?? 0,
  };
}

/* ── Shared helpers ── */

interface ActiveOrg {
  id: string;
  name: string;
  type: string;
}

async function fetchActiveOrgs(): Promise<ActiveOrg[]> {
  const { data } = await supabase
    .from('organizations')
    .select('id, name, type')
    .in('type', ['aggregator', 'associate'])
    .eq('status', 'active')
    .order('type')
    .order('name');
  return (data as ActiveOrg[] | null) ?? [];
}

/**
 * Generic helper that fetches active orgs, maps each through a callback,
 * and automatically attaches { id, name, type } to every result.
 */
async function buildOrgSummaries<T>(
  callback: (org: ActiveOrg) => Promise<Omit<T, 'id' | 'name' | 'type'>>,
): Promise<(T & { id: string; name: string; type: string })[]> {
  const orgs = await fetchActiveOrgs();
  if (orgs.length === 0) return [];

  return Promise.all(
    orgs.map(async (org) => {
      const extra = await callback(org);
      return { id: org.id, name: org.name, type: org.type, ...extra } as T & { id: string; name: string; type: string };
    }),
  );
}

/* ── Inventory ── */

export interface OrgInventorySummary {
  id: string;
  name: string;
  type: string;
  productCount: number;
  totalStock: number;
  lowStock: number;
  orderCount: number;
}

export function getOrgSummaries(): Promise<OrgInventorySummary[]> {
  return buildOrgSummaries<OrgInventorySummary>(async (org) => {
    const [productsRes, stockRes, lowStockRes, ordersRes] = await Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
      supabase.from('products').select('stock').eq('org_id', org.id),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('org_id', org.id).gt('stock', 0).lte('stock', LOW_STOCK_THRESHOLD),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
    ]);

    const totalStock = (stockRes.data ?? []).reduce((sum, p) => sum + ((p as { stock: number }).stock ?? 0), 0);

    return {
      productCount: productsRes.count ?? 0,
      totalStock,
      lowStock: lowStockRes.count ?? 0,
      orderCount: ordersRes.count ?? 0,
    };
  });
}

/* ── Orders ── */

export interface OrgOrderSummary {
  id: string;
  name: string;
  type: string;
  orderCount: number;
  pendingOrders: number;
  inProgressOrders: number;
  revenue: number;
}

export async function getOrgOrderSummaries(): Promise<OrgOrderSummary[]> {
  // Only fetch aggregators for the grid
  const { data: aggregators } = await supabase
    .from('organizations')
    .select('id, name, type')
    .eq('type', 'aggregator')
    .eq('status', 'active')
    .order('name');

  const aggs = (aggregators as ActiveOrg[] | null) ?? [];
  if (aggs.length === 0) return [];

  return Promise.all(
    aggs.map(async (org) => {
      // Get child org IDs for this aggregator
      const { data: hierarchy } = await supabase
        .from('org_hierarchy').select('child_id').eq('parent_id', org.id);
      const childIds = (hierarchy ?? []).map((h: { child_id: string }) => h.child_id);
      const allOrgIds = [org.id, ...childIds];

      const [totalRes, pendingRes, inProgressRes, revenueRes] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).in('org_id', allOrgIds),
        supabase.from('orders').select('id', { count: 'exact', head: true }).in('org_id', allOrgIds).in('status', [...PENDING_ORDER_STATUSES]),
        supabase.from('orders').select('id', { count: 'exact', head: true }).in('org_id', allOrgIds).in('status', [...IN_PROGRESS_ORDER_STATUSES]),
        supabase.from('orders').select('total').in('org_id', allOrgIds),
      ]);
      const revenue = (revenueRes.data ?? []).reduce((s, o) => s + Number((o as { total: number }).total ?? 0), 0);

      return {
        id: org.id, name: org.name, type: org.type,
        orderCount: totalRes.count ?? 0, pendingOrders: pendingRes.count ?? 0,
        inProgressOrders: inProgressRes.count ?? 0, revenue,
      };
    }),
  );
}

/* ── Picking ── */

export interface OrgPickingSummary {
  id: string;
  name: string;
  type: string;
  pickListCount: number;
  pendingPicks: number;
  inProgressPicks: number;
}

export function getOrgPickingSummaries(): Promise<OrgPickingSummary[]> {
  return buildOrgSummaries<OrgPickingSummary>(async (org) => {
    const [totalRes, pendingRes, inProgressRes] = await Promise.all([
      supabase.from('pick_lists').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
      supabase.from('pick_lists').select('id', { count: 'exact', head: true }).eq('org_id', org.id).in('status', [...PENDING_PICK_STATUSES]),
      supabase.from('pick_lists').select('id', { count: 'exact', head: true }).eq('org_id', org.id).in('status', [...IN_PROGRESS_PICK_STATUSES]),
    ]);
    return { pickListCount: totalRes.count ?? 0, pendingPicks: pendingRes.count ?? 0, inProgressPicks: inProgressRes.count ?? 0 };
  });
}

/* ── Packing ── */

export interface OrgPackingSummary {
  id: string;
  name: string;
  type: string;
  packSessionCount: number;
  pendingPacks: number;
  inProgressPacks: number;
}

export function getOrgPackingSummaries(): Promise<OrgPackingSummary[]> {
  return buildOrgSummaries<OrgPackingSummary>(async (org) => {
    const [totalRes, pendingRes, inProgressRes] = await Promise.all([
      supabase.from('pack_sessions').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
      supabase.from('pack_sessions').select('id', { count: 'exact', head: true }).eq('org_id', org.id).in('status', [...PENDING_PACK_STATUSES]),
      supabase.from('pack_sessions').select('id', { count: 'exact', head: true }).eq('org_id', org.id).in('status', [...IN_PROGRESS_PACK_STATUSES]),
    ]);
    return { packSessionCount: totalRes.count ?? 0, pendingPacks: pendingRes.count ?? 0, inProgressPacks: inProgressRes.count ?? 0 };
  });
}

/* ── Returns ── */

export interface OrgReturnSummary {
  id: string;
  name: string;
  type: string;
  returnCount: number;
  pendingReturns: number;
  inspectingReturns: number;
}

export function getOrgReturnSummaries(): Promise<OrgReturnSummary[]> {
  return buildOrgSummaries<OrgReturnSummary>(async (org) => {
    const [totalRes, pendingRes, inspectingRes] = await Promise.all([
      supabase.from('return_orders').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
      supabase.from('return_orders').select('id', { count: 'exact', head: true }).eq('org_id', org.id).eq('status', 'pending'),
      supabase.from('return_orders').select('id', { count: 'exact', head: true }).eq('org_id', org.id).eq('status', 'inspecting'),
    ]);
    return { returnCount: totalRes.count ?? 0, pendingReturns: pendingRes.count ?? 0, inspectingReturns: inspectingRes.count ?? 0 };
  });
}

/* ── Receiving ── */

export interface OrgReceivingSummary {
  id: string;
  name: string;
  type: string;
  receivingCount: number;
  pendingReceiving: number;
  inProgressReceiving: number;
  completedReceiving: number;
}

export function getOrgReceivingSummaries(): Promise<OrgReceivingSummary[]> {
  return buildOrgSummaries<OrgReceivingSummary>(async (org) => {
    const [totalRes, pendingRes, inProgressRes, completedRes] = await Promise.all([
      supabase.from('receiving_orders').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
      supabase.from('receiving_orders').select('id', { count: 'exact', head: true }).eq('org_id', org.id).in('status', [...PENDING_RECEIVING_STATUSES]),
      supabase.from('receiving_orders').select('id', { count: 'exact', head: true }).eq('org_id', org.id).in('status', [...IN_PROGRESS_RECEIVING_STATUSES]),
      supabase.from('receiving_orders').select('id', { count: 'exact', head: true }).eq('org_id', org.id).eq('status', 'completed'),
    ]);
    return {
      receivingCount: totalRes.count ?? 0,
      pendingReceiving: pendingRes.count ?? 0,
      inProgressReceiving: inProgressRes.count ?? 0,
      completedReceiving: completedRes.count ?? 0,
    };
  });
}

/* ── Customers ── */

export interface OrgCustomerSummary {
  id: string;
  name: string;
  type: string;
  customerCount: number;
  withEmail: number;
  withPhone: number;
}

export function getOrgCustomerSummaries(): Promise<OrgCustomerSummary[]> {
  return buildOrgSummaries<OrgCustomerSummary>(async (org) => {
    const [totalRes, emailRes, phoneRes] = await Promise.all([
      supabase.from('customers').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
      supabase.from('customers').select('id', { count: 'exact', head: true }).eq('org_id', org.id).not('email', 'is', null),
      supabase.from('customers').select('id', { count: 'exact', head: true }).eq('org_id', org.id).not('phone', 'is', null),
    ]);
    return { customerCount: totalRes.count ?? 0, withEmail: emailRes.count ?? 0, withPhone: phoneRes.count ?? 0 };
  });
}

/* ── Stock by Location ── */

export interface OrgStockSummary {
  id: string;
  name: string;
  type: string;
  productCount: number;
  totalUnits: number;
  lowStockCount: number;
  warehouseCount: number;
}

export function getOrgStockSummaries(): Promise<OrgStockSummary[]> {
  return buildOrgSummaries<OrgStockSummary>(async (org) => {
    const [stockRes, lowRes, whRes] = await Promise.all([
      supabase.from('inventory_stock').select('product_id, quantity').eq('org_id', org.id),
      supabase.from('inventory_stock').select('id', { count: 'exact', head: true }).eq('org_id', org.id).lte('quantity', LOW_STOCK_THRESHOLD).gt('quantity', 0),
      supabase.from('warehouses').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
    ]);
    const rows = stockRes.data ?? [];
    const uniqueProducts = new Set(rows.map((r: { product_id: string }) => r.product_id)).size;
    const totalUnits = rows.reduce((s, r: { quantity: number }) => s + (r.quantity ?? 0), 0);
    return { productCount: uniqueProducts, totalUnits, lowStockCount: lowRes.count ?? 0, warehouseCount: whRes.count ?? 0 };
  });
}
