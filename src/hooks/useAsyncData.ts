import { useState, useEffect, useCallback, useRef } from 'react';
import type { ServiceResult } from '@/services/base.ts';

interface UseAsyncDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useAsyncData<T>(
  fetcher: () => Promise<ServiceResult<T>>,
  deps: unknown[] = [],
): UseAsyncDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await fetcher();
    if (!mountedRef.current) return;
    setData(result.data);
    setError(result.error);
    setLoading(false);
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    reload();
    return () => { mountedRef.current = false; };
  }, [reload]);

  return { data, loading, error, reload };
}
