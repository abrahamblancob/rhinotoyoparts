import { useState, useCallback } from 'react';
import { MapPin, Package, QrCode, Printer, Search, X } from 'lucide-react';
import { Modal } from '@/components/hub/shared/Modal.tsx';
import { useAsyncData } from '@/hooks/useAsyncData.ts';
import * as warehouseService from '@/services/warehouseService.ts';
import * as productService from '@/services/productService.ts';
import type { WarehouseLocation, InventoryStock } from '@/types/warehouse.ts';
import type { Product } from '@/lib/database.types.ts';

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
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignQuantity, setAssignQuantity] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [error, setError] = useState('');

  // Fetch stock for this location's products
  const stockFetcher = useCallback(
    () => warehouseService.getStockByWarehouse(warehouseId),
    [warehouseId],
  );
  const { data: allStock, reload: reloadStock } = useAsyncData<InventoryStock[]>(stockFetcher, [warehouseId]);

  const locationStock = allStock?.find((s) => s.location_id === location.id) ?? null;

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    setError('');
    const result = await productService.searchProducts(orgId, searchTerm);
    if (result.error) {
      setError(result.error);
    } else {
      setSearchResults(result.data ?? []);
    }
    setSearching(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleAssignProduct = async () => {
    if (!selectedProduct || assignQuantity <= 0) return;
    setAssigning(true);
    setError('');

    const result = await warehouseService.assignProductToLocation({
      product_id: selectedProduct.id,
      location_id: location.id,
      warehouse_id: warehouseId,
      org_id: orgId,
      quantity: assignQuantity,
    });

    if (result.error) {
      setError(result.error);
      setAssigning(false);
      return;
    }

    // Mark location as occupied
    await warehouseService.updateLocation(location.id, { is_occupied: true });

    setAssigning(false);
    setShowProductSearch(false);
    setSelectedProduct(null);
    setSearchTerm('');
    setSearchResults([]);
    setAssignQuantity(1);
    reloadStock();
  };

  const handleCancelSearch = () => {
    setShowProductSearch(false);
    setSelectedProduct(null);
    setSearchTerm('');
    setSearchResults([]);
    setError('');
  };

  const handlePrintQR = () => {
    // Placeholder - will implement QR printing
    alert(`Imprimir QR para ubicacion: ${location.code}\nQR: ${location.qr_code ?? location.code}`);
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
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: 12,
          backgroundColor: '#FFFBEB',
          borderRadius: 8,
          marginBottom: 16,
          border: '1px solid #FEF3C7',
        }}
      >
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
          onClick={handlePrintQR}
          className="rh-btn rh-btn-ghost"
          style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
        >
          <Printer size={14} />
          Imprimir QR
        </button>
      </div>

      {/* Stock Info */}
      {locationStock ? (
        <div
          className="rh-card"
          style={{ padding: 16, marginBottom: 16, border: '1px solid #E2E8F0' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Package size={18} style={{ color: '#10B981' }} />
            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', margin: 0 }}>
              Producto en Ubicacion
            </h4>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>Producto</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', margin: '2px 0 0' }}>
                {locationStock.product?.name ?? 'Sin nombre'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>SKU</p>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#475569', margin: '2px 0 0', fontFamily: 'monospace' }}>
                {locationStock.product?.sku ?? '—'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>Cantidad</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#10B981', margin: '2px 0 0' }}>
                {locationStock.quantity}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>Reservado</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#F59E0B', margin: '2px 0 0' }}>
                {locationStock.reserved_quantity}
              </p>
            </div>
            {locationStock.lot_number && (
              <div>
                <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>Lote</p>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#475569', margin: '2px 0 0' }}>
                  {locationStock.lot_number}
                </p>
              </div>
            )}
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
            Ubicacion vacia
          </p>
          <p style={{ fontSize: 12, color: '#CBD5E1', margin: '4px 0 0' }}>
            No hay producto asignado a esta ubicacion
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
              Buscar Producto
            </h4>
            <button
              onClick={handleCancelSearch}
              className="rh-btn rh-btn-ghost"
              style={{ padding: 4 }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Search Input */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Nombre, SKU u OEM..."
                className="rh-input"
                style={{ paddingLeft: 34 }}
                autoFocus
              />
            </div>
            <button
              onClick={handleSearch}
              className="rh-btn rh-btn-outline"
              disabled={searching || !searchTerm.trim()}
            >
              {searching ? 'Buscando...' : 'Buscar'}
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && !selectedProduct && (
            <div
              style={{
                maxHeight: 200,
                overflowY: 'auto',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              {searchResults.map((product) => (
                <div
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #F1F5F9',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', margin: 0 }}>
                      {product.name}
                    </p>
                    <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0 0' }}>
                      SKU: {product.sku} {product.brand ? `| ${product.brand}` : ''}
                    </p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#10B981' }}>
                    Stock: {product.stock}
                  </span>
                </div>
              ))}
            </div>
          )}

          {searchResults.length === 0 && searchTerm && !searching && (
            <p style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: 12 }}>
              No se encontraron productos
            </p>
          )}

          {/* Selected Product & Quantity */}
          {selectedProduct && (
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
                    {selectedProduct.name}
                  </p>
                  <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>
                    SKU: {selectedProduct.sku}
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
                <label className="rh-label">Cantidad a asignar</label>
                <input
                  type="number"
                  min={1}
                  value={assignQuantity}
                  onChange={(e) => setAssignQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="rh-input"
                />
              </div>

              <button
                onClick={handleAssignProduct}
                className="rh-btn rh-btn-primary"
                style={{ width: '100%' }}
                disabled={assigning}
              >
                {assigning ? 'Asignando...' : 'Confirmar Asignacion'}
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
