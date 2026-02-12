/**
 * Analytics utility for sending custom events to Google Analytics 4 (gtag)
 * and Google Tag Manager (dataLayer).
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: Record<string, unknown>[];
  }
}

interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
  [key: string]: unknown;
}

/**
 * Sends a custom event to both GA4 (gtag) and GTM (dataLayer).
 */
export function trackEvent({ action, category, label, value, ...extra }: AnalyticsEvent): void {
  // GA4 via gtag
  if (typeof window.gtag === 'function') {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value,
      ...extra,
    });
  }

  // GTM via dataLayer
  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({
      event: action,
      event_category: category,
      event_label: label,
      value,
      ...extra,
    });
  }
}

// ── Pre-built event helpers ──────────────────────────────────────────

export function trackWhatsAppClick(sellerName: string, sellerRole: string): void {
  trackEvent({
    action: 'whatsapp_click',
    category: 'contact',
    label: sellerName,
    seller_name: sellerName,
    seller_role: sellerRole,
  });
}

export function trackNavClick(section: string): void {
  trackEvent({
    action: 'nav_click',
    category: 'navigation',
    label: section,
  });
}

export function trackMercadoLibreClick(): void {
  trackEvent({
    action: 'mercadolibre_click',
    category: 'ecommerce',
    label: 'tienda_mercadolibre',
  });
}
