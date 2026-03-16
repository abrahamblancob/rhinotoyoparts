import { useState } from 'react';
import { Mail, Send, X } from 'lucide-react';
import { Modal } from '@/components/hub/shared/Modal.tsx';

interface AuditEmailModalProps {
  open: boolean;
  onClose: () => void;
  onSend: (email: string) => Promise<void>;
  onSkip: () => void;
  defaultEmail: string;
  matchCount: number;
  discrepancyCount: number;
  totalLocations: number;
}

export function AuditEmailModal({
  open,
  onClose,
  onSend,
  onSkip,
  defaultEmail,
  matchCount,
  discrepancyCount,
  totalLocations,
}: AuditEmailModalProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) return;
    setSending(true);
    try {
      await onSend(email.trim());
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Enviar Reporte de Auditoría"
      footer={
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onSkip}
            className="rh-btn rh-btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <X size={14} />
            Omitir
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !email.trim()}
            className="rh-btn rh-btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: sending ? 0.6 : 1 }}
          >
            <Send size={14} />
            {sending ? 'Enviando...' : 'Enviar Reporte'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Summary */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 12,
          }}
        >
          <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#F0F9FF', borderRadius: 8 }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#0EA5E9', margin: 0 }}>{totalLocations}</p>
            <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>Ubicaciones</p>
          </div>
          <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#ECFDF5', borderRadius: 8 }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#10B981', margin: 0 }}>{matchCount}</p>
            <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>Coincidencias</p>
          </div>
          <div style={{ textAlign: 'center', padding: 12, backgroundColor: discrepancyCount > 0 ? '#FEF2F2' : '#F8FAFC', borderRadius: 8 }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: discrepancyCount > 0 ? '#EF4444' : '#94A3B8', margin: 0 }}>
              {discrepancyCount}
            </p>
            <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>Discrepancias</p>
          </div>
        </div>

        {/* Email input */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
            <Mail size={14} />
            Correo electrónico
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            className="rh-input"
            style={{ width: '100%' }}
          />
          <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
            Se enviará un resumen detallado de la auditoría a este correo.
          </p>
        </div>
      </div>
    </Modal>
  );
}
