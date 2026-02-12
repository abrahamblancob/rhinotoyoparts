import type { PartAnalysisResult } from '../types/vision';

const WHATSAPP_NUMBERS = {
    alito: '584242121072',
    giuseppe: '584242121072'
};

export function generatePartInquiryMessage(partInfo: PartAnalysisResult): string {
    const message = `Hola! Vi un repuesto en Rhino Vision:

📦 *${partInfo.partType}*
📁 Categoría: ${partInfo.category}
🔧 Condición: ${partInfo.condition === 'new' ? 'Nuevo' : partInfo.condition === 'used' ? 'Usado' : partInfo.condition === 'damaged' ? 'Dañado' : 'A consultar'}

🚗 Modelos compatibles:
${partInfo.compatibleModels.map(model => `• ${model}`).join('\n')}

¿Tienen disponibilidad y cuál es el precio?`;

    return encodeURIComponent(message);
}

export function getWhatsAppUrl(partInfo: PartAnalysisResult, seller: 'alito' | 'giuseppe' = 'alito'): string {
    const phoneNumber = WHATSAPP_NUMBERS[seller];
    const message = generatePartInquiryMessage(partInfo);
    return `https://wa.me/${phoneNumber}?text=${message}`;
}
