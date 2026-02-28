import { useState } from 'react';
import { Modal } from '@/components/hub/shared/Modal.tsx';

interface CancelOrderModalProps {
  open: boolean;
  updating: boolean;
  onCancel: (reason: string) => void;
  onClose: () => void;
}

export function CancelOrderModal({ open, updating, onCancel, onClose }: CancelOrderModalProps) {
  const [cancelReason, setCancelReason] = useState('');

  const handleCancel = () => {
    onCancel(cancelReason || 'Orden cancelada');
    setCancelReason('');
  };

  const handleClose = () => {
    setCancelReason('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Cancelar Orden" footer={
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="rh-btn rh-btn-secondary" onClick={handleClose}>Volver</button>
        <button className="rh-btn" style={{ background: '#D3010A', color: '#fff' }} onClick={handleCancel} disabled={updating}>
          {updating ? 'Cancelando...' : 'Confirmar Cancelación'}
        </button>
      </div>
    }>
      <div>
        <p style={{ fontSize: 14, color: '#475569', marginBottom: 12 }}>
          Esta acción no se puede deshacer. La orden pasará a estado "Cancelada".
        </p>
        <label className="rh-label">Motivo de cancelación</label>
        <textarea className="rh-input" placeholder="Razón por la que se cancela..." rows={3}
          value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
      </div>
    </Modal>
  );
}
