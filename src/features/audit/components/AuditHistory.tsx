import { useState, useCallback } from 'react';
import { Clock, Mail, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAsyncData } from '@/hooks/useAsyncData.ts';
import * as stockAuditService from '@/services/stockAuditService.ts';
import { toast } from '@/stores/toastStore.ts';
import type { StockAudit } from '@/types/warehouse.ts';

interface AuditHistoryProps {
  warehouseId: string;
}

const TYPE_LABELS: Record<string, string> = {
  manual: 'Manual',
  random_single: '1 Aleatorio',
  random_multiple: 'X Aleatorios',
};

export function AuditHistory({ warehouseId }: AuditHistoryProps) {
  const [resendingId, setResendingId] = useState<string | null>(null);

  const fetcher = useCallback(
    () => stockAuditService.getAudits(warehouseId),
    [warehouseId],
  );

  const { data: audits, loading, reload } = useAsyncData<StockAudit[]>(fetcher, [warehouseId]);

  const handleResendEmail = async (audit: StockAudit) => {
    if (!audit.email_sent_to) {
      toast('error', 'Esta auditoría no tiene correo asociado');
      return;
    }
    setResendingId(audit.id);
    const { error } = await stockAuditService.sendAuditEmail(audit.id, audit.email_sent_to);
    if (error) {
      toast('error', `Error al reenviar: ${error}`);
    } else {
      toast('success', `Reporte reenviado a ${audit.email_sent_to}`);
    }
    setResendingId(null);
  };

  if (loading) {
    return <p className="rh-loading">Cargando historial...</p>;
  }

  const items = audits ?? [];

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
        <Clock size={48} style={{ marginBottom: 12, opacity: 0.4 }} />
        <p style={{ fontSize: 14, fontWeight: 600 }}>No hay auditorías registradas</p>
        <p style={{ fontSize: 12 }}>Las auditorías completadas aparecen aquí</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={18} />
          Historial de Auditorías ({items.length})
        </h3>
        <button
          onClick={reload}
          className="rh-btn rh-btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
        >
          <RefreshCw size={12} />
          Actualizar
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: '#64748B', fontWeight: 600, fontSize: 11 }}>Fecha</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: '#64748B', fontWeight: 600, fontSize: 11 }}>Hora</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: '#64748B', fontWeight: 600, fontSize: 11 }}>Auditor</th>
              <th style={{ textAlign: 'center', padding: '10px 12px', color: '#64748B', fontWeight: 600, fontSize: 11 }}>Tipo</th>
              <th style={{ textAlign: 'center', padding: '10px 12px', color: '#64748B', fontWeight: 600, fontSize: 11 }}>Ubicaciones</th>
              <th style={{ textAlign: 'center', padding: '10px 12px', color: '#10B981', fontWeight: 600, fontSize: 11 }}>Coinciden</th>
              <th style={{ textAlign: 'center', padding: '10px 12px', color: '#EF4444', fontWeight: 600, fontSize: 11 }}>Discrepancias</th>
              <th style={{ textAlign: 'center', padding: '10px 12px', color: '#64748B', fontWeight: 600, fontSize: 11 }}>Email</th>
              <th style={{ textAlign: 'center', padding: '10px 12px', color: '#64748B', fontWeight: 600, fontSize: 11 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((audit) => {
              const dt = new Date(audit.created_at);
              const dateStr = dt.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
              const timeStr = dt.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
              return (
                <tr
                  key={audit.id}
                  style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.1s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{dateStr}</td>
                  <td style={{ padding: '10px 12px', color: '#64748B' }}>{timeStr}</td>
                  <td style={{ padding: '10px 12px' }}>{audit.auditor?.full_name ?? '-'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{
                      padding: '2px 10px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                      backgroundColor: '#F1F5F9',
                      color: '#475569',
                    }}>
                      {TYPE_LABELS[audit.audit_type] ?? audit.audit_type}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>{audit.location_count}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#10B981', fontWeight: 600 }}>
                      <CheckCircle2 size={12} /> {audit.match_count}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: audit.discrepancy_count > 0 ? '#EF4444' : '#94A3B8', fontWeight: 600 }}>
                      <AlertTriangle size={12} /> {audit.discrepancy_count}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 11, color: '#94A3B8' }}>
                    {audit.email_sent_to ?? '-'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    {audit.email_sent_to && (
                      <button
                        onClick={() => handleResendEmail(audit)}
                        disabled={resendingId === audit.id}
                        style={{
                          padding: '4px 10px',
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: '#F0F9FF',
                          color: '#0EA5E9',
                          border: '1px solid #BAE6FD',
                          borderRadius: 6,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          opacity: resendingId === audit.id ? 0.5 : 1,
                        }}
                      >
                        <Mail size={10} />
                        {resendingId === audit.id ? 'Enviando...' : 'Reenviar'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
