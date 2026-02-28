import { Modal } from './Modal.tsx';

interface ConfirmDeleteModalProps {
  open: boolean;
  title: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  children: React.ReactNode;
}

export function ConfirmDeleteModal({
  open,
  title,
  loading,
  onClose,
  onConfirm,
  children,
}: ConfirmDeleteModalProps) {
  return (
    <Modal
      open={open}
      onClose={() => !loading && onClose()}
      title={title}
      width="460px"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={loading}
            className="rh-btn rh-btn-ghost"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rh-btn"
            style={{ background: '#D3010A', color: '#fff' }}
          >
            {loading ? 'Eliminando...' : 'Si, Eliminar'}
          </button>
        </>
      }
    >
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        {children}
      </div>
    </Modal>
  );
}
