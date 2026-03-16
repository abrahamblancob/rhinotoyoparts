import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase.ts';

export function useRealtimeSubscription(
  channelName: string,
  table: string,
  filter: string | undefined,
  onUpdate: () => void,
) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const channel = supabase.channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        filter,
      }, () => onUpdateRef.current())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [channelName, table, filter]);
}
