import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  Plus,
  Truck,
  User,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore.ts';
import { useAsyncData } from '@/hooks/useAsyncData.ts';
import { Modal } from '@/components/hub/shared/Modal.tsx';
import * as receivingService from '@/services/receivingService.ts';
import type {
  ReceivingOrder,
  ReceivingOrderItem,
  ReceivingStatus,
  ReceivingItemStatus,
} from '@/types/warehouse.ts';

const STATUS_LABELS: Record<ReceivingStatus, string> = {
  pending: 'Pendiente',
  receiving: 'Recibiendo',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<ReceivingStatus, { bg: string; text: string }> = {
  pending: { bg: '#F59E0B15', text: '#F59E0B' },
  receiving: { bg: '#3B82F615', text: '#3B82F6' },
  completed: { bg: '#10B98115', text: '#10B981' },
  cancelled: { bg: '#D3010A15', text: '#D3010A' },
};

const ITEM_STATUS_LABELS: Record<ReceivingItemStatus, string> = {
  pending: 'Pendiente',
  received: 'Recibido',
  partial: 'Parcial',
  damaged: 'Danado',
};

const ITEM_STATUS_COLORS: Record<ReceivingItemStatus, { bg: string; text: string }> = {
  pending: { bg: '#F59E0B15', text: '#F59E0B' },
  received: { bg: '#10B98115', text: '#10B981' },
  partial: { bg: '#F9731615', text: '#F97316' },
  damaged: { bg: '#D3010A15', text: '#D3010A' },
};

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('es-VE', { dateStyle: 'medium' });
}

export function ReceivingDetailPage() {
  const { receivingId } = useParams<{ receivingId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [actionLoading, setActionLoading] = useState(false);
  const [receiveModal, setReceiveModal] = useState<ReceivingOrderItem | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);

  const orderFetcher = useCallback(
    () =>
      receivingId
        ? receivingService.getReceivingOrder(receivingId)
        : Promise.resolve({ data: null, error: null }),
    [receivingId],
  );

  const itemsFetcher = useCallback(
    () =>
      receivingId
        ? receivingService.getReceivingOrderItems(receivingId)
        : Promise.resolve({ data: null, error: null }),
    [receivingId],
  );

  const {
    data: order,
    loading: orderLoading,
    reload: reloadOrder,
  } = useAsyncData<ReceivingOrder>(orderFetcher, [receivingId]);

  const {
    data: items,
    loading: itemsLoading,
    reload: reloadItems,
  } = useAsyncData<ReceivingOrderItem[]>(itemsFetcher, [receivingId]);

  const loading = orderLoading || itemsLoading;
  const allItems = items ?? [];

  const handleCompleteReceiving = async () => {
    if (!receivingId || !user) return;
    setActionLoading(true);
    await receivingService.completeReceiving(receivingId, user.id);
    await reloadOrder();
    setActionLoading(false);
  };

  if (loading) {
    return <p className="rh-loading">Cargando...</p>;
  }

  if (!order) {
    return (
      <div>
        <button className="rh-btn" onClick={() => navigate('/hub/receiving')}>
          <ArrowLeft size={16} style={{ marginRight: 4 }} /> Volver
        </button>
        <p style={{ marginTop: 16, color: '#8A8886' }}>Orden de recepcion no encontrada.</p>
      </div>
    );
  }

  const statusStyle = STATUS_COLORS[order.status];
  const allReceived = allItems.length > 0 && allItems.every((i) => i.status === 'received');

  return (
    <div>
      {/* Back */}
      <button
        className="rh-btn"
        onClick={() => navigate('/hub/receiving')}
        style={{ marginBottom: 16 }}
      >
        <ArrowLeft size={16} style={{ marginRight: 4 }} /> Volver a Recepciones
      </button>

      {/* Header */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          border: '1px solid #E1DFDD',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#323130', marginBottom: 8 }}>
              Recepcion: {order.reference_number ?? 'Sin referencia'}
            </h1>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', color: '#605E5C', fontSize: 14 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Truck size={14} />
                Proveedor: {order.supplier_name ?? '-'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Package size={14} />
                Almacen: {order.warehouse?.name ?? '-'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={14} />
                Fecha: {formatDate(order.created_at)}
              </span>
              {order.receiver?.full_name && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <User size={14} />
                  Recibido por: {order.receiver.full_name}
                </span>
              )}
            </div>
          </div>
          <span
            className="rh-badge"
            style={{ backgroundColor: statusStyle.bg, color: statusStyle.text, fontSize: 14, padding: '6px 14px' }}
          >
            {STATUS_LABELS[order.status]}
          </span>
        </div>

        {/* Actions */}
        {order.status !== 'completed' && order.status !== 'cancelled' && (
          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="rh-btn"
              onClick={() => setShowAddProduct(true)}
            >
              <Plus size={16} style={{ marginRight: 4 }} />
              Agregar Producto
            </button>
            {allReceived && (
              <button
                className="rh-btn rh-btn-primary"
                disabled={actionLoading}
                onClick={handleCompleteReceiving}
                style={{ backgroundColor: '#10B981' }}
              >
                <CheckCircle2 size={16} style={{ marginRight: 4 }} />
                Completar Recepcion
              </button>
            )}
          </div>
        )}
      </div>

      {/* Items */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 24,
          border: '1px solid #E1DFDD',
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#323130', marginBottom: 16 }}>
          Items de Recepcion ({allItems.length})
        </h2>

        {allItems.length === 0 ? (
          <p style={{ color: '#8A8886' }}>
            No hay productos agregados. Usa el boton "Agregar Producto" para comenzar.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {allItems.map((item) => {
              const itemStatusStyle = ITEM_STATUS_COLORS[item.status];
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: 16,
                    borderRadius: 8,
                    border: '1px solid #E1DFDD',
                    backgroundColor: item.status === 'received' ? '#F0FDF4' : '#fff',
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Product */}
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <div style={{ fontWeight: 500, fontSize: 14, color: '#323130' }}>
                      {item.product?.name ?? '-'}
                    </div>
                    <div style={{ fontSize: 12, color: '#8A8886' }}>
                      SKU: {item.product?.sku ?? '-'}
                    </div>
                  </div>

                  {/* Expected qty */}
                  <div style={{ minWidth: 100 }}>
                    <div style={{ fontSize: 12, color: '#605E5C' }}>Esperado</div>
                    <div style={{ fontWeight: 600 }}>{item.expected_quantity}</div>
                  </div>

                  {/* Received qty */}
                  <div style={{ minWidth: 100 }}>
                    <div style={{ fontSize: 12, color: '#605E5C' }}>Recibido</div>
                    <div style={{ fontWeight: 600, color: item.received_quantity >= item.expected_quantity ? '#10B981' : '#F97316' }}>
                      {item.received_quantity}
                    </div>
                  </div>

                  {/* Location */}
                  <div style={{ minWidth: 100 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#605E5C' }}>
                      <MapPin size={12} /> Ubicacion
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: 13 }}>
                      {item.location?.code ?? 'Sin asignar'}
                    </div>
                  </div>

                  {/* Status */}
                  <span
                    className="rh-badge"
                    style={{ backgroundColor: itemStatusStyle.bg, color: itemStatusStyle.text }}
                  >
                    {ITEM_STATUS_LABELS[item.status]}
                  </span>

                  {/* Action */}
                  {item.status === 'pending' && order.status !== 'completed' && (
                    <button
                      className="rh-btn rh-btn-primary"
                      style={{ fontSize: 12, padding: '4px 12px' }}
                      onClick={() => setReceiveModal(item)}
                    >
                      Recibir
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Receive Item Modal */}
      <ReceiveItemModal
        item={receiveModal}
        onClose={() => setReceiveModal(null)}
        onReceived={() => {
          setReceiveModal(null);
          reloadItems();
          reloadOrder();
        }}
      />

      {/* Add Product Placeholder Modal */}
      <Modal
        open={showAddProduct}
        onClose={() => setShowAddProduct(false)}
        title="Agregar Producto"
      >
        <p style={{ color: '#605E5C', fontSize: 14 }}>
          Esta funcionalidad permite buscar y agregar productos a la orden de recepcion.
          Proximo a implementar: busqueda de productos del catalogo con seleccion de cantidad esperada.
        </p>
      </Modal>
    </div>
  );
}

// ── Receive Item Modal ──

interface ReceiveItemModalProps {
  item: ReceivingOrderItem | null;
  onClose: () => void;
  onReceived: () => void;
}

function ReceiveItemModal({ item, onClose, onReceived }: ReceiveItemModalProps) {
  const [receivedQty, setReceivedQty] = useState('');
  const [locationId, setLocationId] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [status, setStatus] = useState<'received' | 'partial' | 'damaged'>('received');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!item) return;
    const qty = parseInt(receivedQty, 10);
    if (isNaN(qty) || qty < 0) {
      setError('Ingresa una cantidad valida');
      return;
    }

    setSaving(true);
    setError(null);

    const result = await receivingService.receiveItem(item.id, {
      received_quantity: qty,
      assigned_location_id: locationId || item.assigned_location_id || '',
      lot_number: lotNumber || undefined,
      status,
    });

    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }

    setSaving(false);
    setReceivedQty('');
    setLocationId('');
    setLotNumber('');
    setStatus('received');
    onReceived();
  };

  if (!item) return null;

  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title={`Recibir: ${item.product?.name ?? 'Producto'}`}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="rh-btn" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            className="rh-btn rh-btn-primary"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Confirmar Recepcion'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <p style={{ color: '#D3010A', fontSize: 13 }}>{error}</p>}

        <div style={{ padding: 12, backgroundColor: '#F3F2F1', borderRadius: 8, fontSize: 13 }}>
          <strong>Cantidad esperada:</strong> {item.expected_quantity}
        </div>

        <div>
          <label className="rh-label">Cantidad Recibida *</label>
          <input
            type="number"
            value={receivedQty}
            onChange={(e) => setReceivedQty(e.target.value)}
            className="rh-input"
            placeholder={String(item.expected_quantity)}
            min={0}
          />
        </div>

        <div>
          <label className="rh-label">ID de Ubicacion</label>
          <input
            type="text"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="rh-input"
            placeholder="ID de la ubicacion en almacen"
          />
        </div>

        <div>
          <label className="rh-label">Numero de Lote</label>
          <input
            type="text"
            value={lotNumber}
            onChange={(e) => setLotNumber(e.target.value)}
            className="rh-input"
            placeholder="Opcional"
          />
        </div>

        <div>
          <label className="rh-label">Estado</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'received' | 'partial' | 'damaged')}
            className="rh-input"
          >
            <option value="received">Recibido completo</option>
            <option value="partial">Parcial</option>
            <option value="damaged">Danado</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}
