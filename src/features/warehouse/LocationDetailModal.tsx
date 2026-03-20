import { useState, useCallback, useRef } from 'react';
import { MapPin, Package, QrCode, Eye, Search, Trash2, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Modal } from '@/components/hub/shared/Modal.tsx';
import { useAsyncData } from '@/hooks/useAsyncData.ts';
import * as warehouseService from '@/services/warehouseService.ts';
import { logActivity } from '@/services/activityLogService.ts';
import type { WarehouseLocation, InventoryStock } from '@/types/warehouse.ts';

interface LocationDetailModalProps {
  open: boolean;
  location: WarehouseLocation;
  warehouseId: string;
  orgId: string;
  onClose: () => void;
}

const LOCATION_TYPE_LABELS: Record<string, string> = {
  standard: 'Estandar',
  bulk: 'Granel',
  high_value: 'Alto Valor',
  temperature_controlled: 'Temp. Controlada',
};

export function LocationDetailModal({ open, location, warehouseId, orgId, onClose }: LocationDetailModalProps) {
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<InventoryStock[]>([]);
  const [searching, setSearching] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignQuantity, setAssignQuantity] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<InventoryStock | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removingStockId, setRemovingStockId] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [showProductQR, setShowProductQR] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Cleanup ref for cancel handler
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch stock for this location's products
  const stockFetcher = useCallback(
    () => warehouseService.getStockByWarehouse(warehouseId),
    [warehouseId],
  );
  const { data: allStock, reload: reloadStock } = useAsyncData<InventoryStock[]>(stockFetcher, [warehouseId]);

  const locationStocks = allStock?.filter((s) => s.location_id === location.id) ?? [];

  // Client-side search within warehouse inventory_stock (not aggregator catalog)
  const handleProductSearch = useCallback((query: string) => {
    setSearchTerm(query);
    if (query.length < 2) { setSearchResults([]); return; }
    const s = query.trim().toLowerCase();
    const results = (allStock ?? []).filter((stock) => {
      // Exclude stock already at this location
      if (stock.location_id === location.id) return false;
      // Only items with available quantity
      if ((stock.quantity - stock.reserved_quantity) <= 0) return false;
      // Match by product name, sku, brand
      const name = stock.product?.name?.toLowerCase() ?? '';
      const sku = stock.product?.sku?.toLowerCase() ?? '';
      const brand = (stock.product as { name: string; sku: string; brand?: string | null })?.brand?.toLowerCase() ?? '';
      return name.includes(s) || sku.includes(s) || brand.includes(s);
    });
    // Sort: unassigned stock (location_id = null) first, then assigned
    results.sort((a, b) => {
      const aAssigned = a.location_id != null ? 1 : 0;
      const bAssigned = b.location_id != null ? 1 : 0;
      return aAssigned - bAssigned;
    });
    setSearchResults(results.slice(0, 10));
  }, [allStock, location.id]);

  const handleAssignProduct = async () => {
    if (!selectedProduct || assignQuantity <= 0) return;
    setAssigning(true);
    setError('');

    const sourceStock = selectedProduct;
    const available = sourceStock.quantity - sourceStock.reserved_quantity;

    if (assignQuantity > available) {
      setError('Cantidad excede el disponible en la ubicacion origen');
      setAssigning(false);
      return;
    }

    // 1. Decrement source stock (or remove entirely if transferring all)
    const newSourceQty = sourceStock.quantity - assignQuantity;
    if (newSourceQty <= 0) {
      const removeResult = await warehouseService.deleteStockRecord(sourceStock.id, sourceStock.location_id!);
      if (removeResult.error) { setError(removeResult.error); setAssigning(false); return; }
    } else {
      const updateResult = await warehouseService.updateStock(sourceStock.id, { quantity: newSourceQty });
      if (updateResult.error) { setError(updateResult.error); setAssigning(false); return; }
    }

    // 2. Check if product already exists at destination location
    const existingAtDest = allStock?.find(
      (s) => s.product_id === sourceStock.product_id && s.location_id === location.id,
    );

    if (existingAtDest) {
      const upsertResult = await warehouseService.updateStock(existingAtDest.id, {
        quantity: existingAtDest.quantity + assignQuantity,
      });
      if (upsertResult.error) { setError(upsertResult.error); setAssigning(false); return; }
    } else {
      const assignResult = await warehouseService.assignProductToLocation({
        product_id: sourceStock.product_id,
        location_id: location.id,
        warehouse_id: warehouseId,
        org_id: orgId,
        quantity: assignQuantity,
        lot_number: sourceStock.lot_number ?? undefined,
      });
      if (assignResult.error) { setError(assignResult.error); setAssigning(false); return; }
    }

    // 3. Mark destination location as occupied
    await warehouseService.updateLocation(location.id, { is_occupied: true });

    logActivity({
      action: 'assign_stock',
      entityType: 'location',
      entityId: location.id,
      description: `Asignó ${selectedProduct.product?.name ?? 'producto'} a ubicación ${location.code}`,
    });

    setAssigning(false);
    setShowProductSearch(false);
    setSelectedProduct(null);
    setSearchTerm('');
    setSearchResults([]);
    setAssignQuantity(1);
    reloadStock();
  };

  const handleCancelSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setShowProductSearch(false);
    setSelectedProduct(null);
    setSearchTerm('');
    setSearchResults([]);
    setSearching(false);
    setError('');
  };

  const handleRemoveProduct = async (stock: InventoryStock) => {
    setRemoving(true);
    setError('');

    const result = await warehouseService.removeProductFromLocation(
      stock.id,
      location.id,
      stock.product_id,
      stock.quantity,
    );
    if (result.error) {
      setError(result.error);
      setRemoving(false);
      return;
    }

    logActivity({
      action: 'remove_stock',
      entityType: 'location',
      entityId: location.id,
      description: `Removió ${stock.product?.name ?? 'producto'} de ubicación ${location.code}`,
    });

    setRemoving(false);
    setRemovingStockId(null);
    reloadStock();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalle de Ubicacion"
      width="520px"
      footer={
        <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="rh-btn rh-btn-ghost">
            Cerrar
          </button>
        </div>
      }
    >
      {error && (
        <div className="rh-alert rh-alert-error mb-4">{error}</div>
      )}

      {/* Location Info */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: 16,
          backgroundColor: '#F8FAFC',
          borderRadius: 10,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            backgroundColor: '#EEF2FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MapPin size={22} style={{ color: '#6366F1' }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#1E293B', margin: 0 }}>
            {location.code}
          </p>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: '2px 0 0' }}>
            Tipo: {LOCATION_TYPE_LABELS[location.location_type] ?? location.location_type} |
            Nivel {location.level}, Posicion {location.position}
          </p>
        </div>
        <div
          style={{
            padding: '4px 10px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            backgroundColor: location.is_active ? '#D1FAE5' : '#FEE2E2',
            color: location.is_active ? '#065F46' : '#991B1B',
          }}
        >
          {location.is_active ? 'Activa' : 'Inactiva'}
        </div>
      </div>

      {/* QR Section */}
      <div
        style={{
          padding: 12,
          backgroundColor: '#FFFBEB',
          borderRadius: 8,
          marginBottom: 16,
          border: '1px solid #FEF3C7',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <QrCode size={20} style={{ color: '#D97706', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#92400E', margin: 0 }}>
              Codigo QR
            </p>
            <p style={{ fontSize: 12, color: '#B45309', margin: '2px 0 0', fontFamily: 'monospace' }}>
              {location.qr_code ?? location.code}
            </p>
          </div>
          <button
            onClick={() => setShowQR(!showQR)}
            className="rh-btn rh-btn-ghost"
            style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
          >
            <Eye size={14} />
            {showQR ? 'Ocultar' : 'Ver QR'}
          </button>
        </div>

        {/* QR Code Preview */}
        {showQR && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            marginTop: 12, paddingTop: 12, borderTop: '1px solid #FEF3C7',
          }}>
            <div style={{
              padding: 16, backgroundColor: '#fff', borderRadius: 10,
              border: '1px solid #E2E8F0', display: 'inline-block',
            }}>
              <QRCodeSVG
                id="qr-preview-svg"
                value={location.qr_code ?? location.code}
                size={160}
                level="M"
                includeMargin={false}
              />
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', margin: 0, letterSpacing: 1 }}>
              {location.code}
            </p>
          </div>
        )}
      </div>

      {/* Stock Info */}
      {locationStocks.length > 0 ? (
        <div
          className="rh-card"
          style={{ padding: 16, marginBottom: 16, border: '1px solid #E2E8F0' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Package size={18} style={{ color: '#10B981' }} />
            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', margin: 0, flex: 1 }}>
              {locationStocks.length === 1 ? 'Producto en Ubicación' : `${locationStocks.length} Productos en Ubicación`}
            </h4>
            <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
              Disponible: {locationStocks.reduce((sum, s) => sum + (s.quantity - s.reserved_quantity), 0)} uds
            </span>
          </div>

          <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {locationStocks.map((stock) => (
              <div key={stock.id} style={{ padding: 12, backgroundColor: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>Producto</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', margin: '2px 0 0' }}>
                      {stock.product?.name ?? 'Sin nombre'}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>SKU</p>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#475569', margin: '2px 0 0', fontFamily: 'monospace' }}>
                      {stock.product?.sku ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>Disponible</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: (stock.quantity - stock.reserved_quantity) > 0 ? '#10B981' : '#DC2626', margin: '2px 0 0' }}>
                      {stock.quantity - stock.reserved_quantity}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>En Orden</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: stock.reserved_quantity > 0 ? '#F59E0B' : '#94A3B8', margin: '2px 0 0' }}>
                      {stock.reserved_quantity}
                    </p>
                  </div>
                  {stock.lot_number && (
                    <div>
                      <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>Lote</p>
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#475569', margin: '2px 0 0' }}>
                        {stock.lot_number}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions row */}
                <div style={{ display: 'flex', gap: 6, marginTop: 10, borderTop: '1px solid #E2E8F0', paddingTop: 8 }}>
                  <button
                    onClick={() => setShowProductQR(showProductQR === stock.id ? null : stock.id)}
                    className="rh-btn rh-btn-ghost"
                    style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                  >
                    <QrCode size={12} />
                    {showProductQR === stock.id ? 'Ocultar QR' : 'QR'}
                  </button>
                  <div style={{ flex: 1 }} />
                  {removingStockId === stock.id ? (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#991B1B', fontWeight: 600 }}>¿Seguro?</span>
                      <button
                        onClick={() => handleRemoveProduct(stock)}
                        disabled={removing}
                        style={{
                          padding: '4px 10px', fontSize: 11, fontWeight: 600,
                          color: '#fff', backgroundColor: '#DC2626', border: 'none',
                          borderRadius: 4, cursor: removing ? 'not-allowed' : 'pointer',
                          opacity: removing ? 0.7 : 1,
                        }}
                      >
                        {removing ? '...' : 'Sí'}
                      </button>
                      <button
                        onClick={() => setRemovingStockId(null)}
                        disabled={removing}
                        className="rh-btn rh-btn-ghost"
                        style={{ padding: '4px 8px', fontSize: 11 }}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRemovingStockId(stock.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '4px 8px', fontSize: 11, fontWeight: 600, color: '#DC2626',
                        background: 'none', border: '1px solid #FECACA', borderRadius: 4,
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={12} />
                      Quitar
                    </button>
                  )}
                </div>

                {/* Product QR (toggled per product) */}
                {showProductQR === stock.id && (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    marginTop: 10, paddingTop: 10, borderTop: '1px solid #E2E8F0',
                  }}>
                    <div style={{
                      padding: 14, backgroundColor: '#fff', borderRadius: 10,
                      border: '1px solid #E2E8F0', display: 'inline-block',
                    }}>
                      <QRCodeSVG
                        id="qr-product-svg"
                        value={stock.product?.sku ?? stock.product_id}
                        size={120}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#1E293B', margin: 0, fontFamily: 'monospace' }}>
                      {stock.product?.sku ?? '—'}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            backgroundColor: '#F8FAFC',
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          <Package size={32} style={{ color: '#CBD5E1', margin: '0 auto 8px' }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', margin: 0 }}>
            Ubicación vacía
          </p>
          <p style={{ fontSize: 12, color: '#CBD5E1', margin: '4px 0 0' }}>
            No hay productos asignados a esta ubicación
          </p>
        </div>
      )}

      {/* Assign Product Section */}
      {!showProductSearch ? (
        <button
          onClick={() => setShowProductSearch(true)}
          className="rh-btn rh-btn-primary"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          disabled={!location.is_active}
        >
          <Package size={16} />
          Asignar Producto
        </button>
      ) : (
        <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', margin: 0 }}>
              Transferir desde otra ubicacion
            </h4>
            <button
              onClick={handleCancelSearch}
              className="rh-btn rh-btn-ghost"
              style={{ padding: 4 }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Smart Search Input (auto-search on type, same as order creation) */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', zIndex: 1 }}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleProductSearch(e.target.value)}
                placeholder="Buscar producto en almacen por nombre, SKU o marca..."
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
            {searchResults.length > 0 && !selectedProduct && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: '#fff', border: '1px solid #E2E0DE', borderRadius: 8,
                maxHeight: 240, overflowY: 'auto', zIndex: 10,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              }}>
                {searchResults.map((stock) => {
                  const avail = stock.quantity - stock.reserved_quantity;
                  const isAssigned = stock.location_id != null;
                  const bgDefault = isAssigned ? '#FFFBEB' : '#fff';
                  const bgHover = isAssigned ? '#FEF3C7' : '#F8FAFC';
                  return (
                    <div
                      key={stock.id}
                      onClick={() => {
                        setSelectedProduct(stock);
                        setSearchTerm('');
                        setSearchResults([]);
                      }}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', cursor: 'pointer', fontSize: 14,
                        borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s',
                        background: bgDefault,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = bgHover; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = bgDefault; }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: '#1E293B' }}>
                          {stock.product?.name ?? 'Sin nombre'}
                        </span>
                        {isAssigned ? (
                          <span style={{ fontSize: 11 }}>
                            <span style={{ color: '#8A8886' }}>SKU: {stock.product?.sku ?? '—'} | </span>
                            <span style={{
                              display: 'inline-block', padding: '1px 6px', borderRadius: 4,
                              backgroundColor: '#F59E0B20', color: '#B45309', fontWeight: 600,
                            }}>
                              📍 En ubicacion: {stock.location?.code ?? '—'}
                            </span>
                          </span>
                        ) : (
                          <span style={{ fontSize: 11 }}>
                            <span style={{ color: '#8A8886' }}>SKU: {stock.product?.sku ?? '—'} | </span>
                            <span style={{
                              display: 'inline-block', padding: '1px 6px', borderRadius: 4,
                              backgroundColor: '#10B98120', color: '#065F46', fontWeight: 600,
                            }}>
                              ✅ Sin asignar
                            </span>
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0, marginLeft: 12 }}>
                        <span style={{ fontWeight: 700, color: '#059669', fontSize: 13 }}>
                          {avail} disponible
                        </span>
                        {stock.reserved_quantity > 0 && (
                          <span style={{ fontSize: 11, color: '#D97706' }}>
                            {stock.reserved_quantity} reservado
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* No results message */}
            {searchTerm.length >= 2 && !searching && searchResults.length === 0 && !selectedProduct && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: '#fff', border: '1px solid #E2E0DE', borderRadius: 8,
                padding: '14px 16px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                color: '#94A3B8', fontSize: 13, textAlign: 'center',
              }}>
                No se encontro stock disponible para &quot;{searchTerm}&quot;
              </div>
            )}
          </div>

          {/* Selected Product & Quantity */}
          {selectedProduct && (() => {
            const maxAvail = selectedProduct.quantity - selectedProduct.reserved_quantity;
            return (
              <div style={{ marginTop: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: 10,
                    backgroundColor: '#EEF2FF',
                    borderRadius: 8,
                    marginBottom: 12,
                  }}
                >
                  <Package size={16} style={{ color: '#6366F1', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', margin: 0 }}>
                      {selectedProduct.product?.name ?? 'Sin nombre'}
                    </p>
                    <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>
                      SKU: {selectedProduct.product?.sku ?? '—'} | {selectedProduct.location_id != null
                        ? `⚠️ Se moverá desde: ${selectedProduct.location?.code ?? '—'}`
                        : '✅ Sin ubicacion asignada'}
                    </p>
                    <p style={{ fontSize: 11, color: '#059669', margin: '2px 0 0', fontWeight: 600 }}>
                      {maxAvail} disponible para transferir
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="rh-btn rh-btn-ghost"
                    style={{ padding: 4 }}
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="rh-field" style={{ marginBottom: 12 }}>
                  <label className="rh-label">Cantidad a transferir</label>
                  <input
                    type="number"
                    min={1}
                    max={maxAvail}
                    value={assignQuantity}
                    onChange={(e) => setAssignQuantity(Math.max(1, Math.min(maxAvail, parseInt(e.target.value) || 1)))}
                    className="rh-input"
                  />
                </div>

                <button
                  onClick={handleAssignProduct}
                  className="rh-btn rh-btn-primary"
                  style={{ width: '100%' }}
                  disabled={assigning || assignQuantity > maxAvail}
                >
                  {assigning ? 'Transfiriendo...' : 'Confirmar Transferencia'}
                </button>
              </div>
            );
          })()}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: translateY(-50%) rotate(360deg); }
        }
      `}</style>
    </Modal>
  );
}
