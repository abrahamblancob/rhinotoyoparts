import { query } from './base.ts';
import type { Product } from '@/lib/database.types.ts';

interface ProductPayload {
  org_id: string | undefined;
  sku: string;
  name: string;
  description: string | null;
  brand: string | null;
  oem_number: string | null;
  price: number;
  cost: number | null;
  stock: number;
  min_stock: number;
  status: string;
}

export async function getProducts(opts?: { orgId?: string; isPlatform?: boolean; status?: string }) {
  return query<Product[]>((sb) => {
    let q = sb.from('products').select('*').order('created_at', { ascending: false });
    if (!opts?.isPlatform && opts?.orgId) {
      q = q.eq('org_id', opts.orgId);
    }
    if (opts?.status === 'active' || opts?.status === 'inactive') {
      q = q.eq('status', opts.status);
    }
    if (opts?.status === 'out_of_stock') {
      q = q.eq('stock', 0);
    }
    return q;
  });
}

export async function saveProduct(data: ProductPayload, editId?: string) {
  if (editId) {
    return query<Product>((sb) =>
      sb.from('products').update(data).eq('id', editId).select().single()
    );
  }
  return query<Product>((sb) =>
    sb.from('products').insert(data).select().single()
  );
}

export async function deleteProduct(id: string) {
  return query<null>((sb) =>
    sb.from('products').delete().eq('id', id)
  );
}

export async function searchProducts(orgId: string, search: string) {
  const s = search.trim().toLowerCase();
  return query<Product[]>((sb) =>
    sb.from('products')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .or(`name.ilike.%${s}%,sku.ilike.%${s}%,oem_number.ilike.%${s}%,brand.ilike.%${s}%`)
      .limit(20)
  );
}

export async function getProductsByIds(ids: string[]) {
  if (ids.length === 0) return { data: [] as Product[], error: null };
  return query<Product[]>((sb) =>
    sb.from('products').select('*').in('id', ids)
  );
}
