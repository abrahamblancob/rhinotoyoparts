import { supabase } from './base.ts';

interface DashboardStats {
  orgs: number;
  products: number;
  orders: number;
  lowStock: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [orgsRes, productsRes, ordersRes, lowStockRes] = await Promise.all([
    supabase.from('organizations').select('id', { count: 'exact', head: true }),
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('products').select('id', { count: 'exact', head: true }).gt('stock', 0).lte('stock', 5),
  ]);
  return {
    orgs: orgsRes.count ?? 0,
    products: productsRes.count ?? 0,
    orders: ordersRes.count ?? 0,
    lowStock: lowStockRes.count ?? 0,
  };
}
