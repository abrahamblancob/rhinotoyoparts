import { useEffect, useRef, useState } from 'react';
import { ENV } from '../../config/env';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
    __gmapsPlacesLoading?: boolean;
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
 * resolve coordinates using Google Maps Geocoder → Places text search fallback.
 */
export function DeliveryPinMap({ lat, lng, address }: DeliveryPinMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const geocodedRef = useRef(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [resolvedLat, setResolvedLat] = useState<number | null>(lat ?? null);
  const [resolvedLng, setResolvedLng] = useState<number | null>(lng ?? null);
  const [geocodeFailed, setGeocodeFailed] = useState(false);
  const apiKey = ENV.GOOGLE_MAPS_KEY;

  // Load Google Maps script with places library
  useEffect(() => {
    if (!apiKey) return;

    // Already loaded with both maps + places
    if (window.google?.maps) {
      // Try loading places if not loaded
      if (!window.google.maps.places && typeof window.google.maps.importLibrary === 'function') {
        window.google.maps.importLibrary('places').then(() => setMapLoaded(true));
      } else {
        setMapLoaded(true);
      }
      return;
    }

    if (window.__gmapsPlacesLoading) {
      const interval = setInterval(() => {
        if (window.google?.maps) { setMapLoaded(true); clearInterval(interval); }
      }, 200);
      return () => clearInterval(interval);
    }

    window.__gmapsPlacesLoading = true;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker,places&v=weekly`;
    script.async = true;
    script.onload = () => { window.__gmapsPlacesLoading = false; setMapLoaded(true); };
    script.onerror = () => { window.__gmapsPlacesLoading = false; };
    document.head.appendChild(script);
  }, [apiKey]);

  // Geocode address if no coordinates provided
  useEffect(() => {
    if (lat && lng) {
      setResolvedLat(lat);
      setResolvedLng(lng);
      return;
    }
    if (!address || !mapLoaded || !window.google?.maps || geocodedRef.current) return;
    geocodedRef.current = true;

    // Try Geocoder first
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address }, (results: any[], status: string) => {
      if (status === 'OK' && results?.[0]?.geometry?.location) {
        const loc = results[0].geometry.location;
        setResolvedLat(loc.lat());
        setResolvedLng(loc.lng());
        return;
      }
      console.warn('[DeliveryPinMap] Geocoder failed:', status, '— trying Places text search');

      // Fallback: Places textSearch (uses Places API which is already enabled)
      if (window.google.maps.places) {
        const dummyDiv = document.createElement('div');
        const service = new window.google.maps.places.PlacesService(dummyDiv);
        service.textSearch({ query: address }, (placeResults: any[], placeStatus: string) => {
          if (placeStatus === 'OK' && placeResults?.[0]?.geometry?.location) {
            const loc = placeResults[0].geometry.location;
            setResolvedLat(loc.lat());
            setResolvedLng(loc.lng());
          } else {
            console.warn('[DeliveryPinMap] Places text search also failed:', placeStatus);
            setGeocodeFailed(true);
          }
        });
      } else {
        setGeocodeFailed(true);
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
  if (!lat && !lng && !address) return null;

  const hasMap = resolvedLat != null && resolvedLng != null;
  const loading = !hasMap && !geocodeFailed;

  return (
    <div style={{ marginBottom: 20 }}>
      {loading && (
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
          display: hasMap ? 'block' : 'none',
        }}
      />
      {address && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 12px',
          background: '#F8FAFC',
          borderRadius: hasMap ? '0 0 12px 12px' : '12px',
          marginTop: hasMap ? -12 : 0,
          fontSize: 13,
          color: '#475569',
          border: '1px solid #E2E8F0',
          borderTop: hasMap ? 'none' : '1px solid #E2E8F0',
        }}>
          <span>📍</span>
          <span>{address}</span>
        </div>
      )}
    </div>
  );
}
