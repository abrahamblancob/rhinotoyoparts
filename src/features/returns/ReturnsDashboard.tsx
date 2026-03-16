import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAsyncData } from '@/hooks/useAsyncData.ts';
import { useOrgSelector } from '@/hooks/useOrgSelector.ts';
import { StatsCard } from '@/components/hub/shared/StatsCard.tsx';
import { StatusBadge } from '@/components/hub/shared/StatusBadge.tsx';
import { EmptyState } from '@/components/hub/shared/EmptyState.tsx';
import { OrgSelectorGrid } from '@/components/hub/shared/OrgSelectorGrid.tsx';
import { RETURN_STATUS_LABELS } from '@/lib/statusConfig.ts';
import { formatDateTime } from '@/utils/dateUtils.ts';
import * as returnService from '@/services/returnService.ts';
import { getOrgReturnSummaries } from '@/services/dashboardService.ts';
import type { OrgReturnSummary } from '@/services/dashboardService.ts';
import { supabase } from '@/lib/supabase.ts';
import type { ReturnOrder } from '@/types/warehouse.ts';

export function ReturnsDashboard() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { isPlatform, isAggregator } = usePermissions();
  const organization = useAuthStore((s) => s.organization);

  const { summaries, selectedOrgId, selectedOrg, loading: loadingSummaries, setSelectedOrgId, showSelector } =
    useOrgSelector<OrgReturnSummary>(getOrgReturnSummaries, isPlatform);

  const orgId = isPlatform ? selectedOrgId ?? undefined : organization?.id;

  const fetcher = useCallback(
    () =>
      returnService.getReturnOrders({
        orgId,
        isPlatform: false,
        isAggregator,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
    [orgId, isAggregator, statusFilter],
  );

  const { data: returns, loading, reload } = useAsyncData<ReturnOrder[]>(fetcher, [
    orgId,
    statusFilter,
  ]);

  useEffect(() => {
    const subId = orgId ?? organization?.id;
    if (!subId) return;
    const channel = returnService.subscribeToReturnOrders(subId, reload);
    return () => { supabase.removeChannel(channel); };
  }, [orgId, organization?.id, reload]);

  const items = showSelector ? [] : (returns ?? []);
  const filtered = search.trim()
    ? items.filter((r) => r.order_number?.toLowerCase().includes(search.toLowerCase()))
    : items;

  const totalCount = items.length;
  const pendingCount = items.filter((r) => r.status === 'pending').length;
  const inspectingCount = items.filter((r) => r.status === 'inspecting').length;
  const completedToday = items.filter((r) => {
    if (r.status !== 'completed' || !r.completed_at) return false;
    const today = new Date().toISOString().slice(0, 10);
    return r.completed_at.slice(0, 10) === today;
  }).length;

  const statuses = ['all', 'pending', 'inspecting', 'completed'];

  if (showSelector) {
    const totalReturns = summaries.reduce((s, o) => s + o.returnCount, 0);
    const totalPending = summaries.reduce((s, o) => s + o.pendingReturns, 0);
    const totalInspecting = summaries.reduce((s, o) => s + o.inspectingReturns, 0);

    return (
      <OrgSelectorGrid<OrgReturnSummary>
        summaries={summaries}
        loading={loadingSummaries}
        onSelect={setSelectedOrgId}
        pageTitle="Devoluciones"
        pageSubtitle="Selecciona una organización para ver sus devoluciones"
        globalStats={[
          { title: 'Total Devoluciones', value: totalReturns, icon: '🔄', color: '#6366F1' },
          { title: 'Pendientes', value: totalPending, icon: '⏳', color: '#F59E0B' },
          { title: 'En Inspección', value: totalInspecting, icon: '🔍', color: '#3B82F6' },
          { title: 'Organizaciones', value: summaries.length, icon: '🏢', color: '#8B5CF6' },
        ]}
        statFields={[
          { key: 'returnCount', label: 'Devoluciones', color: '#6366F1' },
          { key: 'pendingReturns', label: 'Pendientes', color: '#F59E0B', highlight: true },
          { key: 'inspectingReturns', label: 'En Inspección', color: '#3B82F6' },
        ]}
      />
    );
  }

  return (
    <div>
      <div className="rh-page-header">
        <div>
          {isPlatform && selectedOrg && (
            <button onClick={() => setSelectedOrgId(null)} className="rh-btn rh-btn-ghost" style={{ fontSize: 13, marginBottom: 4, padding: '2px 0' }}>
              ← Todas las organizaciones
            </button>
          )}
          <h1 className="rh-page-title">
            Devoluciones{isPlatform && selectedOrg ? ` — ${selectedOrg.name}` : ''}
          </h1>
          <p style={{ color: '#8A8886', fontSize: 14, marginTop: 4 }}>
            Gestiona las devoluciones de pedidos
          </p>
        </div>
      </div>

      <div className="rh-stats-grid mb-6">
        <StatsCard title="Total" value={totalCount} icon="🔄" color="#6366F1" />
        <StatsCard title="Pendientes" value={pendingCount} icon="⏳" color="#F59E0B" />
        <StatsCard title="En Inspección" value={inspectingCount} icon="🔍" color="#3B82F6" />
        <StatsCard title="Completadas Hoy" value={completedToday} icon="✅" color="#10B981" />
      </div>

      <div className="rh-filters flex-wrap" style={{ gap: 8, marginBottom: 16 }}>
        {statuses.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`rh-filter-pill ${statusFilter === s ? 'active' : ''}`}>
            {RETURN_STATUS_LABELS[s] ?? s}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 16, position: 'relative', maxWidth: 360 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8A8886' }} />
        <input type="text" placeholder="Buscar por numero de orden..." value={search} onChange={(e) => setSearch(e.target.value)} className="rh-input" style={{ paddingLeft: 36 }} />
      </div>

      {loading ? (
        <p className="rh-loading">Cargando...</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon="🔄" title="No hay devoluciones" description="Las devoluciones apareceran aqui cuando se registren desde la app" />
      ) : (
        <div className="rh-table-wrapper">
          <table className="rh-table">
            <thead>
              <tr>
                <th>Orden #</th>
                <th>Recibido por</th>
                <th>Estado</th>
                <th>Bultos</th>
                <th>Fotos</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ret) => (
                <tr key={ret.id} className="cursor-pointer" onClick={() => navigate(`/hub/returns/${ret.id}`)}>
                  <td className="cell-primary cell-mono">{ret.order_number ?? '-'}</td>
                  <td>{ret.receiver?.full_name ?? <span style={{ color: '#C8C6C4' }}>Sin asignar</span>}</td>
                  <td><StatusBadge status={ret.status} /></td>
                  <td><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Package size={14} style={{ color: '#8A8886' }} />{ret.package_count}</span></td>
                  <td>{(ret.photo_urls?.length ?? 0) > 0 ? `${ret.photo_urls.length} foto${ret.photo_urls.length > 1 ? 's' : ''}` : '-'}</td>
                  <td style={{ fontSize: 13, color: '#605E5C' }}>{formatDateTime(ret.created_at)}</td>
                  <td>
                    <button className="rh-btn" style={{ fontSize: 12, padding: '4px 10px' }} onClick={(e) => { e.stopPropagation(); navigate(`/hub/returns/${ret.id}`); }}>
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
