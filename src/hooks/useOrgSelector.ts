import { useState, useEffect, useCallback, useRef } from 'react';

export function useOrgSelector<T extends { id: string }>(
  fetchSummaries: () => Promise<T[]>,
  isPlatform: boolean,
) {
  const [summaries, setSummaries] = useState<T[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  const fetchRef = useRef<object | null>(null);

  const loadSummaries = useCallback(() => {
    if (!isPlatform) return;
    setLoading(true);
    const fetchId = {};
    fetchRef.current = fetchId;
    fetchSummaries()
      .then((data) => {
        if (!mountedRef.current) return;
        if (fetchRef.current !== fetchId) return;
        setSummaries(data);
      })
      .catch(() => {
        // silently handle — loading will be reset below
      })
      .finally(() => {
        if (!mountedRef.current) return;
        if (fetchRef.current !== fetchId) return;
        setLoading(false);
      });
  }, [isPlatform, fetchSummaries]);

  useEffect(() => {
    mountedRef.current = true;
    if (isPlatform && !selectedOrgId) {
      loadSummaries();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [isPlatform, selectedOrgId, loadSummaries]);

  const selectedOrg = summaries.find((o) => o.id === selectedOrgId);
  const clearSelection = () => { setSelectedOrgId(null); };
  const showSelector = isPlatform && !selectedOrgId;

  return { summaries, selectedOrgId, selectedOrg, loading, setSelectedOrgId, clearSelection, showSelector };
}
