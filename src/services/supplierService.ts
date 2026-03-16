import { query } from './base.ts';
import type { Supplier } from '@/lib/database.types.ts';

interface SupplierPayload {
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  status?: 'active' | 'inactive';
}

export async function getSuppliers(opts?: { orgId?: string; isPlatform?: boolean }) {
  return query<Supplier[]>((sb) => {
    let q = sb.from('suppliers').select('*').order('name');
    if (!opts?.isPlatform && opts?.orgId) {
      q = q.eq('org_id', opts.orgId);
    }
    return q;
  });
}

export async function getActiveSuppliers(orgId: string) {
  return query<Supplier[]>((sb) =>
    sb.from('suppliers').select('id, name').eq('org_id', orgId).eq('status', 'active').order('name')
  );
}

export async function saveSupplier(payload: SupplierPayload & { org_id?: string }, editId?: string) {
  if (editId) {
    return query<Supplier>((sb) =>
      sb.from('suppliers').update(payload).eq('id', editId).select().single()
    );
  }
  return query<Supplier>((sb) =>
    sb.from('suppliers').insert(payload).select().single()
  );
}

export async function deleteSupplier(id: string) {
  return query<null>((sb) =>
    sb.from('suppliers').delete().eq('id', id)
  );
}
