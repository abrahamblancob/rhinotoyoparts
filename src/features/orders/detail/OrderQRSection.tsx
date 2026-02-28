import { QRCodeSVG } from 'qrcode.react';
import type { OrderQr } from './types.ts';

interface OrderQRSectionProps {
  orderQr: OrderQr;
}

export function OrderQRSection({ orderQr }: OrderQRSectionProps) {
  return (
    <div className="rh-card" style={{ padding: 20 }}>
      <h3 className="rh-card-title" style={{ marginBottom: 12 }}>QR de Orden</h3>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{
          background: '#fff', padding: 16, borderRadius: 12,
          border: orderQr.scanned_at ? '2px solid #10B981' : '2px solid #E2E8F0',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          <QRCodeSVG value={orderQr.qr_code} size={160} level="M" bgColor="#FFFFFF" fgColor="#1E293B" />
          <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#1E293B', letterSpacing: 0.5 }}>
            {orderQr.qr_code}
          </span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
            {orderQr.scanned_at
              ? 'El despachador ha tomado la orden.'
              : <>El despachador escanea este código desde <strong>Rhino Móvil</strong> para tomar la orden.</>}
          </p>
          {orderQr.scanned_at ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', background: '#ECFDF5', borderRadius: 8, fontSize: 13,
            }}>
              <span style={{ fontSize: 16 }}>✅</span>
              <div>
                <div style={{ fontWeight: 600, color: '#059669' }}>Escaneado</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>
                  {new Date(orderQr.scanned_at).toLocaleString('es-VE')}
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', background: '#FFF7ED', borderRadius: 8, fontSize: 13,
            }}>
              <span style={{ fontSize: 16 }}>⏳</span>
              <div>
                <div style={{ fontWeight: 600, color: '#D97706' }}>Pendiente de escaneo</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>
                  El despachador aún no ha tomado esta orden
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
