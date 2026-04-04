import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface Vendedor {
  id: string;
  nome_completo: string;
  email?: string | null;
  telefone?: string | null;
  id_usuario?: string | null;
  status: string;
}

export function useVendedores(idEmpresa: string | null) {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [carregando, setCarregando] = useState(false);

  const fetchVendedores = useCallback(async () => {
    if (!idEmpresa) return;

    try {
      setCarregando(true);
      
      // Buscar vendedores da tabela vendedores
      const { data, error } = await supabase
        .from('erp_vendedores')
        .select(`
          id,
          nome_completo,
          email,
          telefone,
          id_usuario,
          status
        `)
        .eq('id_empresa', idEmpresa)
        .eq('status', 'ATIVO')
        .order('nome_completo');

      if (error) throw error;

      setVendedores(data || []);
    } catch (error) {
      console.error('Erro ao buscar vendedores:', error);
      setVendedores([]);
    } finally {
      setCarregando(false);
    }
  }, [idEmpresa]);

  useEffect(() => {
    if (idEmpresa) {
      fetchVendedores();
    }
  }, [idEmpresa, fetchVendedores]);

  return {
    vendedores,
    carregando,
    refetch: fetchVendedores,
  };
}

