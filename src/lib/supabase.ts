import { createClient } from '@supabase/supabase-js';
import { ENV } from '@/config/env.ts';

if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
  console.warn(
    'Supabase credentials not found. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
  );
}

// Use a placeholder URL when credentials are missing so the app doesn't crash on non-Hub pages
export const supabase = createClient(
  ENV.SUPABASE_URL || 'https://placeholder.supabase.co',
  ENV.SUPABASE_ANON_KEY || 'placeholder-key',
);
