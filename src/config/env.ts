/**
 * Centralized environment variables.
 * All access to import.meta.env should go through this module.
 */
export const ENV = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  GOOGLE_MAPS_KEY: import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined,
} as const;
