import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase.ts';
import type { AuditLog } from '@/lib/database.types.ts';
import {
  getActivityTimeline,
  getActivityStats,
  ENTITY_TYPE_LABELS,
  ACTION_LABELS,
} from '@/services/activityLogService.ts';
import type { ActivityStats } from '@/services/activityLogService.ts';
import { getRoleBadgeStyle } from '@/lib/statusConfig.ts';
import { UserActivityTimeline } from './UserActivityTimeline.tsx';

interface UserInfo {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  is_active: boolean;
  last_login: string | null;
  role_name: string;
  role_display: string;
}

const PAGE_SIZE = 30;

export function UserActivityPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  // User info
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Timeline
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  // Stats
  const [stats, setStats] = useState<ActivityStats | null>(null);

  // Filters
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Load user info
  useEffect(() => {
    if (!userId) return;
    setLoadingUser(true);

    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, is_active, last_login, user_roles(roles(name, display_name))')
        .eq('id', userId)
        .single();

      if (data) {
        const record = data as Record<string, unknown>;
        const uRoles = record.user_roles as { roles: { name: string; display_name: string } | null }[] | null;
        const firstRole = uRoles?.[0];
        setUser({
          id: data.id,
          full_name: data.full_name,
          email: data.email,
          avatar_url: data.avatar_url,
          is_active: data.is_active,
          last_login: data.last_login,
          role_name: firstRole?.roles?.name ?? '',
          role_display: firstRole?.roles?.display_name ?? 'Sin rol',
        });
      }
      setLoadingUser(false);
    })();
  }, [userId]);

  // Load stats
  useEffect(() => {
    if (!userId) return;
    getActivityStats(userId).then((result) => {
      if (result.data) setStats(result.data);
    });
  }, [userId]);

  // Load timeline
  const loadTimeline = useCallback(
    async (cursor?: string) => {
      if (!userId) return;
      setLoadingLogs(true);

      const result = await getActivityTimeline(userId, {
        cursor,
        limit: PAGE_SIZE,
        entityType: entityTypeFilter || undefined,
        action: actionFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });

      if (result.data) {
        if (cursor) {
          setLogs((prev) => [...prev, ...result.data!]);
        } else {
          setLogs(result.data);
        }
        setHasMore(result.data.length >= PAGE_SIZE);
      }
      setLoadingLogs(false);
    },
    [userId, entityTypeFilter, actionFilter, dateFrom, dateTo]
  );

  // Reload on filter change
  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  const handleLoadMore = () => {
    const lastLog = logs[logs.length - 1];
    if (lastLog) loadTimeline(lastLog.created_at);
  };

  const handleClearFilters = () => {
    setEntityTypeFilter('');
    setActionFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = entityTypeFilter || actionFilter || dateFrom || dateTo;

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 200 }}>
        <p style={{ color: '#94A3B8', fontSize: 14 }}>Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: '#EF4444' }}>Usuario no encontrado</p>
        <button onClick={() => navigate('/hub/users')} className="rh-btn rh-btn-outline" style={{ marginTop: 12 }}>
          ← Volver a Usuarios
        </button>
      </div>
    );
  }

  const badgeStyle = getRoleBadgeStyle(user.role_name);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => navigate('/hub/users')}
          className="rh-btn rh-btn-ghost"
          style={{ fontSize: 13, padding: '4px 8px', marginBottom: 12, color: '#64748B' }}
        >
          ← Volver a Usuarios
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div className="rh-avatar" style={{ width: 48, height: 48, fontSize: 20 }}>
            {user.full_name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>

          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', margin: 0 }}>
              {user.full_name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 14, color: '#64748B' }}>{user.email}</span>
              <span
                className="rh-badge"
                style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.color, fontSize: 11 }}
              >
                {user.role_display}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="rh-card" style={{ padding: 16 }}>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: 0, fontWeight: 500 }}>Total Acciones</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#1E293B', margin: '4px 0 0' }}>
            {stats?.totalActions ?? '—'}
          </p>
        </div>
        <div className="rh-card" style={{ padding: 16 }}>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: 0, fontWeight: 500 }}>Última Actividad</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', margin: '8px 0 0' }}>
            {stats?.lastActivity
              ? new Date(stats.lastActivity).toLocaleDateString('es-VE', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—'}
          </p>
        </div>
        <div className="rh-card" style={{ padding: 16 }}>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: 0, fontWeight: 500 }}>Módulo más usado</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', margin: '8px 0 0' }}>
            {stats?.topModule ? ENTITY_TYPE_LABELS[stats.topModule] ?? stats.topModule : '—'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rh-card" style={{ padding: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Filtros:</span>

          <select
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
            className="rh-search"
            style={{ fontSize: 13, padding: '4px 8px', minWidth: 140 }}
          >
            <option value="">Todos los módulos</option>
            {Object.entries(ENTITY_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rh-search"
            style={{ fontSize: 13, padding: '4px 8px', minWidth: 140 }}
          >
            <option value="">Todas las acciones</option>
            {Object.entries(ACTION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rh-search"
            style={{ fontSize: 13, padding: '4px 8px' }}
            title="Desde"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rh-search"
            style={{ fontSize: 13, padding: '4px 8px' }}
            title="Hasta"
          />

          {hasFilters && (
            <button
              onClick={handleClearFilters}
              className="rh-btn rh-btn-ghost"
              style={{ fontSize: 12, padding: '4px 10px', color: '#D3010A' }}
            >
              ✕ Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <UserActivityTimeline
        logs={logs}
        loading={loadingLogs}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
      />
    </div>
  );
}
