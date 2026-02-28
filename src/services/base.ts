import { supabase } from '@/lib/supabase.ts';

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

export async function query<T>(
  fn: (client: typeof supabase) => PromiseLike<{ data: unknown; error: { message: string } | null }>
): Promise<ServiceResult<T>> {
  try {
    const { data, error } = await fn(supabase);
    if (error) return { data: null, error: error.message };
    return { data: data as T, error: null };
  } catch (err) {
    return { data: null, error: (err as Error).message };
  }
}

// Re-export supabase for services that need raw access (e.g., realtime channels)
export { supabase };
