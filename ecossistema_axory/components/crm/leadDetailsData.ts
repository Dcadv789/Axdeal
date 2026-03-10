'use client';

import { supabase } from '@/lib/supabase';

export interface LeadRelatorioRow {
  lead_id: string;
  id_empresa: string;
  id_quiz?: string | null;
  nome: string;
  email: string | null;
  whatsapp: string | null;
  origem: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  utm_id: string | null;
  status_conversao: string | null;
  status_negocio: 'aberto' | 'ganho' | 'perdido' | null;
  valor_estimado_contrato?: number | null;
  tags?: string[] | null;
  score_qualificacao: number | null;
  quiz_titulo: string | null;
  pipeline_id: string | null;
  pipeline_nome: string | null;
  etapa_id: string | null;
  etapa_nome: string | null;
  etapa_ordem: number | null;
  qtd_respostas: number | null;
  score_respostas: number | null;
  ultimo_evento_em: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
  data_fechamento: string | null;
  motivo_perda: string | null;
  id_responsavel: string | null;
  responsavel_nome: string | null;
}

export interface LeadRespostaDetalhe {
  id: string;
  pergunta_texto: string;
  resposta_texto: string;
  valor_score: number;
  opcoes_snapshot: Array<Record<string, unknown>> | null;
  criado_em: string | null;
}

export interface PlaybookDoLead {
  nome: string | null;
}

export interface ConfiguracaoEstrategicaEmpresa {
  playbook_json: Record<string, unknown> | null;
}

export interface ConfiguracaoEtapaFunil {
  checklist_json: string[];
  templates_whatsapp_json: Record<string, unknown> | null;
}

export interface ProximoPassoPlaybook {
  etapa_nome: string | null;
  etapa_ordem: number | null;
  script: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extrairScriptPlaybookEtapa(playbookJson: unknown): string | null {
  if (!isRecord(playbookJson)) return null;
  const texto = String(
    playbookJson.script ??
      playbookJson.script_whatsapp ??
      playbookJson.roteiro ??
      playbookJson.script_vendas ??
      playbookJson.descricao ??
      playbookJson.etapa_descricao ??
      playbookJson.o_que_e_etapa ??
      ''
  ).trim();
  return texto || null;
}

export async function buscarLeadRelatorioPorId(leadId: string): Promise<LeadRelatorioRow | null> {
  const { data, error } = await supabase
    .from('crm_vw_relatorio_leads')
    .select('*')
    .eq('lead_id', leadId)
    .maybeSingle();
  if (error) throw error;
  return (data as LeadRelatorioRow | null) || null;
}

export async function buscarRespostasDoLead(leadId: string): Promise<LeadRespostaDetalhe[]> {
  const { data, error } = await supabase
    .from('crm_quiz_respostas')
    .select('id, pergunta_texto, resposta_texto, valor_score, opcoes_snapshot, criado_em')
    .eq('id_lead', leadId)
    .order('criado_em', { ascending: true });
  if (error) throw error;
  return (data || []) as LeadRespostaDetalhe[];
}

export async function buscarPlaybookDoLeadPorPipeline(pipelineId: string | null): Promise<PlaybookDoLead | null> {
  if (!pipelineId) return null;
  const { data: pipelineData, error: pipelineErr } = await supabase
    .from('crm_pipelines')
    .select('id_playbook')
    .eq('id', pipelineId)
    .maybeSingle();
  if (pipelineErr) throw pipelineErr;

  const idPlaybook = (pipelineData as { id_playbook?: string | null } | null)?.id_playbook;
  if (!idPlaybook) return null;

  const { data: playbookData, error: playbookErr } = await supabase
    .from('crm_playbooks')
    .select('nome')
    .eq('id', idPlaybook)
    .maybeSingle();
  if (playbookErr) throw playbookErr;

  const row = playbookData as { nome?: string | null } | null;
  if (!row) return null;
  return {
    nome: row.nome || null,
  };
}

export async function buscarProximoPassoPlaybook(
  pipelineId: string | null,
  etapaOrdemAtual: number | null
): Promise<ProximoPassoPlaybook | null> {
  if (!pipelineId || etapaOrdemAtual === null || etapaOrdemAtual === undefined) return null;

  const { data, error } = await supabase
    .from('crm_pipeline_etapas')
    .select('nome, ordem, playbook_json')
    .eq('id_pipeline', pipelineId)
    .gt('ordem', etapaOrdemAtual)
    .order('ordem', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as {
    nome?: string | null;
    ordem?: number | null;
    playbook_json?: Record<string, unknown> | null;
  };

  return {
    etapa_nome: row.nome || null,
    etapa_ordem: row.ordem ?? null,
    script: extrairScriptPlaybookEtapa(row.playbook_json || null),
  };
}

export async function buscarConfiguracaoEstrategicaEmpresa(idEmpresa: string): Promise<ConfiguracaoEstrategicaEmpresa | null> {
  const { data, error } = await supabase
    .from('crm_configuracoes_estrategicas')
    .select('playbook_json')
    .eq('id_empresa', idEmpresa)
    .maybeSingle();
  if (error) throw error;
  const row = data as { playbook_json?: Record<string, unknown> | null } | null;
  if (!row) return null;
  return {
    playbook_json: row.playbook_json || null,
  };
}

export async function buscarConfiguracaoEtapaFunil(idEtapa: string | null): Promise<ConfiguracaoEtapaFunil | null> {
  if (!idEtapa) return null;
  const { data, error } = await supabase
    .from('crm_pipeline_etapas')
    .select('checklist_json, templates_whatsapp_json')
    .eq('id', idEtapa)
    .maybeSingle();
  if (error) throw error;
  const row = data as { checklist_json?: unknown; templates_whatsapp_json?: Record<string, unknown> | null } | null;
  if (!row) return null;
  const checklist = Array.isArray(row.checklist_json)
    ? row.checklist_json.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  return {
    checklist_json: checklist,
    templates_whatsapp_json: row.templates_whatsapp_json || null,
  };
}
