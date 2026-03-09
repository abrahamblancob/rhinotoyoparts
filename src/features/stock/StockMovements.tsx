import {
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

export function StockMovements() {
  return (
    <div>
      <div className="rh-page-header">
        <div>
          <h1 className="rh-page-title">Historial de Movimientos</h1>
          <p style={{ color: '#8A8886', fontSize: 14, marginTop: 4 }}>
            Registro completo de todos los movimientos de inventario
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div
        style={{
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <ArrowRightLeft size={20} style={{ color: '#3B82F6', flexShrink: 0, marginTop: 2 }} />
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1E40AF', marginBottom: 4 }}>
            Trazabilidad de Inventario
          </h3>
          <p style={{ fontSize: 13, color: '#1E3A5F', lineHeight: 1.5 }}>
            Esta seccion registra automaticamente todos los movimientos de stock: entradas por recepcion,
            salidas por despacho, transferencias entre ubicaciones y ajustes manuales. Cada movimiento
            queda registrado con fecha, usuario responsable y motivo.
          </p>
        </div>
      </div>

      {/* Movement type legend */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#605E5C' }}>
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              backgroundColor: '#10B98115',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowDownLeft size={14} style={{ color: '#10B981' }} />
          </span>
          Entrada
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#605E5C' }}>
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              backgroundColor: '#D3010A15',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowUpRight size={14} style={{ color: '#D3010A' }} />
          </span>
          Salida
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#605E5C' }}>
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              backgroundColor: '#3B82F615',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowRightLeft size={14} style={{ color: '#3B82F6' }} />
          </span>
          Transferencia
        </div>
      </div>

      {/* Placeholder table */}
      <div className="rh-table-wrapper">
        <table className="rh-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Desde</th>
              <th />
              <th>Hacia</th>
              <th className="text-right">Cantidad</th>
              <th>Tipo</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            {/* Placeholder rows for illustration */}
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#8A8886' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <ArrowRightLeft size={32} style={{ color: '#C8C6C4' }} />
                  <p style={{ fontSize: 15, fontWeight: 500 }}>Sin movimientos registrados</p>
                  <p style={{ fontSize: 13 }}>
                    Los movimientos de stock se registraean automaticamente al recibir, despachar
                    o transferir productos entre ubicaciones.
                  </p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
