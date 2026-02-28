import { query } from './base.ts';
import type { Customer } from '@/lib/database.types.ts';

interface CustomerPayload {
  name: string;
  rif: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  lat: number | null;
  lng: number | null;
}

export async function getCustomers(opts?: { orgId?: string; isPlatform?: boolean }) {
  return query<Customer[]>((sb) => {
    let q = sb.from('customers').select('*').order('created_at', { ascending: false });
    if (!opts?.isPlatform && opts?.orgId) {
      q = q.eq('org_id', opts.orgId);
    }
    return q;
  });
}

export async function saveCustomer(payload: CustomerPayload, editId?: string) {
  if (editId) {
    return query<Customer>((sb) =>
      sb.from('customers').update(payload).eq('id', editId).select().single()
    );
  }
  return query<Customer>((sb) =>
    sb.from('customers').insert(payload).select().single()
  );
}

export async function createCustomer(payload: CustomerPayload & { org_id: string }) {
  return query<Customer>((sb) =>
    sb.from('customers').insert(payload).select().single()
  );
}

export async function updateCustomer(id: string, payload: Partial<CustomerPayload>) {
  return query<Customer>((sb) =>
    sb.from('customers').update(payload).eq('id', id).select().single()
  );
}

export async function deleteCustomer(id: string) {
  return query<null>((sb) =>
    sb.from('customers').delete().eq('id', id)
  );
}
