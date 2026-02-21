import { useEffect, useState } from 'react';
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

  const [source, setSource] = useState<'manual' | 'whatsapp' | 'rhino_vision'>('manual');
  const [visionRef, setVisionRef] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', whatsapp: '', address: '', city: '', state: '' });
  const [shippingAddress, setShippingAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [shippingCost, setShippingCost] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && organization) {
      supabase.from('customers').select('*').eq('org_id', organization.id).order('name').then(({ data }) => {
        setCustomers((data as Customer[]) ?? []);
      });
    }
  }, [open, organization]);

  useEffect(() => {
    if (!open) {
      setSource('manual');
      setVisionRef('');
      setSelectedCustomer(null);
      setShowNewCustomer(false);
      setNewCustomer({ name: '', phone: '', whatsapp: '', address: '', city: '', state: '' });
      setShippingAddress('');
      setCustomerPhone('');
      setProductSearch('');
      setProductResults([]);
      setItems([]);
      setNotes('');
      setShippingCost(0);
    }
  }, [open]);

  const searchProducts = async (query: string) => {
    setProductSearch(query);
    if (query.length < 2 || !organization) return;
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('org_id', organization.id)
      .eq('status', 'active')
      .gt('stock', 0)
      .or(`name.ilike.%${query}%,sku.ilike.%${query}%,oem_number.ilike.%${query}%`)
      .limit(10);
    setProductResults((data as Product[]) ?? []);
  };

  const addItem = (product: Product) => {
    const existing = items.find((i) => i.product.id === product.id);
    if (existing) {
      setItems(items.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, { product, quantity: 1 }]);
    }
    setProductSearch('');
    setProductResults([]);
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

  const filteredCustomers = customerSearch
    ? customers.filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone?.includes(customerSearch) || c.rif?.includes(customerSearch))
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
          whatsapp: newCustomer.whatsapp || null,
          address: newCustomer.address || null,
          city: newCustomer.city || null,
          state: newCustomer.state || null,
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
        source,
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
        metadata: { source, vision_ref: visionRef || undefined },
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
    <Modal open={open} onClose={onClose} title="Nueva Orden" width="700px" footer={
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="rh-btn rh-btn-secondary" onClick={() => handleSave(true)} disabled={saving || items.length === 0}>
          Guardar como borrador
        </button>
        <button className="rh-btn rh-btn-primary" onClick={() => handleSave(false)} disabled={saving || items.length === 0}>
          {saving ? 'Guardando...' : 'Confirmar orden'}
        </button>
      </div>
    }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Source */}
        <div>
          <label className="rh-label">Origen</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['manual', 'whatsapp', 'rhino_vision'] as const).map((s) => (
              <button key={s} onClick={() => setSource(s)}
                className={`rh-filter-pill ${source === s ? 'active' : ''}`}>
                {s === 'manual' ? 'Manual' : s === 'whatsapp' ? 'WhatsApp' : 'Rhino Vision'}
              </button>
            ))}
          </div>
        </div>

        {source === 'rhino_vision' && (
          <div>
            <label className="rh-label">Ref. Rhino Vision</label>
            <input className="rh-input" placeholder="RV-XXXXXXXX" value={visionRef}
              onChange={(e) => setVisionRef(e.target.value)} />
          </div>
        )}

        {/* Customer */}
        <div>
          <label className="rh-label">Cliente</label>
          {selectedCustomer ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F8FAFC', borderRadius: 8 }}>
              <span style={{ flex: 1, fontWeight: 500 }}>
                {selectedCustomer.name} {selectedCustomer.phone && `· ${selectedCustomer.phone}`}
              </span>
              <button onClick={() => setSelectedCustomer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8886' }}>&times;</button>
            </div>
          ) : showNewCustomer ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: '#F8FAFC', borderRadius: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="rh-input" placeholder="Nombre *" style={{ flex: 1 }}
                  value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} />
                <input className="rh-input" placeholder="Teléfono" style={{ width: 160 }}
                  value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="rh-input" placeholder="WhatsApp" style={{ flex: 1 }}
                  value={newCustomer.whatsapp} onChange={(e) => setNewCustomer({ ...newCustomer, whatsapp: e.target.value })} />
                <input className="rh-input" placeholder="Ciudad" style={{ flex: 1 }}
                  value={newCustomer.city} onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })} />
              </div>
              <input className="rh-input" placeholder="Dirección"
                value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} />
              <button className="rh-btn rh-btn-secondary" onClick={() => { setShowNewCustomer(false); setNewCustomer({ name: '', phone: '', whatsapp: '', address: '', city: '', state: '' }); }}
                style={{ alignSelf: 'flex-start', fontSize: 13 }}>Cancelar</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input className="rh-input" placeholder="Buscar cliente..." value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)} />
                {filteredCustomers.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #E2E0DE', borderRadius: 8, maxHeight: 200, overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                    {filteredCustomers.map((c) => (
                      <div key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setCustomerPhone(c.phone ?? ''); setShippingAddress(c.address ?? ''); }}
                        style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 14, borderBottom: '1px solid #F1F5F9' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}>
                        <span style={{ fontWeight: 500 }}>{c.name}</span>
                        {c.phone && <span style={{ color: '#8A8886', marginLeft: 8 }}>{c.phone}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button className="rh-btn rh-btn-secondary" onClick={() => setShowNewCustomer(true)}>+ Nuevo</button>
            </div>
          )}
        </div>

        {/* Shipping info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label className="rh-label">Teléfono de contacto</label>
            <input className="rh-input" placeholder="+58 414-..." value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)} />
          </div>
          <div>
            <label className="rh-label">Dirección de envío</label>
            <input className="rh-input" placeholder="Dirección completa" value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)} />
          </div>
        </div>

        {/* Products */}
        <div>
          <label className="rh-label">Productos</label>
          <div style={{ position: 'relative' }}>
            <input className="rh-input" placeholder="Buscar producto o SKU..." value={productSearch}
              onChange={(e) => searchProducts(e.target.value)} />
            {productResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #E2E0DE', borderRadius: 8, maxHeight: 200, overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                {productResults.map((p) => (
                  <div key={p.id} onClick={() => addItem(p)}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 14, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}>
                    <div>
                      <span style={{ fontWeight: 500 }}>{p.name}</span>
                      <span style={{ color: '#8A8886', marginLeft: 8, fontSize: 12 }}>{p.sku}</span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: '#10B981' }}>${p.price.toFixed(2)}</span>
                      <span style={{ color: '#8A8886', marginLeft: 8, fontSize: 12 }}>Stock: {p.stock}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div style={{ marginTop: 8, border: '1px solid #E2E0DE', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>Producto</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#64748B', width: 80 }}>Qty</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#64748B', width: 80 }}>Precio</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#64748B', width: 90 }}>Subtotal</th>
                    <th style={{ width: 40 }}></th>
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
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <button onClick={() => removeItem(item.product.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D3010A', fontSize: 16 }}>&times;</button>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', padding: '8px 0' }}>
            <div style={{ display: 'flex', gap: 16, fontSize: 14 }}>
              <span style={{ color: '#64748B' }}>Subtotal:</span>
              <span style={{ fontWeight: 500 }}>${subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 14, alignItems: 'center' }}>
              <span style={{ color: '#64748B' }}>Envío:</span>
              <input type="number" min="0" step="0.01" value={shippingCost}
                onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                style={{ width: 80, textAlign: 'right', border: '1px solid #E2E0DE', borderRadius: 4, padding: '2px 8px' }} />
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 16, fontWeight: 700, borderTop: '1px solid #E2E0DE', paddingTop: 8, marginTop: 4 }}>
              <span>TOTAL:</span>
              <span style={{ color: '#D3010A' }}>${total.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="rh-label">Notas</label>
          <textarea className="rh-input" placeholder="Notas sobre el pedido..." rows={2}
            value={notes} onChange={(e) => setNotes(e.target.value)} style={{ resize: 'vertical' }} />
        </div>
      </div>
    </Modal>
  );
}
