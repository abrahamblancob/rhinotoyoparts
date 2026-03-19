import { supabase } from '@/lib/supabase.ts';
import { ENV } from '@/config/env.ts';

/**
 * Call a Supabase Edge Function with the current user's session token.
 * Centralizes auth headers, error handling, and JSON parsing.
 * Auto-refreshes expired sessions and retries once on 401.
 */
export async function callEdgeFunction<T = Record<string, unknown>>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  const url = ENV.SUPABASE_URL;
  const anonKey = ENV.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Configuración de Supabase incompleta.');
  }

  const getAccessToken = async (forceRefresh = false): Promise<string> => {
    if (forceRefresh) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed.session?.access_token) return refreshed.session.access_token;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
    // Last resort: try refresh
    const { data: refreshed } = await supabase.auth.refreshSession();
    if (refreshed.session?.access_token) return refreshed.session.access_token;
    throw new Error('Sesión expirada. Por favor, inicia sesión de nuevo.');
  };

  const doFetch = async (token: string) => {
    const res = await fetch(`${url}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': anonKey,
      },
      body: JSON.stringify(body),
    });
    return res;
  };

  // First attempt
  let token = await getAccessToken();
  let res = await doFetch(token);

  // If 401, refresh session and retry once
  if (res.status === 401) {
    token = await getAccessToken(true);
    res = await doFetch(token);
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || `Error ${res.status}: ${res.statusText}`);
  }

  return data as T;
}
