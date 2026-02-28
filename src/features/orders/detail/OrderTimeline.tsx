import { StatusBadge } from '@/components/hub/shared/StatusBadge.tsx';
import type { StatusHistoryWithUser } from './types.ts';

interface OrderTimelineProps {
  history: StatusHistoryWithUser[];
}

export function OrderTimeline({ history }: OrderTimelineProps) {
  return (
    <div className="rh-card" style={{ padding: 20, alignSelf: 'start' }}>
      <h3 className="rh-card-title" style={{ marginBottom: 16 }}>Historial de Estados</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {history.map((h, i) => (
          <div key={h.id} style={{ display: 'flex', gap: 12, position: 'relative' }}>
            {i < history.length - 1 && (
              <div style={{ position: 'absolute', left: 11, top: 24, bottom: -8, width: 2, background: '#E2E8F0' }} />
            )}
            <div style={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
              background: i === history.length - 1 ? '#D3010A' : '#E2E8F0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: i === history.length - 1 ? '#fff' : '#94A3B8', fontSize: 10,
            }}>
              {i === history.length - 1 ? '●' : '✓'}
            </div>
            <div style={{ paddingBottom: 20, flex: 1 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <StatusBadge status={h.to_status} />
              </div>
              {h.note && <p style={{ fontSize: 13, color: '#475569', margin: '4px 0 0' }}>{h.note}</p>}
              <p style={{ fontSize: 12, color: '#94A3B8', margin: '2px 0 0' }}>
                {h.profiles?.full_name ?? 'Sistema'} · {new Date(h.created_at).toLocaleString('es-VE')}
              </p>
            </div>
          </div>
        ))}
        {history.length === 0 && (
          <p style={{ color: '#94A3B8', fontSize: 14 }}>Sin historial aún</p>
        )}
      </div>
    </div>
  );
}
