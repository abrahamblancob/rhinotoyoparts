import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { StatusBadge } from '@/components/hub/shared/StatusBadge.tsx';
import { TrackingMap } from '@/components/tracking/TrackingMap.tsx';
import { DeliveryPinMap } from '@/components/tracking/DeliveryPinMap.tsx';
import { OrderCreateModal } from './OrderCreateModal.tsx';
import type { Order, Customer, Profile, Carrier } from '@/lib/database.types.ts';
import { reserveOrderStock } from '@/services/orderService.ts';
import { createPickListForOrder, getPickListForOrder, getPickListItems } from '@/services/pickingService.ts';
import { getPackSessionForOrder } from '@/services/packingService.ts';
import { PickingMiniMap } from '@/features/picking/PickingMiniMap.tsx';
import type { PickList, PickListItem, PackSession } from '@/types/warehouse.ts';
import { ChevronDown } from 'lucide-react';

import { OrderProgressBar } from './detail/OrderProgressBar.tsx';
import { OrderStatusActions } from './detail/OrderStatusActions.tsx';
import { OrderCustomerCard } from './detail/OrderCustomerCard.tsx';
import { OrderItemsTable } from './detail/OrderItemsTable.tsx';
import { OrderQRSection } from './detail/OrderQRSection.tsx';
import { OrderDeliveryPhoto } from './detail/OrderDeliveryPhoto.tsx';
import { OrderTrackingInfo } from './detail/OrderTrackingInfo.tsx';
import { OrderTimeline } from './detail/OrderTimeline.tsx';
import { AssignDispatcherModal } from './detail/AssignDispatcherModal.tsx';
import { ShipOrderModal } from './detail/ShipOrderModal.tsx';
import { CancelOrderModal } from './detail/CancelOrderModal.tsx';
import type { OrderItemWithProduct, StatusHistoryWithUser, OrderQr, RealtimeStatus } from './detail/types.ts';
import type { DispatcherWithCount } from './detail/AssignDispatcherModal.tsx';

/* eslint-disable @typescript-eslint/no-explicit-any */

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const organization = useAuthStore((s) => s.organization);
  const { canWrite, isDispatcher, isAggregator, isPlatformOwner } = usePermissions();

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItemWithProduct[]>([]);
  const [history, setHistory] = useState<StatusHistoryWithUser[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAssign, setShowAssign] = useState(false);
  const [dispatchers, setDispatchers] = useState<DispatcherWithCount[]>([]);
  const [selectedDispatcher, setSelectedDispatcher] = useState<string | null>(null);
  const [showShipModal, setShowShipModal] = useState(false);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [pickList, setPickList] = useState<PickList | null>(null);
  const [pickListItems, setPickListItems] = useState<PickListItem[]>([]);
  const [packSession, setPackSession] = useState<PackSession | null>(null);
  const [pickingExpanded, setPickingExpanded] = useState(false);
  const [packingExpanded, setPackingExpanded] = useState(false);
  const [photoModalUrl, setPhotoModalUrl] = useState<string | null>(null);

  const [updating, setUpdating] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting');
  const [dispatcherName, setDispatcherName] = useState<string>('Despachador');
  const [orderQr, setOrderQr] = useState<OrderQr | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Resolved delivery coordinates (from order or geocoded from address)
  const [resolvedDeliveryLat, setResolvedDeliveryLat] = useState<number | null>(null);
  const [resolvedDeliveryLng, setResolvedDeliveryLng] = useState<number | null>(null);
  const geocodeAttemptedRef = useRef(false);

  // ── Load order data ──
  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);

    const [orderRes, itemsRes, historyRes] = await Promise.all([
      supabase.from('orders').select('*').eq('id', orderId).single(),
      supabase.from('order_items').select('*, products(name, sku, image_url)').eq('order_id', orderId),
      supabase.from('order_status_history').select('*, profiles(full_name)').eq('order_id', orderId).order('created_at', { ascending: true }),
    ]);

    const orderData = orderRes.data as Order | null;
    setOrder(orderData);
    setItems((itemsRes.data as OrderItemWithProduct[]) ?? []);
    setHistory((historyRes.data as StatusHistoryWithUser[]) ?? []);

    if (orderData?.customer_id) {
      const { data: c } = await supabase.from('customers').select('*').eq('id', orderData.customer_id).single();
      setCustomer(c as Customer | null);
    }

    if (orderData?.assigned_to) {
      const { data: dp } = await supabase.from('profiles').select('full_name').eq('id', orderData.assigned_to).single();
      if (dp) setDispatcherName((dp as { full_name: string }).full_name);
    }

    // Load or auto-generate order QR code (only after packing is done)
    const postPackStatuses = ['packed', 'assigned', 'picked', 'preparing', 'ready_to_ship', 'shipped', 'in_transit', 'delivered'];
    if (orderData?.tracking_code && orderData?.org_id && postPackStatuses.includes(orderData.status)) {
      const { data: qr } = await supabase
        .from('order_qr_codes')
        .select('qr_code, scanned_at, scanned_by, is_valid')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (qr) {
        setOrderQr(qr as OrderQr);
      } else {
        const qrCode = orderData.tracking_code.replace(/^TRACK-/, 'RHINO-QR-');
        const { data: newQr } = await supabase
          .from('order_qr_codes')
          .insert({
            order_id: orderId,
            org_id: orderData.org_id,
            qr_code: qrCode,
            generated_at: new Date().toISOString(),
            is_valid: true,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select('qr_code, scanned_at, scanned_by, is_valid')
          .single();
        if (newQr) setOrderQr(newQr as OrderQr);
      }
    }

    // Load associated pick list (if any)
    if (orderId) {
      getPickListForOrder(orderId).then(({ data }) => {
        const pl = (data as PickList) ?? null;
        setPickList(pl);
        // Load items when pick list is completed (for mini-map display)
        if (pl?.status === 'completed') {
          getPickListItems(pl.id).then(({ data: plItems }) => {
            setPickListItems((plItems as PickListItem[]) ?? []);
          }).catch(() => setPickListItems([]));
        }
      }).catch(() => setPickList(null));

      // Load associated pack session (if any)
      getPackSessionForOrder(orderId).then(({ data }) => {
        setPackSession((data as PackSession) ?? null);
      }).catch(() => setPackSession(null));
    }

    setLoading(false);
  }, [orderId]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  // ── Geocode delivery address ──
  useEffect(() => {
    if (!order) return;

    if (order.delivery_latitude && order.delivery_longitude) {
      setResolvedDeliveryLat(order.delivery_latitude);
      setResolvedDeliveryLng(order.delivery_longitude);
      return;
    }

    const addr = (order.shipping_address as Record<string, string> | null)?.address;
    if (!addr || geocodeAttemptedRef.current) return;
    geocodeAttemptedRef.current = true;

    const tryGeocode = () => {
      if (!window.google?.maps) { setTimeout(tryGeocode, 500); return; }
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: addr }, (results: any[], status: string) => {
        let lat: number | null = null;
        let lng: number | null = null;

        if (status === 'OK' && results?.[0]?.geometry?.location) {
          lat = results[0].geometry.location.lat();
          lng = results[0].geometry.location.lng();
        }

        if (!lat && window.google?.maps?.places) {
          const dummyDiv = document.createElement('div');
          const service = new window.google.maps.places.PlacesService(dummyDiv);
          service.textSearch({ query: addr }, (placeResults: any[], placeStatus: string) => {
            if (placeStatus === 'OK' && placeResults?.[0]?.geometry?.location) {
              const loc = placeResults[0].geometry.location;
              setResolvedDeliveryLat(loc.lat());
              setResolvedDeliveryLng(loc.lng());
              supabase.from('orders').update({ delivery_latitude: loc.lat(), delivery_longitude: loc.lng() }).eq('id', order.id).then(() => {});
            }
          });
          return;
        }

        if (lat && lng) {
          setResolvedDeliveryLat(lat);
          setResolvedDeliveryLng(lng);
          supabase.from('orders').update({ delivery_latitude: lat, delivery_longitude: lng }).eq('id', order.id).then(() => {});
        }
      });
    };
    tryGeocode();
  }, [order?.id, order?.delivery_latitude, order?.delivery_longitude, order?.shipping_address]);

  // ── Realtime subscription ──
  useEffect(() => {
    if (!orderId) return;
    setRealtimeStatus('connecting');

    const channel = supabase
      .channel(`order-detail-${orderId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => { setOrder((prev) => prev ? { ...prev, ...(payload.new as Order) } : prev); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_status_history', filter: `order_id=eq.${orderId}` },
        () => {
          supabase.from('order_status_history').select('*, profiles(full_name)')
            .eq('order_id', orderId).order('created_at', { ascending: true })
            .then(({ data }) => { if (data) setHistory(data as StatusHistoryWithUser[]); });
        })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('connected');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setRealtimeStatus('error');
      });

    channelRef.current = channel;
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [orderId]);

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
      // Auto-create pick list when confirming with warehouse (non-fatal)
      if (newStatus === 'confirmed' && order.warehouse_id) {
        try {
          await createPickListForOrder(orderId, order.warehouse_id);
        } catch (pickErr) {
          console.error('Pick list auto-creation failed:', pickErr);
        }
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
      tracking_number: trackingNumber,
      carrier_id: carrierId || undefined,
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

      {/* ── Picking Module (collapsible) ── */}
      {pickList && (
        <div style={{ marginBottom: 20, borderRadius: 10, overflow: 'hidden', border: pickList.status === 'completed' ? '1px solid #BBF7D0' : '1px solid #FDE68A' }}>
          <button
            type="button"
            onClick={() => setPickingExpanded((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '14px 20px', border: 'none', cursor: 'pointer',
              background: pickList.status === 'completed' ? '#F0FDF4' : '#FFFBEB',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20 }}>{pickList.status === 'completed' ? '✅' : '📦'}</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: pickList.status === 'completed' ? '#166534' : '#1E293B' }}>
                  {pickList.status === 'completed' ? 'Picking Completado' : `Pick List — ${pickList.status === 'in_progress' ? 'En progreso' : pickList.status === 'assigned' ? 'Asignado' : 'Pendiente'}`}
                </div>
                <div style={{ fontSize: 12, color: pickList.status === 'completed' ? '#15803D' : '#64748B' }}>
                  {pickList.picked_items} / {pickList.total_items} items recogidos
                  {pickList.assignee?.full_name && ` · ${pickList.assignee.full_name}`}
                  {pickList.status === 'completed' && pickList.completed_at && ` · ${new Date(pickList.completed_at).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' })}`}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {pickList.total_items > 0 && (
                <div style={{ width: 80, height: 6, borderRadius: 3, backgroundColor: pickList.status === 'completed' ? '#BBF7D0' : '#E2E8F0', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.round((pickList.picked_items / pickList.total_items) * 100)}%`,
                    height: '100%', borderRadius: 3,
                    backgroundColor: pickList.picked_items === pickList.total_items ? '#10B981' : '#F97316',
                  }} />
                </div>
              )}
              <ChevronDown size={18} style={{ color: '#64748B', transition: 'transform 0.2s', transform: pickingExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </div>
          </button>

          {pickingExpanded && (
            <div style={{ borderTop: pickList.status === 'completed' ? '1px solid #BBF7D0' : '1px solid #FDE68A' }}>
              {pickList.status !== 'completed' && (
                <div style={{ padding: '14px 20px', background: '#fff' }}>
                  <button
                    className="rh-btn rh-btn-primary"
                    onClick={() => navigate(`/hub/picking/${pickList.id}`)}
                    style={{ fontSize: 12, padding: '6px 14px', backgroundColor: '#F97316' }}
                  >
                    Ver Pick List →
                  </button>
                </div>
              )}
              {pickList.status === 'completed' && pickList.warehouse_id && (
                <PickingMiniMap
                  warehouseId={pickList.warehouse_id}
                  locationIds={pickListItems.map((i) => i.source_location_id).filter(Boolean)}
                  pickedLocationIds={pickListItems.filter((i) => i.status === 'picked').map((i) => i.source_location_id).filter(Boolean)}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Packing Module (collapsible) ── */}
      {packSession && (() => {
        const isCompleted = packSession.status === 'completed';
        const packPhotos: string[] = (() => {
          if (!packSession.package_photo_url) return [];
          try { const p = JSON.parse(packSession.package_photo_url); return Array.isArray(p) ? p : [packSession.package_photo_url]; }
          catch { return packSession.package_photo_url ? [packSession.package_photo_url] : []; }
        })();
        return (
          <div style={{ marginBottom: 20, borderRadius: 10, overflow: 'hidden', border: isCompleted ? '1px solid #BBF7D0' : '1px solid #FDE68A' }}>
            <button
              type="button"
              onClick={() => setPackingExpanded((v) => !v)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '14px 20px', border: 'none', cursor: 'pointer',
                background: isCompleted ? '#F0FDF4' : '#FFFBEB',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20 }}>{isCompleted ? '✅' : '📦'}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: isCompleted ? '#166534' : '#1E293B' }}>
                    {isCompleted ? 'Packing Completado' : `Packing — ${packSession.status === 'in_progress' ? 'En progreso' : packSession.status === 'pending' ? 'Pendiente' : packSession.status}`}
                  </div>
                  <div style={{ fontSize: 12, color: isCompleted ? '#15803D' : '#64748B' }}>
                    {packSession.verified_items} / {packSession.total_items} items verificados
                    {packSession.packer?.full_name && ` · ${packSession.packer.full_name}`}
                    {isCompleted && packSession.completed_at && ` · ${new Date(packSession.completed_at).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' })}`}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {packSession.total_items > 0 && (
                  <div style={{ width: 80, height: 6, borderRadius: 3, backgroundColor: isCompleted ? '#BBF7D0' : '#E2E8F0', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.round((packSession.verified_items / packSession.total_items) * 100)}%`,
                      height: '100%', borderRadius: 3, backgroundColor: '#10B981',
                    }} />
                  </div>
                )}
                <ChevronDown size={18} style={{ color: '#64748B', transition: 'transform 0.2s', transform: packingExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </div>
            </button>

            {packingExpanded && (
              <div style={{ borderTop: isCompleted ? '1px solid #BBF7D0' : '1px solid #FDE68A', padding: 20, background: '#fff' }}>
                {/* Pack session details */}
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: packPhotos.length > 0 ? 16 : 0 }}>
                  {packSession.package_weight_kg != null && (
                    <div>
                      <p style={{ fontSize: 12, color: '#605E5C', margin: 0 }}>Peso</p>
                      <p style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', margin: '4px 0 0' }}>
                        {packSession.package_weight_kg} kg
                      </p>
                    </div>
                  )}
                  <div>
                    <p style={{ fontSize: 12, color: '#605E5C', margin: 0 }}>Empacador</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', margin: '4px 0 0' }}>
                      {packSession.packer?.full_name ?? 'Sin asignar'}
                    </p>
                  </div>
                  {packSession.completed_at && (
                    <div>
                      <p style={{ fontSize: 12, color: '#605E5C', margin: 0 }}>Completado</p>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', margin: '4px 0 0' }}>
                        {new Date(packSession.completed_at).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  )}
                  <div>
                    <p style={{ fontSize: 12, color: '#605E5C', margin: 0 }}>Items verificados</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', margin: '4px 0 0' }}>
                      {packSession.verified_items} / {packSession.total_items}
                    </p>
                  </div>
                </div>

                {/* Photos gallery */}
                {packPhotos.length > 0 && (
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#475569', margin: '0 0 10px' }}>
                      📷 Fotos del paquete ({packPhotos.length})
                    </p>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {packPhotos.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPhotoModalUrl(url)}
                          style={{
                            display: 'block', width: 100, height: 100,
                            borderRadius: 8, overflow: 'hidden',
                            border: '1px solid #E2E8F0', cursor: 'pointer',
                            padding: 0, background: 'none',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                          <img src={url} alt={`Foto ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!isCompleted && (
                  <button
                    className="rh-btn rh-btn-primary"
                    onClick={() => navigate(`/hub/packing/${packSession.id}`)}
                    style={{ fontSize: 12, padding: '6px 14px', marginTop: packPhotos.length > 0 ? 16 : 0 }}
                  >
                    Ver Sesión de Packing →
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })()}

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

      {/* Photo lightbox modal */}
      {photoModalUrl && (
        <div
          onClick={() => setPhotoModalUrl(null)}
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, cursor: 'pointer',
          }}
        >
          <button
            onClick={() => setPhotoModalUrl(null)}
            style={{
              position: 'absolute', top: 16, right: 16,
              width: 40, height: 40, borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff',
              border: 'none', cursor: 'pointer', fontSize: 22,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
          <img
            src={photoModalUrl}
            alt="Foto del paquete"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain', cursor: 'default' }}
          />
        </div>
      )}

      <style>{`
        @keyframes realtimePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
