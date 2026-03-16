import { supabase } from './base.ts';

interface DashboardStats {
  orgs: number;
  products: number;
  orders: number;
  lowStock: number;
}

export async function getDashboardStats(orgId?: string): Promise<DashboardStats> {
  let productsQuery = supabase.from('products').select('id', { count: 'exact', head: true });
  let ordersQuery = supabase.from('orders').select('id', { count: 'exact', head: true });
  let lowStockQuery = supabase.from('products').select('id', { count: 'exact', head: true }).gt('stock', 0).lte('stock', 5);

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

export interface OrgInventorySummary {
  id: string;
  name: string;
  type: string;
  productCount: number;
  totalStock: number;
  lowStock: number;
  orderCount: number;
}

/* ── Shared helper: fetch active orgs ── */
async function fetchActiveOrgs() {
  const { data } = await supabase
    .from('organizations')
    .select('id, name, type')
    .in('type', ['aggregator', 'associate'])
    .eq('status', 'active')
    .order('type')
    .order('name');
  return data ?? [];
}

export async function getOrgSummaries(): Promise<OrgInventorySummary[]> {
  const orgs = await fetchActiveOrgs();
  if (orgs.length === 0) return [];

  const summaries = await Promise.all(
    orgs.map(async (org) => {
      const [productsRes, stockRes, lowStockRes, ordersRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
        supabase.from('products').select('stock').eq('org_id', org.id),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('org_id', org.id).gt('stock', 0).lte('stock', 5),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
      ]);

      const totalStock = (stockRes.data ?? []).reduce((sum, p) => sum + ((p as { stock: number }).stock ?? 0), 0);

      return {
        id: org.id,
        name: org.name,
        type: org.type as string,
        productCount: productsRes.count ?? 0,
        totalStock,
        lowStock: lowStockRes.count ?? 0,
        orderCount: ordersRes.count ?? 0,
      };
    })
  );

  return summaries;
}

/* ── Page-specific org summaries ── */

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
  const orgs = await fetchActiveOrgs();
  if (orgs.length === 0) return [];

  return Promise.all(
    orgs.map(async (org) => {
      const [totalRes, pendingRes, inProgressRes, revenueRes] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('org_id', org.id).in('status', ['draft', 'pending', 'confirmed']),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('org_id', org.id).in('status', ['picking', 'packing', 'packed', 'assigned', 'picked']),
        supabase.from('orders').select('total').eq('org_id', org.id),
      ]);
      const revenue = (revenueRes.data ?? []).reduce((s, o) => s + Number((o as { total: number }).total ?? 0), 0);
      return { id: org.id, name: org.name, type: org.type as string, orderCount: totalRes.count ?? 0, pendingOrders: pendingRes.count ?? 0, inProgressOrders: inProgressRes.count ?? 0, revenue };
    }),
  );
}

export interface OrgPickingSummary {
  id: string;
  name: string;
  type: string;
  pickListCount: number;
  pendingPicks: number;
  inProgressPicks: number;
}

export async function getOrgPickingSummaries(): Promise<OrgPickingSummary[]> {
  const orgs = await fetchActiveOrgs();
  if (orgs.length === 0) return [];

  return Promise.all(
    orgs.map(async (org) => {
      const [totalRes, pendingRes, inProgressRes] = await Promise.all([
        supabase.from('pick_lists').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
        supabase.from('pick_lists').select('id', { count: 'exact', head: true }).eq('org_id', org.id).eq('status', 'pending'),
        supabase.from('pick_lists').select('id', { count: 'exact', head: true }).eq('org_id', org.id).in('status', ['assigned', 'in_progress']),
      ]);
      return { id: org.id, name: org.name, type: org.type as string, pickListCount: totalRes.count ?? 0, pendingPicks: pendingRes.count ?? 0, inProgressPicks: inProgressRes.count ?? 0 };
    }),
  );
}

export interface OrgPackingSummary {
  id: string;
  name: string;
  type: string;
  packSessionCount: number;
  pendingPacks: number;
  inProgressPacks: number;
}

export async function getOrgPackingSummaries(): Promise<OrgPackingSummary[]> {
  const orgs = await fetchActiveOrgs();
  if (orgs.length === 0) return [];

  return Promise.all(
    orgs.map(async (org) => {
      const [totalRes, pendingRes, inProgressRes] = await Promise.all([
        supabase.from('pack_sessions').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
        supabase.from('pack_sessions').select('id', { count: 'exact', head: true }).eq('org_id', org.id).eq('status', 'pending'),
        supabase.from('pack_sessions').select('id', { count: 'exact', head: true }).eq('org_id', org.id).in('status', ['in_progress', 'verified']),
      ]);
      return { id: org.id, name: org.name, type: org.type as string, packSessionCount: totalRes.count ?? 0, pendingPacks: pendingRes.count ?? 0, inProgressPacks: inProgressRes.count ?? 0 };
    }),
  );
}

export interface OrgReturnSummary {
  id: string;
  name: string;
  type: string;
  returnCount: number;
  pendingReturns: number;
  inspectingReturns: number;
}

export async function getOrgReturnSummaries(): Promise<OrgReturnSummary[]> {
  const orgs = await fetchActiveOrgs();
  if (orgs.length === 0) return [];

  return Promise.all(
    orgs.map(async (org) => {
      const [totalRes, pendingRes, inspectingRes] = await Promise.all([
        supabase.from('return_orders').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
        supabase.from('return_orders').select('id', { count: 'exact', head: true }).eq('org_id', org.id).eq('status', 'pending'),
        supabase.from('return_orders').select('id', { count: 'exact', head: true }).eq('org_id', org.id).eq('status', 'inspecting'),
      ]);
      return { id: org.id, name: org.name, type: org.type as string, returnCount: totalRes.count ?? 0, pendingReturns: pendingRes.count ?? 0, inspectingReturns: inspectingRes.count ?? 0 };
    }),
  );
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

export async function getOrgCustomerSummaries(): Promise<OrgCustomerSummary[]> {
  const orgs = await fetchActiveOrgs();
  if (orgs.length === 0) return [];

  return Promise.all(
    orgs.map(async (org) => {
      const [totalRes, emailRes, phoneRes] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('org_id', org.id).not('email', 'is', null),
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('org_id', org.id).not('phone', 'is', null),
      ]);
      return { id: org.id, name: org.name, type: org.type as string, customerCount: totalRes.count ?? 0, withEmail: emailRes.count ?? 0, withPhone: phoneRes.count ?? 0 };
    }),
  );
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

export async function getOrgStockSummaries(): Promise<OrgStockSummary[]> {
  const orgs = await fetchActiveOrgs();
  if (orgs.length === 0) return [];

  return Promise.all(
    orgs.map(async (org) => {
      const [stockRes, lowRes, whRes] = await Promise.all([
        supabase.from('inventory_stock').select('product_id, quantity').eq('org_id', org.id),
        supabase.from('inventory_stock').select('id', { count: 'exact', head: true }).eq('org_id', org.id).lte('quantity', 5).gt('quantity', 0),
        supabase.from('warehouses').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
      ]);
      const rows = stockRes.data ?? [];
      const uniqueProducts = new Set(rows.map((r: { product_id: string }) => r.product_id)).size;
      const totalUnits = rows.reduce((s, r: { quantity: number }) => s + (r.quantity ?? 0), 0);
      return { id: org.id, name: org.name, type: org.type as string, productCount: uniqueProducts, totalUnits, lowStockCount: lowRes.count ?? 0, warehouseCount: whRes.count ?? 0 };
    }),
  );
}
