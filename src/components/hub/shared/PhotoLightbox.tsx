import { X } from 'lucide-react';

interface PhotoLightboxProps {
  url: string | null;
  onClose: () => void;
}

/**
 * Full-screen photo lightbox overlay.
 * Click the backdrop or the ✕ button to close.
 */
export function PhotoLightbox({ url, onClose }: PhotoLightboxProps) {
  if (!url) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, cursor: 'pointer',
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 16, right: 16,
          width: 40, height: 40, borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <X size={24} />
      </button>
      <img
        src={url}
        alt="Foto del paquete"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90vw', maxHeight: '90vh',
          borderRadius: 12, objectFit: 'contain',
          cursor: 'default',
        }}
      />
    </div>
  );
}
