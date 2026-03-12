import { type ReactNode, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  /** Section title text */
  title: string;
  /** Subtitle / secondary info */
  subtitle?: string;
  /** Emoji or icon node shown left of the title */
  icon?: ReactNode;
  /** Right-side badge or progress element */
  trailing?: ReactNode;
  /** Visual variant: green for completed, amber for pending */
  variant?: 'completed' | 'pending';
  /** Whether section starts expanded */
  defaultExpanded?: boolean;
  /** Title / subtitle text colors */
  titleColor?: string;
  subtitleColor?: string;
  children: ReactNode;
}

const VARIANT_STYLES = {
  completed: {
    border: '1px solid #BBF7D0',
    bg: '#F0FDF4',
    borderTop: '1px solid #BBF7D0',
    titleColor: '#166534',
    subtitleColor: '#15803D',
  },
  pending: {
    border: '1px solid #FDE68A',
    bg: '#FFFBEB',
    borderTop: '1px solid #FDE68A',
    titleColor: '#1E293B',
    subtitleColor: '#64748B',
  },
} as const;

export function CollapsibleSection({
  title,
  subtitle,
  icon,
  trailing,
  variant = 'pending',
  defaultExpanded = false,
  titleColor,
  subtitleColor,
  children,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const vs = VARIANT_STYLES[variant];

  return (
    <div style={{ marginBottom: 20, borderRadius: 10, overflow: 'hidden', border: vs.border }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '14px 20px', border: 'none', cursor: 'pointer',
          background: vs.bg,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: titleColor ?? vs.titleColor }}>
              {title}
            </div>
            {subtitle && (
              <div style={{ fontSize: 12, color: subtitleColor ?? vs.subtitleColor }}>
                {subtitle}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {trailing}
          <ChevronDown
            size={18}
            style={{
              color: '#64748B',
              transition: 'transform 0.2s',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </div>
      </button>

      {expanded && (
        <div style={{ borderTop: vs.borderTop }}>
          {children}
        </div>
      )}
    </div>
  );
}
