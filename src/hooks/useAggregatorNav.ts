import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Navigation hook for platform super admin views.
 * Level 1: Aggregator grid (summaries)
 * Level 2: Data list (aggregator + its children, with "Asociado" column)
 *
 * Navigation states:
 *  - 'aggregators': show aggregator grid
 *  - 'list':        show data list (includes children automatically)
 */
export function useAggregatorNav<T extends { id: string }>(
  fetchSummaries: () => Promise<T[]>,
  isPlatform: boolean,
) {
  const [summaries, setSummaries] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAggregatorId, setSelectedAggregatorId] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const fetchRef = useRef<object | null>(null);

  const loadSummaries = useCallback(() => {
    if (!isPlatform) return;
    setLoading(true);
    const fetchId = {};
    fetchRef.current = fetchId;
    fetchSummaries()
      .then((data) => {
        if (!mountedRef.current || fetchRef.current !== fetchId) return;
        setSummaries(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!mountedRef.current || fetchRef.current !== fetchId) return;
        setLoading(false);
      });
  }, [isPlatform, fetchSummaries]);

  useEffect(() => {
    mountedRef.current = true;
    if (isPlatform && !selectedAggregatorId) loadSummaries();
    return () => { mountedRef.current = false; };
  }, [isPlatform, selectedAggregatorId, loadSummaries]);

  const selectAggregator = useCallback((aggId: string) => {
    setSelectedAggregatorId(aggId);
  }, []);

  const goBackToAggregators = useCallback(() => {
    setSelectedAggregatorId(null);
  }, []);

  const navState: 'aggregators' | 'list' = isPlatform && !selectedAggregatorId ? 'aggregators' : 'list';

  const selectedAggregator = summaries.find((s) => s.id === selectedAggregatorId);

  // Breadcrumb segments
  const breadcrumbs: { label: string; onClick?: () => void }[] = [];
  if (isPlatform && selectedAggregatorId) {
    breadcrumbs.push({ label: 'Agregadores', onClick: goBackToAggregators });
    const aggName = (selectedAggregator as T & { name?: string })?.name ?? 'Agregador';
    breadcrumbs.push({ label: aggName as string });
  }

  return {
    summaries,
    loading,
    navState,
    selectedAggregatorId,
    selectedAggregator,
    effectiveOrgId: selectedAggregatorId,
    includeChildren: true,
    breadcrumbs,
    selectAggregator,
    goBackToAggregators,
  };
}
