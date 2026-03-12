import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { StatusBadge } from '@/components/hub/shared/StatusBadge.tsx';
import { TrackingMap } from '@/components/tracking/TrackingMap.tsx';
import { DeliveryPinMap } from '@/components/tracking/DeliveryPinMap.tsx';
import { OrderCreateModal } from './OrderCreateModal.tsx';
import { reserveOrderStock } from '@/services/orderService.ts';
import { createPickListForOrder } from '@/services/pickingService.ts';
import type { Profile, Carrier } from '@/lib/database.types.ts';

import { OrderProgressBar } from './detail/OrderProgressBar.tsx';
import { OrderStatusActions } from './detail/OrderStatusActions.tsx';
import { OrderCustomerCard } from './detail/OrderCustomerCard.tsx';
import { OrderItemsTable } from './detail/OrderItemsTable.tsx';
import { OrderQRSection } from './detail/OrderQRSection.tsx';
import { OrderDeliveryPhoto } from './detail/OrderDeliveryPhoto.tsx';
import { OrderTrackingInfo } from './detail/OrderTrackingInfo.tsx';
import { OrderTimeline } from './detail/OrderTimeline.tsx';
import { OrderPickingSection } from './detail/OrderPickingSection.tsx';
import { OrderPackingSection } from './detail/OrderPackingSection.tsx';
import { AssignDispatcherModal } from './detail/AssignDispatcherModal.tsx';
import { ShipOrderModal } from './detail/ShipOrderModal.tsx';
import { CancelOrderModal } from './detail/CancelOrderModal.tsx';
import { useOrderDetail } from './detail/useOrderDetail.ts';
import type { DispatcherWithCount } from './detail/AssignDispatcherModal.tsx';

/* eslint-disable @typescript-eslint/no-explicit-any */

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const organization = useAuthStore((s) => s.organization);
  const { canWrite, isDispatcher, isAggregator, isPlatformOwner } = usePermissions();

  const {
    order, items, history, customer, loading,
    pickList, pickListItems, packSession,
    dispatcherName, orderQr, realtimeStatus,
    resolvedDeliveryLat, resolvedDeliveryLng,
    loadOrder,
  } = useOrderDetail(orderId);

  // Modal state
  const [showAssign, setShowAssign] = useState(false);
  const [dispatchers, setDispatchers] = useState<DispatcherWithCount[]>([]);
  const [selectedDispatcher, setSelectedDispatcher] = useState<string | null>(null);
  const [showShipModal, setShowShipModal] = useState(false);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  // ── Status change handler ──
  const changeStatus = async (newStatus: string, notes?: string, metadata?: Record<string, unknown>) => {
    if (!orderId || !profile || !order) return;
    setUpdating(true);

    // Reserve stock when confirming a draft/pending order with a warehouse
    if (newStatus === 'confirmed' && order.warehouse_id && !order.stock_reserved) {
      try {
        const reserveResult = await reserveOrderStock(orderId, order.warehouse_id);
        if (!reserveResult?.success) {
          alert(`Error al reservar stock: ${reserveResult?.error ?? 'Stock insuficiente'}`);
          setUpdating(false);
          return;
        }
      } catch (reserveErr: unknown) {
        const msg = reserveErr instanceof Error ? reserveErr.message : 'Error desconocido';
        alert(`Error al reservar stock: ${msg}`);
        setUpdating(false);
        return;
      }
    }

    const { data } = await supabase.rpc('change_order_status', {
      p_order_id: orderId, p_new_status: newStatus, p_notes: notes ?? null, p_metadata: metadata ?? {},
    });
    const result = data as { success: boolean; error?: string } | null;
    if (result?.success) {
      if (newStatus === 'confirmed' && order.warehouse_id) {
        try { await createPickListForOrder(orderId, order.warehouse_id); }
        catch (pickErr) { console.error('Pick list auto-creation failed:', pickErr); }
      }
      await loadOrder();
    }
    else alert(result?.error ?? 'Error al cambiar estado');
    setUpdating(false);
  };

  // ── Action handlers ──
  const handleAssign = async () => {
    if (!selectedDispatcher || !order || !profile || !organization) return;
    setUpdating(true);

    await supabase.from('orders').update({
      assigned_to: selectedDispatcher, assigned_at: new Date().toISOString(),
    }).eq('id', order.id);

    await supabase.from('order_assignments').insert({
      order_id: order.id, org_id: organization.id,
      assigned_to: selectedDispatcher, assigned_by: profile.id, status: 'active',
    });

    await changeStatus('assigned', 'Orden asignada a despachador');
    setShowAssign(false);
    setSelectedDispatcher(null);
    setUpdating(false);
  };

  const handleShip = async (trackingNumber: string, carrierId: string, shipNotes: string) => {
    await changeStatus('shipped', shipNotes || 'Orden despachada', {
      tracking_number: trackingNumber, carrier_id: carrierId || undefined,
    });
    setShowShipModal(false);
  };

  const handleCancel = async (reason: string) => {
    await changeStatus('cancelled', reason);
    setShowCancelModal(false);
  };

  const openAssignModal = async () => {
    if (!organization || !order) return;
    const orderOrgId = order.org_id;

    const { data: userRoles } = await supabase
      .from('user_roles').select('user_id, roles(name)').eq('roles.name', 'associate_dispatcher');

    const dispatcherIds = (userRoles as unknown as { user_id: string; roles: { name: string } | null }[])
      ?.filter((ur) => ur.roles?.name === 'associate_dispatcher')
      .map((ur) => ur.user_id) ?? [];

    if (dispatcherIds.length > 0) {
      const relatedOrgIds = [orderOrgId];
      const { data: parents } = await supabase.from('org_hierarchy').select('parent_id').eq('child_id', orderOrgId);
      (parents ?? []).forEach((p: { parent_id: string }) => relatedOrgIds.push(p.parent_id));
      const { data: children } = await supabase.from('org_hierarchy').select('child_id').eq('parent_id', orderOrgId);
      (children ?? []).forEach((c: { child_id: string }) => relatedOrgIds.push(c.child_id));

      const { data: profiles } = await supabase
        .from('profiles').select('*').in('id', dispatcherIds).in('org_id', relatedOrgIds).eq('is_active', true);

      const { data: orderCounts } = await supabase
        .from('orders').select('assigned_to')
        .in('assigned_to', dispatcherIds).in('status', ['assigned', 'preparing', 'ready_to_ship']);

      const countMap: Record<string, number> = {};
      (orderCounts ?? []).forEach((o: { assigned_to: string | null }) => {
        if (o.assigned_to) countMap[o.assigned_to] = (countMap[o.assigned_to] ?? 0) + 1;
      });

      setDispatchers(
        ((profiles as Profile[]) ?? []).map((p) => ({ ...p, active_orders: countMap[p.id] ?? 0 }))
      );
    } else {
      setDispatchers([]);
    }
    setShowAssign(true);
  };

  const openShipModal = async () => {
    const { data } = await supabase.from('carriers').select('*').eq('is_active', true);
    setCarriers((data as Carrier[]) ?? []);
    setShowShipModal(true);
  };

  // ── Render ──
  if (loading) return <p className="rh-loading">Cargando orden...</p>;
  if (!order) return <p>Orden no encontrada</p>;

  const isReadOnly = isAggregator;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/hub/orders')} className="rh-btn rh-btn-secondary" style={{ padding: '6px 12px' }}>
            &larr; Volver
          </button>
          <div>
            <h1 className="rh-page-title" style={{ margin: 0 }}>Orden {order.order_number}</h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
              <StatusBadge status={order.status} />
              {order.source && order.source !== 'manual' && (
                <span style={{ fontSize: 12, color: '#8A8886', background: '#F1F5F9', padding: '2px 8px', borderRadius: 12 }}>
                  {order.source === 'whatsapp' ? 'WhatsApp' : order.source === 'rhino_vision' ? 'Rhino Vision' : order.source}
                </span>
              )}
            </div>
          </div>
        </div>
        <OrderStatusActions
          order={order} updating={updating}
          canWrite={canWrite} isDispatcher={isDispatcher} isReadOnly={isReadOnly} isPlatformOwner={isPlatformOwner}
          onChangeStatus={changeStatus} onOpenAssign={openAssignModal}
          onOpenShip={openShipModal} onOpenCancel={() => setShowCancelModal(true)}
          onOpenEdit={() => setShowEditModal(true)}
        />
      </div>

      <OrderProgressBar status={order.status} />

      {/* Picking Module */}
      {pickList && <OrderPickingSection pickList={pickList} pickListItems={pickListItems} />}

      {/* Packing Module */}
      {packSession && <OrderPackingSection packSession={packSession} />}

      {/* Delivery pin map */}
      {isPlatformOwner && !order.dispatcher_current_lat
        && (resolvedDeliveryLat || (order.shipping_address as Record<string, string> | null)?.address) && (
        <DeliveryPinMap
          lat={resolvedDeliveryLat} lng={resolvedDeliveryLng}
          address={(order.shipping_address as Record<string, string> | null)?.address}
        />
      )}

      {/* Live tracking map */}
      {order.dispatcher_current_lat && order.dispatcher_current_lng && order.assigned_to && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '6px 12px',
            background: realtimeStatus === 'connected' ? '#ECFDF5' : realtimeStatus === 'error' ? '#FEF2F2' : '#FFFBEB',
            borderRadius: 8, width: 'fit-content',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: realtimeStatus === 'connected' ? '#10B981' : realtimeStatus === 'error' ? '#EF4444' : '#F59E0B',
              boxShadow: realtimeStatus === 'connected' ? '0 0 0 3px rgba(16,185,129,0.2)' : 'none',
              animation: realtimeStatus === 'connected' ? 'realtimePulse 2s ease-in-out infinite' : 'none',
            }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: realtimeStatus === 'connected' ? '#059669' : realtimeStatus === 'error' ? '#DC2626' : '#D97706' }}>
              {realtimeStatus === 'connected' ? '● En vivo — rastreo en tiempo real' : realtimeStatus === 'error' ? '● Sin conexión — recarga la página' : '● Conectando...'}
            </span>
          </div>
          <TrackingMap
            dispatcherLat={order.dispatcher_current_lat} dispatcherLng={order.dispatcher_current_lng}
            deliveryLat={resolvedDeliveryLat} deliveryLng={resolvedDeliveryLng}
            dispatcherName={dispatcherName} lastUpdate={order.dispatcher_last_update}
            estimatedMinutes={order.estimated_duration_min}
          />
        </div>
      )}

      {/* Main content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <OrderCustomerCard order={order} customer={customer} />
          <OrderItemsTable items={items} total={Number(order.total)} />
          <OrderTrackingInfo order={order} customer={customer} items={items} />
          {orderQr && <OrderQRSection orderQr={orderQr} />}
          <OrderDeliveryPhoto order={order} />
          {order.notes && (
            <div className="rh-card" style={{ padding: 20 }}>
              <h3 className="rh-card-title" style={{ marginBottom: 8 }}>Notas</h3>
              <p style={{ fontSize: 14, color: '#475569', margin: 0 }}>{order.notes}</p>
            </div>
          )}
        </div>

        <OrderTimeline history={history} />
      </div>

      {/* Modals */}
      <AssignDispatcherModal
        open={showAssign} dispatchers={dispatchers}
        selectedDispatcher={selectedDispatcher} updating={updating}
        onSelect={setSelectedDispatcher} onAssign={handleAssign}
        onClose={() => setShowAssign(false)}
      />

      <ShipOrderModal
        open={showShipModal} carriers={carriers} updating={updating}
        onShip={handleShip} onClose={() => setShowShipModal(false)}
      />

      <OrderCreateModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        onCreated={() => { setShowEditModal(false); loadOrder(); }}
        editOrder={order}
        editItems={items.map((i) => ({ product_id: i.product_id, quantity: i.quantity, unit_price: Number(i.unit_price) }))}
      />

      <CancelOrderModal
        open={showCancelModal} updating={updating}
        onCancel={handleCancel} onClose={() => setShowCancelModal(false)}
      />

      <style>{`
        @keyframes realtimePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
