import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase.ts';
import { Navbar } from '@/components/layout/Navbar.tsx';
import { TrackingTimeline } from '@/components/tracking/TrackingTimeline.tsx';
import { TrackingItemsList } from '@/components/tracking/TrackingItemsList.tsx';
import { TrackingMap } from '@/components/tracking/TrackingMap.tsx';

interface TrackingData {
  tracking_code: string;
  status: string;
  confirmed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  estimated_minutes: number | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  dispatcher_lat: number | null;
  dispatcher_lng: number | null;
  dispatcher_updated_at: string | null;
  dispatcher_name: string | null;
  receiver_name: string | null;
  carrier_tracking: string | null;
  items: { name: string; quantity: number }[] | null;
  timeline: { status: string; timestamp: string }[] | null;
  error?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  draft: { label: 'Borrador', color: '#64748B', bg: '#F1F5F9', icon: '📝' },
  pending: { label: 'Pendiente', color: '#F59E0B', bg: '#FEF3C7', icon: '⏳' },
  confirmed: { label: 'Confirmado', color: '#6366F1', bg: '#EEF2FF', icon: '✅' },
  assigned: { label: 'Asignado', color: '#8B5CF6', bg: '#F5F3FF', icon: '👤' },
  preparing: { label: 'Preparando', color: '#F97316', bg: '#FFF7ED', icon: '📦' },
  ready_to_ship: { label: 'Listo para envío', color: '#0EA5E9', bg: '#F0F9FF', icon: '📋' },
  shipped: { label: 'Despachado', color: '#0EA5E9', bg: '#F0F9FF', icon: '🚚' },
  in_transit: { label: 'En camino', color: '#10B981', bg: '#ECFDF5', icon: '🏍️' },
  delivered: { label: 'Entregado', color: '#10B981', bg: '#ECFDF5', icon: '✅' },
  cancelled: { label: 'Cancelado', color: '#EF4444', bg: '#FEF2F2', icon: '❌' },
  returned: { label: 'Devuelto', color: '#EF4444', bg: '#FEF2F2', icon: '↩️' },
};

export function PublicTrackingPage() {
  const { code } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const [searchCode, setSearchCode] = useState(code ?? '');
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchTracking = async (trackingCode: string) => {
    const clean = trackingCode.trim().toUpperCase();
    if (!clean) return;
    setLoading(true);
    setNotFound(false);
    setTracking(null);

    const { data } = await supabase.rpc('get_public_tracking', { p_tracking_code: clean });
    const result = data as TrackingData | null;

    if (!result || result.error === 'not_found') {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setTracking(result);
    setLoading(false);

    // Navigate to URL with code if not already there
    if (!code) {
      navigate(`/tracking/${clean}`, { replace: true });
    }

    // Subscribe to realtime updates
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`tracking-${clean}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `tracking_code=eq.${clean}`,
        },
        () => {
          // Refetch on any change
          supabase.rpc('get_public_tracking', { p_tracking_code: clean }).then(({ data: refreshed }) => {
            const refreshedData = refreshed as TrackingData | null;
            if (refreshedData && !refreshedData.error) {
              setTracking(refreshedData);
            }
          });
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  useEffect(() => {
    if (code) {
      setSearchCode(code);
      fetchTracking(code);
    }
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTracking(searchCode);
  };

  const statusCfg = tracking ? STATUS_CONFIG[tracking.status] ?? STATUS_CONFIG.pending : null;
  const isMoving = tracking && ['shipped', 'in_transit'].includes(tracking.status);
  const isDelivered = tracking?.status === 'delivered';
  const isCancelled = tracking?.status === 'cancelled';

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '64px 20px 60px' }}>
        {/* Search section */}
        {!tracking && (
          <div style={{ textAlign: 'center', padding: '60px 0 40px' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📦</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1E293B', marginBottom: 8 }}>
              Rastrea tu pedido
            </h1>
            <p style={{ color: '#64748B', fontSize: 16, marginBottom: 32, maxWidth: 400, margin: '0 auto 32px' }}>
              Ingresa tu código de seguimiento para ver el estado de tu pedido en tiempo real
            </p>

            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, justifyContent: 'center', maxWidth: 480, margin: '0 auto' }}>
              <input
                type="text"
                placeholder="RH-XXXX-XXXX"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  fontSize: 18,
                  fontWeight: 600,
                  fontFamily: 'monospace',
                  border: '2px solid #E2E8F0',
                  borderRadius: 12,
                  outline: 'none',
                  letterSpacing: '0.05em',
                  textAlign: 'center',
                }}
              />
              <button
                type="submit"
                disabled={loading || !searchCode.trim()}
                style={{
                  padding: '14px 28px',
                  background: '#D3010A',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                  opacity: loading || !searchCode.trim() ? 0.5 : 1,
                }}
              >
                {loading ? '...' : '🔍 Buscar'}
              </button>
            </form>

            <p style={{ color: '#94A3B8', fontSize: 13, marginTop: 16 }}>
              Ejemplo: <strong>RH-A8F3-X7K2</strong> — Lo encuentras en el mensaje de WhatsApp que te envió tu vendedor.
            </p>
          </div>
        )}

        {/* Not found */}
        {notFound && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>❌</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>
              Código no encontrado
            </h2>
            <p style={{ color: '#64748B', fontSize: 15, marginBottom: 8 }}>
              No encontramos ningún pedido con el código <strong style={{ fontFamily: 'monospace' }}>"{searchCode}"</strong>
            </p>
            <p style={{ color: '#94A3B8', fontSize: 14, marginBottom: 24 }}>
              Verifica que el código sea correcto. Lo encuentras en el mensaje de WhatsApp que te envió tu vendedor.
            </p>
            <button
              onClick={() => { setNotFound(false); setSearchCode(''); navigate('/tracking'); }}
              style={{
                padding: '12px 28px',
                background: '#D3010A',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Intentar de nuevo
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12, animation: 'pulse 1.5s infinite' }}>📦</div>
            <p style={{ color: '#64748B' }}>Buscando tu pedido...</p>
          </div>
        )}

        {/* Tracking result */}
        {tracking && statusCfg && (
          <div>
            {/* Top: back to search + mini search */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <button
                onClick={() => { setTracking(null); setSearchCode(''); navigate('/tracking'); }}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 14 }}
              >
                ← Buscar otro pedido
              </button>
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: 4 }}>
                <input
                  type="text"
                  placeholder="RH-XXXX-XXXX"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                  style={{ padding: '6px 12px', fontSize: 13, fontFamily: 'monospace', border: '1px solid #E2E8F0', borderRadius: 8, width: 160 }}
                />
                <button type="submit" style={{ padding: '6px 12px', background: '#1E293B', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                  Buscar
                </button>
              </form>
            </div>

            {/* Status hero */}
            <div style={{
              background: '#fff',
              borderRadius: 16,
              padding: '24px 28px',
              marginBottom: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
            }}>
              <div>
                <p style={{ fontSize: 13, color: '#64748B', marginBottom: 4 }}>Pedido</p>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1E293B', margin: 0, fontFamily: 'monospace' }}>
                  {tracking.tracking_code}
                </h1>
                {tracking.receiver_name && (
                  <p style={{ fontSize: 14, color: '#64748B', marginTop: 4 }}>
                    Para: <strong>{tracking.receiver_name}</strong>
                  </p>
                )}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 20px',
                background: statusCfg.bg,
                borderRadius: 12,
              }}>
                <span style={{ fontSize: 24 }}>{statusCfg.icon}</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: statusCfg.color }}>
                  {statusCfg.label.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Delivered state */}
            {isDelivered && (
              <div style={{
                background: '#ECFDF5',
                borderRadius: 16,
                padding: '32px',
                marginBottom: 20,
                textAlign: 'center',
                border: '2px solid #A7F3D0',
              }}>
                <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#065F46', marginBottom: 8 }}>
                  Tu pedido fue entregado
                </h2>
                {tracking.delivered_at && (
                  <p style={{ color: '#047857', fontSize: 15 }}>
                    {new Date(tracking.delivered_at).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })} a las {new Date(tracking.delivered_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
                {tracking.dispatcher_name && (
                  <p style={{ color: '#059669', fontSize: 14, marginTop: 4 }}>
                    Entregado por: <strong>{tracking.dispatcher_name.split(' ')[0]}</strong>
                  </p>
                )}
                {tracking.confirmed_at && tracking.delivered_at && (
                  <p style={{ color: '#6EE7B7', fontSize: 13, marginTop: 12 }}>
                    Tiempo total: {Math.round((new Date(tracking.delivered_at).getTime() - new Date(tracking.confirmed_at).getTime()) / 60000)} minutos
                  </p>
                )}
              </div>
            )}

            {/* Cancelled state */}
            {isCancelled && (
              <div style={{
                background: '#FEF2F2',
                borderRadius: 16,
                padding: '32px',
                marginBottom: 20,
                textAlign: 'center',
                border: '2px solid #FECACA',
              }}>
                <div style={{ fontSize: 56, marginBottom: 12 }}>❌</div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#991B1B', marginBottom: 8 }}>
                  Este pedido fue cancelado
                </h2>
                <p style={{ color: '#B91C1C', fontSize: 14 }}>
                  Contacta a tu vendedor para más información.
                </p>
              </div>
            )}

            {/* Map (only when in transit) */}
            {isMoving && tracking.dispatcher_lat && tracking.dispatcher_lng && (
              <TrackingMap
                dispatcherLat={tracking.dispatcher_lat}
                dispatcherLng={tracking.dispatcher_lng}
                deliveryLat={tracking.delivery_lat}
                deliveryLng={tracking.delivery_lng}
                dispatcherName={tracking.dispatcher_name?.split(' ')[0] ?? 'Motorizado'}
                lastUpdate={tracking.dispatcher_updated_at}
                estimatedMinutes={tracking.estimated_minutes}
              />
            )}

            {/* Items + Timeline grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Items */}
              {tracking.items && tracking.items.length > 0 && (
                <TrackingItemsList items={tracking.items} />
              )}

              {/* Timeline */}
              {tracking.timeline && tracking.timeline.length > 0 && (
                <TrackingTimeline
                  timeline={tracking.timeline}
                  currentStatus={tracking.status}
                  dispatcherName={tracking.dispatcher_name?.split(' ')[0]}
                />
              )}
            </div>

            {/* Help */}
            <div style={{
              textAlign: 'center',
              padding: '24px',
              marginTop: 20,
              background: '#fff',
              borderRadius: 12,
              color: '#64748B',
              fontSize: 14,
            }}>
              ¿Necesitas ayuda? Contacta a tu vendedor por WhatsApp
            </div>

            {/* Branding */}
            <div style={{ textAlign: 'center', marginTop: 24, color: '#CBD5E1', fontSize: 12 }}>
              Powered by{' '}
              <a
                href="https://www.wabyte.net"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#94A3B8', fontWeight: 600, textDecoration: 'none' }}
              >
                Wabyte
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
