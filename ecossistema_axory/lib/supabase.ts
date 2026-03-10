import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variáveis do Supabase não configuradas. Crie apps/erp/.env.local com NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY. Veja .env.example.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
