const STATUS_LABELS: Record<string, string> = {
  draft: 'Pedido creado',
  pending: 'Pedido pendiente',
  confirmed: 'Pedido confirmado',
  assigned: 'Motorizado asignado',
  preparing: 'Preparando tu pedido',
  ready_to_ship: 'Listo para despachar',
  shipped: 'Pedido despachado',
  in_transit: 'En camino hacia ti',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  returned: 'Devuelto',
};

const STATUS_ICONS: Record<string, string> = {
  draft: '📝',
  pending: '⏳',
  confirmed: '✅',
  assigned: '👤',
  preparing: '📦',
  ready_to_ship: '📋',
  shipped: '🚚',
  in_transit: '🏍️',
  delivered: '✅',
  cancelled: '❌',
  returned: '↩️',
};

interface TimelineEntry {
  status: string;
  timestamp: string;
}

interface TrackingTimelineProps {
  timeline: TimelineEntry[];
  currentStatus: string;
  dispatcherName?: string;
}

export function TrackingTimeline({ timeline, currentStatus, dispatcherName }: TrackingTimelineProps) {
  // Full flow for showing future steps
  const FULL_FLOW = ['confirmed', 'assigned', 'preparing', 'ready_to_ship', 'shipped', 'in_transit', 'delivered'];
  const completedStatuses = new Set(timeline.map((t) => t.status));
  const timelineMap = new Map(timeline.map((t) => [t.status, t.timestamp]));

  // Build display list: completed steps + future steps
  const steps = FULL_FLOW.map((status) => ({
    status,
    timestamp: timelineMap.get(status) ?? null,
    isCompleted: completedStatuses.has(status),
    isCurrent: status === currentStatus,
    isFuture: !completedStatuses.has(status),
  }));

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const time = d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Hoy, ${time}`;
    return `${d.toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}, ${time}`;
  };

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', marginBottom: 20 }}>
        Historial
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          return (
            <div key={step.status} style={{ display: 'flex', gap: 14, position: 'relative', opacity: step.isFuture ? 0.4 : 1 }}>
              {/* Vertical line */}
              {!isLast && (
                <div style={{
                  position: 'absolute',
                  left: 15,
                  top: 32,
                  bottom: 0,
                  width: 2,
                  background: step.isCompleted && !step.isCurrent ? '#D3010A' : '#E2E8F0',
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
                background: step.isCurrent ? '#D3010A'
                  : step.isCompleted ? '#ECFDF5'
                    : '#F1F5F9',
                color: step.isCurrent ? '#fff' : undefined,
                border: step.isCurrent ? '3px solid rgba(211,1,10,0.2)' : 'none',
              }}>
                {step.isCurrent ? '●' : step.isCompleted ? STATUS_ICONS[step.status] : '○'}
              </div>

              {/* Content */}
              <div style={{ paddingBottom: isLast ? 0 : 20, flex: 1 }}>
                <p style={{
                  fontSize: 14,
                  fontWeight: step.isCurrent ? 700 : 500,
                  color: step.isCurrent ? '#D3010A' : step.isCompleted ? '#1E293B' : '#94A3B8',
                  margin: 0,
                }}>
                  {STATUS_LABELS[step.status] ?? step.status}
                </p>

                {/* Subtitle for specific steps */}
                {step.status === 'assigned' && dispatcherName && step.isCompleted && (
                  <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                    {dispatcherName} se encarga de tu pedido
                  </p>
                )}
                {step.status === 'in_transit' && step.isCurrent && (
                  <p style={{ fontSize: 12, color: '#10B981', margin: '2px 0 0' }}>
                    {dispatcherName ? `${dispatcherName} viene en camino` : 'En camino hacia ti'}
                  </p>
                )}

                {/* Timestamp */}
                {step.timestamp ? (
                  <p style={{ fontSize: 12, color: '#94A3B8', margin: '2px 0 0' }}>
                    {formatTime(step.timestamp)}
                  </p>
                ) : (
                  <p style={{ fontSize: 12, color: '#CBD5E1', margin: '2px 0 0' }}>
                    Pendiente
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
