import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  Plus,
  Printer,
  QrCode,
  Search,
  Trash2,
  Truck,
  User,
  X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase.ts';
import { Modal } from '@/components/hub/shared/Modal.tsx';
import * as receivingService from '@/services/receivingService.ts';
import { logActivity } from '@/services/activityLogService.ts';
import { useReceivingDetail } from './useReceivingDetail.ts';
import type {
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
  const {
    order,
    allItems,
    loading,
    actionLoading,
    receiveModal,
    setReceiveModal,
    showAddProduct,
    setShowAddProduct,
    confirmDeleteId,
    setConfirmDeleteId,
    deletingId,
    qrItemId,
    setQrItemId,
    hasWritePermission,
    showDeleteOrder,
    setShowDeleteOrder,
    deletingOrder,
    handleCompleteReceiving,
    handleDeleteOrder,
    handleDeleteItem,
    handlePrintProductQR,
    reloadItems,
    reloadOrder,
    navigate,
  } = useReceivingDetail();

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
            <button
              className="rh-btn"
              onClick={() => setShowDeleteOrder(true)}
              style={{ color: '#DC2626', borderColor: '#FECACA', marginLeft: 'auto' }}
            >
              <Trash2 size={16} style={{ marginRight: 4 }} />
              Eliminar Recepcion
            </button>
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
              const isQRExpanded = qrItemId === item.id;
              return (
                <div
                  key={item.id}
                  style={{
                    borderRadius: 8,
                    border: '1px solid #E1DFDD',
                    backgroundColor: item.status === 'received' ? '#F0FDF4' : '#fff',
                    overflow: 'hidden',
                  }}
                >
                  {/* Item row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: 16,
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

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {/* QR Button */}
                      <button
                        className="rh-btn"
                        style={{
                          fontSize: 12, padding: '4px 10px',
                          display: 'flex', alignItems: 'center', gap: 4,
                          color: isQRExpanded ? '#16A34A' : '#64748B',
                          borderColor: isQRExpanded ? '#BBF7D0' : undefined,
                          backgroundColor: isQRExpanded ? '#F0FDF4' : undefined,
                        }}
                        onClick={() => setQrItemId(isQRExpanded ? null : item.id)}
                      >
                        <QrCode size={14} />
                        {isQRExpanded ? 'Ocultar QR' : 'Ver QR'}
                      </button>

                      {hasWritePermission && item.status === 'pending' && order.status !== 'completed' && (
                        <>
                          <button
                            className="rh-btn rh-btn-primary"
                            style={{ fontSize: 12, padding: '4px 12px' }}
                            onClick={() => setReceiveModal(item)}
                          >
                            Recibir
                          </button>
                          {confirmDeleteId === item.id ? (
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                              <span style={{ fontSize: 11, color: '#D3010A', fontWeight: 500 }}>Eliminar?</span>
                              <button
                                className="rh-btn"
                                style={{ fontSize: 11, padding: '2px 8px', color: '#D3010A', borderColor: '#D3010A' }}
                                onClick={() => handleDeleteItem(item.id)}
                                disabled={deletingId === item.id}
                              >
                                {deletingId === item.id ? '...' : 'Si'}
                              </button>
                              <button
                                className="rh-btn"
                                style={{ fontSize: 11, padding: '2px 8px' }}
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              className="rh-btn"
                              style={{ fontSize: 12, padding: '4px 8px', color: '#D3010A' }}
                              onClick={() => setConfirmDeleteId(item.id)}
                              title="Eliminar item"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expandable QR Section */}
                  {isQRExpanded && (
                    <div
                      style={{
                        padding: '12px 16px',
                        backgroundColor: '#F0FDF4',
                        borderTop: '1px solid #BBF7D0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <QrCode size={16} style={{ color: '#16A34A', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: '#166534', margin: 0 }}>
                            QR del Producto
                          </p>
                          <p style={{ fontSize: 11, color: '#15803D', margin: '1px 0 0', fontFamily: 'monospace' }}>
                            {item.product?.sku ?? '—'}
                          </p>
                        </div>
                        <button
                          onClick={() => handlePrintProductQR(item)}
                          className="rh-btn rh-btn-ghost"
                          style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                        >
                          <Printer size={13} />
                          Imprimir QR
                        </button>
                      </div>

                      <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        padding: '12px 0',
                      }}>
                        <div style={{
                          padding: 14, backgroundColor: '#fff', borderRadius: 10,
                          border: '1px solid #E2E8F0', display: 'inline-block',
                        }}>
                          <QRCodeSVG
                            id={`qr-product-${item.id}`}
                            value={item.product?.sku ?? item.product_id}
                            size={140}
                            level="M"
                            includeMargin={false}
                          />
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', margin: 0, fontFamily: 'monospace' }}>
                          {item.product?.sku ?? '—'}
                        </p>
                        <p style={{ fontSize: 11, color: '#64748B', margin: 0, textAlign: 'center', maxWidth: 220 }}>
                          {item.product?.name ?? ''}
                        </p>
                      </div>
                    </div>
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
        existingItems={allItems}
        onClose={() => setShowAddProduct(false)}
        onAdded={() => {
          setShowAddProduct(false);
          reloadItems();
        }}
      />

      {/* Delete Order Confirmation */}
      {showDeleteOrder && (
        <div
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={() => { if (!deletingOrder) setShowDeleteOrder(false); }}
        >
          <div
            className="rh-card"
            style={{ padding: 32, maxWidth: 440, width: '90%', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>
              Eliminar Recepcion
            </h3>
            <p style={{ color: '#64748B', fontSize: 14, marginBottom: 8 }}>
              ¿Estas seguro de que deseas eliminar esta recepcion y todos sus items?
            </p>
            <div style={{
              backgroundColor: '#F8FAFC', borderRadius: 8, padding: 16, marginBottom: 16, textAlign: 'left',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#94A3B8', fontSize: 13 }}>Referencia:</span>
                <span style={{ color: '#1E293B', fontWeight: 600, fontSize: 13 }}>
                  {order.reference_number ?? 'Sin referencia'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#94A3B8', fontSize: 13 }}>Proveedor:</span>
                <span style={{ color: '#1E293B', fontWeight: 500, fontSize: 13 }}>
                  {order.supplier_name ?? '-'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8', fontSize: 13 }}>Items:</span>
                <span style={{ color: '#1E293B', fontWeight: 600, fontSize: 13 }}>
                  {allItems.length}
                </span>
              </div>
            </div>
            <p style={{ color: '#F59E0B', fontSize: 13, marginBottom: 16, fontWeight: 500 }}>
              Esta accion no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                className="rh-btn rh-btn-ghost"
                onClick={() => setShowDeleteOrder(false)}
                disabled={deletingOrder}
              >
                Cancelar
              </button>
              <button
                className="rh-btn"
                style={{ backgroundColor: '#DC2626', color: 'white', opacity: deletingOrder ? 0.6 : 1 }}
                onClick={handleDeleteOrder}
                disabled={deletingOrder}
              >
                {deletingOrder ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

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
  existingItems: ReceivingOrderItem[];
  onClose: () => void;
  onAdded: () => void;
}

function AddReceivingProductModal({ open, receivingOrderId, warehouseOrgId, existingItems, onClose, onAdded }: AddReceivingProductModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [expectedQty, setExpectedQty] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialProducts, setInitialProducts] = useState<Product[]>([]);
  const [initialLoading, setInitialLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef('');

  // Dedup: track products already added to this receiving order
  const addedProductIds = useMemo(
    () => new Set(existingItems.map((i) => i.product_id)),
    [existingItems]
  );

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  // Load initial products when modal opens (all active products in org)
  useEffect(() => {
    if (!open || !warehouseOrgId) return;
    setInitialLoading(true);
    const q = supabase
      .from('products')
      .select('*')
      .eq('org_id', warehouseOrgId)
      .eq('status', 'active')
      .order('name')
      .limit(50);
    q.then(({ data }) => {
      setInitialProducts((data as Product[]) ?? []);
      setInitialLoading(false);
    });
  }, [open, warehouseOrgId]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSearchTerm('');
      setSearchResults([]);
      setSearching(false);
      setSelectedProduct(null);
      setExpectedQty(1);
      setError(null);
      setInitialProducts([]);
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
      const q = supabase
        .from('products')
        .select('*')
        .eq('org_id', warehouseOrgId)
        .eq('status', 'active')
        .or(`name.ilike.%${s}%,sku.ilike.%${s}%,oem_number.ilike.%${s}%,brand.ilike.%${s}%`)
        .limit(30);
      const { data, error: err } = await q;
      if (err) console.error('Product search error:', err);
      if (searchRef.current === query) {
        setSearchResults((data as Product[]) ?? []);
        setSearching(false);
      }
    }, 200);
  }, [warehouseOrgId]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setExpectedQty(1);
  };

  const handleSubmit = async () => {
    if (!selectedProduct) return;
    if (expectedQty <= 0) { setError('La cantidad debe ser mayor a 0'); return; }

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

  // Products to display: search results or initial catalog, excluding already-added
  const displayProducts = (searchTerm.length >= 2 ? searchResults : initialProducts)
    .filter((p) => !addedProductIds.has(p.id));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Agregar Producto a Recepcion"
      width="900px"
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
        {error && <p style={{ color: '#D3010A', fontSize: 13, margin: 0 }}>{error}</p>}

        {/* Selected product confirmation bar */}
        {selectedProduct && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', backgroundColor: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0',
          }}>
            <CheckCircle2 size={20} style={{ color: '#10B981', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', margin: 0 }}>{selectedProduct.name}</p>
              <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                SKU: {selectedProduct.sku}{selectedProduct.brand ? ` | ${selectedProduct.brand}` : ''} | Stock actual: {selectedProduct.stock}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <label style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>Cantidad:</label>
              <input
                type="number"
                min={1}
                value={expectedQty}
                onChange={(e) => setExpectedQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="rh-input"
                style={{ width: 80, textAlign: 'center', padding: '6px 8px' }}
              />
            </div>
            <button onClick={() => setSelectedProduct(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}
              title="Cambiar producto">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', zIndex: 1 }}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar por nombre, SKU, OEM o marca..."
            className="rh-input"
            style={{ paddingLeft: 36, paddingRight: 36, fontSize: 14 }}
            autoFocus
          />
          {(searching || initialLoading) && (
            <div style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              width: 16, height: 16, border: '2px solid #E2E8F0', borderTopColor: '#D3010A',
              borderRadius: '50%', animation: 'spin 0.6s linear infinite',
            }} />
          )}
        </div>

        {/* Product Cards Grid */}
        <div style={{
          maxHeight: 420, overflowY: 'auto', borderRadius: 10,
          border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', padding: 12,
        }}>
          {displayProducts.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 10,
            }}>
              {displayProducts.map((p) => {
                const isSelected = selectedProduct?.id === p.id;
                const stockColor = p.stock > 10 ? '#10B981' : p.stock > 0 ? '#F59E0B' : '#94A3B8';
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProduct(p)}
                    style={{
                      backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                      border: isSelected ? '2px solid #10B981' : '1px solid #E2E8F0',
                      borderRadius: 10,
                      padding: 14,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#6366F1';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(99,102,241,0.12)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#E2E8F0';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {/* Selected checkmark */}
                    {isSelected && (
                      <div style={{
                        position: 'absolute', top: 8, right: 8,
                        width: 22, height: 22, borderRadius: '50%',
                        backgroundColor: '#10B981', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <CheckCircle2 size={14} style={{ color: '#fff' }} />
                      </div>
                    )}

                    {/* Product icon + name */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        backgroundColor: '#EEF2FF', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Package size={18} style={{ color: '#6366F1' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 13, fontWeight: 600, color: '#1E293B', margin: 0,
                          lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {p.name}
                        </p>
                      </div>
                    </div>

                    {/* SKU + Brand */}
                    <div style={{ marginBottom: 8 }}>
                      <p style={{ fontSize: 11, color: '#94A3B8', margin: 0, fontFamily: 'monospace' }}>
                        {p.sku}
                      </p>
                      {p.brand && (
                        <p style={{ fontSize: 11, color: '#64748B', margin: '2px 0 0' }}>
                          {p.brand}
                        </p>
                      )}
                    </div>

                    {/* Bottom: stock + price */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      paddingTop: 8, borderTop: '1px solid #F1F5F9',
                    }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: stockColor,
                        backgroundColor: stockColor + '15', padding: '2px 8px',
                        borderRadius: 10,
                      }}>
                        {p.stock} en stock
                      </span>
                      {p.price > 0 && (
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1E293B' }}>
                          ${p.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : searchTerm.length >= 2 && !searching ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Package size={36} style={{ color: '#CBD5E1', margin: '0 auto 8px' }} />
              <p style={{ fontSize: 14, color: '#94A3B8', margin: 0 }}>
                {addedProductIds.size > 0
                  ? 'Todos los productos disponibles ya fueron agregados a esta orden.'
                  : <>No se encontraron productos para &quot;{searchTerm}&quot;</>}
              </p>
            </div>
          ) : initialLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ fontSize: 14, color: '#94A3B8', margin: 0 }}>Cargando catalogo...</p>
            </div>
          ) : !initialLoading && initialProducts.length > 0 && displayProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <CheckCircle2 size={36} style={{ color: '#10B981', margin: '0 auto 8px' }} />
              <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>
                Todos los productos disponibles ya fueron agregados a esta orden.
              </p>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Search size={36} style={{ color: '#CBD5E1', margin: '0 auto 8px' }} />
              <p style={{ fontSize: 14, color: '#94A3B8', margin: 0 }}>
                Escribe para buscar productos en el catalogo
              </p>
            </div>
          )}
        </div>
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
    if (qty > item.expected_quantity) {
      setError(`La cantidad no puede exceder la esperada (${item.expected_quantity})`);
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

    logActivity({ action: 'receive_item', entityType: 'receiving_order', entityId: item.id, description: `Recibió ${qty}x ${item.product?.name ?? 'producto'}` });
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
            max={item.expected_quantity}
          />
          <p style={{ fontSize: 11, color: '#94A3B8', margin: '4px 0 0' }}>
            Maximo: {item.expected_quantity} unidades
          </p>
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
