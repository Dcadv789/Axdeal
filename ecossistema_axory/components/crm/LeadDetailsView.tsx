'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  FileText,
  Lightbulb,
  Loader2,
  Save,
  SlidersHorizontal,
} from 'lucide-react';
import LeadTimeline from '@/components/crm/LeadTimeline';
import { supabase } from '@/lib/supabase';
import type { CrmCustomFieldDefinition, CrmCustomFieldType } from '@/types/database';
import {
  buscarConfiguracaoEtapaFunil,
  buscarPlaybookDoLeadPorPipeline,
  buscarProximoPassoPlaybook,
  buscarRespostasDoLead,
  type ConfiguracaoEtapaFunil,
  type LeadRelatorioRow,
  type ProximoPassoPlaybook,
  type LeadRespostaDetalhe,
} from '@/components/crm/leadDetailsData';

interface LeadDetailsViewProps {
  lead: LeadRelatorioRow;
  userId: string | null;
  autorPadrao: string | null;
  timelineRefreshKey?: number;
  layout?: 'drawer' | 'page';
}

function obterIniciais(nome: string | null) {
  const valor = (nome || '').trim();
  if (!valor) return 'SN';
  const partes = valor.split(/\s+/).filter(Boolean);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0] || ''}${partes[1][0] || ''}`.toUpperCase();
}

function formatarData(valor: string | null) {
  if (!valor) return '-';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatarDataSomenteData(valor: string | null) {
  if (!valor) return '-';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function badgeColorPorTexto(valor: string | null) {
  const tema = [
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300',
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300',
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300',
    'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-300',
    'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300',
    'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/40 dark:bg-cyan-500/15 dark:text-cyan-300',
  ];
  const texto = (valor || '-').trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < texto.length; i += 1) hash = (hash * 31 + texto.charCodeAt(i)) >>> 0;
  return tema[hash % tema.length];
}

function normalizarTexto(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function obterTextoOpcao(opcao: Record<string, unknown>, idx: number) {
  const texto =
    String(opcao.texto || opcao.label || opcao.rotulo || opcao.valor || '').trim();
  return texto || `Opcao ${idx + 1}`;
}

function obterAlternativas(opcoesSnapshot: Array<Record<string, unknown>> | null) {
  if (!opcoesSnapshot || opcoesSnapshot.length === 0) return [];
  return opcoesSnapshot.map((opcao, idx) => obterTextoOpcao(opcao, idx));
}

function respostaSelecionouOpcao(respostaTexto: string | null, opcaoTexto: string) {
  const resposta = (respostaTexto || '').trim();
  if (!resposta) return false;
  const opcaoNorm = normalizarTexto(opcaoTexto);
  const respostaNorm = normalizarTexto(resposta);
  if (respostaNorm === opcaoNorm) return true;
  if (respostaNorm.includes(opcaoNorm)) return true;
  const partes = resposta
    .split(/[,;\n|]+/)
    .map((parte) => normalizarTexto(parte))
    .filter(Boolean);
  return partes.includes(opcaoNorm);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extrairValoresCamposPersonalizados(dadosExtras: unknown): Record<string, unknown> {
  if (!isRecord(dadosExtras)) return {};
  const nested = dadosExtras.campos_personalizados;
  if (isRecord(nested)) return nested;
  return {};
}

function extrairOpcoesSelectCampo(opcoes: unknown): string[] {
  if (!Array.isArray(opcoes)) return [];
  return opcoes.map((item) => String(item || '').trim()).filter(Boolean);
}

function normalizarValorCampo(tipo: CrmCustomFieldType, valor: string): string | number | null {
  if (tipo === 'number') {
    if (!valor.trim()) return null;
    const parsed = Number(valor);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const base = valor.trim();
  return base || null;
}

interface EtapaPlaybookGuia {
  id: string;
  nome: string | null;
  ordem: number;
  playbook_json: Record<string, unknown> | null;
  templates_whatsapp_json: Record<string, unknown> | null;
}

function extrairScriptEtapaPlaybook(
  playbookJson: Record<string, unknown> | null,
  templateJson: Record<string, unknown> | null
): string {
  const scriptPlaybook = String(
    (playbookJson || {}).script ??
      (playbookJson || {}).script_whatsapp ??
      (playbookJson || {}).roteiro ??
      (playbookJson || {}).script_vendas ??
      ''
  ).trim();
  if (scriptPlaybook) return scriptPlaybook;

  const scriptTemplate = String(
    (templateJson || {}).template ??
      (templateJson || {}).mensagem ??
      (templateJson || {}).texto ??
      ''
  ).trim();
  if (scriptTemplate) return scriptTemplate;

  return 'Sem script configurado para esta etapa.';
}

export default function LeadDetailsView({
  lead,
  userId,
  autorPadrao,
  timelineRefreshKey = 0,
  layout = 'drawer',
}: LeadDetailsViewProps) {
  const [respostasDetalhe, setRespostasDetalhe] = useState<LeadRespostaDetalhe[]>([]);
  const [loadingRespostas, setLoadingRespostas] = useState(false);
  const [respostasExpandido, setRespostasExpandido] = useState(true);
  const [playbookDoLead, setPlaybookDoLead] = useState<{ nome: string | null } | null>(null);
  const [proximoPassoPlaybook, setProximoPassoPlaybook] = useState<ProximoPassoPlaybook | null>(null);
  const [loadingProximoPassoPlaybook, setLoadingProximoPassoPlaybook] = useState(false);
  const [etapasPlaybook, setEtapasPlaybook] = useState<EtapaPlaybookGuia[]>([]);
  const [loadingEtapasPlaybook, setLoadingEtapasPlaybook] = useState(false);
  const [erroEtapasPlaybook, setErroEtapasPlaybook] = useState<string | null>(null);
  const [etapaAtualId, setEtapaAtualId] = useState<string | null>(lead.etapa_id || null);
  const [etapaAtualOrdem, setEtapaAtualOrdem] = useState<number | null>(lead.etapa_ordem ?? null);
  const [etapaExpandidaId, setEtapaExpandidaId] = useState<string | null>(lead.etapa_id || null);
  const [avancandoEtapaPlaybook, setAvancandoEtapaPlaybook] = useState(false);
  const [avisoEtapaPlaybook, setAvisoEtapaPlaybook] = useState<string | null>(null);
  const [configEtapa, setConfigEtapa] = useState<ConfiguracaoEtapaFunil | null>(null);
  const [camposPersonalizados, setCamposPersonalizados] = useState<CrmCustomFieldDefinition[]>([]);
  const [valoresCamposPersonalizados, setValoresCamposPersonalizados] = useState<Record<string, unknown>>({});
  const [loadingCamposPersonalizados, setLoadingCamposPersonalizados] = useState(false);
  const [salvandoCamposPersonalizados, setSalvandoCamposPersonalizados] = useState(false);
  const [erroCamposPersonalizados, setErroCamposPersonalizados] = useState<string | null>(null);
  const [avisoCamposPersonalizados, setAvisoCamposPersonalizados] = useState<string | null>(null);

  useEffect(() => {
    setEtapaAtualId(lead.etapa_id || null);
    setEtapaAtualOrdem(lead.etapa_ordem ?? null);
    setEtapaExpandidaId(lead.etapa_id || null);
    setAvisoEtapaPlaybook(null);
  }, [lead.lead_id, lead.etapa_id, lead.etapa_ordem]);

  useEffect(() => {
    const carregarEtapasPlaybook = async () => {
      if (!lead.pipeline_id) {
        setEtapasPlaybook([]);
        setErroEtapasPlaybook(null);
        setLoadingEtapasPlaybook(false);
        return;
      }

      try {
        setLoadingEtapasPlaybook(true);
        setErroEtapasPlaybook(null);
        const { data, error } = await supabase
          .from('crm_pipeline_etapas')
          .select('id, nome, ordem, playbook_json, templates_whatsapp_json')
          .eq('id_pipeline', lead.pipeline_id)
          .order('ordem', { ascending: true });
        if (error) throw error;
        const etapas = ((data || []) as EtapaPlaybookGuia[]).sort((a, b) => a.ordem - b.ordem);
        setEtapasPlaybook(etapas);
      } catch (err) {
        console.error('Erro ao carregar etapas do playbook:', err);
        setEtapasPlaybook([]);
        setErroEtapasPlaybook('Nao foi possivel carregar as etapas do playbook.');
      } finally {
        setLoadingEtapasPlaybook(false);
      }
    };
    void carregarEtapasPlaybook();
  }, [lead.pipeline_id]);

  useEffect(() => {
    const carregarRespostas = async () => {
      try {
        setLoadingRespostas(true);
        const data = await buscarRespostasDoLead(lead.lead_id);
        setRespostasDetalhe(data);
        setRespostasExpandido(data.length > 0);
      } catch (err) {
        console.error('Erro ao carregar respostas do lead:', err);
        setRespostasDetalhe([]);
        setRespostasExpandido(false);
      } finally {
        setLoadingRespostas(false);
      }
    };
    void carregarRespostas();
  }, [lead.lead_id]);

  useEffect(() => {
    const carregarPlaybook = async () => {
      try {
        const data = await buscarPlaybookDoLeadPorPipeline(lead.pipeline_id);
        setPlaybookDoLead(data);
      } catch (err) {
        console.error('Erro ao carregar playbook do lead:', err);
        setPlaybookDoLead(null);
      }
    };
    void carregarPlaybook();
  }, [lead.pipeline_id]);

  useEffect(() => {
    if (!etapasPlaybook.length) return;

    if (etapaAtualId) {
      const etapaAtual = etapasPlaybook.find((item) => item.id === etapaAtualId) || null;
      if (etapaAtual) {
        setEtapaAtualOrdem(etapaAtual.ordem);
        setEtapaExpandidaId((prev) => prev || etapaAtual.id);
        return;
      }
    }

    const primeira = etapasPlaybook[0] || null;
    if (primeira) {
      setEtapaAtualId((prev) => prev || primeira.id);
      setEtapaAtualOrdem((prev) => (prev === null || prev === undefined ? primeira.ordem : prev));
      setEtapaExpandidaId((prev) => prev || primeira.id);
    }
  }, [etapasPlaybook, etapaAtualId]);

  useEffect(() => {
    const carregarProximoPassoPlaybook = async () => {
      try {
        setLoadingProximoPassoPlaybook(true);
        const data = await buscarProximoPassoPlaybook(lead.pipeline_id, etapaAtualOrdem);
        setProximoPassoPlaybook(data);
      } catch (err) {
        console.error('Erro ao carregar proximo passo do playbook:', err);
        setProximoPassoPlaybook(null);
      } finally {
        setLoadingProximoPassoPlaybook(false);
      }
    };
    void carregarProximoPassoPlaybook();
  }, [lead.pipeline_id, etapaAtualOrdem]);

  useEffect(() => {
    const carregarConfigEtapa = async () => {
      try {
        const data = await buscarConfiguracaoEtapaFunil(etapaAtualId);
        setConfigEtapa(data);
      } catch (err) {
        console.error('Erro ao carregar configuracoes da etapa:', err);
        setConfigEtapa(null);
      }
    };
    void carregarConfigEtapa();
  }, [etapaAtualId]);

  useEffect(() => {
    const carregarCamposPersonalizados = async () => {
      try {
        setLoadingCamposPersonalizados(true);
        setErroCamposPersonalizados(null);
        setAvisoCamposPersonalizados(null);

        const [defsRes, leadRes] = await Promise.all([
          supabase
            .from('crm_custom_field_definitions')
            .select('*')
            .eq('id_empresa', lead.id_empresa)
            .eq('ativo', true)
            .order('ordem', { ascending: true })
            .order('criado_em', { ascending: true }),
          supabase
            .from('crm_leads')
            .select('dados_extras')
            .eq('id', lead.lead_id)
            .maybeSingle(),
        ]);

        if (defsRes.error) throw defsRes.error;
        if (leadRes.error) throw leadRes.error;

        setCamposPersonalizados((defsRes.data || []) as CrmCustomFieldDefinition[]);
        const dadosExtras = (leadRes.data as { dados_extras?: unknown } | null)?.dados_extras;
        setValoresCamposPersonalizados(extrairValoresCamposPersonalizados(dadosExtras));
      } catch (err) {
        console.error('Erro ao carregar campos personalizados do lead:', err);
        setCamposPersonalizados([]);
        setValoresCamposPersonalizados({});
        setErroCamposPersonalizados('Nao foi possivel carregar os campos personalizados.');
      } finally {
        setLoadingCamposPersonalizados(false);
      }
    };
    void carregarCamposPersonalizados();
  }, [lead.id_empresa, lead.lead_id]);

  const qtdRespostasExibida = useMemo(
    () => Math.max(lead.qtd_respostas ?? 0, respostasDetalhe.length),
    [lead.qtd_respostas, respostasDetalhe.length]
  );
  const respostasRespondidas = useMemo(
    () =>
      respostasDetalhe.filter(
        (resposta) =>
          (resposta.pergunta_texto || '').trim() !== '' &&
          (resposta.resposta_texto || '').trim() !== ''
      ),
    [respostasDetalhe]
  );
  const respostasExibidas = useMemo(
    () => (layout === 'drawer' ? respostasRespondidas.slice(0, 20) : respostasRespondidas),
    [layout, respostasRespondidas]
  );
  const temQuiz = Boolean(lead.id_quiz);
  const checklistEtapa = configEtapa?.checklist_json || [];
  const templateEtapaBruto = useMemo(() => {
    const raw = configEtapa?.templates_whatsapp_json || null;
    if (!raw) return '';
    const valor =
      String(raw.template || raw.mensagem || raw.texto || '').trim();
    return valor;
  }, [configEtapa?.templates_whatsapp_json]);
  const templateEtapaPreview = useMemo(() => {
    if (!templateEtapaBruto) return '';
    const mapa: Record<string, string> = {
      nome_lead: lead.nome || '',
      email: lead.email || '',
      whatsapp: lead.whatsapp || '',
      origem: lead.origem || '',
      funil: lead.pipeline_nome || '',
      etapa: lead.etapa_nome || '',
    };
    return templateEtapaBruto.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, chave: string) => mapa[chave] ?? '');
  }, [templateEtapaBruto, lead.nome, lead.email, lead.whatsapp, lead.origem, lead.pipeline_nome, lead.etapa_nome]);
  const nomePlaybookExibido = useMemo(
    () => (playbookDoLead?.nome || '').trim() || 'Sem playbook vinculado',
    [playbookDoLead?.nome]
  );
  const proximoPassoExibido = useMemo(() => {
    if (loadingProximoPassoPlaybook) return 'Carregando proximo passo...';
    if (proximoPassoPlaybook?.script) return proximoPassoPlaybook.script;
    if (proximoPassoPlaybook?.etapa_nome) return `Avancar para a etapa ${proximoPassoPlaybook.etapa_nome}.`;
    return 'Nenhum proximo passo configurado para este lead.';
  }, [loadingProximoPassoPlaybook, proximoPassoPlaybook]);
  const etapaAtualNomeExibida = useMemo(() => {
    const etapaAtual = etapasPlaybook.find((item) => item.id === etapaAtualId) || null;
    return etapaAtual?.nome || lead.etapa_nome || '-';
  }, [etapaAtualId, etapasPlaybook, lead.etapa_nome]);
  const proximaEtapaPlaybook = useMemo(() => {
    if (etapaAtualOrdem === null || etapaAtualOrdem === undefined) return null;
    return etapasPlaybook.find((item) => item.ordem > etapaAtualOrdem) || null;
  }, [etapasPlaybook, etapaAtualOrdem]);

  const atualizarValorCampoPersonalizado = (campo: CrmCustomFieldDefinition, valor: string) => {
    const tipo = (campo.tipo as CrmCustomFieldType) || 'text';
    const normalizado = normalizarValorCampo(tipo, valor);
    setValoresCamposPersonalizados((prev) => ({
      ...prev,
      [campo.chave]: normalizado,
    }));
    setAvisoCamposPersonalizados(null);
  };

  const salvarCamposPersonalizados = async () => {
    setSalvandoCamposPersonalizados(true);
    setErroCamposPersonalizados(null);
    setAvisoCamposPersonalizados(null);
    try {
      const { data: atual, error: atualErr } = await supabase
        .from('crm_leads')
        .select('dados_extras')
        .eq('id', lead.lead_id)
        .maybeSingle();
      if (atualErr) throw atualErr;

      const atualRecord = (atual as { dados_extras?: unknown } | null)?.dados_extras;
      const dadosExtrasBase = isRecord(atualRecord) ? { ...atualRecord } : {};

      const chavesPermitidas = new Set(camposPersonalizados.map((campo) => campo.chave));
      const filtrado = Object.entries(valoresCamposPersonalizados).reduce<Record<string, unknown>>((acc, [chave, valor]) => {
        if (!chavesPermitidas.has(chave)) return acc;
        if (valor === null || valor === undefined) return acc;
        const texto = typeof valor === 'string' ? valor.trim() : '';
        if (typeof valor === 'string' && !texto) return acc;
        acc[chave] = valor;
        return acc;
      }, {});

      const payload = {
        ...dadosExtrasBase,
        campos_personalizados: filtrado,
      };

      const { error: updateErr } = await supabase
        .from('crm_leads')
        .update({ dados_extras: payload })
        .eq('id', lead.lead_id);
      if (updateErr) throw updateErr;

      setValoresCamposPersonalizados(filtrado);
      setAvisoCamposPersonalizados('Informacoes adicionais salvas com sucesso.');
    } catch (err) {
      console.error('Erro ao salvar campos personalizados do lead:', err);
      setErroCamposPersonalizados('Nao foi possivel salvar as informacoes adicionais.');
    } finally {
      setSalvandoCamposPersonalizados(false);
    }
  };

  const avancarEtapaPlaybook = async () => {
    if (!lead.pipeline_id || !proximaEtapaPlaybook) return;
    setAvancandoEtapaPlaybook(true);
    setErroEtapasPlaybook(null);
    setAvisoEtapaPlaybook(null);
    try {
      const { error } = await supabase
        .from('crm_pipeline_leads')
        .update({ id_etapa: proximaEtapaPlaybook.id })
        .eq('id_lead', lead.lead_id)
        .eq('id_pipeline', lead.pipeline_id);
      if (error) throw error;

      setEtapaAtualId(proximaEtapaPlaybook.id);
      setEtapaAtualOrdem(proximaEtapaPlaybook.ordem);
      setEtapaExpandidaId(proximaEtapaPlaybook.id);
      setAvisoEtapaPlaybook(`Etapa avancada para ${proximaEtapaPlaybook.ordem}. ${proximaEtapaPlaybook.nome || 'Etapa'}.`);
    } catch (err) {
      console.error('Erro ao avancar etapa do playbook:', err);
      setErroEtapasPlaybook('Nao foi possivel avancar a etapa do playbook.');
    } finally {
      setAvancandoEtapaPlaybook(false);
    }
  };

  const blocoResumoLead = (
    <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/70 p-4">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center text-sm font-bold">
          {obterIniciais(lead.nome)}
        </div>
        <div>
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{lead.nome || 'Sem nome'}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Data: {formatarDataSomenteData(lead.ultimo_evento_em || lead.atualizado_em || lead.criado_em)}
          </p>
        </div>
      </div>
    </div>
  );

  const blocoContato = (
    <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/70 p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Contato</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 dark:bg-neutral-800/70 px-3 py-2">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">E-mail</p>
          <p className="font-medium text-slate-800 dark:text-slate-100">{lead.email || '-'}</p>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-neutral-800/70 px-3 py-2">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">WhatsApp</p>
          <p className="font-medium text-slate-800 dark:text-slate-100">{lead.whatsapp || '-'}</p>
        </div>
      </div>
    </div>
  );

  const blocoClassificacao = (
    <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/70 p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Classificação</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 dark:bg-neutral-800/70 px-3 py-2">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Origem</p>
          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium mt-1 ${badgeColorPorTexto(lead.origem)}`}>
            {lead.origem || '-'}
          </span>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-neutral-800/70 px-3 py-2">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Status</p>
          <p className="font-medium text-slate-800 dark:text-slate-100 mt-1">{lead.status_conversao || '-'}</p>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-neutral-800/70 px-3 py-2">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Score</p>
          <p className="font-medium text-slate-800 dark:text-slate-100">{lead.score_qualificacao ?? 0}</p>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-neutral-800/70 px-3 py-2">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Qtd. respostas</p>
          <p className="font-medium text-slate-800 dark:text-slate-100">{qtdRespostasExibida}</p>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-neutral-800/70 px-3 py-2 col-span-2">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Responsável</p>
          <p className="font-medium text-slate-800 dark:text-slate-100">{lead.responsavel_nome || '-'}</p>
        </div>
      </div>
    </div>
  );

  const blocoFunilQuiz = (
    <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/70 p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Funil e quiz</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 dark:bg-neutral-800/70 px-3 py-2">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Quiz</p>
          <p className="font-medium text-slate-800 dark:text-slate-100">{lead.quiz_titulo || '-'}</p>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-neutral-800/70 px-3 py-2">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Funil</p>
          <p className="font-medium text-slate-800 dark:text-slate-100">{lead.pipeline_nome || '-'}</p>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-neutral-800/70 px-3 py-2">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Etapa</p>
          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium mt-1 ${badgeColorPorTexto(etapaAtualNomeExibida)}`}>
            {etapaAtualNomeExibida}
          </span>
        </div>
      </div>
    </div>
  );

  const blocoInformacoesAdicionais = (
    <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/70 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-blue-600 dark:text-blue-300" />
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Informacoes adicionais
          </p>
        </div>
        {camposPersonalizados.length > 0 && (
          <button
            onClick={() => void salvarCamposPersonalizados()}
            disabled={salvandoCamposPersonalizados}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-60"
          >
            {salvandoCamposPersonalizados ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Salvar
          </button>
        )}
      </div>

      {erroCamposPersonalizados && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {erroCamposPersonalizados}
        </div>
      )}
      {avisoCamposPersonalizados && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {avisoCamposPersonalizados}
        </div>
      )}

      {loadingCamposPersonalizados ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={`skeleton-extra-${idx}`} className="rounded-xl bg-slate-50 dark:bg-neutral-800/70 px-3 py-3">
              <div className="h-3 w-24 rounded bg-slate-200 dark:bg-neutral-700 animate-pulse mb-2" />
              <div className="h-9 w-full rounded bg-slate-200 dark:bg-neutral-700 animate-pulse" />
            </div>
          ))}
        </div>
      ) : camposPersonalizados.length === 0 ? (
        <div className="rounded-xl bg-slate-50 dark:bg-neutral-800/70 px-3 py-3 text-sm text-slate-500 dark:text-slate-400">
          Nenhum campo personalizado configurado.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
          {camposPersonalizados.map((campo) => {
            const tipo = (campo.tipo as CrmCustomFieldType) || 'text';
            const valorBruto = valoresCamposPersonalizados[campo.chave];
            const valorTexto = valorBruto === null || valorBruto === undefined ? '' : String(valorBruto);
            const valorData = valorTexto ? valorTexto.slice(0, 10) : '';
            const opcoes = extrairOpcoesSelectCampo(campo.opcoes);
            return (
              <div key={campo.id} className="rounded-xl bg-slate-50 dark:bg-neutral-800/70 px-3 py-2">
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">{campo.nome}</label>
                {tipo === 'select' ? (
                  <select
                    value={valorTexto}
                    onChange={(e) => atualizarValorCampoPersonalizado(campo, e.target.value)}
                    className="w-full rounded-lg border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 px-2.5 py-2 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/35 focus:border-blue-500"
                  >
                    <option value="">Selecione</option>
                    {opcoes.map((opcao) => (
                      <option key={`${campo.id}-${opcao}`} value={opcao}>
                        {opcao}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={tipo === 'number' ? 'number' : tipo === 'date' ? 'date' : 'text'}
                    value={tipo === 'date' ? valorData : valorTexto}
                    onChange={(e) => atualizarValorCampoPersonalizado(campo, e.target.value)}
                    placeholder={tipo === 'date' ? 'dd/mm/aaaa' : ''}
                    className="w-full rounded-lg border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 px-2.5 py-2 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/35 focus:border-blue-500"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const blocoDatas = (
    <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">Datas</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 dark:bg-neutral-800/70 px-3 py-2">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Ultimo evento</p>
          <p className="font-medium text-slate-800 dark:text-slate-100">{formatarData(lead.ultimo_evento_em || lead.atualizado_em || lead.criado_em)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-neutral-800/70 px-3 py-2">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Criado em</p>
          <p className="font-medium text-slate-800 dark:text-slate-100">{formatarData(lead.criado_em)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-neutral-800/70 px-3 py-2 sm:col-span-2">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Atualizado em</p>
          <p className="font-medium text-slate-800 dark:text-slate-100">{formatarData(lead.atualizado_em || lead.criado_em)}</p>
        </div>
      </div>
    </div>
  );

  const blocoRespostasQuiz = (
    <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/70 p-4">
      <button
        onClick={() => setRespostasExpandido((v) => !v)}
        className="w-full inline-flex items-center justify-between"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {layout === 'page' ? 'Respostas Quiz' : 'Diagnostico (20 perguntas)'}
        </p>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {respostasExpandido ? 'Ocultar' : 'Expandir'}
        </span>
      </button>
      {respostasExpandido && (
        <div className="mt-3 space-y-3">
          {loadingRespostas ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="rounded-xl bg-slate-50 dark:bg-neutral-800/70 px-3 py-3">
                  <div className="h-4 w-32 rounded bg-slate-200 dark:bg-neutral-700 animate-pulse mb-2" />
                  <div className="h-4 w-full rounded bg-slate-200 dark:bg-neutral-700 animate-pulse" />
                </div>
              ))}
            </div>
          ) : respostasExibidas.length === 0 ? (
            <div className="rounded-xl bg-slate-50 dark:bg-neutral-800/70 px-3 py-3 text-sm text-slate-500 dark:text-slate-400">
              Nenhuma resposta registrada para este lead.
            </div>
          ) : (
            respostasExibidas.map((resposta, idx) => {
              const alternativas = obterAlternativas(resposta.opcoes_snapshot);
              return (
                <div key={resposta.id} className="rounded-xl bg-slate-50 dark:bg-neutral-800/70 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                    Pergunta {idx + 1}
                  </p>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400">Pergunta</p>
                  <p className="font-medium text-slate-800 dark:text-slate-100 mb-2">{resposta.pergunta_texto || '-'}</p>

                  {alternativas.length > 0 && (
                    <>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400">Alternativas</p>
                      <div className="mt-1 mb-2 flex flex-wrap gap-1.5">
                        {alternativas.map((alternativa, alternativaIdx) => {
                          const selecionada = respostaSelecionouOpcao(resposta.resposta_texto, alternativa);
                          return (
                            <span
                              key={`${resposta.id}-alt-${alternativaIdx}`}
                              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] ${
                                selecionada
                                  ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300'
                                  : 'border-slate-200 bg-white text-slate-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'
                              }`}
                            >
                              {alternativa}
                            </span>
                          );
                        })}
                      </div>
                    </>
                  )}

                  <p className="text-[12px] text-slate-500 dark:text-slate-400">Resposta</p>
                  <p className="font-medium text-slate-800 dark:text-slate-100">{resposta.resposta_texto || '-'}</p>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );

  const blocoEtapaEstrategica =
    checklistEtapa.length > 0 || templateEtapaBruto ? (
      <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/70 p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Conteudo da etapa
        </p>

        {checklistEtapa.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Checklist</p>
            <div className="space-y-1">
              {checklistEtapa.map((item, idx) => (
                <div key={`check-${idx}`} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {templateEtapaBruto && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Template WhatsApp</p>
            <div className="rounded-xl bg-slate-50 dark:bg-neutral-800/70 px-3 py-2">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">Modelo</p>
              <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{templateEtapaBruto}</p>
            </div>
            <div className="rounded-xl bg-blue-50/70 dark:bg-blue-500/10 px-3 py-2 border border-blue-100 dark:border-blue-500/30">
              <p className="text-[11px] text-blue-700 dark:text-blue-300 mb-1">Preview com variaveis</p>
              <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">{templateEtapaPreview || '-'}</p>
            </div>
          </div>
        )}
      </div>
    ) : null;

  const blocoPlaybook =
    layout === 'drawer' ? (
      <div className="rounded-2xl border border-blue-200 dark:border-blue-500/30 bg-gradient-to-br from-blue-50 to-sky-50/70 dark:from-blue-500/10 dark:to-sky-500/10 p-4 shadow-sm space-y-3">
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300">
            <Lightbulb size={15} />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Playbook</p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">{nomePlaybookExibido}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white/85 dark:bg-neutral-900/70 p-3">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Proximo passo</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{proximoPassoExibido}</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Para detalhes, veja mais.</p>
        </div>
      </div>
    ) : (
      <div className="rounded-2xl border border-blue-200 dark:border-blue-500/30 bg-gradient-to-br from-blue-50 to-sky-50/70 dark:from-blue-500/10 dark:to-sky-500/10 p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="inline-flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300">
              <Lightbulb size={15} />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Guia do Playbook</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">{nomePlaybookExibido}</p>
            </div>
          </div>

          <button
            onClick={() => void avancarEtapaPlaybook()}
            disabled={!proximaEtapaPlaybook || avancandoEtapaPlaybook}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-60"
          >
            {avancandoEtapaPlaybook ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
            {proximaEtapaPlaybook ? 'Avancar etapa do playbook' : 'Playbook concluido'}
          </button>
        </div>

        {(erroEtapasPlaybook || avisoEtapaPlaybook) && (
          <div className="space-y-2">
            {erroEtapasPlaybook && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {erroEtapasPlaybook}
              </div>
            )}
            {avisoEtapaPlaybook && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {avisoEtapaPlaybook}
              </div>
            )}
          </div>
        )}

        {loadingEtapasPlaybook ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={`playbook-skeleton-${idx}`} className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white/85 dark:bg-neutral-900/70 px-3 py-3">
                <div className="h-4 w-40 rounded bg-slate-200 dark:bg-neutral-700 animate-pulse" />
                <div className="mt-2 h-4 w-full rounded bg-slate-200 dark:bg-neutral-700 animate-pulse" />
              </div>
            ))}
          </div>
        ) : etapasPlaybook.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white/85 dark:bg-neutral-900/70 p-3 text-sm text-slate-500 dark:text-slate-400">
            Nenhuma etapa de playbook configurada para este funil.
          </div>
        ) : (
          <div className="space-y-2">
            {etapasPlaybook.map((etapa) => {
              const status =
                etapaAtualOrdem === null || etapaAtualOrdem === undefined
                  ? 'proxima'
                  : etapa.ordem < etapaAtualOrdem
                    ? 'concluida'
                    : etapa.ordem === etapaAtualOrdem
                      ? 'atual'
                      : 'proxima';
              const expandida = etapaExpandidaId === etapa.id;
              const scriptEtapa = extrairScriptEtapaPlaybook(etapa.playbook_json, etapa.templates_whatsapp_json);
              return (
                <div
                  key={etapa.id}
                  className={`rounded-xl border bg-white/90 dark:bg-neutral-900/80 transition-colors ${
                    status === 'atual'
                      ? 'border-blue-300 dark:border-blue-500/40'
                      : 'border-slate-200 dark:border-neutral-700'
                  } ${status === 'concluida' ? 'opacity-55' : ''}`}
                >
                  <button
                    onClick={() => setEtapaExpandidaId((prev) => (prev === etapa.id ? null : etapa.id))}
                    className="w-full flex items-center justify-between gap-3 px-3 py-3 text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[11px] font-semibold ${
                          status === 'concluida'
                            ? 'bg-slate-200 text-slate-600 dark:bg-neutral-700 dark:text-neutral-300'
                            : status === 'atual'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-200'
                        }`}
                      >
                        {etapa.ordem}
                      </span>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {etapa.nome || `Etapa ${etapa.ordem}`}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2">
                      {status === 'concluida' && <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />}
                      {status === 'atual' && <CircleDot size={14} className="text-blue-600 dark:text-blue-300" />}
                      <ChevronDown size={14} className={`text-slate-500 dark:text-slate-400 transition-transform ${expandida ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {expandida && (
                    <div className="px-3 pb-3 space-y-2">
                      <div className="rounded-lg bg-blue-50/70 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/30 px-3 py-2">
                        <p className="text-[11px] text-blue-700 dark:text-blue-300">Script</p>
                        <p className="mt-1 text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">{scriptEtapa}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );

  if (layout === 'page') {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 text-sm">
        <div className="xl:col-span-3 space-y-4">
          {blocoResumoLead}
          {blocoContato}
          {blocoClassificacao}
          {blocoFunilQuiz}
          {blocoInformacoesAdicionais}
          {blocoDatas}
        </div>
        <div className="xl:col-span-5 space-y-4">
          {blocoPlaybook}
          {blocoEtapaEstrategica}
          {temQuiz && blocoRespostasQuiz}
        </div>
        <div className="xl:col-span-4 space-y-4">
          <LeadTimeline leadId={lead.lead_id} userId={userId} autorPadrao={autorPadrao} refreshKey={timelineRefreshKey} />
          <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
              Documentos
            </p>
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-neutral-700 bg-slate-50/70 dark:bg-neutral-800/50 p-4 text-center">
              <FileText size={18} className="mx-auto text-slate-400 dark:text-neutral-500" />
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Nenhum documento anexado.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      {blocoResumoLead}
      {blocoContato}
      {blocoClassificacao}
      {blocoFunilQuiz}
      {blocoInformacoesAdicionais}
      {blocoPlaybook}
      {blocoEtapaEstrategica}
      <LeadTimeline leadId={lead.lead_id} userId={userId} autorPadrao={autorPadrao} refreshKey={timelineRefreshKey} />
      {blocoRespostasQuiz}
      {blocoDatas}
    </div>
  );
}
