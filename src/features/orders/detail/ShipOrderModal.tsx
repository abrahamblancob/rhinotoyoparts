import { useState } from 'react';
import { Modal } from '@/components/hub/shared/Modal.tsx';
import type { Carrier } from '@/lib/database.types.ts';

interface ShipOrderModalProps {
  open: boolean;
  carriers: Carrier[];
  updating: boolean;
  onShip: (trackingNumber: string, carrierId: string, notes: string) => void;
  onClose: () => void;
}

export function ShipOrderModal({ open, carriers, updating, onShip, onClose }: ShipOrderModalProps) {
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shipNotes, setShipNotes] = useState('');

  const handleShip = () => {
    if (!trackingNumber) return;
    onShip(trackingNumber, selectedCarrier, shipNotes);
  };

  const handleClose = () => {
    setSelectedCarrier('');
    setTrackingNumber('');
    setShipNotes('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Despachar Orden" footer={
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="rh-btn rh-btn-secondary" onClick={handleClose}>Cancelar</button>
        <button className="rh-btn rh-btn-primary" onClick={handleShip} disabled={!trackingNumber || updating}>
          {updating ? 'Despachando...' : 'Confirmar Despacho'}
        </button>
      </div>
    }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label className="rh-label">Carrier</label>
          <select className="rh-input" value={selectedCarrier} onChange={(e) => setSelectedCarrier(e.target.value)}>
            <option value="">Seleccionar carrier...</option>
            {carriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="rh-label">Número de Guía *</label>
          <input className="rh-input" placeholder="Ej: MRW-2026-456789" value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)} />
        </div>
        <div>
          <label className="rh-label">Notas</label>
          <textarea className="rh-input" placeholder="Notas del despacho..." rows={2}
            value={shipNotes} onChange={(e) => setShipNotes(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}
