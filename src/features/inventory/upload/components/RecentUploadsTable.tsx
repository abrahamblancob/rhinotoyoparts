import { useEffect, useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { fetchRecentUploads, deleteLot } from '../uploadBatch.ts';

interface BulkUploadRow {
  id: string;
  lot_id: string | null;
  file_name: string;
  created_at: string;
  success_rows: number;
  error_rows: number;
  total_rows: number;
  total_stock: number;
  inventory_value: number;
  status: string;
  profiles: { full_name: string } | null;
  inventory_lots: { lot_number: string } | null;
}

interface Props {
  orgId: string;
  refreshKey?: number;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate();
  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
  ];
  const month = months[d.getMonth()];
  const hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  const h12 = hours % 12 || 12;
  return `${day} ${month}, ${h12}:${mins}${ampm}`;
}

function fmtCurrency(n: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function RecentUploadsTable({ orgId, refreshKey }: Props) {
  const { isPlatformOwner } = usePermissions();
  const [uploads, setUploads] = useState<BulkUploadRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<BulkUploadRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRecentUploads(orgId).then((data) => {
      if (!cancelled) {
        setUploads(data as BulkUploadRow[]);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [orgId, refreshKey]);

  const handleDeleteLot = async () => {
    if (!deleteTarget?.lot_id) return;
    setDeleteLoading(true);
    setDeleteError('');

    const result = await deleteLot(deleteTarget.lot_id);

    if (!result.success) {
      setDeleteError(result.error ?? 'Error desconocido');
      setDeleteLoading(false);
      return;
    }

    // Remove from local state
    setUploads((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleteLoading(false);
  };

  if (loading) {
    return (
      <div className="rh-card" style={{ padding: 24 }}>
        <p style={{ color: '#8A8886', fontSize: 14 }}>Cargando historial...</p>
      </div>
    );
  }

  if (uploads.length === 0) {
    return (
      <div className="rh-card" style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ color: '#8A8886', fontSize: 14 }}>
          No hay cargas recientes. Sube tu primer archivo para ver el historial aqui.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rh-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px 0' }}>
          <h3 className="rh-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            📁 Ultimas Cargas
          </h3>
        </div>
        <div className="rh-table-wrapper" style={{ overflowX: 'auto' }}>
          <table className="rh-table">
            <thead>
              <tr>
                <th>Lote</th>
                <th>Archivo</th>
                <th>Subido por</th>
                <th>Fecha</th>
                <th className="text-right">Productos</th>
                <th className="text-right">Stock</th>
                <th className="text-right">Valor (USD)</th>
                <th style={{ textAlign: 'center' }}>Estado</th>
                <th>Resultado</th>
                {isPlatformOwner && <th style={{ textAlign: 'center', width: 60 }}></th>}
              </tr>
            </thead>
            <tbody>
              {uploads.map((u) => (
                <tr key={u.id}>
                  <td className="cell-mono" style={{ fontSize: 12, whiteSpace: 'nowrap', color: '#6366F1', fontWeight: 600 }}>
                    {u.inventory_lots?.lot_number ?? '—'}
                  </td>
                  <td className="cell-primary" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.file_name}
                  </td>
                  <td className="cell-muted">
                    {u.profiles?.full_name ?? '—'}
                  </td>
                  <td className="cell-muted" style={{ whiteSpace: 'nowrap' }}>
                    {formatDate(u.created_at)}
                  </td>
                  <td className="text-right cell-bold">
                    {u.total_rows.toLocaleString()}
                  </td>
                  <td className="text-right cell-mono">
                    {(u.total_stock ?? 0).toLocaleString()}
                  </td>
                  <td className="text-right cell-bold" style={{ color: '#10B981' }}>
                    ${fmtCurrency(u.inventory_value ?? 0)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        backgroundColor:
                          u.status === 'completed' ? '#ECFDF5' :
                          u.status === 'failed' ? '#FEF2F2' : '#FFF7ED',
                        color:
                          u.status === 'completed' ? '#059669' :
                          u.status === 'failed' ? '#DC2626' : '#D97706',
                      }}
                    >
                      {u.status === 'completed' ? '✓ Completado' :
                       u.status === 'failed' ? '✗ Fallido' : '⏳ Pendiente'}
                    </span>
                  </td>
                  <td className="cell-muted" style={{ whiteSpace: 'nowrap' }}>
                    {u.success_rows} OK{u.error_rows > 0 ? ` · ${u.error_rows} errores` : ''}
                  </td>
                  {isPlatformOwner && (
                    <td style={{ textAlign: 'center' }}>
                      {u.lot_id ? (
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className="rh-btn rh-btn-ghost"
                          style={{
                            color: '#DC2626',
                            padding: '4px 8px',
                            fontSize: 13,
                            minWidth: 'auto',
                          }}
                          title="Eliminar lote y sus productos"
                        >
                          🗑️
                        </button>
                      ) : (
                        <span style={{ color: '#CBD5E1', fontSize: 13 }}>—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => { if (!deleteLoading) { setDeleteTarget(null); setDeleteError(''); } }}
        >
          <div
            className="rh-card"
            style={{
              padding: 32,
              maxWidth: 480,
              width: '90%',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h3 style={{ marginBottom: 8, fontSize: 18, fontWeight: 700, color: '#1E293B' }}>
              Eliminar Lote
            </h3>
            <p style={{ color: '#64748B', fontSize: 14, marginBottom: 8 }}>
              ¿Estas seguro de que deseas eliminar este lote y <strong>todos sus productos</strong>?
            </p>

            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#94A3B8', fontSize: 13 }}>Lote:</span>
                <span style={{ color: '#6366F1', fontWeight: 700, fontSize: 13, fontFamily: 'monospace' }}>
                  {deleteTarget.inventory_lots?.lot_number ?? '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#94A3B8', fontSize: 13 }}>Archivo:</span>
                <span style={{ color: '#1E293B', fontWeight: 500, fontSize: 13 }}>
                  {deleteTarget.file_name}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#94A3B8', fontSize: 13 }}>Productos:</span>
                <span style={{ color: '#1E293B', fontWeight: 600, fontSize: 13 }}>
                  {deleteTarget.total_rows.toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8', fontSize: 13 }}>Valor:</span>
                <span style={{ color: '#10B981', fontWeight: 700, fontSize: 13 }}>
                  ${fmtCurrency(deleteTarget.inventory_value ?? 0)}
                </span>
              </div>
            </div>

            <p style={{ color: '#F59E0B', fontSize: 13, marginBottom: 16, fontWeight: 500 }}>
              Esta accion no se puede deshacer. Se eliminaran los productos, las entradas del lote y el registro del lote.
            </p>

            {deleteError && (
              <div
                className="rh-alert rh-alert-error"
                style={{ marginBottom: 16, fontSize: 13, textAlign: 'left' }}
              >
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                className="rh-btn rh-btn-ghost"
                onClick={() => { setDeleteTarget(null); setDeleteError(''); }}
                disabled={deleteLoading}
              >
                Cancelar
              </button>
              <button
                className="rh-btn"
                style={{
                  backgroundColor: '#DC2626',
                  color: 'white',
                  opacity: deleteLoading ? 0.6 : 1,
                }}
                onClick={handleDeleteLot}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Eliminando...' : 'Eliminar Lote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
