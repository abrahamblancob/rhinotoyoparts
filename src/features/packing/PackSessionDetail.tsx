import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  User,
  Weight,
  Camera,
  CheckSquare,
  Square,
  X,
  ImageIcon,
} from 'lucide-react';
import { getStatusStyle, getStatusLabel } from '@/lib/statusConfig.ts';
import { PhotoLightbox } from '@/components/hub/shared/PhotoLightbox.tsx';
import { formatDateTime } from '@/utils/dateUtils.ts';
import { usePackSessionDetail } from './usePackSessionDetail.ts';

export function PackSessionDetail() {
  const {
    session,
    allItems,
    loading,
    actionLoading,
    weight,
    setWeight,
    photoFiles,
    uploadProgress,
    lightboxUrl,
    setLightboxUrl,
    fileInputRef,
    allVerified,
    savedPhotos,
    handleVerifyItem,
    handleAddPhotos,
    handleRemovePhoto,
    handleComplete,
    handleAssignSelf,
    navigate,
  } = usePackSessionDetail();

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

  const statusStyle = getStatusStyle(session.status);

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
              {session.completed_at && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10B981', fontWeight: 600 }}>
                  <CheckCircle2 size={14} />
                  Completado: {formatDateTime(session.completed_at)}
                </span>
              )}
            </div>
          </div>
          <span
            className="rh-badge"
            style={{ backgroundColor: statusStyle.bg, color: statusStyle.text, fontSize: 14, padding: '6px 14px' }}
          >
            {getStatusLabel(session.status)}
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
                      onClick={() => handleVerifyItem(item.id, item.quantity_expected, item.product?.name)}
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

      {/* Weight and Photos — active packing */}
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

            {/* Photo upload — multiple */}
            <div style={{ flex: 2, minWidth: 280 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#605E5C', marginBottom: 6 }}>
                <Camera size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Fotos del paquete
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handleAddPhotos}
                  style={{ display: 'none' }}
                />
                <button
                  className="rh-btn"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                >
                  <Camera size={14} />
                  {photoFiles.length > 0 ? 'Agregar mas fotos' : 'Tomar / Seleccionar fotos'}
                </button>
                {photoFiles.length > 0 && (
                  <span style={{ fontSize: 12, color: '#64748B' }}>
                    {photoFiles.length} foto{photoFiles.length > 1 ? 's' : ''} seleccionada{photoFiles.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Photo thumbnails preview */}
              {photoFiles.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {photoFiles.map((file, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'relative', width: 80, height: 80,
                        borderRadius: 8, overflow: 'hidden',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Foto ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <button
                        onClick={() => handleRemovePhoto(idx)}
                        style={{
                          position: 'absolute', top: 2, right: 2,
                          width: 20, height: 20, borderRadius: '50%',
                          backgroundColor: '#DC2626', color: '#fff',
                          border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10,
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Upload progress */}
          {uploadProgress && (
            <p style={{ fontSize: 12, color: '#3B82F6', marginTop: 12 }}>
              {uploadProgress}
            </p>
          )}

          {/* Complete button */}
          <div style={{ marginTop: 20 }}>
            <button
              className="rh-btn rh-btn-primary"
              disabled={actionLoading || !allVerified}
              onClick={handleComplete}
              style={{ backgroundColor: allVerified ? '#10B981' : undefined }}
            >
              <CheckCircle2 size={16} style={{ marginRight: 4 }} />
              {actionLoading ? 'Procesando...' : 'Completar Packing'}
            </button>
            {!allVerified && (
              <p style={{ fontSize: 12, color: '#F59E0B', marginTop: 8 }}>
                Debes verificar todos los items antes de completar el empaque.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Completed — show saved photos gallery */}
      {session.status === 'completed' && (savedPhotos.length > 0 || session.package_weight_kg) && (
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
            Resumen del Empaque
          </h2>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: savedPhotos.length > 0 ? 16 : 0 }}>
            {(session.package_count ?? 1) > 0 && (
              <div>
                <p style={{ fontSize: 12, color: '#605E5C', margin: 0 }}>Bultos</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', margin: '4px 0 0' }}>
                  {session.package_count ?? 1}
                </p>
              </div>
            )}
            {session.package_weight_kg && (
              <div>
                <p style={{ fontSize: 12, color: '#605E5C', margin: 0 }}>Peso</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', margin: '4px 0 0' }}>
                  {session.package_weight_kg} kg
                </p>
              </div>
            )}
            <div>
              <p style={{ fontSize: 12, color: '#605E5C', margin: 0 }}>Empacador</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', margin: '4px 0 0' }}>
                {session.packer?.full_name ?? '-'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: '#605E5C', margin: 0 }}>Completado</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', margin: '4px 0 0' }}>
                {formatDateTime(session.completed_at)}
              </p>
            </div>
          </div>

          {/* Photo gallery */}
          {savedPhotos.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <ImageIcon size={14} style={{ color: '#64748B' }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: '#475569', margin: 0 }}>
                  Fotos del paquete ({savedPhotos.length})
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {savedPhotos.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setLightboxUrl(url)}
                    style={{
                      display: 'block', width: 120, height: 120,
                      borderRadius: 10, overflow: 'hidden',
                      border: '1px solid #E2E8F0',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                      cursor: 'pointer', padding: 0, background: 'none',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.03)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <img
                      src={url}
                      alt={`Foto paquete ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <PhotoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </div>
  );
}
