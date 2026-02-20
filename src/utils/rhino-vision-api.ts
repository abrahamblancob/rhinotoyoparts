import type { VisionSearchResponse } from '../types/vision';
import { ENV } from '../config/env';

/**
 * Convert a File to base64 string (without data URL prefix).
 */
export function imageToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Calls the Rhino Vision Edge Function via direct fetch.
 * This gives us full control over error handling (supabase.functions.invoke hides error details).
 */
export async function analyzePartWithVision(
    imageBase64: string,
    mimeType: string,
): Promise<VisionSearchResponse> {
    const response = await fetch(`${ENV.SUPABASE_URL}/functions/v1/rhino-vision`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ENV.SUPABASE_ANON_KEY}`,
            'apikey': ENV.SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({
            image_base64: imageBase64,
            mime_type: mimeType,
        }),
    });

    let data;
    try {
        data = await response.json();
    } catch {
        console.error('Response is not JSON, status:', response.status);
        throw new Error(`Error del servidor (${response.status})`);
    }

    if (!response.ok) {
        const errorMsg = data?.error || `Error del servidor (${response.status})`;
        console.error('Edge Function error:', response.status, errorMsg);
        throw new Error(errorMsg);
    }

    if (data?.error) {
        console.error('API error:', data.error);
        throw new Error(data.error);
    }

    return data as VisionSearchResponse;
}

/**
 * Generate a WhatsApp message URL for buying a product found in stock.
 */
export function getWhatsAppBuyUrl(
    whatsapp: string,
    productName: string,
    sku: string,
    _price?: number,
): string {
    const cleanNumber = whatsapp.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
        `¡Hola! Encontré *${productName}* (SKU: ${sku}) a través de *Rhino Vision*. Me interesa comprarlo.`
    );
    return `https://wa.me/${cleanNumber}?text=${message}`;
}

/**
 * Generate a WhatsApp message URL for requesting a product not found in stock.
 */
export function getWhatsAppRequestUrl(
    partName: string,
    oemNumber: string | null,
    category: string,
): string {
    // Use the first seller's number as default request contact
    const defaultNumber = '584241396324'; // Diego
    const oemText = oemNumber ? ` (OEM: ${oemNumber})` : '';
    const message = encodeURIComponent(
        `¡Hola! Busqué *${partName}*${oemText} (${category}) en *Rhino Vision* pero no está disponible. ¿Pueden ayudarme a conseguirlo?`
    );
    return `https://wa.me/${defaultNumber}?text=${message}`;
}
