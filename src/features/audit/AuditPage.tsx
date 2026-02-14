import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { EmptyState } from '@/components/hub/shared/EmptyState.tsx';
import type { AuditLog } from '@/lib/database.types.ts';

const ACTION_ICONS: Record<string, string> = {
  create: '➕',
  update: '✏️',
  delete: '🗑️',
  login: '🔑',
  logout: '🚪',
};

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('all');
  const { isPlatform } = usePermissions();
  const organization = useAuthStore((s) => s.organization);

  useEffect(() => {
    loadLogs();
  }, [entityFilter]);

  const loadLogs = async () => {
    setLoading(true);
    let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
    if (!isPlatform && organization) {
      query = query.eq('org_id', organization.id);
    }
    if (entityFilter !== 'all') {
      query = query.eq('entity_type', entityFilter);
    }
    const { data } = await query;
    setLogs((data as AuditLog[]) ?? []);
    setLoading(false);
  };

  const entities = ['all', 'organization', 'product', 'order', 'customer', 'invoice', 'user'];
  const entityLabels: Record<string, string> = {
    all: 'Todos', organization: 'Organizaciones', product: 'Productos', order: 'Órdenes',
    customer: 'Clientes', invoice: 'Facturas', user: 'Usuarios',
  };

  return (
    <div>
      <div className="rh-page-header">
        <div>
          <h1 className="rh-page-title">Auditoría</h1>
          <p className="rh-page-subtitle">Registro de actividad del sistema</p>
        </div>
      </div>

      <div className="rh-filters flex-wrap">
        {entities.map((e) => (
          <button
            key={e}
            onClick={() => setEntityFilter(e)}
            className={`rh-filter-pill ${entityFilter === e ? 'active' : ''}`}
          >
            {entityLabels[e]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="rh-loading">Cargando...</p>
      ) : logs.length === 0 ? (
        <EmptyState icon="📜" title="Sin registros" description="No hay actividad registrada aún" />
      ) : (
        <div className="rh-space-y-sm">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rh-audit-item"
            >
              <div className="rh-audit-icon">
                {ACTION_ICONS[log.action] ?? '📋'}
              </div>
              <div className="rh-audit-content">
                <div className="rh-audit-action">
                  <span className="rh-audit-action">
                    {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                  </span>
                  <span className="rh-audit-tag">
                    {log.entity_type}
                  </span>
                </div>
                <p className="rh-audit-meta">
                  {log.entity_id ? `ID: ${log.entity_id.slice(0, 8)}...` : ''}
                  {log.ip_address ? ` · IP: ${log.ip_address}` : ''}
                </p>
              </div>
              <span className="rh-audit-time">
                {new Date(log.created_at).toLocaleString('es-VE')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
