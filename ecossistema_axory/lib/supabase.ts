import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
const supabaseUrlFallback = supabaseUrl || '';
const supabaseAnonKeyFallback = supabaseAnonKey || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Variaveis do Supabase nao configuradas (NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY). Usando fallback para nao bloquear o build.'
  );
}

export const supabase = (() => {
  try {
    return createClient(supabaseUrlFallback, supabaseAnonKeyFallback);
  } catch {
    // Fallback defensivo: createClient("", "") gera erro na lib.
    return createClient('http://localhost', 'anon');
  }
})();
