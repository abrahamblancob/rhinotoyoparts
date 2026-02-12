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

export function trackImageUpload(fileSize: number, fileType: string): void {
  trackEvent({
    action: 'image_upload',
    category: 'rhino_vision',
    label: 'part_image_uploaded',
    file_size_kb: Math.round(fileSize / 1024),
    file_type: fileType,
  });
}

export function trackImageUploadError(errorType: string): void {
  trackEvent({
    action: 'image_upload_error',
    category: 'rhino_vision',
    label: errorType,
    error_type: errorType,
  });
}

export function trackAnalysisStarted(): void {
  trackEvent({
    action: 'analysis_started',
    category: 'rhino_vision',
    label: 'ai_analysis_initiated',
  });
}

export function trackPartAnalysis(partType: string, category: string, condition: string, confidence: number): void {
  trackEvent({
    action: 'part_analysis_complete',
    category: 'rhino_vision',
    label: partType,
    value: confidence,
    part_type: partType,
    part_category: category,
    part_condition: condition,
    confidence_score: confidence,
  });
}

export function trackAnalysisError(errorMessage: string): void {
  trackEvent({
    action: 'analysis_error',
    category: 'rhino_vision',
    label: 'ai_analysis_failed',
    error_message: errorMessage,
  });
}

export function trackLowConfidenceResult(partType: string, confidence: number): void {
  trackEvent({
    action: 'low_confidence_result',
    category: 'rhino_vision',
    label: partType,
    value: confidence,
    part_type: partType,
    confidence_score: confidence,
  });
}

export function trackWhatsAppFromVision(partType: string, category: string, condition: string): void {
  trackEvent({
    action: 'whatsapp_from_vision',
    category: 'rhino_vision',
    label: partType,
    part_type: partType,
    part_category: category,
    part_condition: condition,
  });
}

export function trackRetryAnalysis(): void {
  trackEvent({
    action: 'retry_analysis',
    category: 'rhino_vision',
    label: 'user_retry_upload',
  });
}

export function trackPageView(pageName: string): void {
  trackEvent({
    action: 'page_view',
    category: 'navigation',
    label: pageName,
    page_name: pageName,
  });
}

