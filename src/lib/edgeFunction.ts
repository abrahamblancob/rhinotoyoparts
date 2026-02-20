import { supabase } from '@/lib/supabase.ts';
import { ENV } from '@/config/env.ts';

/**
 * Call a Supabase Edge Function with the current user's session token.
 * Centralizes auth headers, error handling, and JSON parsing.
 */
export async function callEdgeFunction<T = Record<string, unknown>>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Sesion expirada. Por favor, inicia sesion de nuevo.');
  }

  const url = ENV.SUPABASE_URL;
  const anonKey = ENV.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Configuracion de Supabase incompleta.');
  }

  const res = await fetch(`${url}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': anonKey,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || `Error ${res.status}: ${res.statusText}`);
  }

  return data as T;
}
