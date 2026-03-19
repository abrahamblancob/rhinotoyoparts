import { query, supabase } from './base.ts';
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
  supplier_id: string | null;
}

export async function getProducts(opts?: { orgId?: string; isPlatform?: boolean; status?: string; includeChildren?: boolean }) {
  // Resolve child org IDs if includeChildren
  let scopeOrgIds: string[] | null = null;
  if (opts?.includeChildren && opts?.orgId) {
    const { data: hierarchy } = await supabase
      .from('org_hierarchy').select('child_id').eq('parent_id', opts.orgId);
    const childIds = (hierarchy ?? []).map((h: { child_id: string }) => h.child_id);
    scopeOrgIds = [opts.orgId, ...childIds];
  }

  return query<Product[]>((sb) => {
    let q = sb.from('products').select('*').order('created_at', { ascending: false });
    if (scopeOrgIds) {
      q = q.in('org_id', scopeOrgIds);
    } else if (!opts?.isPlatform && opts?.orgId) {
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

/** Search products for receiving — tries org_id filter first, falls back to no org filter */
export async function searchProductsForReceiving(orgId: string, search?: string, limit = 50) {
  const s = search?.trim().toLowerCase();

  // Try with org_id first
  const primary = await query<Product[]>((sb) => {
    let q = sb.from('products').select('*').eq('org_id', orgId).eq('status', 'active');
    if (s && s.length >= 2) {
      q = q.or(`name.ilike.%${s}%,sku.ilike.%${s}%,oem_number.ilike.%${s}%,brand.ilike.%${s}%`);
    }
    return q.order('name').limit(limit);
  });

  if (primary.data && primary.data.length > 0) return primary;

  // Fallback: no org filter, rely on RLS
  console.warn('[Receiving] No products for org_id:', orgId, '- falling back to RLS-only');
  return query<Product[]>((sb) => {
    let q = sb.from('products').select('*').eq('status', 'active');
    if (s && s.length >= 2) {
      q = q.or(`name.ilike.%${s}%,sku.ilike.%${s}%,oem_number.ilike.%${s}%,brand.ilike.%${s}%`);
    }
    return q.order('name').limit(limit);
  });
}

export async function getProductsByIds(ids: string[]) {
  if (ids.length === 0) return { data: [] as Product[], error: null };
  return query<Product[]>((sb) =>
    sb.from('products').select('*').in('id', ids)
  );
}
