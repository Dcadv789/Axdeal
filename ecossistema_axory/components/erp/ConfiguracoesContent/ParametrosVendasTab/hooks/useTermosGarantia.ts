import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { TermoGarantia } from '../types';

export function useTermosGarantia(idEmpresa: string | null) {
  const [termos, setTermos] = useState<TermoGarantia[]>([]);
  const [carregando, setCarregando] = useState(false);

  const carregarTermos = useCallback(async () => {
    if (!idEmpresa) return;

    try {
      setCarregando(true);

      const { data, error } = await supabase
        .from('erp_termos_garantia')
        .select('*')
        .eq('id_empresa', idEmpresa)
        .order('nome');

      if (error) throw error;

      setTermos(data || []);
    } catch (error) {
      console.error('Erro ao carregar termos:', error);
    } finally {
      setCarregando(false);
    }
  }, [idEmpresa]);

  const adicionarTermo = useCallback(async (nome: string, conteudo: string): Promise<boolean> => {
    if (!idEmpresa) return false;

    try {
      const { error } = await supabase
        .from('erp_termos_garantia')
        .insert({
          id_empresa: idEmpresa,
          nome,
          conteudo,
          isPadrao: false,
        });

      if (error) throw error;

      await carregarTermos();
      return true;
    } catch (error) {
      console.error('Erro ao adicionar termo:', error);
      throw error;
    }
  }, [idEmpresa, carregarTermos]);

  const removerTermo = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('erp_termos_garantia')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await carregarTermos();
      return true;
    } catch (error) {
      console.error('Erro ao remover termo:', error);
      throw error;
    }
  }, [carregarTermos]);

  useEffect(() => {
    if (idEmpresa) {
      carregarTermos();
    }
  }, [idEmpresa, carregarTermos]);

  return {
    termos,
    carregando,
    adicionarTermo,
    removerTermo,
    refetch: carregarTermos,
  };
}

