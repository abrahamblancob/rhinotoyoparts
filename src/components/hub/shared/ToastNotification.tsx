import { useToastStore, toast } from '@/stores/toastStore.ts';
import type { Toast } from '@/stores/toastStore.ts';

// Re-export for backwards compatibility
export function showToast(message: string) {
  toast('info', message);
}

// Typed toast helpers
export { toast };

const TOAST_STYLES: Record<Toast['type'], { bg: string; border: string; icon: string }> = {
  success: { bg: '#F0FDF4', border: '#86EFAC', icon: '✅' },
  error: { bg: '#FEF2F2', border: '#FCA5A5', icon: '❌' },
  info: { bg: '#1E293B', border: '#475569', icon: '🔔' },
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 380,
      }}
    >
      {toasts.map((t) => {
        const style = TOAST_STYLES[t.type];
        const isInfo = t.type === 'info';
        return (
          <div
            key={t.id}
            style={{
              background: style.bg,
              color: isInfo ? '#fff' : '#1E293B',
              padding: '12px 16px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              animation: 'slideIn 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: isInfo ? 'none' : `1px solid ${style.border}`,
            }}
          >
            <span style={{ fontSize: 16 }}>{style.icon}</span>
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: 16,
                color: isInfo ? '#94A3B8' : '#64748B',
                padding: 0,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
