import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/lib/context/company-context';
import { supabase } from '@/lib/supabase';
import type { ReguaCobranca, Notificacao } from '../types';

export function useReguaCobranca() {
  const { user } = useAuth();
  const { companyId } = useCompany();
  const [reguas, setReguas] = useState<ReguaCobranca[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!companyId) {
      setReguas([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErro(null);
    const { data, error } = await supabase
      .from('erp_reguas_cobranca')
      .select('*')
      .eq('id_empresa', companyId)
      .order('criado_em', { ascending: false });

    if (error) {
      setErro('Não foi possível carregar as réguas de cobrança.');
      setReguas([]);
    } else {
      setReguas((data || []).map(normalizarRegua));
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const criar = useCallback(
    async (nome: string, descricao: string, padrao: boolean, etapas: Notificacao[]) => {
      if (!companyId || !user?.id) {
        throw new Error('Empresa ou usuário não identificado.');
      }
      setSalvando(true);
      setErro(null);
      if (padrao) {
        await supabase
          .from('erp_reguas_cobranca')
          .update({ padrao: false })
          .eq('id_empresa', companyId);
      }
      const { data, error } = await supabase
        .from('erp_reguas_cobranca')
        .insert({
          id_empresa: companyId,
          criado_por: user.id,
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          padrao,
          ativa: true,
          etapas: etapas.map((e, i) => ({
            numero: i + 1,
            offset: Number(e.offset) || 0,
            unit: e.unit,
            direction: e.direction,
            channels: e.channels || [],
            subject: e.subject || '',
            message: e.message || '',
          })),
        })
        .select('*')
        .single();

      setSalvando(false);
      if (error) throw new Error(error.message || 'Erro ao criar régua.');
      await carregar();
      return normalizarRegua(data);
    },
    [companyId, user?.id, carregar]
  );

  const atualizar = useCallback(
    async (id: string, nome: string, descricao: string, padrao: boolean, etapas: Notificacao[]) => {
      if (!companyId) throw new Error('Empresa não identificada.');
      setSalvando(true);
      setErro(null);
      if (padrao) {
        await supabase
          .from('erp_reguas_cobranca')
          .update({ padrao: false })
          .eq('id_empresa', companyId)
          .neq('id', id);
      }
      const { error } = await supabase
        .from('erp_reguas_cobranca')
        .update({
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          padrao,
          etapas: etapas.map((e, i) => ({
            numero: i + 1,
            offset: Number(e.offset) || 0,
            unit: e.unit,
            direction: e.direction,
            channels: e.channels || [],
            subject: e.subject || '',
            message: e.message || '',
          })),
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('id_empresa', companyId);

      setSalvando(false);
      if (error) throw new Error(error.message || 'Erro ao atualizar régua.');
      await carregar();
    },
    [companyId, carregar]
  );

  const alternarAtiva = useCallback(
    async (regua: ReguaCobranca) => {
      if (!companyId) return;
      const { error } = await supabase
        .from('erp_reguas_cobranca')
        .update({ ativa: !regua.ativa })
        .eq('id', regua.id)
        .eq('id_empresa', companyId);
      if (!error) await carregar();
    },
    [companyId, carregar]
  );

  const excluir = useCallback(
    async (id: string) => {
      if (!companyId) return;
      const { error } = await supabase
        .from('erp_reguas_cobranca')
        .delete()
        .eq('id', id)
        .eq('id_empresa', companyId);
      if (!error) await carregar();
    },
    [companyId, carregar]
  );

  const definirComoPadrao = useCallback(
    async (id: string) => {
      if (!companyId) return;
      setSalvando(true);
      setErro(null);
      await supabase
        .from('erp_reguas_cobranca')
        .update({ padrao: false })
        .eq('id_empresa', companyId)
        .neq('id', id);
      const { error } = await supabase
        .from('erp_reguas_cobranca')
        .update({ padrao: true, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .eq('id_empresa', companyId);
      setSalvando(false);
      if (!error) await carregar();
      else setErro('Erro ao definir régua padrão.');
    },
    [companyId, carregar]
  );

  return { reguas, loading, erro, salvando, carregar, criar, atualizar, alternarAtiva, excluir, definirComoPadrao };
}

function normalizarRegua(row: Record<string, unknown>): ReguaCobranca {
  let etapas = (row.etapas as Notificacao[]) || [];
  if (!Array.isArray(etapas)) etapas = [];
  return {
    id: String(row.id),
    id_empresa: String(row.id_empresa),
    nome: String(row.nome || ''),
    descricao: row.descricao ? String(row.descricao) : null,
    padrao: Boolean(row.padrao),
    etapas: etapas.map((e: Record<string, unknown>, index: number) => ({
      numero: index + 1,
      offset: Number(e.offset) || 0,
      unit: (e.unit as 'dias' | 'meses') || 'dias',
      direction: (e.direction as 'antes' | 'vencimento' | 'depois') || 'vencimento',
      channels: Array.isArray(e.channels) ? e.channels : [],
      subject: String(e.subject || ''),
      message: String(e.message || ''),
    })),
    ativa: Boolean(row.ativa !== false),
    criado_em: String(row.criado_em || ''),
    atualizado_em: String(row.atualizado_em || ''),
  };
}
