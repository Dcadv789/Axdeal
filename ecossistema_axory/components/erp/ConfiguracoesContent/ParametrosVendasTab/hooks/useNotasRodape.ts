import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { NotaRodape } from '../types';

export function useNotasRodape(idEmpresa: string | null) {
  const [notas, setNotas] = useState<NotaRodape[]>([]);
  const [carregando, setCarregando] = useState(false);

  const carregarNotas = useCallback(async () => {
    if (!idEmpresa) return;

    try {
      setCarregando(true);

      const { data, error } = await supabase
        .from('erp_notas_rodape')
        .select('*')
        .eq('id_empresa', idEmpresa)
        .order('nome');

      if (error) throw error;

      setNotas(data || []);
    } catch (error) {
      console.error('Erro ao carregar notas:', error);
    } finally {
      setCarregando(false);
    }
  }, [idEmpresa]);

  const adicionarNota = useCallback(async (nome: string, conteudo: string): Promise<boolean> => {
    if (!idEmpresa) return false;

    try {
      const { error } = await supabase
        .from('erp_notas_rodape')
        .insert({
          id_empresa: idEmpresa,
          nome,
          conteudo,
          isPadrao: false,
        });

      if (error) throw error;

      await carregarNotas();
      return true;
    } catch (error) {
      console.error('Erro ao adicionar nota:', error);
      throw error;
    }
  }, [idEmpresa, carregarNotas]);

  const removerNota = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('erp_notas_rodape')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await carregarNotas();
      return true;
    } catch (error) {
      console.error('Erro ao remover nota:', error);
      throw error;
    }
  }, [carregarNotas]);

  useEffect(() => {
    if (idEmpresa) {
      carregarNotas();
    }
  }, [idEmpresa, carregarNotas]);

  return {
    notas,
    carregando,
    adicionarNota,
    removerNota,
    refetch: carregarNotas,
  };
}

