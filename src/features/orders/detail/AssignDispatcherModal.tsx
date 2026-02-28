import { Modal } from '@/components/hub/shared/Modal.tsx';
import type { Profile } from '@/lib/database.types.ts';

interface DispatcherWithCount extends Profile {
  active_orders: number;
}

interface AssignDispatcherModalProps {
  open: boolean;
  dispatchers: DispatcherWithCount[];
  selectedDispatcher: string | null;
  updating: boolean;
  onSelect: (id: string) => void;
  onAssign: () => void;
  onClose: () => void;
}

export function AssignDispatcherModal({
  open, dispatchers, selectedDispatcher, updating,
  onSelect, onAssign, onClose,
}: AssignDispatcherModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Asignar Despachador" footer={
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="rh-btn rh-btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="rh-btn rh-btn-primary" onClick={onAssign} disabled={!selectedDispatcher || updating}>
          {updating ? 'Asignando...' : 'Asignar'}
        </button>
      </div>
    }>
      {dispatchers.length === 0 ? (
        <p style={{ color: '#94A3B8', textAlign: 'center', padding: 20 }}>
          No hay despachadores disponibles. Crea un usuario con rol "Despachador" primero.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {dispatchers.map((d) => (
            <div key={d.id} onClick={() => onSelect(d.id)}
              style={{
                padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
                border: selectedDispatcher === d.id ? '2px solid #D3010A' : '1px solid #E2E0DE',
                background: selectedDispatcher === d.id ? '#FEF2F2' : '#fff',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
              <div>
                <span style={{ fontWeight: 600 }}>{d.full_name}</span>
                <span style={{ color: '#8A8886', marginLeft: 8, fontSize: 13 }}>{d.email}</span>
              </div>
              <span style={{ fontSize: 13, color: d.active_orders === 0 ? '#10B981' : '#F59E0B' }}>
                {d.active_orders} {d.active_orders === 1 ? 'orden activa' : 'órdenes activas'}
              </span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

export type { DispatcherWithCount };
