import { WHATSAPP_BASE_URL } from '../config/contact';

export function useWhatsappLink(phoneNumber: string, message?: string): string {
  const encodedMessage = message ? `?text=${encodeURIComponent(message)}` : '';
  return `${WHATSAPP_BASE_URL}${phoneNumber}${encodedMessage}`;
}
