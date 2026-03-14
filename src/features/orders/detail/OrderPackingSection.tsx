import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CollapsibleSection } from '@/components/hub/shared/CollapsibleSection.tsx';
import { PhotoLightbox } from '@/components/hub/shared/PhotoLightbox.tsx';
import { formatDateTime } from '@/utils/dateUtils.ts';
import { parsePhotoUrls } from '@/utils/photos.ts';
import type { PackSession } from '@/types/warehouse.ts';

interface OrderPackingSectionProps {
  packSession: PackSession;
}

function ProgressBar({ verified, total, completed }: { verified: number; total: number; completed: boolean }) {
  if (total === 0) return null;
  const pct = Math.round((verified / total) * 100);

  return (
    <div style={{ width: 80, height: 6, borderRadius: 3, backgroundColor: completed ? '#BBF7D0' : '#E2E8F0', overflow: 'hidden' }}>
      <div style={{
        width: `${pct}%`, height: '100%', borderRadius: 3, backgroundColor: '#10B981',
      }} />
    </div>
  );
}

function PhotoGallery({ urls, onSelect }: { urls: string[]; onSelect: (url: string) => void }) {
  if (urls.length === 0) return null;

  return (
    <div>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#475569', margin: '0 0 10px' }}>
        📷 Fotos del paquete ({urls.length})
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {urls.map((url, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelect(url)}
            style={{
              display: 'block', width: 100, height: 100,
              borderRadius: 8, overflow: 'hidden',
              border: '1px solid #E2E8F0', cursor: 'pointer',
              padding: 0, background: 'none',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <img src={url} alt={`Foto ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function OrderPackingSection({ packSession }: OrderPackingSectionProps) {
  const navigate = useNavigate();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const isCompleted = packSession.status === 'completed';
  const photos = parsePhotoUrls(packSession.package_photo_url);

  const title = isCompleted
    ? 'Packing Completado'
    : `Packing — ${packSession.status === 'in_progress' ? 'En progreso' : packSession.status === 'pending' ? 'Pendiente' : packSession.status}`;

  const subtitleParts = [`${packSession.verified_items} / ${packSession.total_items} items verificados`];
  if (packSession.packer?.full_name) subtitleParts.push(packSession.packer.full_name);
  if (isCompleted && packSession.completed_at) subtitleParts.push(formatDateTime(packSession.completed_at));

  return (
    <>
      <CollapsibleSection
        title={title}
        subtitle={subtitleParts.join(' · ')}
        icon={isCompleted ? '✅' : '📦'}
        variant={isCompleted ? 'completed' : 'pending'}
        trailing={<ProgressBar verified={packSession.verified_items} total={packSession.total_items} completed={isCompleted} />}
      >
        <div style={{ padding: 20, background: '#fff' }}>
          {/* Pack session details */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: photos.length > 0 ? 16 : 0 }}>
            {(packSession.package_count ?? 1) > 0 && (
              <div>
                <p style={{ fontSize: 12, color: '#605E5C', margin: 0 }}>Bultos</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', margin: '4px 0 0' }}>
                  {packSession.package_count ?? 1}
                </p>
              </div>
            )}
            {packSession.package_weight_kg != null && (
              <div>
                <p style={{ fontSize: 12, color: '#605E5C', margin: 0 }}>Peso</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', margin: '4px 0 0' }}>
                  {packSession.package_weight_kg} kg
                </p>
              </div>
            )}
            <div>
              <p style={{ fontSize: 12, color: '#605E5C', margin: 0 }}>Empacador</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', margin: '4px 0 0' }}>
                {packSession.packer?.full_name ?? 'Sin asignar'}
              </p>
            </div>
            {packSession.completed_at && (
              <div>
                <p style={{ fontSize: 12, color: '#605E5C', margin: 0 }}>Completado</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', margin: '4px 0 0' }}>
                  {formatDateTime(packSession.completed_at)}
                </p>
              </div>
            )}
            <div>
              <p style={{ fontSize: 12, color: '#605E5C', margin: 0 }}>Items verificados</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', margin: '4px 0 0' }}>
                {packSession.verified_items} / {packSession.total_items}
              </p>
            </div>
          </div>

          <PhotoGallery urls={photos} onSelect={setLightboxUrl} />

          {!isCompleted && (
            <button
              className="rh-btn rh-btn-primary"
              onClick={() => navigate(`/hub/packing/${packSession.id}`)}
              style={{ fontSize: 12, padding: '6px 14px', marginTop: photos.length > 0 ? 16 : 0 }}
            >
              Ver Sesion de Packing →
            </button>
          )}
        </div>
      </CollapsibleSection>

      <PhotoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </>
  );
}
