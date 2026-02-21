import { useEffect, useState } from 'react';

interface Toast {
  id: number;
  message: string;
}

let toastId = 0;
let globalAddToast: ((message: string) => void) | null = null;

export function showToast(message: string) {
  globalAddToast?.(message);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    globalAddToast = (message: string) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };
    return () => { globalAddToast = null; };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380,
    }}>
      {toasts.map((toast) => (
        <div key={toast.id} style={{
          background: '#1E293B', color: '#fff', padding: '12px 16px',
          borderRadius: 8, fontSize: 14, fontWeight: 500,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          animation: 'slideIn 0.3s ease',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>🔔</span>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
