import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

export function Modal({ open, onClose, title, children, footer, width = '500px' }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="rh-modal-backdrop">
      <div className="rh-modal-overlay" onClick={onClose} />
      <div className="rh-modal" style={{ width }}>
        <div className="rh-modal-header">
          <h3 className="rh-modal-title">{title}</h3>
          <button onClick={onClose} className="rh-modal-close">&times;</button>
        </div>
        <div className="rh-modal-body">{children}</div>
        {footer && (
          <div className="rh-modal-footer">{footer}</div>
        )}
      </div>
    </div>
  );
}
