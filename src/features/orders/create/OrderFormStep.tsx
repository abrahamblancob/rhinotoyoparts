import type { Customer, Organization } from '@/lib/database.types.ts';
import type { Warehouse } from '@/types/warehouse.ts';
import type { OrderItem } from './types.ts';
import GooglePlacesAutocomplete from '@/components/GooglePlacesAutocomplete.tsx';

interface OrderFormStepProps {
  isPlatformOwner: boolean;
  isEditMode: boolean;
  isAggregator?: boolean;
  inventoryOrg: Organization | null;
  selectedOrg: Organization | null;
  selectedWarehouse?: Warehouse | null;
  warehouses?: Warehouse[];
  onWarehouseChange?: (wh: Warehouse | null) => void;
  // Customer state
  customers: Customer[];
  customerSearch: string;
  selectedCustomer: Customer | null;
  showNewCustomer: boolean;
  newCustomerName: string;
  customerPhone: string;
  shippingAddress: string;
  // Product state
  productSearch: string;
  productResults: import('@/lib/database.types.ts').Product[];
  productLoading: boolean;
  items: OrderItem[];
  notes: string;
  shippingCost: number;
  subtotal: number;
  total: number;
  // Handlers
  onCustomerSearch: (search: string) => void;
  onSelectCustomer: (c: Customer) => void;
  onClearCustomer: () => void;
  onShowNewCustomer: () => void;
  onCancelNewCustomer: () => void;
  onNewCustomerNameChange: (name: string) => void;
  onCustomerPhoneChange: (phone: string) => void;
  onShippingAddressChange: (address: string) => void;
  onPlaceSelect: (place: { address: string; lat: number; lng: number }) => void;
  onProductSearch: (query: string) => void;
  onAddItem: (product: import('@/lib/database.types.ts').Product) => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemoveItem: (productId: string) => void;
  onNotesChange: (notes: string) => void;
  onShippingCostChange: (cost: number) => void;
  onGoBackToOrgSelection: () => void;
}

export function OrderFormStep(props: OrderFormStepProps) {
  const {
    isPlatformOwner, isEditMode, isAggregator, inventoryOrg, selectedOrg, selectedWarehouse,
    warehouses, onWarehouseChange,
    customers, customerSearch, selectedCustomer, showNewCustomer, newCustomerName,
    customerPhone, shippingAddress,
    productSearch, productResults, productLoading, items,
    notes, shippingCost, subtotal, total,
    onCustomerSearch, onSelectCustomer, onClearCustomer,
    onShowNewCustomer, onCancelNewCustomer, onNewCustomerNameChange,
    onCustomerPhoneChange, onShippingAddressChange, onPlaceSelect,
    onProductSearch, onAddItem, onUpdateQty, onRemoveItem,
    onNotesChange, onShippingCostChange, onGoBackToOrgSelection,
  } = props;

  // Show warehouse selector for associates & platform owners (aggregators select via org step)
  const showWarehouseSelector = !isAggregator && (warehouses ?? []).length > 0 && onWarehouseChange;

  const filteredCustomers = customerSearch.length >= 2
    ? customers.filter((c) =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone?.includes(customerSearch) ||
        c.rif?.includes(customerSearch)
      )
    : [];

  return (
    <>
      {/* Org banner for Super Admin */}
      {isPlatformOwner && inventoryOrg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 8,
          background: 'rgba(211,1,10,0.05)', border: '1px solid rgba(211,1,10,0.2)',
        }}>
          <span style={{ fontSize: 18 }}>🏢</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12, color: '#64748B' }}>Inventario de:</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#D3010A', marginLeft: 6 }}>{inventoryOrg.name}</span>
            {selectedOrg && inventoryOrg.id !== selectedOrg.id && (
              <span style={{ fontSize: 11, color: '#64748B', marginLeft: 6 }}>({selectedOrg.name})</span>
            )}
          </div>
          {!isEditMode && (
            <button onClick={onGoBackToOrgSelection}
              style={{ fontSize: 12, color: '#D3010A', background: 'none', border: '1px solid rgba(211,1,10,0.3)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
              Cambiar
            </button>
          )}
        </div>
      )}

      {/* Org + Warehouse banner for Aggregator */}
      {isAggregator && inventoryOrg && selectedWarehouse && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 6,
          padding: '10px 14px', borderRadius: 8,
          background: 'rgba(211,1,10,0.05)', border: '1px solid rgba(211,1,10,0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>👤</span>
            <span style={{ fontSize: 12, color: '#64748B' }}>Asociado:</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#1E293B' }}>{inventoryOrg.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🏭</span>
            <span style={{ fontSize: 12, color: '#64748B' }}>Almacén:</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#D3010A' }}>{selectedWarehouse.name}</span>
            <span style={{ fontSize: 11, color: '#8A8886' }}>({selectedWarehouse.code})</span>
          </div>
          {!isEditMode && (
            <button onClick={onGoBackToOrgSelection}
              style={{ fontSize: 12, color: '#D3010A', background: 'none', border: '1px solid rgba(211,1,10,0.3)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', alignSelf: 'flex-end' }}>
              Cambiar
            </button>
          )}
        </div>
      )}

      {/* Warehouse selector for associates / platform owners */}
      {showWarehouseSelector && (
        <div>
          <label className="rh-label" style={{ marginBottom: 6, display: 'block' }}>
            Almacén de despacho
          </label>
          <select
            className="rh-input"
            value={selectedWarehouse?.id ?? ''}
            onChange={(e) => {
              const wh = warehouses!.find((w) => w.id === e.target.value) ?? null;
              onWarehouseChange!(wh);
            }}
            style={{ cursor: 'pointer' }}
          >
            <option value="">— Seleccionar almacén —</option>
            {warehouses!.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name} ({wh.code})
              </option>
            ))}
          </select>
          {!selectedWarehouse && (
            <span style={{ fontSize: 11, color: '#F59E0B', marginTop: 4, display: 'block' }}>
              Selecciona un almacén para habilitar reserva de stock y picking automatico
            </span>
          )}
        </div>
      )}

      {/* Customer */}
      <div>
        <label className="rh-label" style={{ marginBottom: 6, display: 'block' }}>Cliente</label>
        {selectedCustomer ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0' }}>
            <span style={{ fontSize: 16 }}>👤</span>
            <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>
              {selectedCustomer.name}
              {selectedCustomer.phone && <span style={{ fontWeight: 400, color: '#64748B', marginLeft: 8 }}>{selectedCustomer.phone}</span>}
            </span>
            <button onClick={onClearCustomer}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8886', fontSize: 18, lineHeight: 1 }}>&times;</button>
          </div>
        ) : showNewCustomer ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input className="rh-input" placeholder="Nombre del nuevo cliente *" style={{ flex: 1 }}
              value={newCustomerName} onChange={(e) => onNewCustomerNameChange(e.target.value)} autoFocus />
            <button className="rh-btn rh-btn-secondary" onClick={onCancelNewCustomer}
              style={{ fontSize: 12, padding: '6px 12px', whiteSpace: 'nowrap' }}>Cancelar</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input className="rh-input" placeholder="Buscar por nombre, teléfono o RIF..." value={customerSearch}
                onChange={(e) => onCustomerSearch(e.target.value)} />
              {filteredCustomers.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #E2E0DE', borderRadius: 8, maxHeight: 200, overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  {filteredCustomers.map((c) => (
                    <div key={c.id} onClick={() => onSelectCustomer(c)}
                      style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 14, borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}>
                      <span style={{ fontWeight: 500 }}>{c.name}</span>
                      {c.phone && <span style={{ color: '#8A8886', marginLeft: 8, fontSize: 13 }}>{c.phone}</span>}
                      {c.city && <span style={{ color: '#94A3B8', marginLeft: 8, fontSize: 12 }}>· {c.city}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button className="rh-btn rh-btn-secondary" onClick={onShowNewCustomer} style={{ whiteSpace: 'nowrap' }}>
              + Nuevo
            </button>
          </div>
        )}
      </div>

      {/* Phone + Address */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label className="rh-label" style={{ marginBottom: 4, display: 'block' }}>Teléfono de contacto</label>
          <input className="rh-input" placeholder="+58 414-..." value={customerPhone}
            onChange={(e) => onCustomerPhoneChange(e.target.value)} />
        </div>
        <div>
          <label className="rh-label" style={{ marginBottom: 4, display: 'block' }}>Dirección de envío</label>
          <GooglePlacesAutocomplete
            className="rh-input"
            placeholder="Escribe la dirección de envío..."
            value={shippingAddress}
            onChange={onShippingAddressChange}
            onPlaceSelect={onPlaceSelect}
          />
          <span style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, display: 'block' }}>
            Escribe y selecciona una dirección de las sugerencias de Google Maps
          </span>
        </div>
      </div>

      {/* Products */}
      <div>
        <label className="rh-label" style={{ marginBottom: 6, display: 'block' }}>Productos</label>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <input className="rh-input" placeholder="Buscar por nombre, SKU o número OEM..."
              value={productSearch}
              onChange={(e) => onProductSearch(e.target.value)}
              style={{ paddingRight: 36 }}
            />
            {productLoading && (
              <div style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                width: 16, height: 16, border: '2px solid #E2E8F0', borderTopColor: '#D3010A',
                borderRadius: '50%', animation: 'spin 0.6s linear infinite',
              }} />
            )}
          </div>
          {productResults.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #E2E0DE', borderRadius: 8, maxHeight: 240, overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
              {productResults.map((p) => (
                <div key={p.id} onClick={() => onAddItem(p)}
                  style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    <span style={{ color: '#8A8886', fontSize: 12 }}>SKU: {p.sku}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span style={{ fontWeight: 700, color: '#059669' }}>${Number(p.price).toFixed(2)}</span>
                    <span style={{ fontSize: 11, color: p.stock > 5 ? '#64748B' : '#D97706' }}>
                      {p.stock > 5 ? `${p.stock} en stock` : `⚠ ${p.stock} en stock`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {productSearch.length >= 2 && !productLoading && productResults.length === 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #E2E0DE', borderRadius: 8, padding: '14px 16px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', color: '#94A3B8', fontSize: 13, textAlign: 'center' }}>
              No se encontraron productos para &quot;{productSearch}&quot;
            </div>
          )}
        </div>

        {/* Items table */}
        {items.length > 0 && (
          <div style={{ marginTop: 10, border: '1px solid #E2E0DE', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>Producto</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#64748B', width: 80 }}>Qty</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#64748B', width: 80 }}>Precio</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#64748B', width: 90 }}>Subtotal</th>
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.product.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{item.product.sku}</div>
                      <div style={{ fontSize: 12, color: '#8A8886' }}>{item.product.name}</div>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <input type="number" min="1" max={item.product.stock} value={item.quantity}
                        onChange={(e) => onUpdateQty(item.product.id, parseInt(e.target.value) || 1)}
                        style={{ width: 50, textAlign: 'center', border: '1px solid #E2E0DE', borderRadius: 4, padding: '2px 4px' }} />
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>${Number(item.product.price).toFixed(2)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                      ${(Number(item.product.price) * item.quantity).toFixed(2)}
                    </td>
                    <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                      <button onClick={() => onRemoveItem(item.product.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D3010A', fontSize: 16, lineHeight: 1 }}>&times;</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Totals */}
      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', padding: '4px 0' }}>
          <div style={{ display: 'flex', gap: 16, fontSize: 14 }}>
            <span style={{ color: '#64748B' }}>Subtotal:</span>
            <span style={{ fontWeight: 500, minWidth: 70, textAlign: 'right' }}>${subtotal.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 14, alignItems: 'center' }}>
            <span style={{ color: '#64748B' }}>Envío:</span>
            <input type="number" min="0" step="0.01" value={shippingCost}
              onChange={(e) => onShippingCostChange(parseFloat(e.target.value) || 0)}
              style={{ width: 70, textAlign: 'right', border: '1px solid #E2E0DE', borderRadius: 4, padding: '2px 8px' }} />
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 16, fontWeight: 700, borderTop: '2px solid #E2E0DE', paddingTop: 8, marginTop: 4 }}>
            <span>TOTAL:</span>
            <span style={{ color: '#D3010A', minWidth: 70, textAlign: 'right' }}>${total.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="rh-label" style={{ marginBottom: 4, display: 'block' }}>Notas</label>
        <textarea className="rh-input" placeholder="Instrucciones especiales, observaciones..." rows={2}
          value={notes} onChange={(e) => onNotesChange(e.target.value)} style={{ resize: 'vertical' }} />
      </div>
    </>
  );
}
