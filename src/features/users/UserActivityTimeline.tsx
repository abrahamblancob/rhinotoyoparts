import type { AuditLog } from '@/lib/database.types.ts';
import { ENTITY_TYPE_LABELS, ACTION_LABELS } from '@/services/activityLogService.ts';
import { useNavigate } from 'react-router-dom';

interface UserActivityTimelineProps {
  logs: AuditLog[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

// ── Icon + color mapping by action ──

const ACTION_ICONS: Record<string, string> = {
  login: '🔑',
  logout: '🚪',
  create: '➕',
  update: '✏️',
  delete: '🗑️',
  status_change: '🔄',
  cancel: '❌',
  assign: '👤',
  complete: '✅',
  claim: '🤚',
  start: '▶️',
  pick_item: '📦',
  verify_item: '✔️',
  add_photo: '📷',
  receive_item: '📥',
  upload: '📤',
  send_email: '📧',
  resend_invitation: '📧',
  assign_stock: '📍',
  remove_stock: '🔓',
};

const ACTION_COLORS: Record<string, { bg: string; border: string }> = {
  delete: { bg: '#FEF2F2', border: '#EF4444' },
  cancel: { bg: '#FEF2F2', border: '#EF4444' },
  remove_stock: { bg: '#FEF2F2', border: '#EF4444' },
  create: { bg: '#F0FDF4', border: '#10B981' },
  assign_stock: { bg: '#F0FDF4', border: '#10B981' },
  upload: { bg: '#F0FDF4', border: '#10B981' },
  update: { bg: '#EFF6FF', border: '#3B82F6' },
  status_change: { bg: '#EFF6FF', border: '#3B82F6' },
  assign: { bg: '#EFF6FF', border: '#3B82F6' },
  complete: { bg: '#ECFDF5', border: '#059669' },
  login: { bg: '#F8FAFC', border: '#94A3B8' },
  logout: { bg: '#F8FAFC', border: '#94A3B8' },
};

const DEFAULT_COLOR = { bg: '#F8FAFC', border: '#94A3B8' };

// ── Entity type → route mapping for clickable links ──

const ENTITY_ROUTES: Record<string, string> = {
  order: '/hub/orders',
  pick_list: '/hub/picking',
  pack_session: '/hub/packing',
  receiving_order: '/hub/receiving',
  return: '/hub/returns',
};

// ── Date grouping helpers ──

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Hoy';
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer';

  return date.toLocaleDateString('es-VE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
}

function groupByDate(logs: AuditLog[]): Map<string, AuditLog[]> {
  const groups = new Map<string, AuditLog[]>();
  for (const log of logs) {
    const label = getDateLabel(log.created_at);
    const existing = groups.get(label) ?? [];
    existing.push(log);
    groups.set(label, existing);
  }
  return groups;
}

// ── Component ──

export function UserActivityTimeline({ logs, loading, hasMore, onLoadMore }: UserActivityTimelineProps) {
  const navigate = useNavigate();
  const dateGroups = groupByDate(logs);

  if (loading && logs.length === 0) {
    return (
      <div className="rh-card" style={{ padding: 32, textAlign: 'center' }}>
        <p style={{ color: '#94A3B8', fontSize: 14 }}>Cargando actividad...</p>
      </div>
    );
  }

  if (!loading && logs.length === 0) {
    return (
      <div className="rh-card" style={{ padding: 32, textAlign: 'center' }}>
        <p style={{ fontSize: 32, marginBottom: 8 }}>📋</p>
        <p style={{ color: '#64748B', fontSize: 15, fontWeight: 600 }}>Sin actividad registrada</p>
        <p style={{ color: '#94A3B8', fontSize: 13 }}>
          Las acciones del usuario aparecerán aquí a medida que interactúe con la plataforma
        </p>
      </div>
    );
  }

  return (
    <div className="rh-card" style={{ padding: 20 }}>
      {Array.from(dateGroups.entries()).map(([dateLabel, groupLogs], groupIdx) => (
        <div key={dateLabel}>
          {/* Date header */}
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#64748B',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 12,
            marginTop: groupIdx > 0 ? 20 : 0,
            paddingBottom: 8,
            borderBottom: '1px solid #F1F5F9',
          }}>
            {dateLabel}
          </div>

          {/* Timeline entries */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {groupLogs.map((log, i) => {
              const isLast = i === groupLogs.length - 1;
              const icon = ACTION_ICONS[log.action] ?? '●';
              const colors = ACTION_COLORS[log.action] ?? DEFAULT_COLOR;
              const entityRoute = ENTITY_ROUTES[log.entity_type];
              const isClickable = entityRoute && log.entity_id;
              const entityLabel = ENTITY_TYPE_LABELS[log.entity_type] ?? log.entity_type;
              const actionLabel = ACTION_LABELS[log.action] ?? log.action;

              return (
                <div key={log.id} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                  {/* Vertical line */}
                  {!isLast && (
                    <div style={{
                      position: 'absolute',
                      left: 15,
                      top: 32,
                      bottom: 0,
                      width: 2,
                      background: '#E2E8F0',
                    }} />
                  )}

                  {/* Icon circle */}
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    background: colors.bg,
                    border: `2px solid ${colors.border}`,
                  }}>
                    {icon}
                  </div>

                  {/* Content */}
                  <div style={{ paddingBottom: isLast ? 0 : 16, flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Description */}
                        <p
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: '#1E293B',
                            margin: 0,
                            cursor: isClickable ? 'pointer' : 'default',
                          }}
                          onClick={isClickable ? () => navigate(`${entityRoute}/${log.entity_id}`) : undefined}
                          onMouseOver={isClickable ? (e) => { (e.target as HTMLElement).style.color = '#D3010A'; } : undefined}
                          onMouseOut={isClickable ? (e) => { (e.target as HTMLElement).style.color = '#1E293B'; } : undefined}
                        >
                          {log.description ?? `${actionLabel} — ${entityLabel}`}
                        </p>

                        {/* Entity badge */}
                        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 11,
                            padding: '1px 8px',
                            borderRadius: 9999,
                            background: '#F1F5F9',
                            color: '#64748B',
                            fontWeight: 500,
                          }}>
                            {entityLabel}
                          </span>
                          <span style={{
                            fontSize: 11,
                            padding: '1px 8px',
                            borderRadius: 9999,
                            background: colors.bg,
                            color: colors.border,
                            fontWeight: 500,
                          }}>
                            {actionLabel}
                          </span>
                        </div>
                      </div>

                      {/* Timestamp */}
                      <span style={{
                        fontSize: 12,
                        color: '#94A3B8',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        marginTop: 2,
                      }}>
                        {formatTime(log.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Load more */}
      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="rh-btn rh-btn-outline"
            style={{ fontSize: 13, padding: '6px 20px' }}
          >
            {loading ? '⏳ Cargando...' : 'Cargar más'}
          </button>
        </div>
      )}
    </div>
  );
}
