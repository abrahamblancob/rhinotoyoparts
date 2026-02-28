import { useState, useCallback } from 'react';

interface DeleteConfirmState<T> {
  target: T | null;
  loading: boolean;
  isOpen: boolean;
  confirm: (item: T) => void;
  cancel: () => void;
  execute: (deleteFn: () => Promise<{ error: string | null }>) => Promise<boolean>;
}

export function useDeleteConfirm<T>(): DeleteConfirmState<T> {
  const [target, setTarget] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);

  const confirm = useCallback((item: T) => setTarget(item), []);
  const cancel = useCallback(() => setTarget(null), []);

  const execute = useCallback(async (deleteFn: () => Promise<{ error: string | null }>) => {
    setLoading(true);
    const result = await deleteFn();
    setLoading(false);
    if (!result.error) {
      setTarget(null);
      return true;
    }
    return false;
  }, []);

  return {
    target,
    loading,
    isOpen: target !== null,
    confirm,
    cancel,
    execute,
  };
}
