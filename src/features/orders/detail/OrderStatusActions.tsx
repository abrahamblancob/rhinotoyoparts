import type { Order } from '@/lib/database.types.ts';

interface OrderStatusActionsProps {
  order: Order;
  updating: boolean;
  canWrite: (module: string) => boolean;
  isDispatcher: boolean;
  isReadOnly: boolean;
  isPlatformOwner: boolean;
  onChangeStatus: (status: string, notes: string) => void;
  onOpenAssign: () => void;
  onOpenShip: () => void;
  onOpenCancel: () => void;
  onOpenEdit: () => void;
}

export function OrderStatusActions({
  order, updating, canWrite, isDispatcher, isReadOnly, isPlatformOwner,
  onChangeStatus, onOpenAssign, onOpenShip, onOpenCancel, onOpenEdit,
}: OrderStatusActionsProps) {
  if (isReadOnly) return null;

  const canCancel = !['delivered', 'cancelled', 'returned'].includes(order.status);

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {(isPlatformOwner || (canWrite('orders') && !isDispatcher))
        && ['draft', 'confirmed', 'assigned'].includes(order.status) && (
        <button className="rh-btn rh-btn-secondary" onClick={onOpenEdit}>
          ✏️ Editar Orden
        </button>
      )}
      {order.status === 'draft' && canWrite('orders') && (
        <button className="rh-btn rh-btn-primary" onClick={() => onChangeStatus('confirmed', 'Orden confirmada')} disabled={updating}>
          Confirmar Orden
        </button>
      )}
      {order.status === 'pending' && canWrite('orders') && (
        <button className="rh-btn rh-btn-primary" onClick={() => onChangeStatus('confirmed', 'Orden confirmada')} disabled={updating}>
          Confirmar Orden
        </button>
      )}
      {order.status === 'confirmed' && canWrite('orders') && !isDispatcher && (
        <button className="rh-btn rh-btn-primary" onClick={onOpenAssign} disabled={updating}>
          Asignar Despachador
        </button>
      )}
      {order.status === 'assigned' && isDispatcher && (
        <button className="rh-btn rh-btn-primary" onClick={() => onChangeStatus('preparing', 'Preparando pedido')} disabled={updating}>
          Empezar a Preparar
        </button>
      )}
      {order.status === 'preparing' && isDispatcher && (
        <button className="rh-btn rh-btn-primary" onClick={() => onChangeStatus('ready_to_ship', 'Paquete listo')} disabled={updating}>
          Marcar como Listo
        </button>
      )}
      {order.status === 'ready_to_ship' && (isDispatcher || canWrite('orders')) && (
        <button className="rh-btn rh-btn-primary" onClick={onOpenShip} disabled={updating}>
          Despachar
        </button>
      )}
      {order.status === 'shipped' && (isDispatcher || canWrite('orders')) && (
        <button className="rh-btn rh-btn-primary" onClick={() => onChangeStatus('in_transit', 'En tránsito')} disabled={updating}>
          Marcar En Tránsito
        </button>
      )}
      {order.status === 'in_transit' && (isDispatcher || canWrite('orders')) && (
        <button className="rh-btn rh-btn-primary" onClick={() => onChangeStatus('delivered', 'Entregado al cliente')} disabled={updating}>
          Confirmar Entrega
        </button>
      )}
      {order.status === 'delivered' && canWrite('orders') && !isDispatcher && (
        <button className="rh-btn rh-btn-secondary" onClick={() => onChangeStatus('returned', 'Cliente devolvió')} disabled={updating}>
          Registrar Devolución
        </button>
      )}
      {canCancel && canWrite('orders') && !isDispatcher && (
        <button className="rh-btn" style={{ color: '#D3010A', border: '1px solid #D3010A' }}
          onClick={onOpenCancel} disabled={updating}>
          Cancelar
        </button>
      )}
    </div>
  );
}
