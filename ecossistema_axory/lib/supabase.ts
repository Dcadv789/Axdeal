import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseConfigMessage =
  'Supabase nao configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY nas variaveis de ambiente do Netlify (Build e Runtime).';

if (!isSupabaseConfigured) {
  console.warn(
    'Variaveis do Supabase nao configuradas (NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY). Build liberado, mas autenticacao e dados ficarao indisponiveis ate configurar as envs.'
  );
}

const url = isSupabaseConfigured ? supabaseUrl : 'https://example.supabase.co';
const key = isSupabaseConfigured ? supabaseAnonKey : 'public-anon-placeholder';

export const supabase = createClient(url, key);
