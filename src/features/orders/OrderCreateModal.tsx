import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { Modal } from '@/components/hub/shared/Modal.tsx';
import type { Customer, Product } from '@/lib/database.types.ts';

interface OrderItem {
  product: Product;
  quantity: number;
}

interface OrderCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function OrderCreateModal({ open, onClose, onCreated }: OrderCreateModalProps) {
  const profile = useAuthStore((s) => s.profile);
  const organization = useAuthStore((s) => s.organization);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', city: '' });
  const [shippingAddress, setShippingAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [shippingCost, setShippingCost] = useState(0);
  const [saving, setSaving] = useState(false);

  // Refs for debounce
  const productDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const productSearchRef = useRef('');

  useEffect(() => {
    if (open && organization) {
      supabase.from('customers').select('*').eq('org_id', organization.id).order('name').then(({ data }) => {
        setCustomers((data as Customer[]) ?? []);
      });
    }
  }, [open, organization]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedCustomer(null);
      setShowNewCustomer(false);
      setNewCustomer({ name: '', phone: '', city: '' });
      setShippingAddress('');
      setCustomerPhone('');
      setCustomerSearch('');
      setProductSearch('');
      setProductResults([]);
      setProductLoading(false);
      setItems([]);
      setNotes('');
      setShippingCost(0);
    }
  }, [open]);

  // Debounced product search
  const searchProducts = useCallback((query: string) => {
    setProductSearch(query);
    productSearchRef.current = query;

    if (productDebounceRef.current) {
      clearTimeout(productDebounceRef.current);
    }

    if (query.length < 2 || !organization) {
      setProductResults([]);
      setProductLoading(false);
      return;
    }

    setProductLoading(true);

    productDebounceRef.current = setTimeout(async () => {
      // Check if query is still current
      if (productSearchRef.current !== query) return;

      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('org_id', organization.id)
        .eq('status', 'active')
        .gt('stock', 0)
        .or(`name.ilike.%${query}%,sku.ilike.%${query}%,oem_number.ilike.%${query}%`)
        .limit(10);

      // Only update if query hasn't changed while we were fetching
      if (productSearchRef.current === query) {
        setProductResults((data as Product[]) ?? []);
        setProductLoading(false);
      }
    }, 250);
  }, [organization]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (productDebounceRef.current) clearTimeout(productDebounceRef.current);
    };
  }, []);

  const addItem = (product: Product) => {
    const existing = items.find((i) => i.product.id === product.id);
    if (existing) {
      setItems(items.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, { product, quantity: 1 }]);
    }
    setProductSearch('');
    setProductResults([]);
    setProductLoading(false);
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setItems(items.filter((i) => i.product.id !== productId));
    } else {
      setItems(items.map((i) => i.product.id === productId ? { ...i, quantity: qty } : i));
    }
  };

  const removeItem = (productId: string) => {
    setItems(items.filter((i) => i.product.id !== productId));
  };

  const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const total = subtotal + shippingCost;

  const filteredCustomers = customerSearch.length >= 2
    ? customers.filter((c) =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone?.includes(customerSearch) ||
        c.rif?.includes(customerSearch)
      )
    : [];

  const handleSave = async (asDraft: boolean) => {
    if (!organization || !profile) return;
    if (items.length === 0) return;
    setSaving(true);

    try {
      let customerId = selectedCustomer?.id ?? null;

      // Create new customer if needed
      if (showNewCustomer && newCustomer.name) {
        const { data: newC } = await supabase.from('customers').insert({
          org_id: organization.id,
          name: newCustomer.name,
          phone: newCustomer.phone || null,
          city: newCustomer.city || null,
        }).select().single();
        if (newC) customerId = newC.id;
      }

      // Generate order number
      const orderNumber = `RH-${Date.now().toString(36).toUpperCase()}`;

      const { data: order, error } = await supabase.from('orders').insert({
        org_id: organization.id,
        customer_id: customerId,
        order_number: orderNumber,
        status: asDraft ? 'draft' : 'confirmed',
        subtotal,
        tax: 0,
        discount: 0,
        total,
        notes: notes || null,
        created_by: profile.id,
        source: 'manual',
        shipping_address: shippingAddress ? { address: shippingAddress } : null,
        customer_phone: customerPhone || selectedCustomer?.phone || newCustomer.phone || null,
        confirmed_at: asDraft ? null : new Date().toISOString(),
      }).select().single();

      if (error || !order) {
        console.error('Error creating order:', error);
        setSaving(false);
        return;
      }

      // Insert order items
      const orderItems = items.map((i) => ({
        order_id: order.id,
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.product.price,
        total: i.product.price * i.quantity,
      }));

      await supabase.from('order_items').insert(orderItems);

      // Record initial status in history
      await supabase.from('order_status_history').insert({
        order_id: order.id,
        org_id: organization.id,
        from_status: null,
        to_status: asDraft ? 'draft' : 'confirmed',
        changed_by: profile.id,
        note: asDraft ? 'Orden creada como borrador' : 'Orden creada y confirmada',
        metadata: { source: 'manual' },
      });

      onCreated();
      onClose();
    } catch (err) {
      console.error('Error creating order:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nueva Orden" width="640px" footer={
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="rh-btn rh-btn-secondary" onClick={() => handleSave(true)} disabled={saving || items.length === 0}>
          Guardar como borrador
        </button>
        <button className="rh-btn rh-btn-primary" onClick={() => handleSave(false)} disabled={saving || items.length === 0}>
          {saving ? 'Guardando...' : 'Confirmar orden'}
        </button>
      </div>
    }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Cliente ── */}
        <div>
          <label className="rh-label" style={{ marginBottom: 6, display: 'block' }}>Cliente</label>
          {selectedCustomer ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0' }}>
              <span style={{ fontSize: 16 }}>👤</span>
              <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>
                {selectedCustomer.name}
                {selectedCustomer.phone && <span style={{ fontWeight: 400, color: '#64748B', marginLeft: 8 }}>{selectedCustomer.phone}</span>}
              </span>
              <button onClick={() => { setSelectedCustomer(null); setCustomerPhone(''); setShippingAddress(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8886', fontSize: 18, lineHeight: 1 }}>&times;</button>
            </div>
          ) : showNewCustomer ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>Nuevo cliente</span>
              <input className="rh-input" placeholder="Nombre del cliente *"
                value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} />
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="rh-input" placeholder="Teléfono" style={{ flex: 1 }}
                  value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
                <input className="rh-input" placeholder="Ciudad" style={{ flex: 1 }}
                  value={newCustomer.city} onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })} />
              </div>
              <button className="rh-btn rh-btn-secondary" onClick={() => { setShowNewCustomer(false); setNewCustomer({ name: '', phone: '', city: '' }); }}
                style={{ alignSelf: 'flex-start', fontSize: 12, padding: '4px 12px' }}>Cancelar</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input className="rh-input" placeholder="Buscar por nombre, teléfono o RIF..." value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)} />
                {filteredCustomers.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #E2E0DE', borderRadius: 8, maxHeight: 200, overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    {filteredCustomers.map((c) => (
                      <div key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setCustomerPhone(c.phone ?? ''); setShippingAddress(c.address ?? ''); }}
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
              <button className="rh-btn rh-btn-secondary" onClick={() => setShowNewCustomer(true)} style={{ whiteSpace: 'nowrap' }}>
                + Nuevo
              </button>
            </div>
          )}
        </div>

        {/* ── Teléfono + Dirección ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label className="rh-label" style={{ marginBottom: 4, display: 'block' }}>Teléfono de contacto</label>
            <input className="rh-input" placeholder="+58 414-..." value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)} />
          </div>
          <div>
            <label className="rh-label" style={{ marginBottom: 4, display: 'block' }}>Dirección de envío</label>
            <input className="rh-input"
              placeholder="https://maps.google.com/... o dirección completa"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
            />
            <span style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, display: 'block' }}>
              Pega el link de Google Maps para facilitar el tracking del despachador
            </span>
          </div>
        </div>

        {/* ── Productos ── */}
        <div>
          <label className="rh-label" style={{ marginBottom: 6, display: 'block' }}>Productos</label>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <input className="rh-input" placeholder="Buscar por nombre, SKU o número OEM..."
                value={productSearch}
                onChange={(e) => searchProducts(e.target.value)}
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
                  <div key={p.id} onClick={() => addItem(p)}
                    style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                      <span style={{ color: '#8A8886', fontSize: 12 }}>SKU: {p.sku}{p.oem_number ? ` · OEM: ${p.oem_number}` : ''}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                      <span style={{ fontWeight: 700, color: '#059669' }}>${p.price.toFixed(2)}</span>
                      <span style={{ fontSize: 11, color: p.stock > 5 ? '#64748B' : '#D97706' }}>
                        {p.stock > 5 ? `${p.stock} en stock` : `Solo ${p.stock} en stock`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {productSearch.length >= 2 && !productLoading && productResults.length === 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #E2E0DE', borderRadius: 8, padding: '14px 16px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', color: '#94A3B8', fontSize: 13, textAlign: 'center' }}>
                No se encontraron productos para "{productSearch}"
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
                        <div style={{ fontWeight: 500 }}>{item.product.name}</div>
                        <div style={{ fontSize: 12, color: '#8A8886' }}>{item.product.sku}</div>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <input type="number" min="1" max={item.product.stock} value={item.quantity}
                          onChange={(e) => updateQty(item.product.id, parseInt(e.target.value) || 1)}
                          style={{ width: 50, textAlign: 'center', border: '1px solid #E2E0DE', borderRadius: 4, padding: '2px 4px' }} />
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>${item.product.price.toFixed(2)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </td>
                      <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                        <button onClick={() => removeItem(item.product.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D3010A', fontSize: 16, lineHeight: 1 }}>&times;</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Totales ── */}
        {items.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', padding: '4px 0' }}>
            <div style={{ display: 'flex', gap: 16, fontSize: 14 }}>
              <span style={{ color: '#64748B' }}>Subtotal:</span>
              <span style={{ fontWeight: 500, minWidth: 70, textAlign: 'right' }}>${subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 14, alignItems: 'center' }}>
              <span style={{ color: '#64748B' }}>Envío:</span>
              <input type="number" min="0" step="0.01" value={shippingCost}
                onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                style={{ width: 70, textAlign: 'right', border: '1px solid #E2E0DE', borderRadius: 4, padding: '2px 8px' }} />
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 16, fontWeight: 700, borderTop: '2px solid #E2E0DE', paddingTop: 8, marginTop: 4 }}>
              <span>TOTAL:</span>
              <span style={{ color: '#D3010A', minWidth: 70, textAlign: 'right' }}>${total.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* ── Notas ── */}
        <div>
          <label className="rh-label" style={{ marginBottom: 4, display: 'block' }}>Notas</label>
          <textarea className="rh-input" placeholder="Instrucciones especiales, observaciones..." rows={2}
            value={notes} onChange={(e) => setNotes(e.target.value)} style={{ resize: 'vertical' }} />
        </div>
      </div>

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: translateY(-50%) rotate(360deg); }
        }
      `}</style>
    </Modal>
  );
}
