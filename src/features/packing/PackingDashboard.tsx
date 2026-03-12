import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Weight,
  CheckSquare,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAsyncData } from '@/hooks/useAsyncData.ts';
import { StatsCard } from '@/components/hub/shared/StatsCard.tsx';
import { StatusBadge } from '@/components/hub/shared/StatusBadge.tsx';
import { EmptyState } from '@/components/hub/shared/EmptyState.tsx';
import { PACK_SESSION_STATUS_LABELS } from '@/lib/statusConfig.ts';
import * as packingService from '@/services/packingService.ts';
import { supabase } from '@/lib/supabase.ts';
import type { PackSession } from '@/types/warehouse.ts';

export function PackingDashboard() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { isPlatform, isAggregator } = usePermissions();
  const organization = useAuthStore((s) => s.organization);

  const fetcher = useCallback(
    () =>
      packingService.getPackSessions({
        orgId: organization?.id,
        isPlatform,
        isAggregator,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
    [organization?.id, isPlatform, isAggregator, statusFilter],
  );

  const { data: sessions, loading, reload } = useAsyncData<PackSession[]>(fetcher, [
    organization?.id,
    statusFilter,
  ]);

  // Realtime
  useEffect(() => {
    if (!organization?.id) return;
    const channel = packingService.subscribeToPackSessions(organization.id, reload);
    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization?.id, reload]);

  const items = sessions ?? [];
  const filtered = search.trim()
    ? items.filter((s) =>
        s.order?.order_number?.toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  // Stats
  const totalCount = items.length;
  const pendingCount = items.filter((s) => s.status === 'pending').length;
  const inProgressCount = items.filter((s) => s.status === 'in_progress').length;
  const completedToday = items.filter((s) => {
    if (s.status !== 'completed' || !s.completed_at) return false;
    const today = new Date().toISOString().slice(0, 10);
    return s.completed_at.slice(0, 10) === today;
  }).length;

  const statuses = ['all', 'pending', 'in_progress', 'verified', 'labelled', 'completed'];

  return (
    <div>
      <div className="rh-page-header">
        <div>
          <h1 className="rh-page-title">Packing - Sesiones de Empaque</h1>
          <p style={{ color: '#8A8886', fontSize: 14, marginTop: 4 }}>
            Gestiona la verificacion y empaque de pedidos
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="rh-stats-grid mb-6">
        <StatsCard title="Total" value={totalCount} icon="📦" color="#6366F1" />
        <StatsCard title="Pendientes" value={pendingCount} icon="⏳" color="#F59E0B" />
        <StatsCard title="En Progreso" value={inProgressCount} icon="🔄" color="#F97316" />
        <StatsCard title="Completados Hoy" value={completedToday} icon="✅" color="#10B981" />
      </div>

      {/* Filters */}
      <div className="rh-filters flex-wrap" style={{ gap: 8, marginBottom: 16 }}>
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rh-filter-pill ${statusFilter === s ? 'active' : ''}`}
          >
            {PACK_SESSION_STATUS_LABELS[s] ?? s}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16, position: 'relative', maxWidth: 360 }}>
        <Search
          size={16}
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8A8886' }}
        />
        <input
          type="text"
          placeholder="Buscar por numero de orden..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rh-input"
          style={{ paddingLeft: 36 }}
        />
      </div>

      {loading ? (
        <p className="rh-loading">Cargando...</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No hay sesiones de packing"
          description="Las sesiones de empaque aparecerean aqui cuando se completen listas de picking"
        />
      ) : (
        <div className="rh-table-wrapper">
          <table className="rh-table">
            <thead>
              <tr>
                <th>Orden #</th>
                <th>Empacador</th>
                <th>Estado</th>
                <th>Verificados</th>
                <th>Peso (kg)</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((session) => (
                  <tr
                    key={session.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/hub/packing/${session.id}`)}
                  >
                    <td className="cell-primary cell-mono">
                      {session.order?.order_number ?? '-'}
                    </td>
                    <td>
                      {session.packer?.full_name ?? (
                        <span style={{ color: '#C8C6C4' }}>Sin asignar</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={session.status} />
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckSquare size={14} style={{ color: '#8A8886' }} />
                        {session.verified_items} / {session.total_items}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Weight size={14} style={{ color: '#8A8886' }} />
                        {session.package_weight_kg != null
                          ? `${session.package_weight_kg} kg`
                          : '-'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="rh-btn"
                        style={{ fontSize: 12, padding: '4px 10px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/hub/packing/${session.id}`);
                        }}
                      >
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
