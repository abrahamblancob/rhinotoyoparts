import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { StatusBadge } from '@/components/hub/shared/StatusBadge.tsx';
import { Modal } from '@/components/hub/shared/Modal.tsx';
import type { Order, OrderItem, OrderStatusHistory, Customer, Profile, Carrier } from '@/lib/database.types.ts';
import { WhatsAppShareButton } from '@/components/orders/WhatsAppShareButton.tsx';
import { TrackingMap } from '@/components/tracking/TrackingMap.tsx';
import { QRCodeSVG } from 'qrcode.react';

interface OrderItemWithProduct extends OrderItem {
  products: { name: string; sku: string; image_url: string | null } | null;
}

interface StatusHistoryWithUser extends OrderStatusHistory {
  profiles: { full_name: string } | null;
}

const STATUS_FLOW = ['draft', 'confirmed', 'assigned', 'preparing', 'ready_to_ship', 'shipped', 'in_transit', 'delivered'];

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', pending: 'Pendiente', confirmed: 'Confirmada', assigned: 'Asignada',
  preparing: 'Preparando', ready_to_ship: 'Lista para envío', processing: 'Procesando',
  shipped: 'Despachada', in_transit: 'En tránsito', delivered: 'Entregada',
  cancelled: 'Cancelada', returned: 'Devuelta',
};

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const organization = useAuthStore((s) => s.organization);
  const { canWrite, isDispatcher, isAggregator } = usePermissions();

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItemWithProduct[]>([]);
  const [history, setHistory] = useState<StatusHistoryWithUser[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // Assignment modal
  const [showAssign, setShowAssign] = useState(false);
  const [dispatchers, setDispatchers] = useState<(Profile & { active_orders: number })[]>([]);
  const [selectedDispatcher, setSelectedDispatcher] = useState<string | null>(null);

  // Shipping modal
  const [showShipModal, setShowShipModal] = useState(false);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shipNotes, setShipNotes] = useState('');

  // Cancel modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [updating, setUpdating] = useState(false);
  const [dispatcherName, setDispatcherName] = useState<string>('Despachador');
  const [orderQr, setOrderQr] = useState<{ qr_code: string; scanned_at: string | null; scanned_by: string | null; is_valid: boolean } | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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

    // Load dispatcher name
    if (orderData?.assigned_to) {
      const { data: dp } = await supabase.from('profiles').select('full_name').eq('id', orderData.assigned_to).single();
      if (dp) setDispatcherName((dp as { full_name: string }).full_name);
    }

    // Load or auto-generate order QR code for dispatcher
    if (orderData?.tracking_code && orderData?.org_id) {
      const { data: qr } = await supabase
        .from('order_qr_codes')
        .select('qr_code, scanned_at, scanned_by, is_valid')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (qr) {
        setOrderQr(qr as { qr_code: string; scanned_at: string | null; scanned_by: string | null; is_valid: boolean });
      } else {
        // Auto-generate QR: TRACK-TP001-2026 → RHINO-QR-TP001-2026
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
        if (newQr) {
          setOrderQr(newQr as { qr_code: string; scanned_at: string | null; scanned_by: string | null; is_valid: boolean });
        }
      }
    }

    setLoading(false);
  }, [orderId]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  // Realtime subscription for GPS updates
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-detail-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => {
          const updated = payload.new as Order;
          setOrder((prev) => prev ? { ...prev, ...updated } : prev);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [orderId]);

  const changeStatus = async (newStatus: string, notes?: string, metadata?: Record<string, unknown>) => {
    if (!orderId || !profile) return;
    setUpdating(true);
    const { data } = await supabase.rpc('change_order_status', {
      p_order_id: orderId,
      p_new_status: newStatus,
      p_notes: notes ?? null,
      p_metadata: metadata ?? {},
    });
    const result = data as { success: boolean; error?: string } | null;
    if (result?.success) {
      await loadOrder();
    } else {
      alert(result?.error ?? 'Error al cambiar estado');
    }
    setUpdating(false);
  };

  const handleAssign = async () => {
    if (!selectedDispatcher || !order || !profile || !organization) return;
    setUpdating(true);

    // Update order assigned_to
    await supabase.from('orders').update({
      assigned_to: selectedDispatcher,
      assigned_at: new Date().toISOString(),
    }).eq('id', order.id);

    // Create assignment record
    await supabase.from('order_assignments').insert({
      order_id: order.id,
      org_id: organization.id,
      assigned_to: selectedDispatcher,
      assigned_by: profile.id,
      status: 'active',
    });

    await changeStatus('assigned', 'Orden asignada a despachador');
    setShowAssign(false);
    setSelectedDispatcher(null);
    setUpdating(false);
  };

  const handleShip = async () => {
    if (!trackingNumber) return;
    await changeStatus('shipped', shipNotes || 'Orden despachada', {
      tracking_number: trackingNumber,
      carrier_id: selectedCarrier || undefined,
    });
    setShowShipModal(false);
  };

  const handleCancel = async () => {
    await changeStatus('cancelled', cancelReason || 'Orden cancelada');
    setShowCancelModal(false);
  };

  const openAssignModal = async () => {
    if (!organization) return;
    // Load dispatchers (users with associate_dispatcher role in same org)
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('user_id, roles(name)')
      .eq('roles.name', 'associate_dispatcher');

    const dispatcherIds = (userRoles as unknown as { user_id: string; roles: { name: string } | null }[])
      ?.filter((ur) => ur.roles?.name === 'associate_dispatcher')
      .map((ur) => ur.user_id) ?? [];

    if (dispatcherIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', dispatcherIds)
        .eq('org_id', organization.id)
        .eq('is_active', true);

      // Count active orders per dispatcher
      const { data: orderCounts } = await supabase
        .from('orders')
        .select('assigned_to')
        .in('assigned_to', dispatcherIds)
        .in('status', ['assigned', 'preparing', 'ready_to_ship']);

      const countMap: Record<string, number> = {};
      (orderCounts ?? []).forEach((o: { assigned_to: string | null }) => {
        if (o.assigned_to) countMap[o.assigned_to] = (countMap[o.assigned_to] ?? 0) + 1;
      });

      setDispatchers(
        ((profiles as Profile[]) ?? []).map((p) => ({
          ...p,
          active_orders: countMap[p.id] ?? 0,
        }))
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

  if (loading) return <p className="rh-loading">Cargando orden...</p>;
  if (!order) return <p>Orden no encontrada</p>;

  const canCancel = !['delivered', 'cancelled', 'returned'].includes(order.status);
  const isReadOnly = isAggregator;

  // Determine current step in the flow
  const currentStepIndex = STATUS_FLOW.indexOf(order.status);

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
        {!isReadOnly && (
          <div style={{ display: 'flex', gap: 8 }}>
            {order.status === 'draft' && canWrite('orders') && (
              <button className="rh-btn rh-btn-primary" onClick={() => changeStatus('confirmed', 'Orden confirmada')} disabled={updating}>
                Confirmar Orden
              </button>
            )}
            {order.status === 'pending' && canWrite('orders') && (
              <button className="rh-btn rh-btn-primary" onClick={() => changeStatus('confirmed', 'Orden confirmada')} disabled={updating}>
                Confirmar Orden
              </button>
            )}
            {order.status === 'confirmed' && canWrite('orders') && !isDispatcher && (
              <button className="rh-btn rh-btn-primary" onClick={openAssignModal} disabled={updating}>
                Asignar Despachador
              </button>
            )}
            {order.status === 'assigned' && isDispatcher && (
              <button className="rh-btn rh-btn-primary" onClick={() => changeStatus('preparing', 'Preparando pedido')} disabled={updating}>
                Empezar a Preparar
              </button>
            )}
            {order.status === 'preparing' && isDispatcher && (
              <button className="rh-btn rh-btn-primary" onClick={() => changeStatus('ready_to_ship', 'Paquete listo')} disabled={updating}>
                Marcar como Listo
              </button>
            )}
            {order.status === 'ready_to_ship' && (isDispatcher || canWrite('orders')) && (
              <button className="rh-btn rh-btn-primary" onClick={openShipModal} disabled={updating}>
                Despachar
              </button>
            )}
            {order.status === 'shipped' && (isDispatcher || canWrite('orders')) && (
              <button className="rh-btn rh-btn-primary" onClick={() => changeStatus('in_transit', 'En tránsito')} disabled={updating}>
                Marcar En Tránsito
              </button>
            )}
            {order.status === 'in_transit' && (isDispatcher || canWrite('orders')) && (
              <button className="rh-btn rh-btn-primary" onClick={() => changeStatus('delivered', 'Entregado al cliente')} disabled={updating}>
                Confirmar Entrega
              </button>
            )}
            {order.status === 'delivered' && canWrite('orders') && !isDispatcher && (
              <button className="rh-btn rh-btn-secondary" onClick={() => changeStatus('returned', 'Cliente devolvió')} disabled={updating}>
                Registrar Devolución
              </button>
            )}
            {canCancel && canWrite('orders') && !isDispatcher && (
              <button className="rh-btn" style={{ color: '#D3010A', border: '1px solid #D3010A' }}
                onClick={() => setShowCancelModal(true)} disabled={updating}>
                Cancelar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Progress bar */}
      {!['cancelled', 'returned'].includes(order.status) && (
        <div className="rh-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            {/* Progress line */}
            <div style={{ position: 'absolute', top: 12, left: 24, right: 24, height: 3, background: '#E2E8F0', zIndex: 0 }} />
            <div style={{ position: 'absolute', top: 12, left: 24, height: 3, background: '#D3010A', zIndex: 1,
              width: currentStepIndex >= 0 ? `${(currentStepIndex / (STATUS_FLOW.length - 1)) * 100}%` : '0%', transition: 'width 0.5s ease' }} />

            {STATUS_FLOW.map((status, i) => {
              const isCompleted = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex;
              return (
                <div key={status} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: isCompleted ? '#D3010A' : '#E2E8F0',
                    border: isCurrent ? '3px solid #D3010A' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isCompleted ? '#fff' : '#94A3B8', fontSize: 12, fontWeight: 700,
                  }}>
                    {isCompleted ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: 10, marginTop: 4, color: isCurrent ? '#D3010A' : isCompleted ? '#1E293B' : '#94A3B8', fontWeight: isCurrent ? 700 : 400, whiteSpace: 'nowrap' }}>
                    {STATUS_LABELS[status]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Live tracking map */}
      {order.dispatcher_current_lat && order.dispatcher_current_lng && order.assigned_to && (
        <div style={{ marginBottom: 20 }}>
          <TrackingMap
            dispatcherLat={order.dispatcher_current_lat}
            dispatcherLng={order.dispatcher_current_lng}
            deliveryLat={order.delivery_latitude}
            deliveryLng={order.delivery_longitude}
            dispatcherName={dispatcherName}
            lastUpdate={order.dispatcher_last_update}
            estimatedMinutes={order.estimated_duration_min}
          />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
        {/* Left: Order details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Customer info */}
          <div className="rh-card" style={{ padding: 20 }}>
            <h3 className="rh-card-title" style={{ marginBottom: 12 }}>Cliente</h3>
            {customer ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14 }}>
                <div><span style={{ color: '#64748B' }}>Nombre:</span> <strong>{customer.name}</strong></div>
                <div><span style={{ color: '#64748B' }}>Teléfono:</span> {customer.phone ?? order.customer_phone ?? '-'}</div>
                <div><span style={{ color: '#64748B' }}>Email:</span> {customer.email ?? '-'}</div>
                <div><span style={{ color: '#64748B' }}>Ciudad:</span> {customer.city ?? '-'}</div>
                {(order.shipping_address as Record<string, string> | null)?.address && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: '#64748B' }}>Dirección de envío:</span> {(order.shipping_address as Record<string, string>).address}
                  </div>
                )}
                {(order.receiver_name || order.receiver_phone || order.receiver_id_number) && (
                  <>
                    <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #F1F5F9', paddingTop: 8, marginTop: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>Receptor</span>
                    </div>
                    {order.receiver_name && (
                      <div><span style={{ color: '#64748B' }}>Nombre:</span> <strong>{order.receiver_name}</strong></div>
                    )}
                    {order.receiver_phone && (
                      <div><span style={{ color: '#64748B' }}>Teléfono:</span> {order.receiver_phone}</div>
                    )}
                    {order.receiver_id_number && (
                      <div><span style={{ color: '#64748B' }}>Cédula:</span> {order.receiver_id_number}</div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <p style={{ color: '#94A3B8', fontSize: 14 }}>Sin cliente asignado</p>
            )}
          </div>

          {/* Order items */}
          <div className="rh-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9' }}>
              <h3 className="rh-card-title" style={{ margin: 0 }}>Productos ({items.length})</h3>
            </div>
            <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>Producto</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 600, color: '#64748B' }}>Qty</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: '#64748B' }}>P. Unit</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: '#64748B' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ fontWeight: 500 }}>{item.products?.name ?? 'Producto'}</div>
                      <div style={{ fontSize: 12, color: '#8A8886' }}>{item.products?.sku ?? ''}</div>
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>${Number(item.unit_price).toFixed(2)}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>${Number(item.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #E2E0DE' }}>
                  <td colSpan={3} style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>Total:</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, fontSize: 16, color: '#D3010A' }}>
                    ${Number(order.total).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Tracking info */}
          {order.tracking_number && (
            <div className="rh-card" style={{ padding: 20 }}>
              <h3 className="rh-card-title" style={{ marginBottom: 12 }}>Información de Envío</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14 }}>
                <div><span style={{ color: '#64748B' }}>Guía:</span> <strong>{order.tracking_number}</strong></div>
                {order.shipped_at && (
                  <div><span style={{ color: '#64748B' }}>Despachado:</span> {new Date(order.shipped_at).toLocaleString('es-VE')}</div>
                )}
              </div>
            </div>
          )}

          {/* Delivery metrics */}
          {(order.estimated_distance_km || order.actual_pickup_at || order.actual_delivery_at) && (
            <div className="rh-card" style={{ padding: 20 }}>
              <h3 className="rh-card-title" style={{ marginBottom: 12 }}>Métricas de Entrega</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {order.estimated_distance_km != null && (
                  <div style={{ textAlign: 'center', padding: 12, background: '#F8FAFC', borderRadius: 8 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#D3010A' }}>{Number(order.estimated_distance_km).toFixed(1)} km</div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Distancia estimada</div>
                  </div>
                )}
                {order.actual_pickup_at && (
                  <div style={{ textAlign: 'center', padding: 12, background: '#F8FAFC', borderRadius: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>{new Date(order.actual_pickup_at).toLocaleString('es-VE')}</div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Recogida real</div>
                  </div>
                )}
                {order.actual_delivery_at && (
                  <div style={{ textAlign: 'center', padding: 12, background: '#F8FAFC', borderRadius: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>{new Date(order.actual_delivery_at).toLocaleString('es-VE')}</div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Entrega real</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* QR de despacho para el despachador */}
          {orderQr && (
            <div className="rh-card" style={{ padding: 20 }}>
              <h3 className="rh-card-title" style={{ marginBottom: 12 }}>QR de Orden</h3>
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                <div style={{
                  background: '#fff',
                  padding: 16,
                  borderRadius: 12,
                  border: orderQr.scanned_at ? '2px solid #10B981' : '2px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  flexShrink: 0,
                }}>
                  <QRCodeSVG
                    value={orderQr.qr_code}
                    size={160}
                    level="M"
                    bgColor="#FFFFFF"
                    fgColor="#1E293B"
                  />
                  <span style={{
                    fontFamily: 'monospace',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#1E293B',
                    letterSpacing: 0.5,
                  }}>
                    {orderQr.qr_code}
                  </span>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
                    {orderQr.scanned_at
                      ? 'El despachador ha tomado la orden.'
                      : <>El despachador escanea este código desde <strong>Rhino Móvil</strong> para tomar la orden.</>}
                  </p>
                  {orderQr.scanned_at ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      background: '#ECFDF5',
                      borderRadius: 8,
                      fontSize: 13,
                    }}>
                      <span style={{ fontSize: 16 }}>✅</span>
                      <div>
                        <div style={{ fontWeight: 600, color: '#059669' }}>Escaneado</div>
                        <div style={{ fontSize: 12, color: '#64748B' }}>
                          {new Date(orderQr.scanned_at).toLocaleString('es-VE')}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      background: '#FFF7ED',
                      borderRadius: 8,
                      fontSize: 13,
                    }}>
                      <span style={{ fontSize: 16 }}>⏳</span>
                      <div>
                        <div style={{ fontWeight: 600, color: '#D97706' }}>Pendiente de escaneo</div>
                        <div style={{ fontSize: 12, color: '#64748B' }}>
                          El despachador aún no ha tomado esta orden
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Foto de entrega del despachador */}
          {order.status === 'delivered' && order.delivery_photo_url && (
            <div className="rh-card" style={{ padding: 20 }}>
              <h3 className="rh-card-title" style={{ marginBottom: 12 }}>📸 Foto de Entrega</h3>
              <p style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>
                Evidencia fotográfica tomada por el despachador al momento de la entrega.
              </p>
              <div style={{
                borderRadius: 12,
                overflow: 'hidden',
                border: '2px solid #E2E8F0',
                background: '#F8FAFC',
                maxWidth: 480,
              }}>
                <img
                  src={order.delivery_photo_url}
                  alt="Foto de entrega"
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    cursor: 'pointer',
                  }}
                  onClick={() => window.open(order.delivery_photo_url!, '_blank')}
                  title="Clic para ver en tamaño completo"
                />
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 12,
                padding: '8px 12px',
                background: '#ECFDF5',
                borderRadius: 8,
                fontSize: 13,
              }}>
                <span style={{ fontSize: 16 }}>✅</span>
                <div>
                  <div style={{ fontWeight: 600, color: '#059669' }}>Entrega verificada con foto</div>
                  {order.actual_delivery_at && (
                    <div style={{ fontSize: 12, color: '#64748B' }}>
                      {new Date(order.actual_delivery_at).toLocaleString('es-VE')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* WhatsApp share + tracking link */}
          {order.tracking_code && (
            <div className="rh-card" style={{ padding: 20 }}>
              <h3 className="rh-card-title" style={{ marginBottom: 8 }}>Tracking Público</h3>
              <div style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>
                Código: <strong style={{ fontFamily: 'monospace', fontSize: 15, color: '#1E293B' }}>{order.tracking_code}</strong>
              </div>
              <WhatsAppShareButton
                trackingCode={order.tracking_code}
                receiverName={order.receiver_name ?? customer?.name ?? null}
                customerPhone={order.customer_phone ?? customer?.phone ?? null}
                items={items.map((i) => ({ name: i.products?.name ?? 'Producto', quantity: i.quantity }))}
                orderStatus={order.status}
              />
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="rh-card" style={{ padding: 20 }}>
              <h3 className="rh-card-title" style={{ marginBottom: 8 }}>Notas</h3>
              <p style={{ fontSize: 14, color: '#475569', margin: 0 }}>{order.notes}</p>
            </div>
          )}
        </div>

        {/* Right: Timeline */}
        <div className="rh-card" style={{ padding: 20, alignSelf: 'start' }}>
          <h3 className="rh-card-title" style={{ marginBottom: 16 }}>Historial de Estados</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {history.map((h, i) => (
              <div key={h.id} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                {/* Vertical line */}
                {i < history.length - 1 && (
                  <div style={{ position: 'absolute', left: 11, top: 24, bottom: -8, width: 2, background: '#E2E8F0' }} />
                )}
                {/* Dot */}
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: i === history.length - 1 ? '#D3010A' : '#E2E8F0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: i === history.length - 1 ? '#fff' : '#94A3B8', fontSize: 10,
                }}>
                  {i === history.length - 1 ? '●' : '✓'}
                </div>
                {/* Content */}
                <div style={{ paddingBottom: 20, flex: 1 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <StatusBadge status={h.to_status} />
                  </div>
                  {h.note && <p style={{ fontSize: 13, color: '#475569', margin: '4px 0 0' }}>{h.note}</p>}
                  <p style={{ fontSize: 12, color: '#94A3B8', margin: '2px 0 0' }}>
                    {h.profiles?.full_name ?? 'Sistema'} · {new Date(h.created_at).toLocaleString('es-VE')}
                  </p>
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <p style={{ color: '#94A3B8', fontSize: 14 }}>Sin historial aún</p>
            )}
          </div>
        </div>
      </div>

      {/* Assign Dispatcher Modal */}
      <Modal open={showAssign} onClose={() => setShowAssign(false)} title="Asignar Despachador" footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="rh-btn rh-btn-secondary" onClick={() => setShowAssign(false)}>Cancelar</button>
          <button className="rh-btn rh-btn-primary" onClick={handleAssign} disabled={!selectedDispatcher || updating}>
            {updating ? 'Asignando...' : 'Asignar'}
          </button>
        </div>
      }>
        {dispatchers.length === 0 ? (
          <p style={{ color: '#94A3B8', textAlign: 'center', padding: 20 }}>
            No hay despachadores disponibles. Crea un usuario con rol "Despachador" primero.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dispatchers.map((d) => (
              <div key={d.id} onClick={() => setSelectedDispatcher(d.id)}
                style={{
                  padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
                  border: selectedDispatcher === d.id ? '2px solid #D3010A' : '1px solid #E2E0DE',
                  background: selectedDispatcher === d.id ? '#FEF2F2' : '#fff',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{d.full_name}</span>
                  <span style={{ color: '#8A8886', marginLeft: 8, fontSize: 13 }}>{d.email}</span>
                </div>
                <span style={{ fontSize: 13, color: d.active_orders === 0 ? '#10B981' : '#F59E0B' }}>
                  {d.active_orders} {d.active_orders === 1 ? 'orden activa' : 'órdenes activas'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Ship Modal */}
      <Modal open={showShipModal} onClose={() => setShowShipModal(false)} title="Despachar Orden" footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="rh-btn rh-btn-secondary" onClick={() => setShowShipModal(false)}>Cancelar</button>
          <button className="rh-btn rh-btn-primary" onClick={handleShip} disabled={!trackingNumber || updating}>
            {updating ? 'Despachando...' : 'Confirmar Despacho'}
          </button>
        </div>
      }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="rh-label">Carrier</label>
            <select className="rh-input" value={selectedCarrier} onChange={(e) => setSelectedCarrier(e.target.value)}>
              <option value="">Seleccionar carrier...</option>
              {carriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="rh-label">Número de Guía *</label>
            <input className="rh-input" placeholder="Ej: MRW-2026-456789" value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)} />
          </div>
          <div>
            <label className="rh-label">Notas</label>
            <textarea className="rh-input" placeholder="Notas del despacho..." rows={2}
              value={shipNotes} onChange={(e) => setShipNotes(e.target.value)} />
          </div>
        </div>
      </Modal>

      {/* Cancel Modal */}
      <Modal open={showCancelModal} onClose={() => setShowCancelModal(false)} title="Cancelar Orden" footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="rh-btn rh-btn-secondary" onClick={() => setShowCancelModal(false)}>Volver</button>
          <button className="rh-btn" style={{ background: '#D3010A', color: '#fff' }} onClick={handleCancel} disabled={updating}>
            {updating ? 'Cancelando...' : 'Confirmar Cancelación'}
          </button>
        </div>
      }>
        <div>
          <p style={{ fontSize: 14, color: '#475569', marginBottom: 12 }}>
            Esta acción no se puede deshacer. La orden pasará a estado "Cancelada".
          </p>
          <label className="rh-label">Motivo de cancelación</label>
          <textarea className="rh-input" placeholder="Razón por la que se cancela..." rows={3}
            value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
