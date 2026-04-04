import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface DepartamentoOption {
  id: string;
  nome: string;
  ativo: boolean;
}

export function useDepartamentos(idEmpresa: string | null) {
  const [departamentos, setDepartamentos] = useState<DepartamentoOption[]>([]);
  const [carregando, setCarregando] = useState(false);

  const fetchDepartamentos = useCallback(async () => {
    if (!idEmpresa) return;

    try {
      setCarregando(true);
      const { data, error } = await supabase
        .from('erp_departamentos')
        .select('id, nome, ativo')
        .eq('id_empresa', idEmpresa)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;

      setDepartamentos((data || []) as DepartamentoOption[]);
    } catch (error) {
      console.error('Erro ao buscar departamentos:', error);
      setDepartamentos([]);
    } finally {
      setCarregando(false);
    }
  }, [idEmpresa]);

  useEffect(() => {
    if (idEmpresa) {
      void fetchDepartamentos();
    }
  }, [idEmpresa, fetchDepartamentos]);

  return {
    departamentos,
    carregando,
    refetch: fetchDepartamentos,
  };
}
