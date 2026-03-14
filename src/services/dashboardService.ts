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

export async function getOrgSummaries(): Promise<OrgInventorySummary[]> {
  // Get all aggregator/associate orgs
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, type')
    .in('type', ['aggregator', 'associate'])
    .eq('status', 'active')
    .order('type')
    .order('name');

  if (!orgs || orgs.length === 0) return [];

  // Get counts per org in parallel
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
