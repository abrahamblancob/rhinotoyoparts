import { query } from './base.ts';
import type { Order } from '@/lib/database.types.ts';

interface OrderWithCustomer extends Order {
  customers: { name: string } | null;
}

export async function getOrders(opts?: {
  orgId?: string;
  isPlatform?: boolean;
  isDispatcher?: boolean;
  assignedTo?: string;
  status?: string;
}) {
  return query<OrderWithCustomer[]>((sb) => {
    let q = sb
      .from('orders')
      .select('*, customers(name)')
      .order('created_at', { ascending: false });

    if (!opts?.isPlatform && opts?.orgId) {
      q = q.eq('org_id', opts.orgId);
    }
    if (opts?.isDispatcher && opts?.assignedTo) {
      q = q.eq('assigned_to', opts.assignedTo);
    }
    if (opts?.status && opts.status !== 'all') {
      q = q.eq('status', opts.status);
    }
    return q;
  });
}
