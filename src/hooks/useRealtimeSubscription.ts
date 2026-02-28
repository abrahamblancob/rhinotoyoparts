import { useEffect } from 'react';
import { supabase } from '@/lib/supabase.ts';

export function useRealtimeSubscription(
  channelName: string,
  table: string,
  filter: string | undefined,
  onUpdate: () => void,
) {
  useEffect(() => {
    const channel = supabase.channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        filter,
      }, onUpdate)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [channelName, table, filter, onUpdate]);
}
