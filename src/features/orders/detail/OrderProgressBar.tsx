import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from '@/lib/statusConfig.ts';
import type { OrderStatus } from '@/lib/constants.ts';

interface OrderProgressBarProps {
  status: string;
}

export function OrderProgressBar({ status }: OrderProgressBarProps) {
  const currentStepIndex = ORDER_STATUS_FLOW.indexOf(status as OrderStatus);

  if (['cancelled', 'returned'].includes(status)) return null;

  return (
    <div className="rh-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 12, left: 24, right: 24, height: 3, background: '#E2E8F0', zIndex: 0 }} />
        <div style={{
          position: 'absolute', top: 12, left: 24, height: 3, background: '#D3010A', zIndex: 1,
          width: currentStepIndex >= 0 ? `${(currentStepIndex / (ORDER_STATUS_FLOW.length - 1)) * 100}%` : '0%',
          transition: 'width 0.5s ease',
        }} />

        {ORDER_STATUS_FLOW.map((s, i) => {
          const isCompleted = i <= currentStepIndex;
          const isCurrent = i === currentStepIndex;
          return (
            <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: isCompleted ? '#D3010A' : '#E2E8F0',
                border: isCurrent ? '3px solid #D3010A' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isCompleted ? '#fff' : '#94A3B8', fontSize: 12, fontWeight: 700,
              }}>
                {isCompleted ? '✓' : i + 1}
              </div>
              <span style={{
                fontSize: 10, marginTop: 4, whiteSpace: 'nowrap',
                color: isCurrent ? '#D3010A' : isCompleted ? '#1E293B' : '#94A3B8',
                fontWeight: isCurrent ? 700 : 400,
              }}>
                {ORDER_STATUS_LABELS[s]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
