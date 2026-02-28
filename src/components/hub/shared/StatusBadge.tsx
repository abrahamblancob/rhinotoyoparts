import { memo } from 'react';
import { getStatusStyle } from '@/lib/statusConfig.ts';

interface StatusBadgeProps {
  status: string;
  label?: string;
}

export const StatusBadge = memo(function StatusBadge({ status, label }: StatusBadgeProps) {
  const style = getStatusStyle(status);
  return (
    <span
      className="rh-badge"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {label ?? style.label}
    </span>
  );
});
