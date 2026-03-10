import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { Modal } from '@/components/hub/shared/Modal.tsx';
import type { Customer, Product, Organization, Order } from '@/lib/database.types.ts';
import type { Warehouse } from '@/types/warehouse.ts';
import { reserveOrderStock } from '@/services/orderService.ts';
import { createPickListForOrder } from '@/services/pickingService.ts';

import { OrgSelectionStep } from './create/OrgSelectionStep.tsx';
import { OrderFormStep } from './create/OrderFormStep.tsx';
import { OrderConfirmStep } from './create/OrderConfirmStep.tsx';
import type { OrderItem, EditOrderItem } from './create/types.ts';

interface OrderCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  editOrder?: Order | null;
  editItems?: EditOrderItem[];
}

export function OrderCreateModal({ open, onClose, onCreated, editOrder, editItems }: OrderCreateModalProps) {
  const profile = useAuthStore((s) => s.profile);
  const organization = useAuthStore((s) => s.organization);
  const { isPlatformOwner, isAggregator } = usePermissions();
  const isEditMode = Boolean(editOrder);
  const needsOrgStep = isPlatformOwner || isAggregator;

  // Step flow
  const [step, setStep] = useState<1 | 2 | 3>(needsOrgStep ? 1 : 2);
  const [orgSubStep, setOrgSubStep] = useState<'aggregator' | 'store' | 'associate' | 'warehouse'>('aggregator');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [childOrgs, setChildOrgs] = useState<Organization[]>([]);
  const [childOrgMap, setChildOrgMap] = useState<Record<string, Organization[]>>({});
  const [inventoryOrg, setInventoryOrg] = useState<Organization | null>(null);

  // Aggregator-specific: warehouse selection
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
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

  // ── Load organizations for Super Admin ──
  useEffect(() => {
    if (open && isPlatformOwner) {
      setOrgsLoading(true);
      (async () => {
        const { data: aggregators } = await supabase
          .from('organizations').select('*').eq('type', 'aggregator').eq('status', 'active').order('name');

        const aggs = (aggregators as Organization[]) ?? [];
        setOrganizations(aggs);

        const map: Record<string, Organization[]> = {};
        for (const agg of aggs) {
          const { data: hierarchy } = await supabase
            .from('org_hierarchy').select('child_id').eq('parent_id', agg.id);
          if (hierarchy && hierarchy.length > 0) {
            const childIds = hierarchy.map((h: { child_id: string }) => h.child_id);
            const { data: children } = await supabase
              .from('organizations').select('*').in('id', childIds).eq('status', 'active').order('name');
            if (children && children.length > 0) map[agg.id] = children as Organization[];
          }
        }
        setChildOrgMap(map);
        setOrgsLoading(false);
      })();
    }
  }, [open, isPlatformOwner]);

  // ── Load associates + warehouses for Aggregator ──
  useEffect(() => {
    if (open && isAggregator && organization) {
      setOrgsLoading(true);
      (async () => {
        // Load child orgs (associates/stores)
        const { data: hierarchy } = await supabase
          .from('org_hierarchy').select('child_id').eq('parent_id', organization.id);
        if (hierarchy && hierarchy.length > 0) {
          const childIds = hierarchy.map((h: { child_id: string }) => h.child_id);
          const { data: children } = await supabase
            .from('organizations').select('*').in('id', childIds).eq('status', 'active').order('name');
          setChildOrgs((children as Organization[]) ?? []);
        }
        // Load warehouses for this aggregator
        const { data: wh } = await supabase
          .from('warehouses').select('*').eq('org_id', organization.id).eq('is_active', true).order('name');
        setWarehouses((wh as Warehouse[]) ?? []);
        setOrgsLoading(false);
      })();
    }
  }, [open, isAggregator, organization]);

  // ── Load warehouses for associates (non-aggregator, non-platform) ──
  useEffect(() => {
    if (open && !isPlatformOwner && !isAggregator && organization) {
      supabase
        .from('warehouses').select('*').eq('org_id', organization.id).eq('is_active', true).order('name')
        .then(({ data }) => {
          const whs = (data as Warehouse[]) ?? [];
          setWarehouses(whs);
          // Auto-select if only one warehouse
          if (whs.length === 1) setSelectedWarehouse(whs[0]);
        });
    }
  }, [open, isPlatformOwner, isAggregator, organization]);

  // ── Load warehouses for platform owners after org selection ──
  useEffect(() => {
    if (open && isPlatformOwner && inventoryOrg) {
      supabase
        .from('warehouses').select('*').eq('org_id', inventoryOrg.id).eq('is_active', true).order('name')
        .then(({ data }) => {
          const whs = (data as Warehouse[]) ?? [];
          setWarehouses(whs);
          if (whs.length === 1) setSelectedWarehouse(whs[0]);
        });
    }
  }, [open, isPlatformOwner, inventoryOrg]);

  // ── Org selection handlers ──
  const handleSelectAggregator = useCallback((org: Organization) => {
    setSelectedOrg(org);
    setInventoryOrg(null);
    const children = childOrgMap[org.id];
    if (children && children.length > 0) { setChildOrgs(children); setOrgSubStep('store'); }
    else { setInventoryOrg(org); setStep(2); }
  }, [childOrgMap]);

  const handleSelectStore = useCallback((store: Organization) => { setInventoryOrg(store); setStep(2); }, []);

  const handleUseAggregatorDirectly = useCallback(() => {
    if (selectedOrg) { setInventoryOrg(selectedOrg); setStep(2); }
  }, [selectedOrg]);

  // ── Aggregator flow handlers ──
  const handleSelectAssociate = useCallback((associate: Organization) => {
    setSelectedOrg(associate);
    setInventoryOrg(associate);
    setOrgSubStep('warehouse');
  }, []);

  const handleSelectWarehouse = useCallback((wh: Warehouse) => {
    setSelectedWarehouse(wh);
    setStep(2);
  }, []);

  // ── Load customers ──
  useEffect(() => {
    if (!open) return;
    if (isPlatformOwner) {
      if (!inventoryOrg) return;
      supabase.from('customers').select('*').eq('org_id', inventoryOrg.id).order('name').then(({ data }) => {
        setCustomers((data as Customer[]) ?? []);
      });
    } else if (isAggregator && organization) {
      // For aggregator: load customers from the aggregator's own org
      supabase.from('customers').select('*').eq('org_id', organization.id).order('name').then(({ data }) => {
        setCustomers((data as Customer[]) ?? []);
      });
    } else if (organization) {
      supabase.from('customers').select('*').eq('org_id', organization.id).order('name').then(({ data }) => {
        setCustomers((data as Customer[]) ?? []);
      });
    }
  }, [open, organization, isPlatformOwner, isAggregator, inventoryOrg]);

  // ── Reset form on close ──
  useEffect(() => {
    if (!open) {
      setStep(needsOrgStep ? 1 : 2);
      setOrgSubStep(isAggregator ? 'associate' : 'aggregator');
      setSelectedOrg(null); setChildOrgs([]); setChildOrgMap({}); setInventoryOrg(null);
      setSelectedWarehouse(null);
      setSelectedCustomer(null); setShowNewCustomer(false); setNewCustomerName('');
      setShippingAddress(''); setDeliveryLat(null); setDeliveryLng(null);
      setCustomerPhone(''); setCustomerSearch('');
      setProductSearch(''); setProductResults([]); setProductLoading(false);
      setItems([]); setNotes(''); setShippingCost(0);
    }
  }, [open, needsOrgStep, isAggregator]);

  // ── Init edit mode ──
  useEffect(() => {
    if (!open || !editOrder || !editItems) return;
    const initEdit = async () => {
      setStep(2);
      if (isPlatformOwner) {
        const { data: orderOrg } = await supabase.from('organizations').select('*').eq('id', editOrder.org_id).single();
        if (orderOrg) { setSelectedOrg(orderOrg as Organization); setInventoryOrg(orderOrg as Organization); }
      }
      if (editOrder.customer_id) {
        const { data: cust } = await supabase.from('customers').select('*').eq('id', editOrder.customer_id).single();
        if (cust) setSelectedCustomer(cust as Customer);
      }
      setCustomerPhone(editOrder.customer_phone ?? '');
      setShippingAddress((editOrder.shipping_address as Record<string, string> | null)?.address ?? '');
      setDeliveryLat(editOrder.delivery_latitude ?? null);
      setDeliveryLng(editOrder.delivery_longitude ?? null);
      setNotes(editOrder.notes ?? '');
      setShippingCost(Math.max(0, Number(editOrder.total) - Number(editOrder.subtotal)));

      const productIds = editItems.map((i) => i.product_id);
      if (productIds.length > 0) {
        const { data: products } = await supabase.from('products').select('*').in('id', productIds);
        if (products) {
          const productMap = new Map((products as Product[]).map((p) => [p.id, p]));
          setItems(
            editItems
              .map((item) => { const product = productMap.get(item.product_id); return product ? { product, quantity: item.quantity } : null; })
              .filter((item): item is OrderItem => item !== null)
          );
        }
      }
    };
    initEdit();
  }, [open, editOrder, editItems, isPlatformOwner]);

  // ── Product search ──
  const searchProducts = useCallback((query: string) => {
    setProductSearch(query);
    productSearchRef.current = query;
    if (productDebounceRef.current) clearTimeout(productDebounceRef.current);
    if (query.length < 2) { setProductResults([]); setProductLoading(false); return; }
    setProductLoading(true);
    productDebounceRef.current = setTimeout(async () => {
      if (productSearchRef.current !== query) return;

      if (isAggregator && selectedWarehouse) {
        // Aggregator flow: search products from warehouse's inventory_stock
        const { data: stockRows, error } = await supabase
          .from('inventory_stock')
          .select('product_id, quantity, reserved_quantity, product:products!inner(*)')
          .eq('warehouse_id', selectedWarehouse.id)
          .gt('quantity', 0)
          .limit(30);
        if (error) { console.error('Product search error:', error); }
        if (productSearchRef.current === query) {
          // Client-side filter by query + deduplicate by product_id (sum quantities)
          const productMap = new Map<string, Product & { warehouseQty: number }>();
          for (const row of (stockRows ?? []) as unknown as { product_id: string; quantity: number; reserved_quantity: number; product: Product }[]) {
            const p = row.product;
            if (!p) continue;
            const q2 = query.toLowerCase();
            const nameMatch = p.name?.toLowerCase().includes(q2);
            const skuMatch = p.sku?.toLowerCase().includes(q2);
            if (!nameMatch && !skuMatch) continue;
            const existing = productMap.get(p.id);
            const available = row.quantity - row.reserved_quantity;
            if (existing) {
              existing.warehouseQty += available;
              existing.stock = existing.warehouseQty;
            } else {
              productMap.set(p.id, { ...p, stock: available, warehouseQty: available });
            }
          }
          const results = Array.from(productMap.values()).filter((p) => p.warehouseQty > 0).slice(0, 10);
          setProductResults(results);
          setProductLoading(false);
        }
      } else {
        // Platform / Store flow: search products table directly
        let q = supabase.from('products').select('*').eq('status', 'active').gt('stock', 0)
          .or(`name.ilike.%${query}%,sku.ilike.%${query}%`).limit(10);
        if (isPlatformOwner && inventoryOrg) q = q.eq('org_id', inventoryOrg.id);
        else if (!isPlatformOwner && organization) q = q.eq('org_id', organization.id);
        const { data, error } = await q;
        if (error) console.error('Product search error:', error);
        if (productSearchRef.current === query) { setProductResults((data as Product[]) ?? []); setProductLoading(false); }
      }
    }, 200);
  }, [organization, isPlatformOwner, isAggregator, inventoryOrg, selectedWarehouse]);

  useEffect(() => { return () => { if (productDebounceRef.current) clearTimeout(productDebounceRef.current); }; }, []);

  // ── Item management ──
  const addItem = (product: Product) => {
    const existing = items.find((i) => i.product.id === product.id);
    if (existing) setItems(items.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    else setItems([...items, { product, quantity: 1 }]);
    setProductSearch(''); setProductResults([]); setProductLoading(false);
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) setItems(items.filter((i) => i.product.id !== productId));
    else setItems(items.map((i) => i.product.id === productId ? { ...i, quantity: qty } : i));
  };

  const removeItem = (productId: string) => setItems(items.filter((i) => i.product.id !== productId));

  const subtotal = items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);
  const total = subtotal + shippingCost;

  // ── Go back to org selection ──
  const goBackToOrgSelection = () => {
    setStep(1); setOrgSubStep(isAggregator ? 'associate' : 'aggregator');
    setSelectedOrg(null); setChildOrgs(isAggregator ? childOrgs : []); setInventoryOrg(null);
    setSelectedWarehouse(null);
    setItems([]); setSelectedCustomer(null); setCustomerSearch('');
    setCustomerPhone(''); setShippingAddress(''); setDeliveryLat(null); setDeliveryLng(null);
    setShowNewCustomer(false); setNewCustomerName('');
    setProductSearch(''); setProductResults([]); setNotes(''); setShippingCost(0);
  };

  // ── Save handler ──
  const handleSave = async (asDraft: boolean) => {
    if (!profile || items.length === 0) return;
    setSaving(true);

    try {
      const orderOrgId = isEditMode && editOrder ? editOrder.org_id
        : (isPlatformOwner || isAggregator) && inventoryOrg ? inventoryOrg.id : organization!.id;

      let customerId = selectedCustomer?.id ?? null;
      if (showNewCustomer && newCustomerName) {
        // New customers belong to the aggregator's own org, not the associate's
        const customerOrgId = isAggregator && organization ? organization.id : orderOrgId;
        const { data: newC } = await supabase.from('customers').insert({
          org_id: customerOrgId, name: newCustomerName, phone: customerPhone || null,
        }).select().single();
        if (newC) customerId = newC.id;
      }

      if (isEditMode && editOrder) {
        const { error } = await supabase.from('orders').update({
          customer_id: customerId, subtotal, total, notes: notes || null,
          shipping_address: shippingAddress ? { address: shippingAddress } : null,
          delivery_latitude: deliveryLat, delivery_longitude: deliveryLng,
          customer_phone: customerPhone || selectedCustomer?.phone || null,
        }).eq('id', editOrder.id);
        if (error) { console.error('Error updating order:', error); setSaving(false); return; }

        await supabase.from('order_items').delete().eq('order_id', editOrder.id);
        await supabase.from('order_items').insert(
          items.map((i) => ({
            order_id: editOrder.id, product_id: i.product.id,
            quantity: i.quantity, unit_price: Number(i.product.price),
            total: Number(i.product.price) * i.quantity,
          }))
        );
        await supabase.from('order_status_history').insert({
          order_id: editOrder.id, org_id: orderOrgId,
          from_status: editOrder.status, to_status: editOrder.status,
          changed_by: profile.id, note: 'Orden editada', metadata: { action: 'edit' },
        });
        onCreated(); onClose(); return;
      }

      // CREATE MODE
      const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
      const orderNumber = `RH-${String((orderCount ?? 0) + 1).padStart(5, '0')}`;

      const { data: order, error } = await supabase.from('orders').insert({
        org_id: orderOrgId, customer_id: customerId, order_number: orderNumber,
        status: asDraft ? 'draft' : 'confirmed', subtotal, tax: 0, discount: 0, total,
        notes: notes || null, created_by: profile.id, source: 'manual',
        shipping_address: shippingAddress ? { address: shippingAddress } : null,
        delivery_latitude: deliveryLat, delivery_longitude: deliveryLng,
        customer_phone: customerPhone || selectedCustomer?.phone || null,
        confirmed_at: asDraft ? null : new Date().toISOString(),
        warehouse_id: selectedWarehouse?.id ?? null,
      }).select().single();

      if (error || !order) { console.error('Error creating order:', error); setSaving(false); return; }

      await supabase.from('order_items').insert(
        items.map((i) => ({
          order_id: order.id, product_id: i.product.id,
          quantity: i.quantity, unit_price: Number(i.product.price),
          total: Number(i.product.price) * i.quantity,
        }))
      );
      await supabase.from('order_status_history').insert({
        order_id: order.id, org_id: orderOrgId,
        from_status: null, to_status: asDraft ? 'draft' : 'confirmed',
        changed_by: profile.id,
        note: asDraft ? 'Orden creada como borrador' : 'Orden creada y confirmada',
        metadata: { source: 'manual' },
      });

      // Reserve stock for confirmed orders with a warehouse
      if (!asDraft && selectedWarehouse) {
        try {
          const reserveResult = await reserveOrderStock(order.id, selectedWarehouse.id);
          if (!reserveResult?.success) {
            // Rollback: delete the order if reservation fails
            await supabase.from('order_status_history').delete().eq('order_id', order.id);
            await supabase.from('order_items').delete().eq('order_id', order.id);
            await supabase.from('orders').delete().eq('id', order.id);
            alert(`Error al reservar stock: ${reserveResult?.error ?? 'Stock insuficiente'}`);
            setSaving(false);
            return;
          }

          // Auto-create pick list (non-fatal if it fails)
          try {
            await createPickListForOrder(order.id, selectedWarehouse.id);
          } catch (pickErr) {
            console.error('Pick list auto-creation failed:', pickErr);
          }
        } catch (reserveErr: unknown) {
          // Rollback on exception
          await supabase.from('order_status_history').delete().eq('order_id', order.id);
          await supabase.from('order_items').delete().eq('order_id', order.id);
          await supabase.from('orders').delete().eq('id', order.id);
          const msg = reserveErr instanceof Error ? reserveErr.message : 'Error desconocido';
          alert(`Error al reservar stock: ${msg}`);
          setSaving(false);
          return;
        }
      }

      onCreated(); onClose();
    } catch (err) { console.error('Error creating order:', err); }
    finally { setSaving(false); }
  };

  // ── Modal title ──
  const modalTitle = (() => {
    if (isEditMode) {
      return step === 3 ? `Editar Orden ${editOrder?.order_number} — Confirmar` : `Editar Orden ${editOrder?.order_number}`;
    }
    if (step === 1) {
      if (isPlatformOwner) {
        return orgSubStep === 'aggregator' ? 'Nueva Orden — Seleccionar Agregador' : 'Nueva Orden — Seleccionar Tienda';
      }
      if (isAggregator) {
        return orgSubStep === 'associate' ? 'Nueva Orden — Seleccionar Asociado' : 'Nueva Orden — Seleccionar Almacén';
      }
    }
    if (step === 3) return 'Nueva Orden — Confirmar Datos';
    return 'Nueva Orden';
  })();

  // ── Modal footer ──
  const modalFooter = (() => {
    if (step === 1) {
      if (isPlatformOwner) {
        return (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {orgSubStep === 'store' && (
              <button className="rh-btn rh-btn-secondary" onClick={() => { setOrgSubStep('aggregator'); setSelectedOrg(null); setChildOrgs([]); setInventoryOrg(null); }}
                style={{ marginRight: 'auto' }}>← Cambiar agregador</button>
            )}
            <button className="rh-btn rh-btn-secondary" onClick={onClose}>Cancelar</button>
          </div>
        );
      }
      if (isAggregator) {
        return (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {orgSubStep === 'warehouse' && (
              <button className="rh-btn rh-btn-secondary" onClick={() => { setOrgSubStep('associate'); setSelectedOrg(null); setInventoryOrg(null); setSelectedWarehouse(null); }}
                style={{ marginRight: 'auto' }}>← Cambiar asociado</button>
            )}
            <button className="rh-btn rh-btn-secondary" onClick={onClose}>Cancelar</button>
          </div>
        );
      }
    }
    if (step === 3) {
      return (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="rh-btn rh-btn-secondary" onClick={() => setStep(2)}>Volver a editar</button>
          <button className="rh-btn rh-btn-primary" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? 'Guardando...' : isEditMode ? 'Guardar cambios' : 'Confirmar y crear orden'}
          </button>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {!isEditMode && needsOrgStep && (
          <button className="rh-btn rh-btn-secondary" onClick={goBackToOrgSelection} style={{ marginRight: 'auto' }}>← Cambiar selección</button>
        )}
        {!isEditMode && (
          <button className="rh-btn rh-btn-secondary" onClick={() => handleSave(true)} disabled={saving || items.length === 0}>
            Guardar como borrador
          </button>
        )}
        {isEditMode ? (
          needsOrgStep ? (
            <button className="rh-btn rh-btn-primary" onClick={() => setStep(3)} disabled={items.length === 0}>Revisar cambios →</button>
          ) : (
            <button className="rh-btn rh-btn-primary" onClick={() => handleSave(false)} disabled={saving || items.length === 0}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          )
        ) : needsOrgStep ? (
          <button className="rh-btn rh-btn-primary" onClick={() => setStep(3)} disabled={items.length === 0}>Revisar orden →</button>
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
        {step === 1 && isPlatformOwner && (
          <OrgSelectionStep
            mode="platform"
            orgSubStep={orgSubStep} organizations={organizations} orgsLoading={orgsLoading}
            selectedOrg={selectedOrg} childOrgs={childOrgs}
            onSelectAggregator={handleSelectAggregator} onSelectStore={handleSelectStore}
            onUseAggregatorDirectly={handleUseAggregatorDirectly}
          />
        )}

        {step === 1 && isAggregator && (
          <OrgSelectionStep
            mode="aggregator"
            orgSubStep={orgSubStep} orgsLoading={orgsLoading}
            selectedOrg={selectedOrg} childOrgs={childOrgs}
            warehouses={warehouses}
            onSelectAssociate={handleSelectAssociate}
            onSelectWarehouse={handleSelectWarehouse}
          />
        )}

        {step === 2 && (
          <OrderFormStep
            isPlatformOwner={isPlatformOwner} isEditMode={isEditMode}
            isAggregator={isAggregator}
            inventoryOrg={inventoryOrg} selectedOrg={selectedOrg}
            selectedWarehouse={selectedWarehouse}
            warehouses={warehouses}
            onWarehouseChange={setSelectedWarehouse}
            customers={customers} customerSearch={customerSearch}
            selectedCustomer={selectedCustomer} showNewCustomer={showNewCustomer}
            newCustomerName={newCustomerName} customerPhone={customerPhone}
            shippingAddress={shippingAddress}
            productSearch={productSearch} productResults={productResults}
            productLoading={productLoading} items={items}
            notes={notes} shippingCost={shippingCost} subtotal={subtotal} total={total}
            onCustomerSearch={setCustomerSearch}
            onSelectCustomer={(c) => { setSelectedCustomer(c); setCustomerSearch(''); setCustomerPhone(c.phone ?? ''); setShippingAddress(c.address ?? ''); if (c.lat && c.lng) { setDeliveryLat(c.lat); setDeliveryLng(c.lng); } }}
            onClearCustomer={() => { setSelectedCustomer(null); setCustomerPhone(''); setShippingAddress(''); setDeliveryLat(null); setDeliveryLng(null); }}
            onShowNewCustomer={() => setShowNewCustomer(true)}
            onCancelNewCustomer={() => { setShowNewCustomer(false); setNewCustomerName(''); }}
            onNewCustomerNameChange={setNewCustomerName}
            onCustomerPhoneChange={setCustomerPhone}
            onShippingAddressChange={setShippingAddress}
            onPlaceSelect={(place) => { setShippingAddress(place.address); setDeliveryLat(place.lat); setDeliveryLng(place.lng); }}
            onProductSearch={searchProducts}
            onAddItem={addItem} onUpdateQty={updateQty} onRemoveItem={removeItem}
            onNotesChange={setNotes} onShippingCostChange={setShippingCost}
            onGoBackToOrgSelection={goBackToOrgSelection}
          />
        )}

        {step === 3 && (
          <OrderConfirmStep
            isEditMode={isEditMode} editOrder={editOrder}
            inventoryOrg={inventoryOrg} selectedOrg={selectedOrg}
            selectedWarehouse={selectedWarehouse}
            selectedCustomer={selectedCustomer} showNewCustomer={showNewCustomer}
            newCustomerName={newCustomerName} customerPhone={customerPhone}
            shippingAddress={shippingAddress}
            items={items} notes={notes} shippingCost={shippingCost}
            subtotal={subtotal} total={total}
          />
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
