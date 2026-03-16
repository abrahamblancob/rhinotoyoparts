import { useState, useEffect, useCallback } from 'react';

export function useOrgSelector<T extends { id: string }>(
  fetchSummaries: () => Promise<T[]>,
  isPlatform: boolean,
) {
  const [summaries, setSummaries] = useState<T[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSummaries = useCallback(() => {
    if (!isPlatform) return;
    setLoading(true);
    fetchSummaries().then((data) => {
      setSummaries(data);
      setLoading(false);
    });
  }, [isPlatform, fetchSummaries]);

  useEffect(() => {
    if (isPlatform && !selectedOrgId) {
      loadSummaries();
    }
  }, [isPlatform, selectedOrgId, loadSummaries]);

  const selectedOrg = summaries.find((o) => o.id === selectedOrgId);
  const clearSelection = () => { setSelectedOrgId(null); };
  const showSelector = isPlatform && !selectedOrgId;

  return { summaries, selectedOrgId, selectedOrg, loading, setSelectedOrgId, clearSelection, showSelector };
}
