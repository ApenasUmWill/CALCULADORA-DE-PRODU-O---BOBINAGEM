import { createClient } from '@supabase/supabase-js';

declare const __SUPABASE_URL__: string | undefined;
declare const __SUPABASE_PUBLISHABLE_KEY__: string | undefined;

// Obtenção robusta das variáveis de ambiente SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY
export const supabaseUrl: string =
  (typeof __SUPABASE_URL__ === 'string' && __SUPABASE_URL__) ||
  (typeof process !== 'undefined' && process.env && process.env.SUPABASE_URL) ||
  (import.meta.env && (import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL)) ||
  '';

export const supabaseKey: string =
  (typeof __SUPABASE_PUBLISHABLE_KEY__ === 'string' && __SUPABASE_PUBLISHABLE_KEY__) ||
  (typeof process !== 'undefined' && process.env && (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY)) ||
  (import.meta.env && (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY)) ||
  '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

if (!isSupabaseConfigured) {
  console.warn('[Supabase] Aviso: SUPABASE_URL ou SUPABASE_PUBLISHABLE_KEY não foram detectadas no ambiente do cliente.');
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

