import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { CatalogoItem, ItemSugestoesState, MostrarSugestoesState } from '../types';

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
        .select('id, codigo, nome, tipo, preco_venda, descricao_padrao')
        .eq('id_empresa', idEmpresa)
        .order('nome');

      if (error) throw error;
      setCatalogoItens(data || []);
    } catch (error) {
      console.error('Erro ao buscar catálogo:', error);
    } finally {
      setCarregando(false);
    }
  }, [idEmpresa]);

  // Buscar sugestões por código
  const buscarSugestoesCodigo = useCallback((itemId: string, termo: string) => {
    if (!termo.trim()) {
      setItemSugestoes((prev) => ({ ...prev, [itemId]: [] }));
      setMostrarSugestoesCodigo((prev) => ({ ...prev, [itemId]: false }));
      return;
    }

    const termoLower = termo.toLowerCase();
    const sugestoes = catalogoItens.filter((item) =>
      item.codigo?.toLowerCase().includes(termoLower)
    );

    setItemSugestoes((prev) => ({ ...prev, [itemId]: sugestoes }));
    setMostrarSugestoesCodigo((prev) => ({ ...prev, [itemId]: sugestoes.length > 0 }));
  }, [catalogoItens]);

  // Buscar sugestões por nome
  const buscarSugestoesNome = useCallback((itemId: string, termo: string) => {
    if (!termo.trim()) {
      setItemSugestoes((prev) => ({ ...prev, [itemId]: [] }));
      setMostrarSugestoesNome((prev) => ({ ...prev, [itemId]: false }));
      return;
    }

    const termoLower = termo.toLowerCase();
    const sugestoes = catalogoItens.filter((item) =>
      item.nome.toLowerCase().includes(termoLower)
    );

    setItemSugestoes((prev) => ({ ...prev, [itemId]: sugestoes }));
    setMostrarSugestoesNome((prev) => ({ ...prev, [itemId]: sugestoes.length > 0 }));
  }, [catalogoItens]);

  // Fechar sugestões
  const fecharSugestoes = useCallback((itemId: string) => {
    setMostrarSugestoesCodigo((prev) => ({ ...prev, [itemId]: false }));
    setMostrarSugestoesNome((prev) => ({ ...prev, [itemId]: false }));
  }, []);

  // Buscar item por código
  const buscarItemPorCodigo = useCallback((codigo: string): CatalogoItem | undefined => {
    return catalogoItens.find((item) => item.codigo === codigo);
  }, [catalogoItens]);

  // Buscar item por ID
  const buscarItemPorId = useCallback((id: string): CatalogoItem | undefined => {
    return catalogoItens.find((item) => item.id === id);
  }, [catalogoItens]);

  // Carregar catálogo ao montar
  useEffect(() => {
    if (idEmpresa) {
      fetchCatalogo();
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





