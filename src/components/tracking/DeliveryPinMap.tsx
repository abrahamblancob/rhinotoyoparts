import { useEffect, useRef, useState } from 'react';
import { ENV } from '../../config/env';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
  }
}

interface DeliveryPinMapProps {
  /** Latitude — if null, will attempt to geocode the address */
  lat?: number | null;
  /** Longitude — if null, will attempt to geocode the address */
  lng?: number | null;
  /** Address text — used for display and geocoding fallback */
  address?: string;
}

/**
 * Lightweight map that shows a single delivery pin.
 * Used on the order detail page before a dispatcher is assigned.
 * Only rendered for Super Admin to save Google Maps API quota.
 *
 * If lat/lng are not provided but address is, the component will
 * geocode the address using Google Maps Geocoding API.
 */
export function DeliveryPinMap({ lat, lng, address }: DeliveryPinMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [resolvedLat, setResolvedLat] = useState<number | null>(lat ?? null);
  const [resolvedLng, setResolvedLng] = useState<number | null>(lng ?? null);
  const [geocoding, setGeocoding] = useState(false);
  const apiKey = ENV.GOOGLE_MAPS_KEY;

  // Load Google Maps script
  useEffect(() => {
    if (!apiKey) return;
    if (window.google?.maps) {
      setMapLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&v=weekly`;
    script.async = true;
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  }, [apiKey]);

  // Geocode address if no coordinates provided
  useEffect(() => {
    if (lat && lng) {
      setResolvedLat(lat);
      setResolvedLng(lng);
      return;
    }
    if (!address || !mapLoaded || !window.google?.maps) return;

    setGeocoding(true);
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address }, (results: any[], status: string) => {
      setGeocoding(false);
      if (status === 'OK' && results?.[0]?.geometry?.location) {
        const loc = results[0].geometry.location;
        setResolvedLat(loc.lat());
        setResolvedLng(loc.lng());
      }
    });
  }, [lat, lng, address, mapLoaded]);

  // Init map with pin
  useEffect(() => {
    if (!apiKey || !mapLoaded || !mapRef.current || !window.google?.maps) return;
    if (resolvedLat == null || resolvedLng == null) return;

    const g = window.google;
    const center = { lat: resolvedLat, lng: resolvedLng };

    const map = new g.maps.Map(mapRef.current, {
      center,
      zoom: 15,
      disableDefaultUI: true,
      zoomControl: true,
      mapId: 'delivery-pin-map',
    });

    // Advanced marker with pin emoji
    if (g.maps.marker?.AdvancedMarkerElement) {
      const pinEl = document.createElement('div');
      pinEl.style.fontSize = '28px';
      pinEl.textContent = '📍';

      new g.maps.marker.AdvancedMarkerElement({
        map,
        position: center,
        content: pinEl,
        title: address || 'Dirección de entrega',
      });
    } else {
      new g.maps.Marker({
        map,
        position: center,
        title: address || 'Dirección de entrega',
      });
    }

    mapInstance.current = map;
  }, [apiKey, mapLoaded, resolvedLat, resolvedLng, address]);

  if (!apiKey) return null;
  // Nothing to show if no coordinates and no address to geocode
  if (!lat && !lng && !address) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      {geocoding && (
        <div style={{
          height: 280, borderRadius: 12, border: '1px solid #E2E8F0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#F8FAFC', color: '#94A3B8', fontSize: 14,
        }}>
          Cargando mapa...
        </div>
      )}
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: 280,
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid #E2E8F0',
          display: (resolvedLat != null && resolvedLng != null && !geocoding) ? 'block' : 'none',
        }}
      />
      {address && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 12px',
          background: '#F8FAFC',
          borderRadius: '0 0 12px 12px',
          marginTop: -12,
          fontSize: 13,
          color: '#475569',
          borderLeft: '1px solid #E2E8F0',
          borderRight: '1px solid #E2E8F0',
          borderBottom: '1px solid #E2E8F0',
        }}>
          <span>📍</span>
          <span>{address}</span>
        </div>
      )}
    </div>
  );
}
