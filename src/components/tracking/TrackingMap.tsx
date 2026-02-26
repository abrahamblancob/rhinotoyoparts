import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
  }
}

interface TrackingMapProps {
  dispatcherLat: number;
  dispatcherLng: number;
  deliveryLat: number | null;
  deliveryLng: number | null;
  dispatcherName: string;
  lastUpdate: string | null;
  estimatedMinutes: number | null;
}

// Leaflet CSS injected once
let leafletCssInjected = false;
function injectLeafletCss() {
  if (leafletCssInjected) return;
  leafletCssInjected = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
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
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [gpsFlash, setGpsFlash] = useState(false);
  const prevCoordsRef = useRef({ lat: dispatcherLat, lng: dispatcherLng });

  const apiKey = (import.meta as unknown as { env: Record<string, string> }).env.VITE_GOOGLE_MAPS_KEY;

  // Load Google Maps script dynamically (only if API key exists)
  useEffect(() => {
    if (!apiKey) {
      // Use Leaflet fallback
      injectLeafletCss();
      setMapLoaded(true);
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

  // Init Google Maps
  useEffect(() => {
    if (!apiKey || !mapLoaded || !mapRef.current || !window.google?.maps) return;

    const g = window.google;
    const center = { lat: dispatcherLat, lng: dispatcherLng };

    const map = new g.maps.Map(mapRef.current, {
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

    if (g.maps.marker?.AdvancedMarkerElement) {
      const marker = new g.maps.marker.AdvancedMarkerElement({
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

      if (g.maps.marker?.AdvancedMarkerElement) {
        const destMarker = new g.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat: deliveryLat, lng: deliveryLng },
          content: destEl,
          title: 'Destino',
        });
        destMarkerRef.current = destMarker;
      }

      // Fit bounds to show both markers
      const bounds = new g.maps.LatLngBounds();
      bounds.extend(center);
      bounds.extend({ lat: deliveryLat, lng: deliveryLng });
      map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
    }
  }, [mapLoaded]);

  // Init Leaflet map (fallback when no Google API key)
  useEffect(() => {
    if (apiKey || !mapLoaded || !mapRef.current) return;
    // Avoid re-init
    if (mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [dispatcherLat, dispatcherLng],
      zoom: 14,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    mapInstance.current = map;

    // Dispatcher marker (motorcycle emoji)
    const motoIcon = L.divIcon({
      html: '<div style="font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">🏍️</div>',
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const dispatcherMarker = L.marker([dispatcherLat, dispatcherLng], {
      icon: motoIcon,
      title: dispatcherName,
    }).addTo(map);
    dispatcherMarker.bindPopup(`<strong>${dispatcherName}</strong><br/>Despachador`);
    markerRef.current = dispatcherMarker;

    // Destination marker
    if (deliveryLat && deliveryLng) {
      const destIcon = L.divIcon({
        html: '<div style="font-size:24px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">📍</div>',
        className: '',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      });

      const destMarker = L.marker([deliveryLat, deliveryLng], {
        icon: destIcon,
        title: 'Destino',
      }).addTo(map);
      destMarker.bindPopup('<strong>Destino</strong><br/>Punto de entrega');
      destMarkerRef.current = destMarker;

      // Fit bounds to show both markers
      const bounds = L.latLngBounds(
        [dispatcherLat, dispatcherLng],
        [deliveryLat, deliveryLng]
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    // Fix Leaflet size issues when container is hidden then shown
    setTimeout(() => map.invalidateSize(), 100);
  }, [mapLoaded]);

  // Update dispatcher position when props change (both Google & Leaflet)
  useEffect(() => {
    if (!markerRef.current) return;

    if (apiKey) {
      // Google Maps
      markerRef.current.position = { lat: dispatcherLat, lng: dispatcherLng };
    } else {
      // Leaflet
      markerRef.current.setLatLng([dispatcherLat, dispatcherLng]);
      if (mapInstance.current && destMarkerRef.current) {
        const bounds = L.latLngBounds(
          [dispatcherLat, dispatcherLng],
          destMarkerRef.current.getLatLng()
        );
        mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [dispatcherLat, dispatcherLng]);

  // Flash animation when GPS coordinates change
  useEffect(() => {
    const prev = prevCoordsRef.current;
    if (prev.lat !== dispatcherLat || prev.lng !== dispatcherLng) {
      prevCoordsRef.current = { lat: dispatcherLat, lng: dispatcherLng };
      setGpsFlash(true);
      const t = setTimeout(() => setGpsFlash(false), 1500);
      return () => clearTimeout(t);
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

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div ref={mapRef} style={{ width: '100%', height: 320 }} />

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
          <span style={{ fontSize: 20, transition: 'transform 0.3s', transform: gpsFlash ? 'scale(1.3)' : 'scale(1)' }}>🏍️</span>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', margin: 0 }}>
              {dispatcherName} viene en camino
              {gpsFlash && (
                <span style={{
                  marginLeft: 8, fontSize: 11, fontWeight: 500,
                  color: '#10B981', animation: 'fadeOut 1.5s ease-out forwards',
                }}>
                  📡 Ubicación actualizada
                </span>
              )}
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

      <style>{`
        @keyframes fadeOut {
          0% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
