import { useEffect, useRef, useState } from 'react';

interface TrackingMapProps {
  dispatcherLat: number;
  dispatcherLng: number;
  deliveryLat: number | null;
  deliveryLng: number | null;
  dispatcherName: string;
  lastUpdate: string | null;
  estimatedMinutes: number | null;
}

export function TrackingMap({
  dispatcherLat,
  dispatcherLng,
  deliveryLat,
  deliveryLng,
  dispatcherName,
  lastUpdate,
  estimatedMinutes,
}: TrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const destMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Load Google Maps script dynamically
  useEffect(() => {
    const apiKey = (import.meta as unknown as { env: Record<string, string> }).env.VITE_GOOGLE_MAPS_KEY;
    if (!apiKey) {
      // No API key — show static fallback
      return;
    }
    if (window.google?.maps) {
      setMapLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&v=weekly`;
    script.async = true;
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Init map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !window.google?.maps) return;

    const center = { lat: dispatcherLat, lng: dispatcherLng };

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: 14,
      disableDefaultUI: true,
      zoomControl: true,
      mapId: 'rhino-tracking',
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    });

    mapInstance.current = map;

    // Dispatcher marker
    const motoEl = document.createElement('div');
    motoEl.style.cssText = 'font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));';
    motoEl.textContent = '🏍️';

    if (google.maps.marker?.AdvancedMarkerElement) {
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: center,
        content: motoEl,
        title: dispatcherName,
      });
      markerRef.current = marker;
    }

    // Destination marker
    if (deliveryLat && deliveryLng) {
      const destEl = document.createElement('div');
      destEl.style.cssText = 'font-size:24px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));';
      destEl.textContent = '📍';

      if (google.maps.marker?.AdvancedMarkerElement) {
        const destMarker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat: deliveryLat, lng: deliveryLng },
          content: destEl,
          title: 'Destino',
        });
        destMarkerRef.current = destMarker;
      }

      // Fit bounds to show both markers
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(center);
      bounds.extend({ lat: deliveryLat, lng: deliveryLng });
      map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
    }
  }, [mapLoaded]);

  // Update dispatcher position when props change
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.position = { lat: dispatcherLat, lng: dispatcherLng };
    }
  }, [dispatcherLat, dispatcherLng]);

  const timeAgo = lastUpdate
    ? Math.round((Date.now() - new Date(lastUpdate).getTime()) / 1000)
    : null;
  const timeAgoStr = timeAgo !== null
    ? timeAgo < 60 ? `hace ${timeAgo}s`
      : timeAgo < 3600 ? `hace ${Math.round(timeAgo / 60)} min`
        : `hace ${Math.round(timeAgo / 3600)}h`
    : null;

  const apiKey = (import.meta as unknown as { env: Record<string, string> }).env.VITE_GOOGLE_MAPS_KEY;

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      {apiKey ? (
        <div ref={mapRef} style={{ width: '100%', height: 320 }} />
      ) : (
        /* Static map fallback — no API key needed for embed */
        <div style={{ width: '100%', height: 320, position: 'relative', background: '#E2E8F0' }}>
          <iframe
            title="Ubicación del motorizado"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            src={`https://www.google.com/maps?q=${dispatcherLat},${dispatcherLng}&z=14&output=embed`}
          />
        </div>
      )}

      {/* Info bar */}
      <div style={{
        padding: '14px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#F8FAFC',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🏍️</span>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', margin: 0 }}>
              {dispatcherName} viene en camino
            </p>
            {timeAgoStr && (
              <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>
                Última actualización: {timeAgoStr}
              </p>
            )}
          </div>
        </div>
        {estimatedMinutes && (
          <div style={{
            padding: '6px 14px',
            background: '#ECFDF5',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            color: '#059669',
          }}>
            ~{estimatedMinutes} min
          </div>
        )}
      </div>
    </div>
  );
}
