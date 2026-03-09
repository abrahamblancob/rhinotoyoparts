import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  User,
  Weight,
  Camera,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore.ts';
import { useAsyncData } from '@/hooks/useAsyncData.ts';
import * as packingService from '@/services/packingService.ts';
import type { PackSession, PackSessionItem, PackSessionStatus } from '@/types/warehouse.ts';

const STATUS_LABELS: Record<PackSessionStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  verified: 'Verificado',
  labelled: 'Etiquetado',
  completed: 'Completado',
};

const STATUS_COLORS: Record<PackSessionStatus, { bg: string; text: string }> = {
  pending: { bg: '#F59E0B15', text: '#F59E0B' },
  in_progress: { bg: '#F9731615', text: '#F97316' },
  verified: { bg: '#3B82F615', text: '#3B82F6' },
  labelled: { bg: '#8B5CF615', text: '#8B5CF6' },
  completed: { bg: '#10B98115', text: '#10B981' },
};

function formatDateTime(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('es-VE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function PackSessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [actionLoading, setActionLoading] = useState(false);
  const [weight, setWeight] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const sessionFetcher = useCallback(
    () =>
      sessionId
        ? packingService.getPackSession(sessionId)
        : Promise.resolve({ data: null, error: null }),
    [sessionId],
  );

  const itemsFetcher = useCallback(
    () =>
      sessionId
        ? packingService.getPackSessionItems(sessionId)
        : Promise.resolve({ data: null, error: null }),
    [sessionId],
  );

  const {
    data: session,
    loading: sessionLoading,
    reload: reloadSession,
  } = useAsyncData<PackSession>(sessionFetcher, [sessionId]);

  const {
    data: items,
    loading: itemsLoading,
    reload: reloadItems,
  } = useAsyncData<PackSessionItem[]>(itemsFetcher, [sessionId]);

  const loading = sessionLoading || itemsLoading;
  const allItems = items ?? [];

  const handleVerifyItem = async (itemId: string, qtyExpected: number) => {
    setActionLoading(true);
    await packingService.verifyPackItem(itemId, qtyExpected);
    await Promise.all([reloadItems(), reloadSession()]);
    setActionLoading(false);
  };

  const handleComplete = async () => {
    if (!sessionId) return;
    setActionLoading(true);
    const weightKg = parseFloat(weight) || undefined;
    await packingService.completePackSession(sessionId, {
      package_weight_kg: weightKg,
    });
    await reloadSession();
    setActionLoading(false);
  };

  const handleAssignSelf = async () => {
    if (!sessionId || !user) return;
    setActionLoading(true);
    await packingService.assignPacker(sessionId, user.id);
    await reloadSession();
    setActionLoading(false);
  };

  if (loading) {
    return <p className="rh-loading">Cargando...</p>;
  }

  if (!session) {
    return (
      <div>
        <button className="rh-btn" onClick={() => navigate('/hub/packing')}>
          <ArrowLeft size={16} style={{ marginRight: 4 }} /> Volver
        </button>
        <p style={{ marginTop: 16, color: '#8A8886' }}>Sesion de packing no encontrada.</p>
      </div>
    );
  }

  const statusStyle = STATUS_COLORS[session.status];
  const allVerified = allItems.length > 0 && allItems.every((i) => i.quantity_verified >= i.quantity_expected);

  return (
    <div>
      {/* Back button */}
      <button
        className="rh-btn"
        onClick={() => navigate('/hub/packing')}
        style={{ marginBottom: 16 }}
      >
        <ArrowLeft size={16} style={{ marginRight: 4 }} /> Volver a Packing
      </button>

      {/* Header */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          border: '1px solid #E1DFDD',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#323130', marginBottom: 8 }}>
              Empaque - Orden {session.order?.order_number ?? '-'}
            </h1>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', color: '#605E5C', fontSize: 14 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <User size={14} />
                Empacador: {session.packer?.full_name ?? 'Sin asignar'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={14} />
                Creado: {formatDateTime(session.created_at)}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckSquare size={14} />
                {session.verified_items} / {session.total_items} verificados
              </span>
            </div>
          </div>
          <span
            className="rh-badge"
            style={{ backgroundColor: statusStyle.bg, color: statusStyle.text, fontSize: 14, padding: '6px 14px' }}
          >
            {STATUS_LABELS[session.status]}
          </span>
        </div>

        {/* Assign self */}
        {session.status === 'pending' && (
          <div style={{ marginTop: 16 }}>
            <button
              className="rh-btn rh-btn-primary"
              disabled={actionLoading}
              onClick={handleAssignSelf}
            >
              <User size={16} style={{ marginRight: 4 }} />
              Asignarme como empacador
            </button>
          </div>
        )}
      </div>

      {/* Items checklist */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          border: '1px solid #E1DFDD',
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#323130', marginBottom: 16 }}>
          Verificacion de Items
        </h2>

        {allItems.length === 0 ? (
          <p style={{ color: '#8A8886' }}>No hay items en esta sesion.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {allItems.map((item) => {
              const isVerified = item.quantity_verified >= item.quantity_expected;
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 14,
                    borderRadius: 8,
                    border: '1px solid #E1DFDD',
                    backgroundColor: isVerified ? '#F0FDF4' : '#fff',
                  }}
                >
                  {/* Checkbox indicator */}
                  <div style={{ flexShrink: 0 }}>
                    {isVerified ? (
                      <CheckSquare size={20} style={{ color: '#10B981' }} />
                    ) : (
                      <Square size={20} style={{ color: '#C8C6C4' }} />
                    )}
                  </div>

                  {/* Product info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 14, color: '#323130' }}>
                      {item.product?.name ?? '-'}
                    </div>
                    <div style={{ fontSize: 12, color: '#8A8886' }}>
                      SKU: {item.product?.sku ?? '-'} | Cantidad esperada: {item.quantity_expected}
                    </div>
                  </div>

                  {/* Verified count */}
                  <div style={{ fontSize: 14, fontWeight: 600, color: isVerified ? '#10B981' : '#605E5C', minWidth: 80, textAlign: 'right' }}>
                    {item.quantity_verified} / {item.quantity_expected}
                  </div>

                  {/* Action */}
                  {!isVerified && session.status === 'in_progress' && (
                    <button
                      className="rh-btn rh-btn-primary"
                      style={{ fontSize: 12, padding: '4px 12px' }}
                      disabled={actionLoading}
                      onClick={() => handleVerifyItem(item.id, item.quantity_expected)}
                    >
                      Verificar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Weight and Photo */}
      {(session.status === 'in_progress' || session.status === 'verified') && (
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
            border: '1px solid #E1DFDD',
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#323130', marginBottom: 16 }}>
            Detalles del Paquete
          </h2>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {/* Weight input */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#605E5C', marginBottom: 6 }}>
                <Weight size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Peso del paquete (kg)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="rh-input"
                style={{ maxWidth: 200 }}
              />
            </div>

            {/* Photo upload */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#605E5C', marginBottom: 6 }}>
                <Camera size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Foto del paquete
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                style={{ fontSize: 13 }}
              />
              {photoFile && (
                <p style={{ fontSize: 12, color: '#8A8886', marginTop: 4 }}>
                  Archivo seleccionado: {photoFile.name}
                </p>
              )}
            </div>
          </div>

          {/* Complete button */}
          <div style={{ marginTop: 20 }}>
            <button
              className="rh-btn rh-btn-primary"
              disabled={actionLoading || !allVerified}
              onClick={handleComplete}
              style={{ backgroundColor: allVerified ? '#10B981' : undefined }}
            >
              <CheckCircle2 size={16} style={{ marginRight: 4 }} />
              Completar Packing
            </button>
            {!allVerified && (
              <p style={{ fontSize: 12, color: '#F59E0B', marginTop: 8 }}>
                Debes verificar todos los items antes de completar el empaque.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
