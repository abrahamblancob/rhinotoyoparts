import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { StatusBadge } from '@/components/hub/shared/StatusBadge.tsx';
import { EmptyState } from '@/components/hub/shared/EmptyState.tsx';
import { StatsCard } from '@/components/hub/shared/StatsCard.tsx';
import type { Invoice } from '@/lib/database.types.ts';

export function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const { isPlatform } = usePermissions();
  const organization = useAuthStore((s) => s.organization);

  useEffect(() => {
    loadInvoices();
  }, [statusFilter]);

  const loadInvoices = async () => {
    setLoading(true);
    let query = supabase.from('invoices').select('*').order('created_at', { ascending: false });
    if (!isPlatform && organization) {
      query = query.eq('org_id', organization.id);
    }
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    const { data } = await query;
    setInvoices((data as Invoice[]) ?? []);
    setLoading(false);
  };

  const totalBilled = invoices.reduce((s, i) => s + i.total, 0);
  const paidTotal = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const pendingTotal = invoices.filter((i) => i.status === 'issued' || i.status === 'overdue').reduce((s, i) => s + i.total, 0);

  const statuses = ['all', 'draft', 'issued', 'paid', 'overdue', 'cancelled'];
  const statusLabels: Record<string, string> = {
    all: 'Todas', draft: 'Borrador', issued: 'Emitidas', paid: 'Pagadas', overdue: 'Vencidas', cancelled: 'Canceladas',
  };

  const typeLabels: Record<string, string> = { sale: 'Venta', commission: 'Comisión', credit_note: 'Nota de crédito' };

  return (
    <div>
      <div className="rh-page-header">
        <h1 className="rh-page-title">Facturación</h1>
      </div>

      <div className="rh-stats-grid mb-6">
        <StatsCard title="Total Facturado" value={`$${totalBilled.toFixed(2)}`} icon="🧾" color="#6366F1" />
        <StatsCard title="Cobrado" value={`$${paidTotal.toFixed(2)}`} icon="✅" color="#10B981" />
        <StatsCard title="Pendiente" value={`$${pendingTotal.toFixed(2)}`} icon="⏳" color="#F59E0B" />
        <StatsCard title="Total Facturas" value={invoices.length} icon="📄" color="#D3010A" />
      </div>

      <div className="rh-filters flex-wrap">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rh-filter-pill ${statusFilter === s ? 'active' : ''}`}
          >
            {statusLabels[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="rh-loading">Cargando...</p>
      ) : invoices.length === 0 ? (
        <EmptyState icon="🧾" title="No hay facturas" description="Las facturas aparecerán aquí cuando se generen" />
      ) : (
        <div className="rh-table-wrapper">
          <table className="rh-table">
            <thead>
              <tr>
                <th>Factura #</th>
                <th>Tipo</th>
                <th>Fecha</th>
                <th className="text-right">Monto</th>
                <th className="text-right">Total</th>
                <th>Vence</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="cursor-pointer">
                  <td className="cell-primary cell-mono">{inv.invoice_number}</td>
                  <td className="cell-muted">{typeLabels[inv.type] ?? inv.type}</td>
                  <td className="cell-muted">{new Date(inv.created_at).toLocaleDateString('es-VE')}</td>
                  <td className="text-right cell-muted">${inv.amount.toFixed(2)}</td>
                  <td className="text-right cell-bold">${inv.total.toFixed(2)}</td>
                  <td className="cell-muted">
                    {inv.due_date ? new Date(inv.due_date).toLocaleDateString('es-VE') : '—'}
                  </td>
                  <td><StatusBadge status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
