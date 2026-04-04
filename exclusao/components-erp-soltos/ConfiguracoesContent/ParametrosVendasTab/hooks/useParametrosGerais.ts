'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/lib/context/company-context';

export interface ParametrosGeraisData {
  // Propostas
  validadePropostaDias: number;
  validadePropostaTipo: 'dias' | 'meses';
  prazoGarantiaDias: number;
  prazoGarantiaTipo: 'dias' | 'meses';
  prazoEntregaDias: number;
  prazoEntregaTipo: 'dias' | 'meses';
  obsPadraoProposta: string;
  // Vendas
  obsPadraoVenda: string;
  instrucoesPadraoPagamento: string;
  // Gerais e Sequência
  prefixoProposta: string;
  prefixoVenda: string;
  prefixoProduto: string;
  prefixoServico: string;
  prefixoOs: string;
  proximoNumeroProposta: number;
  proximoNumeroVenda: number;
  proximoNumeroProduto: number;
  proximoNumeroServico: number;
  proximoNumeroOs: number;
  // Parâmetros Gerais
  idTermoGarantiaPadrao: string | null;
  idNotaRodapePadrao: string | null;
  enviarEmailVenda: boolean;
  gerarNfAutomatica: boolean;
  gerarVendaAutomatica: boolean;
  gerarParcelaAutomatica: boolean;
}

const defaultData: ParametrosGeraisData = {
  validadePropostaDias: 15,
  validadePropostaTipo: 'dias',
  prazoGarantiaDias: 12,
  prazoGarantiaTipo: 'meses',
  prazoEntregaDias: 7,
  prazoEntregaTipo: 'dias',
  obsPadraoProposta: '',
  obsPadraoVenda: '',
  instrucoesPadraoPagamento: '',
  prefixoProposta: 'PROP',
  prefixoVenda: 'VDA',
  prefixoProduto: 'P',
  prefixoServico: 'S',
  prefixoOs: 'OS',
  proximoNumeroProposta: 1,
  proximoNumeroVenda: 1,
  proximoNumeroProduto: 1,
  proximoNumeroServico: 1,
  proximoNumeroOs: 1,
  idTermoGarantiaPadrao: null,
  idNotaRodapePadrao: null,
  enviarEmailVenda: false,
  gerarNfAutomatica: false,
  gerarVendaAutomatica: false,
  gerarParcelaAutomatica: false,
};

export type SaveNotification = { type: 'success' | 'error'; message: string } | null;

export function useParametrosGerais() {
  const { companyId } = useCompany();
  const [data, setData] = useState<ParametrosGeraisData>(defaultData);
  const [configId, setConfigId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<SaveNotification>(null);

  const load = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data: row, error } = await supabase
        .from('erp_configuracoes')
        .select('*')
        .eq('id_empresa', companyId)
        .maybeSingle();

      if (error) throw error;
      if (row) {
        setConfigId(row.id);
        setData({
          validadePropostaDias: row.validade_proposta_dias ?? defaultData.validadePropostaDias,
          validadePropostaTipo: (row.validade_proposta_tipo as 'dias' | 'meses') ?? 'dias',
          prazoGarantiaDias: row.prazo_garantia_padrao_dias ?? defaultData.prazoGarantiaDias,
          prazoGarantiaTipo: (row.prazo_garantia_padrao_tipo as 'dias' | 'meses') ?? 'meses',
          prazoEntregaDias: row.prazo_entrega_padrao_dias ?? defaultData.prazoEntregaDias,
          prazoEntregaTipo: (row.prazo_entrega_padrao_tipo as 'dias' | 'meses') ?? 'dias',
          obsPadraoProposta: row.obs_padrao_proposta ?? '',
          obsPadraoVenda: row.obs_padrao_venda ?? '',
          instrucoesPadraoPagamento: row.instrucoes_padrao_pagamento ?? '',
          prefixoProposta: row.prefixo_proposta ?? defaultData.prefixoProposta,
          prefixoVenda: row.prefixo_venda ?? defaultData.prefixoVenda,
          prefixoProduto: row.prefixo_produto ?? defaultData.prefixoProduto,
          prefixoServico: row.prefixo_servico ?? defaultData.prefixoServico,
          prefixoOs: row.prefixo_os ?? defaultData.prefixoOs,
          proximoNumeroProposta: row.proximo_numero_proposta ?? defaultData.proximoNumeroProposta,
          proximoNumeroVenda: row.proximo_numero_venda ?? defaultData.proximoNumeroVenda,
          proximoNumeroProduto: row.proximo_numero_produto ?? defaultData.proximoNumeroProduto,
          proximoNumeroServico: row.proximo_numero_servico ?? defaultData.proximoNumeroServico,
          proximoNumeroOs: row.proximo_numero_os ?? defaultData.proximoNumeroOs,
          idTermoGarantiaPadrao: row.id_termo_garantia_padrao ?? null,
          idNotaRodapePadrao: row.id_nota_rodape_padrao ?? null,
          enviarEmailVenda: row.enviar_email_venda ?? false,
          gerarNfAutomatica: row.gerar_nf_automatica ?? false,
          gerarVendaAutomatica: row.gerar_venda_automatica ?? false,
          gerarParcelaAutomatica: row.gerar_parcela_automatica ?? false,
        });
      } else {
        setData(defaultData);
      }
    } catch (e) {
      console.error('Erro ao carregar parâmetros:', e);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateField = useCallback(<K extends keyof ParametrosGeraisData>(key: K, value: ParametrosGeraisData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearNotification = useCallback(() => setNotification(null), []);

  const save = useCallback(async () => {
    if (!companyId) {
      setNotification({ type: 'error', message: 'Empresa não identificada.' });
      return;
    }
    try {
      setSaving(true);
      setNotification(null);
      const payload = {
        validade_proposta_dias: data.validadePropostaDias,
        validade_proposta_tipo: data.validadePropostaTipo,
        prazo_garantia_padrao_dias: data.prazoGarantiaDias,
        prazo_garantia_padrao_tipo: data.prazoGarantiaTipo,
        prazo_entrega_padrao_dias: data.prazoEntregaDias,
        prazo_entrega_padrao_tipo: data.prazoEntregaTipo,
        obs_padrao_proposta: data.obsPadraoProposta || null,
        obs_padrao_venda: data.obsPadraoVenda || null,
        instrucoes_padrao_pagamento: data.instrucoesPadraoPagamento || null,
        prefixo_proposta: data.prefixoProposta || null,
        prefixo_venda: data.prefixoVenda || null,
        prefixo_produto: data.prefixoProduto || null,
        prefixo_servico: data.prefixoServico || null,
        prefixo_os: data.prefixoOs || null,
        proximo_numero_proposta: data.proximoNumeroProposta,
        proximo_numero_venda: data.proximoNumeroVenda,
        proximo_numero_produto: data.proximoNumeroProduto,
        proximo_numero_servico: data.proximoNumeroServico,
        proximo_numero_os: data.proximoNumeroOs,
        id_termo_garantia_padrao: data.idTermoGarantiaPadrao || null,
        id_nota_rodape_padrao: data.idNotaRodapePadrao || null,
        enviar_email_venda: data.enviarEmailVenda,
        gerar_nf_automatica: data.gerarNfAutomatica,
        gerar_venda_automatica: data.gerarVendaAutomatica,
        gerar_parcela_automatica: data.gerarParcelaAutomatica,
        atualizado_em: new Date().toISOString(),
      };

      if (configId) {
        const { error } = await supabase
          .from('erp_configuracoes')
          .update(payload)
          .eq('id', configId)
          .eq('id_empresa', companyId);

        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from('erp_configuracoes')
          .insert({ id_empresa: companyId, ...payload })
          .select('id')
          .single();

        if (error) throw error;
        if (inserted) setConfigId(inserted.id);
      }
      setNotification({ type: 'success', message: 'Parâmetros salvos com sucesso!' });
    } catch (e) {
      console.error('Erro ao salvar:', e);
      setNotification({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao salvar parâmetros.' });
    } finally {
      setSaving(false);
    }
  }, [companyId, configId, data]);

  return { data, updateField, save, loading, saving, notification, clearNotification };
}
