import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { Modal } from '@/components/hub/shared/Modal.tsx';
import type { Customer, Product, Organization } from '@/lib/database.types.ts';

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
  const { isPlatformOwner } = usePermissions();

  // ── Step flow (Super Admin: 1→2→3, Regular users: always 2) ──
  const [step, setStep] = useState<1 | 2 | 3>(isPlatformOwner ? 1 : 2);
  // Sub-step within step 1: 'aggregator' = pick aggregator, 'store' = pick child store
  const [orgSubStep, setOrgSubStep] = useState<'aggregator' | 'store'>('aggregator');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [orgsLoading, setOrgsLoading] = useState(false);
  // Child organizations (stores/associates under the selected aggregator)
  const [childOrgs, setChildOrgs] = useState<Organization[]>([]);
  // Pre-loaded map: aggregatorId → child organizations
  const [childOrgMap, setChildOrgMap] = useState<Record<string, Organization[]>>({});
  // The final inventory org — either the aggregator itself or a child store
  const [inventoryOrg, setInventoryOrg] = useState<Organization | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [shippingCost, setShippingCost] = useState(0);
  const [saving, setSaving] = useState(false);

  const productDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const productSearchRef = useRef('');

  // Load organizations + pre-load child hierarchy for Super Admin (Step 1)
  useEffect(() => {
    if (open && isPlatformOwner) {
      setOrgsLoading(true);
      (async () => {
        // 1. Load aggregators
        const { data: aggregators } = await supabase
          .from('organizations')
          .select('*')
          .eq('type', 'aggregator')
          .eq('status', 'active')
          .order('name');

        const aggs = (aggregators as Organization[]) ?? [];
        setOrganizations(aggs);

        // 2. Pre-load child orgs for every aggregator via org_hierarchy + organizations
        const map: Record<string, Organization[]> = {};
        for (const agg of aggs) {
          const { data: hierarchy } = await supabase
            .from('org_hierarchy')
            .select('child_id')
            .eq('parent_id', agg.id);

          if (hierarchy && hierarchy.length > 0) {
            const childIds = hierarchy.map((h: { child_id: string }) => h.child_id);
            const { data: children } = await supabase
              .from('organizations')
              .select('*')
              .in('id', childIds)
              .eq('status', 'active')
              .order('name');

            if (children && children.length > 0) {
              map[agg.id] = children as Organization[];
            }
          }
        }
        setChildOrgMap(map);
        setOrgsLoading(false);
      })();
    }
  }, [open, isPlatformOwner]);

  // When an aggregator is selected — synchronous lookup from pre-loaded map
  const handleSelectAggregator = useCallback((org: Organization) => {
    setSelectedOrg(org);
    setInventoryOrg(null);

    const children = childOrgMap[org.id];
    if (children && children.length > 0) {
      setChildOrgs(children);
      setOrgSubStep('store');
    } else {
      // No children — use aggregator directly, skip to step 2
      setInventoryOrg(org);
      setStep(2);
    }
  }, [childOrgMap]);

  // When a child store is selected, set it as the inventory org and move to step 2
  const handleSelectStore = useCallback((store: Organization) => {
    setInventoryOrg(store);
    setStep(2);
  }, []);

  // Use aggregator itself (even if it has children) — user can pick the aggregator directly
  const handleUseAggregatorDirectly = useCallback(() => {
    if (selectedOrg) {
      setInventoryOrg(selectedOrg);
      setStep(2);
    }
  }, [selectedOrg]);

  // Load customers — filtered by inventoryOrg for Super Admin, by organization for regular users
  useEffect(() => {
    if (!open) return;
    // Super Admin: load customers after selecting inventory org (aggregator or child store)
    if (isPlatformOwner) {
      if (!inventoryOrg) return;
      supabase.from('customers').select('*').eq('org_id', inventoryOrg.id).order('name').then(({ data }) => {
        setCustomers((data as Customer[]) ?? []);
      });
    } else if (organization) {
      supabase.from('customers').select('*').eq('org_id', organization.id).order('name').then(({ data }) => {
        setCustomers((data as Customer[]) ?? []);
      });
    }
  }, [open, organization, isPlatformOwner, inventoryOrg]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setStep(isPlatformOwner ? 1 : 2);
      setOrgSubStep('aggregator');
      setSelectedOrg(null);
      setChildOrgs([]);
      setChildOrgMap({});
      setInventoryOrg(null);
      setSelectedCustomer(null);
      setShowNewCustomer(false);
      setNewCustomerName('');
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
  }, [open, isPlatformOwner]);

  // Debounced product search
  const searchProducts = useCallback((query: string) => {
    setProductSearch(query);
    productSearchRef.current = query;

    if (productDebounceRef.current) clearTimeout(productDebounceRef.current);

    if (query.length < 2) {
      setProductResults([]);
      setProductLoading(false);
      return;
    }

    setProductLoading(true);

    productDebounceRef.current = setTimeout(async () => {
      if (productSearchRef.current !== query) return;

      // IMPORTANTE: Siempre filtrar por org_id.
      // Super Admin filtra por selectedOrg. Usuarios regulares por su organization.
      let q = supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .gt('stock', 0)
        .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
        .limit(10);

      if (isPlatformOwner && inventoryOrg) {
        q = q.eq('org_id', inventoryOrg.id);
      } else if (!isPlatformOwner && organization) {
        q = q.eq('org_id', organization.id);
      }

      const { data, error } = await q;
      if (error) console.error('Product search error:', error);

      if (productSearchRef.current === query) {
        setProductResults((data as Product[]) ?? []);
        setProductLoading(false);
      }
    }, 200);
  }, [organization, isPlatformOwner, inventoryOrg]);

  useEffect(() => {
    return () => { if (productDebounceRef.current) clearTimeout(productDebounceRef.current); };
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
    if (qty <= 0) setItems(items.filter((i) => i.product.id !== productId));
    else setItems(items.map((i) => i.product.id === productId ? { ...i, quantity: qty } : i));
  };

  const removeItem = (productId: string) => {
    setItems(items.filter((i) => i.product.id !== productId));
  };

  const subtotal = items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);
  const total = subtotal + shippingCost;

  const filteredCustomers = customerSearch.length >= 2
    ? customers.filter((c) =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone?.includes(customerSearch) ||
        c.rif?.includes(customerSearch)
      )
    : [];

  // Go back to org selection (clear cart to avoid mixing inventories)
  const goBackToOrgSelection = () => {
    setStep(1);
    setOrgSubStep('aggregator');
    setSelectedOrg(null);
    setChildOrgs([]);
    setInventoryOrg(null);
    setItems([]);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setCustomerPhone('');
    setShippingAddress('');
    setShowNewCustomer(false);
    setNewCustomerName('');
    setProductSearch('');
    setProductResults([]);
    setNotes('');
    setShippingCost(0);
  };

  const handleSave = async (asDraft: boolean) => {
    if (!profile) return;
    if (items.length === 0) return;
    setSaving(true);

    try {
      // Determine org_id: Super Admin uses inventoryOrg (selected store/aggregator), regular users use their organization
      const orderOrgId = isPlatformOwner && inventoryOrg
        ? inventoryOrg.id
        : organization!.id;

      let customerId = selectedCustomer?.id ?? null;

      if (showNewCustomer && newCustomerName) {
        const { data: newC } = await supabase.from('customers').insert({
          org_id: orderOrgId,
          name: newCustomerName,
          phone: customerPhone || null,
        }).select().single();
        if (newC) customerId = newC.id;
      }

      // Generar número de orden secuencial: RH-00001, RH-00002, ...
      const { count: orderCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });
      const seq = (orderCount ?? 0) + 1;
      const orderNumber = `RH-${String(seq).padStart(5, '0')}`;

      const { data: order, error } = await supabase.from('orders').insert({
        org_id: orderOrgId,
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
        customer_phone: customerPhone || selectedCustomer?.phone || null,
        confirmed_at: asDraft ? null : new Date().toISOString(),
      }).select().single();

      if (error || !order) {
        console.error('Error creating order:', error);
        setSaving(false);
        return;
      }

      const orderItems = items.map((i) => ({
        order_id: order.id,
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: Number(i.product.price),
        total: Number(i.product.price) * i.quantity,
      }));

      await supabase.from('order_items').insert(orderItems);

      await supabase.from('order_status_history').insert({
        order_id: order.id,
        org_id: orderOrgId,
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

  // ── Dynamic modal title ──
  const modalTitle = isPlatformOwner
    ? step === 1
      ? orgSubStep === 'aggregator'
        ? 'Nueva Orden — Seleccionar Agregador'
        : 'Nueva Orden — Seleccionar Tienda'
    : step === 3 ? 'Nueva Orden — Confirmar Datos'
    : 'Nueva Orden'
    : 'Nueva Orden';

  // ── Dynamic modal footer ──
  const modalFooter = (() => {
    // Step 1: Org selection (two sub-steps)
    if (isPlatformOwner && step === 1) {
      return (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {orgSubStep === 'store' && (
            <button className="rh-btn rh-btn-secondary" onClick={() => { setOrgSubStep('aggregator'); setSelectedOrg(null); setChildOrgs([]); setInventoryOrg(null); }}
              style={{ marginRight: 'auto' }}>
              ← Cambiar agregador
            </button>
          )}
          <button className="rh-btn rh-btn-secondary" onClick={onClose}>Cancelar</button>
        </div>
      );
    }

    // Step 3: Confirmation
    if (isPlatformOwner && step === 3) {
      return (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="rh-btn rh-btn-secondary" onClick={() => setStep(2)}>Volver a editar</button>
          <button className="rh-btn rh-btn-primary" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? 'Guardando...' : 'Confirmar y crear orden'}
          </button>
        </div>
      );
    }

    // Step 2: Order form
    return (
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {isPlatformOwner && (
          <button className="rh-btn rh-btn-secondary" onClick={goBackToOrgSelection} style={{ marginRight: 'auto' }}>
            ← Cambiar inventario
          </button>
        )}
        <button className="rh-btn rh-btn-secondary" onClick={() => handleSave(true)} disabled={saving || items.length === 0}>
          Guardar como borrador
        </button>
        {isPlatformOwner ? (
          <button className="rh-btn rh-btn-primary" onClick={() => setStep(3)} disabled={items.length === 0}>
            Revisar orden →
          </button>
        ) : (
          <button className="rh-btn rh-btn-primary" onClick={() => handleSave(false)} disabled={saving || items.length === 0}>
            {saving ? 'Guardando...' : 'Confirmar orden'}
          </button>
        )}
      </div>
    );
  })();

  return (
    <Modal open={open} onClose={onClose} title={modalTitle} width="640px" footer={modalFooter}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ═══════════════════════════════════════════════════════════════
            PASO 1: Seleccionar Organización (Solo Super Admin)
           ═══════════════════════════════════════════════════════════════ */}
        {isPlatformOwner && step === 1 && (
          <div>
            {/* Sub-step indicator */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: orgSubStep === 'aggregator' ? '#D3010A' : '#E2E8F0',
                color: orgSubStep === 'aggregator' ? '#fff' : '#64748B',
              }}>
                1. Agregador
              </div>
              <span style={{ color: '#CBD5E1' }}>→</span>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: orgSubStep === 'store' ? '#D3010A' : '#E2E8F0',
                color: orgSubStep === 'store' ? '#fff' : '#64748B',
              }}>
                2. Tienda
              </div>
            </div>

            {/* Sub-step A: Select Aggregator */}
            {orgSubStep === 'aggregator' && (
              <>
                <p style={{ fontSize: 14, color: '#64748B', marginBottom: 16 }}>
                  Selecciona el agregador de cuyo inventario se descontarán los productos.
                </p>
                {orgsLoading ? (
                  <p style={{ textAlign: 'center', color: '#94A3B8', padding: 20 }}>Cargando agregadores...</p>
                ) : organizations.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#94A3B8', padding: 20 }}>No hay agregadores activos</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {organizations.map((org) => (
                      <div key={org.id} onClick={() => handleSelectAggregator(org)}
                        style={{
                          padding: '14px 18px', borderRadius: 10, cursor: 'pointer',
                          border: '1px solid #E2E0DE', background: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#D3010A'; e.currentTarget.style.background = '#FEF2F2'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E0DE'; e.currentTarget.style.background = '#fff'; }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 15, color: '#1E293B' }}>{org.name}</div>
                          <div style={{ fontSize: 12, color: '#8A8886', marginTop: 2 }}>
                            Agregador{org.rif && ` · RIF: ${org.rif}`}
                          </div>
                        </div>
                        <span style={{ color: '#94A3B8', fontSize: 18 }}>→</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Sub-step B: Select Store / Child */}
            {orgSubStep === 'store' && (
              <>
                {/* Selected aggregator badge */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px', borderRadius: 8, marginBottom: 16,
                  background: '#F1F5F9', border: '1px solid #E2E8F0',
                }}>
                  <span style={{ fontSize: 14 }}>🏢</span>
                  <span style={{ fontSize: 13, color: '#475569' }}>Agregador:</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>{selectedOrg?.name}</span>
                </div>

                <p style={{ fontSize: 14, color: '#64748B', marginBottom: 16 }}>
                  ¿De qué tienda deseas descontar el inventario?
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Option: Use the aggregator directly */}
                    <div onClick={handleUseAggregatorDirectly}
                      style={{
                        padding: '14px 18px', borderRadius: 10, cursor: 'pointer',
                        border: '1px solid #E2E0DE', background: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#D3010A'; e.currentTarget.style.background = '#FEF2F2'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E0DE'; e.currentTarget.style.background = '#fff'; }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: '#1E293B' }}>
                          {selectedOrg?.name}
                          <span style={{ fontWeight: 400, fontSize: 12, color: '#8A8886', marginLeft: 8 }}>(inventario del agregador)</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#8A8886', marginTop: 2 }}>
                          Agregador{selectedOrg?.rif && ` · RIF: ${selectedOrg.rif}`}
                        </div>
                      </div>
                      <span style={{ color: '#94A3B8', fontSize: 18 }}>→</span>
                    </div>

                    {/* Child stores */}
                    {childOrgs.map((store) => (
                      <div key={store.id} onClick={() => handleSelectStore(store)}
                        style={{
                          padding: '14px 18px', borderRadius: 10, cursor: 'pointer',
                          border: '1px solid #E2E0DE', background: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#D3010A'; e.currentTarget.style.background = '#FEF2F2'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E0DE'; e.currentTarget.style.background = '#fff'; }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 15, color: '#1E293B' }}>{store.name}</div>
                          <div style={{ fontSize: 12, color: '#8A8886', marginTop: 2 }}>
                            Tienda asociada{store.rif && ` · RIF: ${store.rif}`}
                          </div>
                        </div>
                        <span style={{ color: '#94A3B8', fontSize: 18 }}>→</span>
                      </div>
                    ))}
                  </div>
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            PASO 2: Formulario de Orden
           ═══════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <>
            {/* Banner de organización seleccionada (Solo Super Admin) */}
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
                <button onClick={goBackToOrgSelection}
                  style={{ fontSize: 12, color: '#D3010A', background: 'none', border: '1px solid rgba(211,1,10,0.3)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                  Cambiar
                </button>
              </div>
            )}

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
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="rh-input" placeholder="Nombre del nuevo cliente *" style={{ flex: 1 }}
                    value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} autoFocus />
                  <button className="rh-btn rh-btn-secondary" onClick={() => { setShowNewCustomer(false); setNewCustomerName(''); }}
                    style={{ fontSize: 12, padding: '6px 12px', whiteSpace: 'nowrap' }}>Cancelar</button>
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
                            <div style={{ fontWeight: 500 }}>{item.product.name}</div>
                            <div style={{ fontSize: 12, color: '#8A8886' }}>{item.product.sku}</div>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <input type="number" min="1" max={item.product.stock} value={item.quantity}
                              onChange={(e) => updateQty(item.product.id, parseInt(e.target.value) || 1)}
                              style={{ width: 50, textAlign: 'center', border: '1px solid #E2E0DE', borderRadius: 4, padding: '2px 4px' }} />
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>${Number(item.product.price).toFixed(2)}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                            ${(Number(item.product.price) * item.quantity).toFixed(2)}
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
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            PASO 3: Confirmación (Solo Super Admin)
           ═══════════════════════════════════════════════════════════════ */}
        {isPlatformOwner && step === 3 && (
          <div>
            {/* Warning banner */}
            <div style={{
              padding: '12px 16px', background: '#FFFBEB', borderRadius: 8,
              border: '1px solid #FDE68A', marginBottom: 20, fontSize: 13, color: '#92400E',
            }}>
              ⚠️ Revisa los datos antes de confirmar. Los productos se descontarán del inventario
              de <strong>{inventoryOrg?.name}</strong>.
            </div>

            {/* Organización */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8A8886', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                Organización / Tienda
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#D3010A' }}>
                🏢 {inventoryOrg?.name}
              </div>
              <div style={{ fontSize: 12, color: '#64748B' }}>
                {inventoryOrg?.type === 'aggregator' ? 'Agregador' : 'Asociado'}
                {selectedOrg && inventoryOrg?.id !== selectedOrg.id && ` · Agregador: ${selectedOrg.name}`}
                {inventoryOrg?.rif && ` · RIF: ${inventoryOrg.rif}`}
              </div>
            </div>

            {/* Cliente */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8A8886', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                Cliente
              </div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>
                {selectedCustomer?.name
                  ?? (showNewCustomer && newCustomerName ? `${newCustomerName} (nuevo)` : null)
                  ?? (customerPhone ? `Cliente: ${customerPhone}` : null)
                  ?? <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Sin cliente registrado</span>}
              </div>
              {customerPhone && <div style={{ fontSize: 13, color: '#64748B' }}>📞 {customerPhone}</div>}
              {shippingAddress && <div style={{ fontSize: 13, color: '#64748B', wordBreak: 'break-all' }}>📍 {shippingAddress}</div>}
            </div>

            {/* Productos */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8A8886', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                Productos ({items.length})
              </div>
              <div style={{ border: '1px solid #E2E0DE', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>Producto</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#64748B', width: 50 }}>Qty</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#64748B', width: 90 }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.product.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ fontWeight: 500 }}>{item.product.name}</div>
                          <div style={{ fontSize: 11, color: '#8A8886' }}>SKU: {item.product.sku}</div>
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                          ${(Number(item.product.price) * item.quantity).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totales */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', gap: 16, fontSize: 14 }}>
                <span style={{ color: '#64748B' }}>Subtotal:</span>
                <span style={{ fontWeight: 500, minWidth: 70, textAlign: 'right' }}>${subtotal.toFixed(2)}</span>
              </div>
              {shippingCost > 0 && (
                <div style={{ display: 'flex', gap: 16, fontSize: 14 }}>
                  <span style={{ color: '#64748B' }}>Envío:</span>
                  <span style={{ fontWeight: 500, minWidth: 70, textAlign: 'right' }}>${shippingCost.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 16, fontSize: 16, fontWeight: 700, borderTop: '2px solid #E2E0DE', paddingTop: 8, marginTop: 4 }}>
                <span>TOTAL:</span>
                <span style={{ color: '#D3010A', minWidth: 70, textAlign: 'right' }}>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Notas */}
            {notes && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#8A8886', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                  Notas
                </div>
                <div style={{ fontSize: 13, color: '#475569' }}>{notes}</div>
              </div>
            )}
          </div>
        )}

      </div>

      <style>{`
        @keyframes spin {
          to { transform: translateY(-50%) rotate(360deg); }
        }
      `}</style>
    </Modal>
  );
}
