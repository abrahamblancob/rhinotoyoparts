import { useState } from 'react';

interface WhatsAppShareButtonProps {
  trackingCode: string | null;
  receiverName: string | null;
  customerPhone: string | null;
  items: { name: string; quantity: number }[];
  orderStatus: string;
  dispatcherName?: string;
  estimatedMinutes?: number | null;
}

export function WhatsAppShareButton({
  trackingCode,
  receiverName,
  customerPhone,
  items,
  orderStatus,
  dispatcherName,
  estimatedMinutes,
}: WhatsAppShareButtonProps) {
  const [copied, setCopied] = useState(false);

  if (!trackingCode) return null;

  const trackingUrl = `${window.location.origin}/tracking/${trackingCode}`;

  const itemsList = items.map((i) => `  - ${i.name} (x${i.quantity})`).join('\n');

  const confirmMessage = `*Tu pedido de repuestos está confirmado*

Hola ${receiverName ?? 'estimado cliente'}! Tu pedido #${trackingCode} ya está siendo procesado.

Productos:
${itemsList}

Rastrea tu pedido en tiempo real aquí:
${trackingUrl}

Cuando el motorizado salga, podrás ver en el mapa exactamente dónde va tu pedido.

_Rhino Hub — Repuestos Toyota_`;

  const dispatchMessage = `*Tu pedido está en camino!*

${receiverName ?? 'Estimado cliente'}, ${dispatcherName ? `el motorizado ${dispatcherName}` : 'el motorizado'} ya salió con tu pedido #${trackingCode}.

${estimatedMinutes ? `Tiempo estimado: ~${estimatedMinutes} minutos` : ''}

Sigue el recorrido en vivo:
${trackingUrl}

_Rhino Hub — Repuestos Toyota_`;

  const isShipped = ['shipped', 'in_transit'].includes(orderStatus);
  const message = isShipped ? dispatchMessage : confirmMessage;
  const buttonLabel = isShipped ? 'Enviar aviso de despacho' : 'Enviar confirmación';

  const cleanPhone = customerPhone?.replace(/[^0-9+]/g, '') ?? '';
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone.startsWith('+') ? cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(trackingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 16px',
          background: '#25D366',
          color: '#fff',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 16 }}>📱</span>
        {buttonLabel}
      </a>
      <button
        onClick={handleCopyLink}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 16px',
          background: copied ? '#ECFDF5' : '#F1F5F9',
          color: copied ? '#059669' : '#475569',
          border: '1px solid',
          borderColor: copied ? '#A7F3D0' : '#E2E8F0',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {copied ? '✅ Copiado!' : '🔗 Copiar link de tracking'}
      </button>
    </div>
  );
}
