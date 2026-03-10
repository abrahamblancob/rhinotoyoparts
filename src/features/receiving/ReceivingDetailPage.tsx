import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  Plus,
  Search,
  Truck,
  User,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAsyncData } from '@/hooks/useAsyncData.ts';
import { supabase } from '@/lib/supabase.ts';
import { Modal } from '@/components/hub/shared/Modal.tsx';
import * as receivingService from '@/services/receivingService.ts';
import type {
  ReceivingOrder,
  ReceivingOrderItem,
  ReceivingStatus,
  ReceivingItemStatus,
} from '@/types/warehouse.ts';
import type { Product } from '@/lib/database.types.ts';

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
  damaged: 'Dañado',
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
  const { canWrite } = usePermissions();
  const [actionLoading, setActionLoading] = useState(false);
  const [receiveModal, setReceiveModal] = useState<ReceivingOrderItem | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);

  const hasWritePermission = canWrite('receiving');

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
  const allReceived = allItems.length > 0 && allItems.every((i) => i.status !== 'pending');

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
        {hasWritePermission && order.status !== 'completed' && order.status !== 'cancelled' && (
          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="rh-btn"
              onClick={() => setShowAddProduct(true)}
            >
              <Plus size={16} style={{ marginRight: 4 }} />
              Agregar Producto
            </button>
            {allReceived && allItems.length > 0 && (
              <button
                className="rh-btn rh-btn-primary"
                disabled={actionLoading}
                onClick={handleCompleteReceiving}
                style={{ backgroundColor: '#10B981' }}
              >
                <CheckCircle2 size={16} style={{ marginRight: 4 }} />
                {actionLoading ? 'Completando...' : 'Completar Recepcion'}
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
            No hay productos agregados. Usa el boton &quot;Agregar Producto&quot; para comenzar.
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
                  {hasWritePermission && item.status === 'pending' && order.status !== 'completed' && (
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
        warehouseId={order.warehouse_id}
        orgId={order.warehouse?.org_id ?? order.org_id}
        onClose={() => setReceiveModal(null)}
        onReceived={() => {
          setReceiveModal(null);
          reloadItems();
          reloadOrder();
        }}
      />

      {/* Add Product Modal */}
      <AddReceivingProductModal
        open={showAddProduct}
        receivingOrderId={order.id}
        warehouseOrgId={order.warehouse?.org_id ?? order.org_id}
        onClose={() => setShowAddProduct(false)}
        onAdded={() => {
          setShowAddProduct(false);
          reloadItems();
        }}
      />

      <style>{`
        @keyframes spin {
          to { transform: translateY(-50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ── Add Receiving Product Modal (Smart Search) ──

interface AddReceivingProductModalProps {
  open: boolean;
  receivingOrderId: string;
  warehouseOrgId: string;
  onClose: () => void;
  onAdded: () => void;
}

function AddReceivingProductModal({ open, receivingOrderId, warehouseOrgId, onClose, onAdded }: AddReceivingProductModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [expectedQty, setExpectedQty] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef('');

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSearchTerm('');
      setSearchResults([]);
      setSearching(false);
      setSelectedProduct(null);
      setExpectedQty(1);
      setError(null);
    }
  }, [open]);

  const handleSearch = useCallback((query: string) => {
    setSearchTerm(query);
    searchRef.current = query;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      if (searchRef.current !== query) return;
      const s = query.trim().toLowerCase();
      const { data, error: err } = await supabase
        .from('products')
        .select('*')
        .eq('org_id', warehouseOrgId)
        .eq('status', 'active')
        .gt('stock', 0)
        .or(`name.ilike.%${s}%,sku.ilike.%${s}%,oem_number.ilike.%${s}%,brand.ilike.%${s}%`)
        .limit(10);
      if (err) console.error('Product search error:', err);
      if (searchRef.current === query) {
        setSearchResults((data as Product[]) ?? []);
        setSearching(false);
      }
    }, 200);
  }, [warehouseOrgId]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearchTerm('');
    setSearchResults([]);
    setExpectedQty(1);
  };

  const handleSubmit = async () => {
    if (!selectedProduct) return;
    if (expectedQty <= 0) { setError('La cantidad debe ser mayor a 0'); return; }
    if (expectedQty > selectedProduct.stock) {
      setError(`Stock insuficiente. Disponible: ${selectedProduct.stock}`);
      return;
    }

    setSaving(true);
    setError(null);

    const result = await receivingService.addReceivingItem({
      receiving_order_id: receivingOrderId,
      product_id: selectedProduct.id,
      expected_quantity: expectedQty,
    });

    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }

    setSaving(false);
    onAdded();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Agregar Producto a Recepcion"
      width="520px"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="rh-btn" onClick={onClose} disabled={saving}>Cancelar</button>
          <button
            className="rh-btn rh-btn-primary"
            onClick={handleSubmit}
            disabled={saving || !selectedProduct}
          >
            {saving ? 'Agregando...' : 'Agregar a Recepcion'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <p style={{ color: '#D3010A', fontSize: 13 }}>{error}</p>}

        {/* Product Search */}
        {!selectedProduct ? (
          <div>
            <label className="rh-label" style={{ marginBottom: 6, display: 'block' }}>Buscar producto del catalogo</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <Search
                  size={16}
                  style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', zIndex: 1 }}
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Buscar por nombre, SKU, OEM o marca..."
                  className="rh-input"
                  style={{ paddingLeft: 34, paddingRight: 36 }}
                  autoFocus
                />
                {searching && (
                  <div style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    width: 16, height: 16, border: '2px solid #E2E8F0', borderTopColor: '#D3010A',
                    borderRadius: '50%', animation: 'spin 0.6s linear infinite',
                  }} />
                )}
              </div>

              {/* Dropdown Results */}
              {searchResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: '#fff', border: '1px solid #E2E0DE', borderRadius: 8,
                  maxHeight: 240, overflowY: 'auto', zIndex: 10,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                }}>
                  {searchResults.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', cursor: 'pointer', fontSize: 14,
                        borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</span>
                        <span style={{ color: '#8A8886', fontSize: 11 }}>
                          SKU: {p.sku}{p.brand ? ` | ${p.brand}` : ''}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: p.stock > 10 ? '#10B981' : '#D97706' }}>
                          {p.stock > 10 ? `${p.stock} en stock` : `⚠ ${p.stock} en stock`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* No results */}
              {searchTerm.length >= 2 && !searching && searchResults.length === 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: '#fff', border: '1px solid #E2E0DE', borderRadius: 8,
                  padding: '14px 16px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  color: '#94A3B8', fontSize: 13, textAlign: 'center',
                }}>
                  No se encontraron productos para &quot;{searchTerm}&quot;
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Selected Product Card */
          <div>
            <label className="rh-label" style={{ marginBottom: 6, display: 'block' }}>Producto seleccionado</label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: 12, backgroundColor: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0',
            }}>
              <Package size={18} style={{ color: '#10B981', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', margin: 0 }}>{selectedProduct.name}</p>
                <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                  SKU: {selectedProduct.sku}{selectedProduct.brand ? ` | ${selectedProduct.brand}` : ''} | Stock: {selectedProduct.stock}
                </p>
              </div>
              <button onClick={() => setSelectedProduct(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8886', fontSize: 18 }}>
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Expected Quantity */}
        {selectedProduct && (
          <div>
            <label className="rh-label">Cantidad esperada *</label>
            <input
              type="number"
              min={1}
              max={selectedProduct.stock}
              value={expectedQty}
              onChange={(e) => setExpectedQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="rh-input"
            />
            <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
              Maximo disponible en catalogo: {selectedProduct.stock}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Receive Item Modal ──

interface ReceiveItemModalProps {
  item: ReceivingOrderItem | null;
  warehouseId: string;
  orgId: string;
  onClose: () => void;
  onReceived: () => void;
}

function ReceiveItemModal({ item, warehouseId, orgId, onClose, onReceived }: ReceiveItemModalProps) {
  const [receivedQty, setReceivedQty] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [status, setStatus] = useState<'received' | 'partial' | 'damaged'>('received');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!item) return;
    const qty = parseInt(receivedQty, 10);
    if (isNaN(qty) || qty <= 0) {
      setError('Ingresa una cantidad valida mayor a 0');
      return;
    }

    setSaving(true);
    setError(null);

    const result = await receivingService.receiveItem(item.id, {
      product_id: item.product_id,
      received_quantity: qty,
      warehouse_id: warehouseId,
      org_id: orgId,
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
            {saving ? 'Procesando...' : 'Confirmar Recepcion'}
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
            min={1}
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
            <option value="damaged">Dañado</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}
