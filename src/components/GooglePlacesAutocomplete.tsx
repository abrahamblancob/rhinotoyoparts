import { useEffect, useRef, useState, useCallback } from 'react';
import { ENV } from '../config/env';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
    __gmapsPlacesLoading?: boolean;
  }
}

export interface PlaceResult {
  address: string;
  lat: number;
  lng: number;
}

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onPlaceSelect?: (place: PlaceResult) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Google Places Autocomplete input component.
 * Loads the Google Maps Places library dynamically (only once).
 * Falls back to a plain text input when no API key is configured.
 */
export default function GooglePlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Escribe la dirección...',
  className,
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const apiKey = ENV.GOOGLE_MAPS_KEY;

  // ── Load Google Maps script with Places library ──
  useEffect(() => {
    if (!apiKey) return;

    // Already fully loaded with Places
    if (window.google?.maps?.places) {
      setScriptLoaded(true);
      return;
    }

    // Another instance is already loading the script
    if (window.__gmapsPlacesLoading) {
      const interval = setInterval(() => {
        if (window.google?.maps?.places) {
          setScriptLoaded(true);
          clearInterval(interval);
        }
      }, 200);
      return () => clearInterval(interval);
    }

    // Google Maps loaded but WITHOUT Places (e.g., by TrackingMap with only "marker")
    // We can't re-load the core script, but we can load the places library separately
    if (window.google?.maps && !window.google.maps.places) {
      // Use importLibrary if available (Google Maps JS API v3.56+)
      if (typeof window.google.maps.importLibrary === 'function') {
        window.google.maps.importLibrary('places').then(() => {
          setScriptLoaded(true);
        });
        return;
      }
    }

    // Load script from scratch
    window.__gmapsPlacesLoading = true;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`;
    script.async = true;
    script.onload = () => {
      window.__gmapsPlacesLoading = false;
      setScriptLoaded(true);
    };
    script.onerror = () => {
      window.__gmapsPlacesLoading = false;
      console.error('[GooglePlacesAutocomplete] Failed to load Google Maps script');
    };
    document.head.appendChild(script);
  }, [apiKey]);

  // ── Initialize Autocomplete on the input ──
  useEffect(() => {
    if (!scriptLoaded || !inputRef.current || !window.google?.maps?.places) return;
    if (autocompleteRef.current) return; // Already initialized

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 've' },
      fields: ['formatted_address', 'geometry'],
      types: ['address'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place?.geometry?.location) return;

      const address = place.formatted_address || '';
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      onChange(address);
      onPlaceSelect?.({ address, lat, lng });
    });

    autocompleteRef.current = autocomplete;

    return () => {
      // Cleanup: remove the pac-container created by Google
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [scriptLoaded, onChange, onPlaceSelect]);

  // ── Handle manual typing ──
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  return (
    <input
      ref={inputRef}
      type="text"
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      autoComplete="off"
    />
  );
}
