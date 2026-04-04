import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { CatalogoItem, ItemSugestoesState, MostrarSugestoesState } from '../types';

function normalizarTipoCatalogo(tipo: string | null | undefined): 'SERVICO' | 'PRODUTO' | '' {
  if (!tipo) return '';
  const valor = tipo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

  if (valor === 'SERVICO') return 'SERVICO';
  if (valor === 'PRODUTO') return 'PRODUTO';
  return '';
}

export function useCatalogo(idEmpresa: string | null) {
  const [catalogoItens, setCatalogoItens] = useState<CatalogoItem[]>([]);
  const [itemSugestoes, setItemSugestoes] = useState<ItemSugestoesState>({});
  const [mostrarSugestoesCodigo, setMostrarSugestoesCodigo] = useState<MostrarSugestoesState>({});
  const [mostrarSugestoesNome, setMostrarSugestoesNome] = useState<MostrarSugestoesState>({});
  const [carregando, setCarregando] = useState(false);

  // Buscar catálogo
  const fetchCatalogo = useCallback(async () => {
    if (!idEmpresa) return;

    try {
      setCarregando(true);
      const { data, error } = await supabase
        .from('erp_catalogo')
        .select('id, codigo, nome, tipo, preco_venda, custo_aquisicao, descricao_padrao')
        .eq('id_empresa', idEmpresa)
        .order('nome');

      if (error) throw error;

      const itensNormalizados: CatalogoItem[] = ((data || []) as any[])
        .map((item) => ({
          id: item.id,
          codigo: item.codigo || null,
          nome: item.nome || '',
          tipo: normalizarTipoCatalogo(item.tipo),
          preco_venda: Number(item.preco_venda || 0),
          custo_aquisicao: item.custo_aquisicao === null || item.custo_aquisicao === undefined ? null : Number(item.custo_aquisicao || 0),
          descricao_padrao: item.descricao_padrao || null,
        }))
        .filter((item) => item.tipo === 'SERVICO' || item.tipo === 'PRODUTO');

      setCatalogoItens(itensNormalizados);
    } catch (error) {
      console.error('Erro ao buscar catálogo:', error);
    } finally {
      setCarregando(false);
    }
  }, [idEmpresa]);

  // Buscar sugestões por código
  const buscarSugestoesCodigo = useCallback(
    (itemId: string, termo: string) => {
      if (!termo.trim()) {
        setItemSugestoes((prev) => ({ ...prev, [itemId]: [] }));
        setMostrarSugestoesCodigo((prev) => ({ ...prev, [itemId]: false }));
        return;
      }

      const termoLower = termo.toLowerCase();
      const sugestoes = catalogoItens.filter((item) => item.codigo?.toLowerCase().includes(termoLower));

      setItemSugestoes((prev) => ({ ...prev, [itemId]: sugestoes }));
      setMostrarSugestoesCodigo((prev) => ({ ...prev, [itemId]: sugestoes.length > 0 }));
    },
    [catalogoItens]
  );

  // Buscar sugestões por nome
  const buscarSugestoesNome = useCallback(
    (itemId: string, termo: string) => {
      if (!termo.trim()) {
        setItemSugestoes((prev) => ({ ...prev, [itemId]: [] }));
        setMostrarSugestoesNome((prev) => ({ ...prev, [itemId]: false }));
        return;
      }

      const termoLower = termo.toLowerCase();
      const sugestoes = catalogoItens.filter((item) => item.nome.toLowerCase().includes(termoLower));

      setItemSugestoes((prev) => ({ ...prev, [itemId]: sugestoes }));
      setMostrarSugestoesNome((prev) => ({ ...prev, [itemId]: sugestoes.length > 0 }));
    },
    [catalogoItens]
  );

  // Fechar sugestões
  const fecharSugestoes = useCallback((itemId: string) => {
    setMostrarSugestoesCodigo((prev) => ({ ...prev, [itemId]: false }));
    setMostrarSugestoesNome((prev) => ({ ...prev, [itemId]: false }));
  }, []);

  // Buscar item por código
  const buscarItemPorCodigo = useCallback(
    (codigo: string): CatalogoItem | undefined => {
      return catalogoItens.find((item) => item.codigo === codigo);
    },
    [catalogoItens]
  );

  // Buscar item por ID
  const buscarItemPorId = useCallback(
    (id: string): CatalogoItem | undefined => {
      return catalogoItens.find((item) => item.id === id);
    },
    [catalogoItens]
  );

  // Carregar catálogo ao montar
  useEffect(() => {
    if (idEmpresa) {
      void fetchCatalogo();
    }
  }, [idEmpresa, fetchCatalogo]);

  return {
    catalogoItens,
    itemSugestoes,
    mostrarSugestoesCodigo,
    mostrarSugestoesNome,
    carregando,
    buscarSugestoesCodigo,
    buscarSugestoesNome,
    fecharSugestoes,
    buscarItemPorCodigo,
    buscarItemPorId,
    refetch: fetchCatalogo,
  };
}


