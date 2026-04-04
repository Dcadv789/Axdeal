import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface ProjetoOption {
  id: string;
  nome: string;
  ativo: boolean;
}

export function useProjetos(idEmpresa: string | null) {
  const [projetos, setProjetos] = useState<ProjetoOption[]>([]);
  const [carregando, setCarregando] = useState(false);

  const fetchProjetos = useCallback(async () => {
    if (!idEmpresa) return;

    try {
      setCarregando(true);
      const { data, error } = await supabase
        .from('erp_projetos')
        .select('id, nome, ativo')
        .eq('id_empresa', idEmpresa)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;

      setProjetos((data || []) as ProjetoOption[]);
    } catch (error) {
      console.error('Erro ao buscar projetos:', error);
      setProjetos([]);
    } finally {
      setCarregando(false);
    }
  }, [idEmpresa]);

  useEffect(() => {
    if (idEmpresa) {
      void fetchProjetos();
    }
  }, [idEmpresa, fetchProjetos]);

  return {
    projetos,
    carregando,
    refetch: fetchProjetos,
  };
}
