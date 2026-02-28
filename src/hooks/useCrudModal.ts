import { useState, useCallback } from 'react';

interface CrudModalState<TItem, TForm> {
  showModal: boolean;
  editItem: TItem | null;
  isEditMode: boolean;
  form: TForm;
  saving: boolean;
  error: string;
  success: string;
  openCreate: () => void;
  openEdit: (item: TItem) => void;
  close: () => void;
  setForm: React.Dispatch<React.SetStateAction<TForm>>;
  setError: (msg: string) => void;
  setSuccess: (msg: string) => void;
  setSaving: (v: boolean) => void;
}

export function useCrudModal<TItem, TForm>(
  defaultForm: TForm,
  itemToForm?: (item: TItem) => TForm,
): CrudModalState<TItem, TForm> {
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<TItem | null>(null);
  const [form, setForm] = useState<TForm>({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const openCreate = useCallback(() => {
    setEditItem(null);
    setForm({ ...defaultForm });
    setError('');
    setSuccess('');
    setShowModal(true);
  }, [defaultForm]);

  const openEdit = useCallback((item: TItem) => {
    setEditItem(item);
    setForm(itemToForm ? itemToForm(item) : { ...defaultForm });
    setError('');
    setSuccess('');
    setShowModal(true);
  }, [defaultForm, itemToForm]);

  const close = useCallback(() => {
    setShowModal(false);
    setEditItem(null);
    setForm({ ...defaultForm });
    setError('');
    setSuccess('');
  }, [defaultForm]);

  return {
    showModal,
    editItem,
    isEditMode: Boolean(editItem),
    form,
    saving,
    error,
    success,
    openCreate,
    openEdit,
    close,
    setForm,
    setError,
    setSuccess,
    setSaving,
  };
}
