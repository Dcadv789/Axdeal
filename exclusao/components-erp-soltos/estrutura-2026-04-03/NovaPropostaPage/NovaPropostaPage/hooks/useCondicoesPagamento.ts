import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { CondicaoPagamento } from '../types';

export function useCondicoesPagamento(idEmpresa: string | null) {
  const [condicoes, setCondicoes] = useState<CondicaoPagamento[]>([]);
  const [condicaoSelecionada, setCondicaoSelecionada] = useState<CondicaoPagamento | null>(null);
  const [carregando, setCarregando] = useState(false);

  // Buscar condições de pagamento
  const fetchCondicoes = useCallback(async () => {
    if (!idEmpresa) return;

    try {
      setCarregando(true);
      // Buscar condições globais (sem id_empresa) e da empresa logada
      // Usando duas queries separadas e combinando os resultados
      const [globalResult, empresaResult] = await Promise.all([
        // Condições globais (sem id_empresa)
        supabase
          .from('erp_condicoes_pagamento')
          .select('id, nome, regras, editavel_na_venda')
          .is('id_empresa', null)
          .order('nome'),
        // Condições da empresa
        supabase
          .from('erp_condicoes_pagamento')
          .select('id, nome, regras, editavel_na_venda')
          .eq('id_empresa', idEmpresa)
          .order('nome')
      ]);

      if (globalResult.error) {
        console.error('Erro ao buscar condições globais:', globalResult.error);
        throw globalResult.error;
      }
      if (empresaResult.error) {
        console.error('Erro ao buscar condições da empresa:', empresaResult.error);
        throw empresaResult.error;
      }

      // Combinar resultados e remover duplicatas
      const todasCondicoes = [
        ...(globalResult.data || []),
        ...(empresaResult.data || [])
      ];
      
      // Remover duplicatas baseado no ID
      const condicoesUnicas = Array.from(
        new Map(todasCondicoes.map(c => [c.id, c])).values()
      );

      console.log('Condições de pagamento carregadas:', {
        globais: globalResult.data?.length || 0,
        empresa: empresaResult.data?.length || 0,
        total: condicoesUnicas.length,
        condicoes: condicoesUnicas.map(c => ({ id: c.id, nome: c.nome, regras: c.regras?.length || 0 }))
      });

      setCondicoes(condicoesUnicas);
    } catch (error) {
      console.error('Erro ao buscar condições de pagamento:', error);
      setCondicoes([]);
    } finally {
      setCarregando(false);
    }
  }, [idEmpresa]);

  // Selecionar condição
  const selecionarCondicao = useCallback((condicaoId: string) => {
    if (!condicaoId) {
      setCondicaoSelecionada(null);
      return;
    }
    const condicao = condicoes.find((c) => c.id === condicaoId);
    setCondicaoSelecionada(condicao || null);
  }, [condicoes]);

  // Limpar seleção
  const limparSelecao = useCallback(() => {
    setCondicaoSelecionada(null);
  }, []);

  // Verificar se pode editar
  const podeEditar = useCallback((condicaoId?: string): boolean => {
    if (!condicaoId) return true;
    const condicao = condicoes.find((c) => c.id === condicaoId);
    return condicao?.editavel_na_venda ?? true;
  }, [condicoes]);

  // Carregar ao montar
  useEffect(() => {
    if (idEmpresa) {
      fetchCondicoes();
    }
  }, [idEmpresa, fetchCondicoes]);

  return {
    condicoes,
    condicaoSelecionada,
    carregando,
    selecionarCondicao,
    limparSelecao,
    podeEditar,
    refetch: fetchCondicoes,
  };
}

