import { supabase } from '../lib/supabase';
import type { VisionSearchResponse } from '../types/vision';

/**
 * Calls the Rhino Vision Edge Function.
 * Sends the image to Claude Vision via the backend (API key stays server-side)
 * and searches for matching products in the DB.
 */
export async function analyzePartWithVision(
    imageBase64: string,
    mimeType: string,
): Promise<VisionSearchResponse> {
    console.log('🦏 Calling Rhino Vision Edge Function...');
    console.log('📝 MIME type:', mimeType);
    console.log('📝 Base64 size:', imageBase64.length, 'chars');

    const { data, error } = await supabase.functions.invoke('rhino-vision', {
        body: {
            image_base64: imageBase64,
            mime_type: mimeType,
        },
    });

    if (error) {
        console.error('❌ Edge Function error:', error);
        throw new Error(error.message || 'Error al conectar con Rhino Vision');
    }

    if (data?.error) {
        console.error('❌ API error:', data.error);
        throw new Error(data.error);
    }

    console.log('✅ Rhino Vision response:', data);
    return data as VisionSearchResponse;
}

/**
 * Generate a WhatsApp message URL for buying a product.
 */
export function getWhatsAppBuyUrl(
    whatsapp: string,
    productName: string,
    sku: string,
    price: number,
): string {
    const cleanNumber = whatsapp.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
        `¡Hola! Vi en Rhino Vision que tienen *${productName}* (SKU: ${sku}) a $${price.toFixed(2)}. Me interesa comprarlo.`
    );
    return `https://wa.me/${cleanNumber}?text=${message}`;
}

/**
 * Generate a WhatsApp message URL for requesting a product not in stock.
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
        `¡Hola! Estoy buscando *${partName}*${oemText} - ${category}. ¿Pueden ayudarme a conseguirlo?`
    );
    return `https://wa.me/${defaultNumber}?text=${message}`;
}
