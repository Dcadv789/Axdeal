'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  MessageCircle,
  Eye,
  Filter,
  LayoutGrid,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Plus,
  Pencil,
  SlidersHorizontal,
  Table2,
  Target,
  Trash2,
  X,
  Maximize2,
} from 'lucide-react';
import PageTitle from '@/components/ui/PageTitle';
import LeadDetailsView from '@/components/crm/LeadDetailsView';
import { buscarLeadRelatorioPorId, type LeadRelatorioRow } from '@/components/crm/leadDetailsData';
import playbookConfigPadrao from '@/components/crm/playbookConfig.json';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { CrmPipeline, CrmPipelineEtapa, CrmPlaybook, Quiz } from '@/types/database';

type Visualizacao = 'tabela' | 'kanban';
type LeadDrawerMode = 'view' | 'edit';
type StatusNegocio = 'aberto' | 'ganho' | 'perdido';

interface LeadEditForm {
  nome: string;
  email: string;
  whatsapp: string;
  id_responsavel: string;
  origem: string;
  status_conversao: string;
  score_qualificacao: number;
  valor_estimado_contrato: number;
  id_quiz: string;
  pipeline_id: string;
  etapa_id: string;
}

interface MembroEquipeResponsavel {
  id_usuario: string;
  nome_completo: string | null;
}

type ColunaTabela =
  | 'lead'
  | 'data'
  | 'email'
  | 'whatsapp'
  | 'origem'
  | 'quiz'
  | 'funil'
  | 'etapa'
  | 'score'
  | 'ultimo_evento'
  | 'utm_source'
  | 'utm_medium'
  | 'utm_campaign'
  | 'utm_term'
  | 'utm_content'
  | 'utm_id';

const COLUNA_LABELS: Record<ColunaTabela, string> = {
  lead: 'Lead',
  data: 'Data',
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  origem: 'Origem',
  quiz: 'Quiz',
  funil: 'Funil',
  etapa: 'Etapa',
  score: 'Score',
  ultimo_evento: 'Últ. evento',
  utm_source: 'UTM Source',
  utm_medium: 'UTM Medium',
  utm_campaign: 'UTM Campaign',
  utm_term: 'UTM Term',
  utm_content: 'UTM Content',
  utm_id: 'UTM ID',
};

const STATUS_NEGOCIO_LABELS: Record<StatusNegocio, string> = {
  aberto: 'Em Aberto',
  ganho: 'Ganhos',
  perdido: 'Perdidos',
};

const STATUS_NEGOCIO_ESTILO: Record<StatusNegocio, string> = {
  aberto: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300',
  ganho: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300',
  perdido: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300',
};

export default function CrmLeadsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const visualizacaoInicial: Visualizacao = searchParams.get('view') === 'kanban' ? 'kanban' : 'tabela';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [leads, setLeads] = useState<LeadRelatorioRow[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [pipelines, setPipelines] = useState<CrmPipeline[]>([]);
  const [etapasMap, setEtapasMap] = useState<Record<string, CrmPipelineEtapa[]>>({});
  const [busca, setBusca] = useState('');
  const [pipelineFiltro, setPipelineFiltro] = useState<string>('todos');
  const [etapasFiltroSelecionadas, setEtapasFiltroSelecionadas] = useState<string[]>([]);
  const [origemFiltro, setOrigemFiltro] = useState<string>('todas');
  const [responsavelFiltro, setResponsavelFiltro] = useState<string>('todos');
  const [emailPreenchidoFiltro, setEmailPreenchidoFiltro] = useState<'todos' | 'true' | 'false'>('todos');
  const [dataInicioFiltro, setDataInicioFiltro] = useState('');
  const [dataFimFiltro, setDataFimFiltro] = useState('');
  const [periodoOpen, setPeriodoOpen] = useState(false);
  const [mesCalendarioBase, setMesCalendarioBase] = useState(() => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  });
  const [visualizacao, setVisualizacao] = useState<Visualizacao>(visualizacaoInicial);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [salvandoPipeline, setSalvandoPipeline] = useState(false);
  const [pipelineEditId, setPipelineEditId] = useState<string | null>(null);
  const [formNome, setFormNome] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formPlaybookId, setFormPlaybookId] = useState('');
  const [formValorEstimadoPadrao, setFormValorEstimadoPadrao] = useState('');
  const [formEtapas, setFormEtapas] = useState<string[]>(['Novo Lead', 'Contato', 'Proposta', 'Fechado']);
  const [playbooks, setPlaybooks] = useState<CrmPlaybook[]>([]);
  const [playbookDrawerOpen, setPlaybookDrawerOpen] = useState(false);
  const [playbookNomeForm, setPlaybookNomeForm] = useState('');
  const [playbookDescricaoForm, setPlaybookDescricaoForm] = useState('');
  const [playbookConfigForm, setPlaybookConfigForm] = useState(() => JSON.stringify(playbookConfigPadrao, null, 2));
  const [salvandoPlaybook, setSalvandoPlaybook] = useState(false);
  const [menuColunasOpen, setMenuColunasOpen] = useState(false);
  const [menuFunilOpen, setMenuFunilOpen] = useState(false);
  const [menuEtapasOpen, setMenuEtapasOpen] = useState(false);
  const [menuOrigemOpen, setMenuOrigemOpen] = useState(false);
  const [menuResponsavelOpen, setMenuResponsavelOpen] = useState(false);
  const [menuEmailOpen, setMenuEmailOpen] = useState(false);
  const [menuAcoes, setMenuAcoes] = useState<{ leadId: string; top: number; left: number } | null>(null);
  const [leadDetalhe, setLeadDetalhe] = useState<LeadRelatorioRow | null>(null);
  const [leadDrawerMode, setLeadDrawerMode] = useState<LeadDrawerMode>('view');
  const [salvandoEdicaoLead, setSalvandoEdicaoLead] = useState(false);
  const [leadParaExcluir, setLeadParaExcluir] = useState<LeadRelatorioRow | null>(null);
  const [confirmarExcluirTexto, setConfirmarExcluirTexto] = useState('');
  const [excluindoLead, setExcluindoLead] = useState(false);
  const [tagInputByLead, setTagInputByLead] = useState<Record<string, string>>({});
  const [salvandoTagLeadId, setSalvandoTagLeadId] = useState<string | null>(null);
  const [tagEditorLeadId, setTagEditorLeadId] = useState<string | null>(null);
  const [menuCardLeadId, setMenuCardLeadId] = useState<string | null>(null);
  const [dragLeadId, setDragLeadId] = useState<string | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{ etapaId: string; index: number } | null>(null);
  const [dragOverStatusNegocio, setDragOverStatusNegocio] = useState<StatusNegocio | null>(null);
  const [statusNegocioFiltro, setStatusNegocioFiltro] = useState<StatusNegocio>('aberto');
  const [movendoLeadId, setMovendoLeadId] = useState<string | null>(null);
  const [kanbanLeadOrder, setKanbanLeadOrder] = useState<string[]>([]);
  const [timelineRefreshKey, setTimelineRefreshKey] = useState(0);
  const [responsaveisEquipe, setResponsaveisEquipe] = useState<MembroEquipeResponsavel[]>([]);
  const periodoRef = useRef<HTMLDivElement | null>(null);
  const funilRef = useRef<HTMLDivElement | null>(null);
  const etapasRef = useRef<HTMLDivElement | null>(null);
  const origemRef = useRef<HTMLDivElement | null>(null);
  const responsavelRef = useRef<HTMLDivElement | null>(null);
  const emailRef = useRef<HTMLDivElement | null>(null);
  const kanbanRef = useRef<HTMLDivElement | null>(null);
  const [kanbanAltura, setKanbanAltura] = useState<number>(560);
  const [colunasVisiveis, setColunasVisiveis] = useState<Record<ColunaTabela, boolean>>({
    lead: true,
    data: true,
    email: true,
    whatsapp: true,
    origem: true,
    quiz: true,
    funil: true,
    etapa: true,
    score: true,
    ultimo_evento: false,
    utm_source: false,
    utm_medium: false,
    utm_campaign: false,
    utm_term: false,
    utm_content: false,
    utm_id: false,
  });
  const [leadForm, setLeadForm] = useState<LeadEditForm>({
    nome: '',
    email: '',
    whatsapp: '',
    id_responsavel: '',
    origem: '',
    status_conversao: '',
    score_qualificacao: 0,
    valor_estimado_contrato: 0,
    id_quiz: '',
    pipeline_id: '',
    etapa_id: '',
  });
  const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const nomesSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  const etapasValidas = useMemo(() => formEtapas.map((e) => e.trim()).filter(Boolean), [formEtapas]);
  const totalColunasTabela = useMemo(() => Object.values(colunasVisiveis).filter(Boolean).length + 2, [colunasVisiveis]);

  const etapasFiltro = useMemo(() => {
    if (pipelineFiltro === 'todos') return [];
    return (etapasMap[pipelineFiltro] || []).sort((a, b) => a.ordem - b.ordem);
  }, [pipelineFiltro, etapasMap]);

  const etapasEdicao = useMemo(() => {
    if (!leadForm.pipeline_id) return [];
    return (etapasMap[leadForm.pipeline_id] || []).sort((a, b) => a.ordem - b.ordem);
  }, [leadForm.pipeline_id, etapasMap]);

  const etapasFiltroLabel = useMemo(() => {
    if (pipelineFiltro === 'todos') return 'Selecione um funil';
    if (etapasFiltroSelecionadas.length === 0) return 'Todas as etapas';
    if (etapasFiltroSelecionadas.length === 1) {
      const etapa = etapasFiltro.find((e) => e.id === etapasFiltroSelecionadas[0]);
      return etapa ? `${etapa.ordem}. ${etapa.nome}` : '1 etapa selecionada';
    }
    return `${etapasFiltroSelecionadas.length} etapas selecionadas`;
  }, [pipelineFiltro, etapasFiltroSelecionadas, etapasFiltro]);

  const origensDisponiveis = useMemo(() => {
    return Array.from(new Set(leads.map((lead) => (lead.origem || '').trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
    );
  }, [leads]);
  const emailPreenchidoFiltroLabel = useMemo(() => {
    if (emailPreenchidoFiltro === 'true') return 'Sim';
    if (emailPreenchidoFiltro === 'false') return 'Não';
    return 'Todos';
  }, [emailPreenchidoFiltro]);
  const responsavelFiltroLabel = useMemo(() => {
    if (responsavelFiltro === 'todos') return 'Todos';
    if (responsavelFiltro === 'sem_responsavel') return 'Sem responsável';
    const membro = responsaveisEquipe.find((item) => item.id_usuario === responsavelFiltro);
    return membro?.nome_completo || 'Responsável';
  }, [responsavelFiltro, responsaveisEquipe]);
  const playbooksAtivos = useMemo(() => playbooks.filter((playbook) => playbook.ativo), [playbooks]);

  const normalizarStatusNegocio = (valor: string | null | undefined): StatusNegocio => {
    const status = (valor || '').trim().toLowerCase();
    if (status === 'ganho') return 'ganho';
    if (status === 'perdido') return 'perdido';
    return 'aberto';
  };

  const leadsFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const inicio = dataInicioFiltro ? new Date(`${dataInicioFiltro}T00:00:00`) : null;
    const fim = dataFimFiltro ? new Date(`${dataFimFiltro}T23:59:59.999`) : null;
    return leads.filter((lead) => {
      const byPipeline = pipelineFiltro === 'todos' || lead.pipeline_id === pipelineFiltro;
      const byEtapa = etapasFiltroSelecionadas.length === 0 || (lead.etapa_id ? etapasFiltroSelecionadas.includes(lead.etapa_id) : false);
      const byBusca =
        !termo ||
        (lead.nome || '').toLowerCase().includes(termo) ||
        (lead.email || '').toLowerCase().includes(termo) ||
        (lead.whatsapp || '').toLowerCase().includes(termo) ||
        (lead.quiz_titulo || '').toLowerCase().includes(termo);
      const byOrigem = origemFiltro === 'todas' || (lead.origem || '').trim().toLowerCase() === origemFiltro.toLowerCase();
      const byResponsavel =
        responsavelFiltro === 'todos' ||
        (responsavelFiltro === 'sem_responsavel'
          ? !lead.id_responsavel
          : lead.id_responsavel === responsavelFiltro);
      const temEmail = Boolean((lead.email || '').trim());
      const byEmailPreenchido =
        emailPreenchidoFiltro === 'todos' ||
        (emailPreenchidoFiltro === 'true' ? temEmail : !temEmail);
      const dataLeadRef = obterDataBaseLead(lead);
      const dataLead = dataLeadRef ? new Date(dataLeadRef) : null;
      const byDataInicio = !inicio || (dataLead && dataLead >= inicio);
      const byDataFim = !fim || (dataLead && dataLead <= fim);
      return byPipeline && byEtapa && byBusca && byOrigem && byResponsavel && byEmailPreenchido && byDataInicio && byDataFim;
    });
  }, [leads, busca, pipelineFiltro, etapasFiltroSelecionadas, origemFiltro, responsavelFiltro, emailPreenchidoFiltro, dataInicioFiltro, dataFimFiltro]);

  const contagemStatusNegocio = useMemo(() => {
    return leadsFiltrados.reduce(
      (acc, lead) => {
        const status = normalizarStatusNegocio(lead.status_negocio);
        acc[status] += 1;
        return acc;
      },
      { aberto: 0, ganho: 0, perdido: 0 } as Record<StatusNegocio, number>
    );
  }, [leadsFiltrados]);

  const leadsKanbanFiltrados = useMemo(
    () => leadsFiltrados.filter((lead) => normalizarStatusNegocio(lead.status_negocio) === statusNegocioFiltro),
    [leadsFiltrados, statusNegocioFiltro]
  );

  const leadArrastando = useMemo(
    () => (dragLeadId ? leads.find((lead) => lead.lead_id === dragLeadId) ?? null : null),
    [dragLeadId, leads]
  );

  useEffect(() => {
    const idsAtuais = leads.map((lead) => lead.lead_id);
    setKanbanLeadOrder((prev) => {
      const ativos = prev.filter((id) => idsAtuais.includes(id));
      const novos = idsAtuais.filter((id) => !ativos.includes(id));
      return [...ativos, ...novos];
    });
  }, [leads]);

  useEffect(() => {
    if (!dragLeadId) return;
    const limparEstadoDrag = () => {
      setDragLeadId(null);
      setDragOverInfo(null);
      setDragOverStatusNegocio(null);
    };
    window.addEventListener('dragend', limparEstadoDrag);
    window.addEventListener('drop', limparEstadoDrag);
    return () => {
      window.removeEventListener('dragend', limparEstadoDrag);
      window.removeEventListener('drop', limparEstadoDrag);
    };
  }, [dragLeadId]);

  function obterDataBaseLead(lead: LeadRelatorioRow) {
    return lead.ultimo_evento_em || lead.atualizado_em || lead.criado_em;
  }

  const formatarData = (valor: string | null) => {
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
  };

  const formatarDataSomenteData = (valor: string | null) => {
    if (!valor) return '-';
    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const campoFiltroClass =
    'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-700 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-500 transition-colors';
  const campoModalLeadClass =
    'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-500 transition-colors';

  const toISODate = (data: Date) => {
    const ano = data.getFullYear();
    const mes = `${data.getMonth() + 1}`.padStart(2, '0');
    const dia = `${data.getDate()}`.padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  const limparWhatsApp = (valor: string | null) => {
    if (!valor) return '';
    return valor.replace(/\D/g, '');
  };

  const parseValorMonetario = (valor: string | number | null | undefined): number => {
    if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
    if (typeof valor !== 'string') return 0;
    const texto = valor.trim();
    if (!texto) return 0;

    let normalizado = texto;
    if (texto.includes(',') && texto.includes('.')) {
      if (texto.lastIndexOf(',') > texto.lastIndexOf('.')) {
        normalizado = texto.replace(/\./g, '').replace(',', '.');
      } else {
        normalizado = texto.replace(/,/g, '');
      }
    } else if (texto.includes(',')) {
      normalizado = texto.replace(',', '.');
    }

    const numero = Number(normalizado);
    return Number.isFinite(numero) ? numero : 0;
  };

  const obterValorPadraoPipeline = useCallback(
    (pipelineId: string | null | undefined): number => {
      if (!pipelineId) return 0;
      const pipeline = pipelines.find((item) => item.id === pipelineId) as (CrmPipeline & {
        valor_estimado_padrao?: number | string | null;
      }) | undefined;
      return parseValorMonetario(pipeline?.valor_estimado_padrao ?? 0);
    },
    [pipelines]
  );

  const linkWhatsApp = (valor: string | null) => {
    const numero = limparWhatsApp(valor);
    if (!numero) return '';
    return `https://wa.me/${numero}`;
  };

  const registrarInteracaoAutomatica = useCallback(
    async (
      lead: LeadRelatorioRow,
      tipo: 'WhatsApp' | 'Ligação' | 'E-mail',
      descricao: string,
      status = 'Tentativa'
    ) => {
      const autorNome = (user?.user_metadata as { full_name?: string } | undefined)?.full_name || user?.email || null;
      const { error: interacaoErr } = await supabase.from('crm_interacoes').insert({
        id_lead: lead.lead_id,
        tipo,
        descricao,
        status,
        id_usuario: user?.id || null,
        autor_nome: autorNome,
      });
      if (interacaoErr) {
        console.error('Erro ao registrar interação automática:', interacaoErr);
        return;
      }
      if (leadDetalhe?.lead_id === lead.lead_id) {
        setTimelineRefreshKey((prev) => prev + 1);
      }
    },
    [user, leadDetalhe?.lead_id]
  );

  const parseISODate = (valor: string) => {
    if (!valor) return null;
    const [ano, mes, dia] = valor.split('-').map(Number);
    if (!ano || !mes || !dia) return null;
    return new Date(ano, mes - 1, dia);
  };

  const montarDiasMes = (base: Date) => {
    const ano = base.getFullYear();
    const mes = base.getMonth();
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    const diasNoMes = ultimoDia.getDate();
    const inicioSemana = (primeiroDia.getDay() + 6) % 7;
    const total = 42;
    return Array.from({ length: total }, (_, idx) => {
      const dia = idx - inicioSemana + 1;
      if (dia < 1 || dia > diasNoMes) return null;
      return new Date(ano, mes, dia);
    });
  };

  const periodoLabel = useMemo(() => {
    if (dataInicioFiltro && dataFimFiltro) {
      return `${formatarDataSomenteData(dataInicioFiltro)} - ${formatarDataSomenteData(dataFimFiltro)}`;
    }
    if (dataInicioFiltro) return `${formatarDataSomenteData(dataInicioFiltro)} - ...`;
    return 'Selecionar período';
  }, [dataInicioFiltro, dataFimFiltro]);

  const selecionarDiaPeriodo = (dia: Date) => {
    const iso = toISODate(dia);
    if (!dataInicioFiltro || (dataInicioFiltro && dataFimFiltro)) {
      setDataInicioFiltro(iso);
      setDataFimFiltro('');
      return;
    }
    const inicio = parseISODate(dataInicioFiltro);
    if (!inicio) {
      setDataInicioFiltro(iso);
      setDataFimFiltro('');
      return;
    }
    if (dia < inicio) {
      setDataFimFiltro(dataInicioFiltro);
      setDataInicioFiltro(iso);
    } else {
      setDataFimFiltro(iso);
      setPeriodoOpen(false);
    }
  };

  const diaSelecionado = (dia: Date) => {
    const iso = toISODate(dia);
    return iso === dataInicioFiltro || iso === dataFimFiltro;
  };

  const diaNoIntervalo = (dia: Date) => {
    if (!dataInicioFiltro || !dataFimFiltro) return false;
    const atual = parseISODate(toISODate(dia));
    const inicio = parseISODate(dataInicioFiltro);
    const fim = parseISODate(dataFimFiltro);
    if (!atual || !inicio || !fim) return false;
    return atual >= inicio && atual <= fim;
  };

  const obterIniciais = (nome: string | null) => {
    const valor = (nome || '').trim();
    if (!valor) return 'SN';
    const partes = valor.split(/\s+/).filter(Boolean);
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return `${partes[0][0] || ''}${partes[1][0] || ''}`.toUpperCase();
  };

  const badgeColorPorTexto = (valor: string | null) => {
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
  };

  const corCabecalhoKanbanPorIndice = (indice: number) => {
    const tema = [
      'bg-blue-100 text-blue-900 dark:bg-blue-500/25 dark:text-blue-100',
      'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/25 dark:text-emerald-100',
      'bg-amber-100 text-amber-900 dark:bg-amber-500/25 dark:text-amber-100',
      'bg-violet-100 text-violet-900 dark:bg-violet-500/25 dark:text-violet-100',
      'bg-rose-100 text-rose-900 dark:bg-rose-500/25 dark:text-rose-100',
      'bg-cyan-100 text-cyan-900 dark:bg-cyan-500/25 dark:text-cyan-100',
      'bg-indigo-100 text-indigo-900 dark:bg-indigo-500/25 dark:text-indigo-100',
      'bg-teal-100 text-teal-900 dark:bg-teal-500/25 dark:text-teal-100',
    ];
    return tema[indice % tema.length];
  };

  const corBordaEsquerdaCardKanbanPorIndice = (indice: number) => {
    const tema = [
      'border-l-blue-500 dark:border-l-blue-400',
      'border-l-emerald-500 dark:border-l-emerald-400',
      'border-l-amber-500 dark:border-l-amber-400',
      'border-l-violet-500 dark:border-l-violet-400',
      'border-l-rose-500 dark:border-l-rose-400',
      'border-l-cyan-500 dark:border-l-cyan-400',
      'border-l-indigo-500 dark:border-l-indigo-400',
      'border-l-teal-500 dark:border-l-teal-400',
    ];
    return tema[indice % tema.length];
  };

  const renderPreviewCardKanban = (lead: LeadRelatorioRow, etapaIdx: number) => (
    <div
      className={`rounded-lg border border-dashed border-slate-300 dark:border-neutral-600 border-l-4 bg-white/80 dark:bg-neutral-900/70 p-3 opacity-60 pointer-events-none shadow-sm ${corBordaEsquerdaCardKanbanPorIndice(etapaIdx)}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {obterIniciais(lead.nome)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{lead.nome || 'Sem nome'}</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{lead.email || '-'}</p>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-gray-600 dark:text-gray-300">Score {lead.score_qualificacao ?? 0}</span>
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${badgeColorPorTexto(lead.origem)}`}>
          {lead.origem || '-'}
        </span>
      </div>
      <div className="mt-2">
        <p className="text-[11px] text-gray-600 dark:text-gray-300 truncate">{lead.whatsapp || '-'}</p>
      </div>
    </div>
  );

  const ordenarLeadsPorKanban = useCallback(
    (lista: LeadRelatorioRow[]) => {
      const ordemMap = new Map(kanbanLeadOrder.map((id, idx) => [id, idx]));
      return [...lista].sort((a, b) => {
        const ia = ordemMap.get(a.lead_id) ?? Number.MAX_SAFE_INTEGER;
        const ib = ordemMap.get(b.lead_id) ?? Number.MAX_SAFE_INTEGER;
        return ia - ib;
      });
    },
    [kanbanLeadOrder]
  );

  const confirmacaoExclusaoOk = useMemo(() => {
    const valor = confirmarExcluirTexto.trim().toLowerCase();
    return valor === 'excluir' || valor === 'escluir';
  }, [confirmarExcluirTexto]);

  const carregarTudo = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const { data: memberData, error: memberErr } = await supabase
        .from('sis_membros_equipe')
        .select('id_empresa')
        .eq('id_usuario', user.id)
        .maybeSingle();
      if (memberErr) throw memberErr;
      if (!memberData?.id_empresa) return;

      const { data: membrosData, error: membrosErr } = await supabase
        .from('sis_membros_equipe')
        .select('id_usuario, nome_completo')
        .eq('id_empresa', memberData.id_empresa)
        .order('nome_completo', { ascending: true });
      if (membrosErr) {
        console.warn('Nao foi possivel carregar membros da equipe para responsavel:', membrosErr.message);
        setResponsaveisEquipe([]);
      } else {
        const mapaMembros = new Map<string, MembroEquipeResponsavel>();
        ((membrosData || []) as MembroEquipeResponsavel[]).forEach((membro) => {
          if (!membro.id_usuario) return;
          if (!mapaMembros.has(membro.id_usuario)) {
            mapaMembros.set(membro.id_usuario, {
              id_usuario: membro.id_usuario,
              nome_completo: membro.nome_completo || null,
            });
          }
        });
        setResponsaveisEquipe(
          Array.from(mapaMembros.values()).sort((a, b) =>
            (a.nome_completo || '').localeCompare(b.nome_completo || '', 'pt-BR', { sensitivity: 'base' })
          )
        );
      }

      const { data: playbooksData, error: playbooksErr } = await supabase
        .from('crm_playbooks')
        .select('*')
        .eq('id_empresa', memberData.id_empresa)
        .order('criado_em', { ascending: false });
      if (playbooksErr) {
        console.warn('Tabela de playbooks indisponivel (execute a migration):', playbooksErr.message);
        setPlaybooks([]);
      } else {
        setPlaybooks((playbooksData || []) as CrmPlaybook[]);
      }

      const { data: quizzesData, error: quizzesErr } = await supabase
        .from('crm_quiz')
        .select('*')
        .eq('id_empresa', memberData.id_empresa)
        .order('titulo', { ascending: true });
      if (quizzesErr) throw quizzesErr;
      setQuizzes((quizzesData || []) as Quiz[]);

      const { data: pipelinesData, error: pipelinesErr } = await supabase
        .from('crm_pipelines')
        .select('*')
        .eq('id_empresa', memberData.id_empresa)
        .order('criado_em', { ascending: false });
      if (pipelinesErr) throw pipelinesErr;
      const listaPipelines = (pipelinesData || []) as CrmPipeline[];
      setPipelines(listaPipelines);

      const map: Record<string, CrmPipelineEtapa[]> = {};
      if (listaPipelines.length > 0) {
        const { data: etapasData, error: etapasErr } = await supabase
          .from('crm_pipeline_etapas')
          .select('*')
          .in('id_pipeline', listaPipelines.map((p) => p.id))
          .order('ordem', { ascending: true });
        if (etapasErr) throw etapasErr;
        (etapasData || []).forEach((etapa) => {
          const e = etapa as CrmPipelineEtapa;
          if (!map[e.id_pipeline]) map[e.id_pipeline] = [];
          map[e.id_pipeline].push(e);
        });
      }
      setEtapasMap(map);

      const { data: leadsData, error: leadsErr } = await supabase
        .from('crm_vw_relatorio_leads')
        .select('*')
        .eq('id_empresa', memberData.id_empresa)
        .order('criado_em', { ascending: false });
      if (leadsErr) throw leadsErr;
      const leadsView = (leadsData || []) as LeadRelatorioRow[];
      const { data: tagsData, error: tagsErr } = await supabase
        .from('crm_leads')
        .select('id, tags')
        .eq('id_empresa', memberData.id_empresa);
      if (tagsErr) throw tagsErr;
      const tagsMap = new Map<string, string[] | null>();
      (tagsData || []).forEach((row) => {
        const item = row as { id: string; tags: string[] | null };
        tagsMap.set(item.id, item.tags || []);
      });
      setLeads(
        leadsView.map((lead) => ({
          ...lead,
          status_negocio: normalizarStatusNegocio(lead.status_negocio),
          tags: tagsMap.get(lead.lead_id) || [],
        }))
      );
    } catch (err: unknown) {
      console.error('Erro ao carregar Leads:', err);
      setError('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void carregarTudo();
  }, [carregarTudo]);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const view = searchParams.get('view');
    if (view === 'kanban') {
      setVisualizacao('kanban');
      return;
    }
    if (view === 'tabela') {
      setVisualizacao('tabela');
    }
  }, [searchParams]);
  useEffect(() => {
    if (!menuAcoes) return;
    const fecharMenu = () => setMenuAcoes(null);
    window.addEventListener('click', fecharMenu);
    window.addEventListener('resize', fecharMenu);
    window.addEventListener('scroll', fecharMenu, true);
    return () => {
      window.removeEventListener('click', fecharMenu);
      window.removeEventListener('resize', fecharMenu);
      window.removeEventListener('scroll', fecharMenu, true);
    };
  }, [menuAcoes]);

  useEffect(() => {
    if (!menuCardLeadId) return;
    const fechar = () => setMenuCardLeadId(null);
    window.addEventListener('click', fechar);
    return () => window.removeEventListener('click', fechar);
  }, [menuCardLeadId]);

  useEffect(() => {
    if (!periodoOpen) return;
    const fechar = (event: MouseEvent) => {
      if (!periodoRef.current) return;
      if (!periodoRef.current.contains(event.target as Node)) {
        setPeriodoOpen(false);
      }
    };
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, [periodoOpen]);

  useEffect(() => {
    const fechar = (event: MouseEvent) => {
      const target = event.target as Node;
      if (funilRef.current && !funilRef.current.contains(target)) setMenuFunilOpen(false);
      if (etapasRef.current && !etapasRef.current.contains(target)) setMenuEtapasOpen(false);
      if (origemRef.current && !origemRef.current.contains(target)) setMenuOrigemOpen(false);
      if (responsavelRef.current && !responsavelRef.current.contains(target)) setMenuResponsavelOpen(false);
      if (emailRef.current && !emailRef.current.contains(target)) setMenuEmailOpen(false);
    };
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, []);

  useEffect(() => {
    if (visualizacao !== 'kanban') return;

    const recalcularAlturaKanban = () => {
      if (!kanbanRef.current) return;
      const kanbanRect = kanbanRef.current.getBoundingClientRect();
      const main = kanbanRef.current.closest('main');
      if (main instanceof HTMLElement) {
        const mainRect = main.getBoundingClientRect();
        const topoNoMain = kanbanRect.top - mainRect.top;
        const alturaDisponivelMain = Math.floor(main.clientHeight - topoNoMain - 12);
        setKanbanAltura(Math.max(320, alturaDisponivelMain));
        return;
      }
      const alturaDisponivel = Math.floor(window.innerHeight - kanbanRect.top - 12);
      setKanbanAltura(Math.max(320, alturaDisponivel));
    };

    recalcularAlturaKanban();
    const raf = requestAnimationFrame(recalcularAlturaKanban);
    window.addEventListener('resize', recalcularAlturaKanban);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', recalcularAlturaKanban);
    };
  }, [visualizacao, busca, pipelineFiltro, etapasFiltroSelecionadas, dataInicioFiltro, dataFimFiltro, statusNegocioFiltro]);

  useEffect(() => {
    if (!leadDetalhe) return;
      setLeadForm({
        nome: leadDetalhe.nome || '',
        email: leadDetalhe.email || '',
        whatsapp: leadDetalhe.whatsapp || '',
        id_responsavel: leadDetalhe.id_responsavel || '',
        origem: leadDetalhe.origem || '',
        status_conversao: leadDetalhe.status_conversao || '',
      score_qualificacao: leadDetalhe.score_qualificacao ?? 0,
      valor_estimado_contrato: parseValorMonetario(
        (leadDetalhe as LeadRelatorioRow & { valor_estimado_contrato?: number | string | null }).valor_estimado_contrato ?? 0
      ),
      id_quiz: leadDetalhe.id_quiz || '',
      pipeline_id: leadDetalhe.pipeline_id || '',
      etapa_id: leadDetalhe.etapa_id || '',
    });
  }, [leadDetalhe]);

  const abrirDrawerCriar = () => {
    setPipelineEditId(null);
    setFormNome('');
    setFormDescricao('');
    setFormPlaybookId('');
    setFormValorEstimadoPadrao('');
    setFormEtapas(['Novo Lead', 'Contato', 'Proposta', 'Fechado']);
    setDrawerOpen(true);
  };

  const abrirDrawerEditar = (pipeline: CrmPipeline) => {
    setPipelineEditId(pipeline.id);
    setFormNome(pipeline.nome);
    setFormDescricao(pipeline.descricao || '');
    setFormPlaybookId(pipeline.id_playbook || '');
    setFormValorEstimadoPadrao(
      String(
        parseValorMonetario(
          (pipeline as CrmPipeline & {
            valor_estimado_padrao?: number | string | null;
          }).valor_estimado_padrao ?? 0
        )
      )
    );
    setFormEtapas((etapasMap[pipeline.id] || []).map((e) => e.nome));
    setDrawerOpen(true);
  };

  const moverEtapa = (idx: number, direcao: 'up' | 'down') => {
    setFormEtapas((prev) => {
      const next = [...prev];
      const alvo = direcao === 'up' ? idx - 1 : idx + 1;
      if (alvo < 0 || alvo >= next.length) return prev;
      const tmp = next[idx];
      next[idx] = next[alvo];
      next[alvo] = tmp;
      return next;
    });
  };

  const salvarPipeline = useCallback(async () => {
    if (!user || !formNome.trim() || etapasValidas.length === 0) return;
    try {
      setSalvandoPipeline(true);
      const valorPadraoNormalizado = parseValorMonetario(formValorEstimadoPadrao);
      const { data: memberData } = await supabase
        .from('sis_membros_equipe')
        .select('id_empresa')
        .eq('id_usuario', user.id)
        .maybeSingle();
      if (!memberData?.id_empresa) return;

      let pipelineId = pipelineEditId;
      if (pipelineEditId) {
        const { error } = await supabase
          .from('crm_pipelines')
          .update({
            nome: formNome.trim(),
            descricao: formDescricao.trim() || null,
            id_playbook: formPlaybookId || null,
            valor_estimado_padrao: valorPadraoNormalizado,
          })
          .eq('id', pipelineEditId)
          .eq('id_empresa', memberData.id_empresa);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('crm_pipelines')
          .insert({
            id_empresa: memberData.id_empresa,
            nome: formNome.trim(),
            descricao: formDescricao.trim() || null,
            id_playbook: formPlaybookId || null,
            valor_estimado_padrao: valorPadraoNormalizado,
            ativo: true,
          })
          .select('id')
          .single();
        if (error) throw error;
        pipelineId = (data as { id: string }).id;
      }

      if (!pipelineId) return;
      const { error: delErr } = await supabase.from('crm_pipeline_etapas').delete().eq('id_pipeline', pipelineId);
      if (delErr) throw delErr;
      const payloadEtapas = etapasValidas.map((nome, idx) => ({
        id_pipeline: pipelineId,
        nome,
        ordem: idx + 1,
        ativo: true,
      }));
      const { error: insErr } = await supabase.from('crm_pipeline_etapas').insert(payloadEtapas);
      if (insErr) throw insErr;
      setDrawerOpen(false);
      await carregarTudo();
    } catch (err: unknown) {
      console.error('Erro ao salvar funil:', err);
      setError('Erro ao salvar funil.');
    } finally {
      setSalvandoPipeline(false);
    }
  }, [user, formNome, formDescricao, formPlaybookId, formValorEstimadoPadrao, etapasValidas, pipelineEditId, carregarTudo]);

  const abrirDrawerNovoPlaybook = () => {
    setPlaybookNomeForm('');
    setPlaybookDescricaoForm('');
    setPlaybookConfigForm(JSON.stringify(playbookConfigPadrao, null, 2));
    setPlaybookDrawerOpen(true);
  };

  const salvarPlaybook = useCallback(async () => {
    if (!user || !playbookNomeForm.trim()) return;
    try {
      setSalvandoPlaybook(true);
      setError(null);

      let configuracao: Record<string, unknown>;
      try {
        const parsed = JSON.parse(playbookConfigForm);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Configuração inválida');
        }
        configuracao = parsed as Record<string, unknown>;
      } catch {
        setError('A configuração JSON do playbook está inválida.');
        return;
      }

      const { data: memberData, error: memberErr } = await supabase
        .from('sis_membros_equipe')
        .select('id_empresa')
        .eq('id_usuario', user.id)
        .maybeSingle();
      if (memberErr) throw memberErr;
      if (!memberData?.id_empresa) throw new Error('Empresa não encontrada');

      const { error: insertErr } = await supabase.from('crm_playbooks').insert({
        id_empresa: memberData.id_empresa,
        nome: playbookNomeForm.trim(),
        descricao: playbookDescricaoForm.trim() || null,
        configuracao,
        ativo: true,
      });
      if (insertErr) throw insertErr;

      setPlaybookDrawerOpen(false);
      await carregarTudo();
    } catch (err) {
      console.error('Erro ao salvar playbook:', err);
      setError('Não foi possível salvar o playbook.');
    } finally {
      setSalvandoPlaybook(false);
    }
  }, [user, playbookNomeForm, playbookDescricaoForm, playbookConfigForm, carregarTudo]);

  const abrirDetalheLead = useCallback(async (lead: LeadRelatorioRow, mode: LeadDrawerMode = 'view') => {
    try {
      const detalhe = await buscarLeadRelatorioPorId(lead.lead_id);
      setLeadDetalhe(detalhe || lead);
      setLeadDrawerMode(mode);
    } catch (err) {
      console.error('Erro ao carregar detalhe do lead:', err);
      setLeadDetalhe(lead);
      setLeadDrawerMode(mode);
    }
  }, []);

  const salvarEdicaoLead = useCallback(async () => {
    if (!leadDetalhe) return;
    try {
      setSalvandoEdicaoLead(true);
      setError(null);

      const { error: updateLeadErr } = await supabase
        .from('crm_leads')
        .update({
          nome: leadForm.nome.trim() || 'Sem nome',
          email: leadForm.email.trim() || null,
          whatsapp: leadForm.whatsapp.trim() || null,
          id_responsavel: leadForm.id_responsavel || null,
          origem: leadForm.origem.trim() || 'manual',
          status_conversao: leadForm.status_conversao.trim() || 'novo',
          score_qualificacao: Number.isFinite(leadForm.score_qualificacao) ? leadForm.score_qualificacao : 0,
          valor_estimado_contrato: Number.isFinite(leadForm.valor_estimado_contrato) ? leadForm.valor_estimado_contrato : 0,
          id_quiz: leadForm.id_quiz || null,
        })
        .eq('id', leadDetalhe.lead_id);
      if (updateLeadErr) throw updateLeadErr;

      const { error: delPipelineErr } = await supabase.from('crm_pipeline_leads').delete().eq('id_lead', leadDetalhe.lead_id);
      if (delPipelineErr) throw delPipelineErr;

      if (leadForm.pipeline_id) {
        const { error: insPipelineErr } = await supabase.from('crm_pipeline_leads').insert({
          id_lead: leadDetalhe.lead_id,
          id_pipeline: leadForm.pipeline_id,
          id_etapa: leadForm.etapa_id || null,
        });
        if (insPipelineErr) throw insPipelineErr;
      }

      await carregarTudo();
      await abrirDetalheLead({ ...leadDetalhe }, 'view');
    } catch (err) {
      console.error('Erro ao salvar edição do lead:', err);
      setError('Não foi possível salvar as alterações do lead.');
    } finally {
      setSalvandoEdicaoLead(false);
    }
  }, [leadDetalhe, leadForm, carregarTudo, abrirDetalheLead]);

  const excluirLead = useCallback(async () => {
    if (!leadParaExcluir) return;
    try {
      setExcluindoLead(true);
      setError(null);
      const { error: delErr } = await supabase.from('crm_leads').delete().eq('id', leadParaExcluir.lead_id);
      if (delErr) throw delErr;
      setLeadParaExcluir(null);
      setConfirmarExcluirTexto('');
      if (leadDetalhe?.lead_id === leadParaExcluir.lead_id) setLeadDetalhe(null);
      await carregarTudo();
    } catch (err) {
      console.error('Erro ao excluir lead:', err);
      setError('Não foi possível excluir o lead.');
    } finally {
      setExcluindoLead(false);
    }
  }, [leadParaExcluir, leadDetalhe, carregarTudo]);

  const salvarTagsLead = useCallback(async (leadId: string, tags: string[]) => {
    try {
      setSalvandoTagLeadId(leadId);
      const tagsNormalizadas = Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
      const { error: tagsErr } = await supabase.from('crm_leads').update({ tags: tagsNormalizadas }).eq('id', leadId);
      if (tagsErr) throw tagsErr;
      setLeads((prev) => prev.map((lead) => (lead.lead_id === leadId ? { ...lead, tags: tagsNormalizadas } : lead)));
      setLeadDetalhe((prev) => (prev && prev.lead_id === leadId ? { ...prev, tags: tagsNormalizadas } : prev));
    } catch (err) {
      console.error('Erro ao salvar tags do lead:', err);
      setError('Não foi possível salvar as tags do lead.');
    } finally {
      setSalvandoTagLeadId(null);
    }
  }, []);

  const adicionarTagLead = useCallback(
    async (lead: LeadRelatorioRow) => {
      const entrada = (tagInputByLead[lead.lead_id] || '').trim();
      if (!entrada) return false;
      const atuais = lead.tags || [];
      if (atuais.some((tag) => tag.toLowerCase() === entrada.toLowerCase())) return false;
      await salvarTagsLead(lead.lead_id, [...atuais, entrada]);
      setTagInputByLead((prev) => ({ ...prev, [lead.lead_id]: '' }));
      return true;
    },
    [tagInputByLead, salvarTagsLead]
  );

  const removerTagLead = useCallback(
    async (lead: LeadRelatorioRow, tag: string) => {
      const novas = (lead.tags || []).filter((item) => item !== tag);
      await salvarTagsLead(lead.lead_id, novas);
    },
    [salvarTagsLead]
  );

  const atualizarStatusNegocioLead = useCallback(
    async (lead: LeadRelatorioRow, proximoStatus: StatusNegocio) => {
      const statusAnterior = normalizarStatusNegocio(lead.status_negocio);
      const dataFechamentoAnterior = lead.data_fechamento || null;
      if (statusAnterior === proximoStatus) return;

      const atualizadoAnterior = lead.atualizado_em;
      const atualizadoNovo = new Date().toISOString();
      const dataFechamentoNovo = proximoStatus === 'aberto' ? null : atualizadoNovo;
      setMovendoLeadId(lead.lead_id);
      setError(null);

      setLeads((prev) =>
        prev.map((item) =>
          item.lead_id === lead.lead_id
            ? {
                ...item,
                status_negocio: proximoStatus,
                atualizado_em: atualizadoNovo,
                data_fechamento: dataFechamentoNovo,
              }
            : item
        )
      );

      setLeadDetalhe((prev) =>
        prev && prev.lead_id === lead.lead_id
          ? {
              ...prev,
              status_negocio: proximoStatus,
              atualizado_em: atualizadoNovo,
              data_fechamento: dataFechamentoNovo,
            }
          : prev
      );

      const { error: upErr } = await supabase
        .from('crm_leads')
        .update({
          status_negocio: proximoStatus,
          data_fechamento: dataFechamentoNovo,
        })
        .eq('id', lead.lead_id);

      if (upErr) {
        console.error('Erro ao atualizar status do negócio:', upErr);
        setError('Não foi possível atualizar o status do negócio.');
        setLeads((prev) =>
          prev.map((item) =>
            item.lead_id === lead.lead_id
              ? {
                  ...item,
                  status_negocio: statusAnterior,
                  atualizado_em: atualizadoAnterior,
                  data_fechamento: dataFechamentoAnterior,
                }
              : item
          )
        );
        setLeadDetalhe((prev) =>
          prev && prev.lead_id === lead.lead_id
            ? {
                ...prev,
                status_negocio: statusAnterior,
                atualizado_em: atualizadoAnterior,
                data_fechamento: dataFechamentoAnterior,
              }
            : prev
        );
      }

      setMovendoLeadId(null);
    },
    []
  );

  const moverLeadParaEtapa = useCallback(
    async (lead: LeadRelatorioRow, etapaDestinoId: string, indiceDestino?: number) => {
      if (!lead.pipeline_id || !etapaDestinoId) return;
      const etapas = (etapasMap[lead.pipeline_id] || []).slice().sort((a, b) => a.ordem - b.ordem);
      const etapaDestino = etapas.find((e) => e.id === etapaDestinoId);
      if (!etapaDestino) return;
      const mudouEtapa = lead.etapa_id !== etapaDestino.id;

      const estadoAnterior = {
        etapa_id: lead.etapa_id,
        etapa_nome: lead.etapa_nome,
        etapa_ordem: lead.etapa_ordem,
      };

      setMovendoLeadId(lead.lead_id);
      if (mudouEtapa) {
        setLeads((prev) =>
          prev.map((item) =>
            item.lead_id === lead.lead_id
              ? {
                  ...item,
                  etapa_id: etapaDestino.id,
                  etapa_nome: etapaDestino.nome,
                  etapa_ordem: etapaDestino.ordem,
                }
              : item
          )
        );
      }

      if (typeof indiceDestino === 'number') {
        const ordemAtual = kanbanLeadOrder;
        const semLead = ordemAtual.filter((id) => id !== lead.lead_id);
        const leadsDestino = ordenarLeadsPorKanban(
          leads
            .filter((item) => item.lead_id !== lead.lead_id)
            .filter((item) => item.etapa_id === etapaDestinoId)
        );
        const indiceAjustado = Math.max(0, Math.min(indiceDestino, leadsDestino.length));
        const idAntes = leadsDestino[indiceAjustado]?.lead_id;
        if (idAntes) {
          const pos = semLead.indexOf(idAntes);
          if (pos >= 0) {
            semLead.splice(pos, 0, lead.lead_id);
          } else {
            semLead.push(lead.lead_id);
          }
        } else {
          const ultimoIdDaEtapa = leadsDestino[leadsDestino.length - 1]?.lead_id;
          if (ultimoIdDaEtapa) {
            const posUltimo = semLead.indexOf(ultimoIdDaEtapa);
            semLead.splice(posUltimo + 1, 0, lead.lead_id);
          } else {
            semLead.push(lead.lead_id);
          }
        }
        setKanbanLeadOrder(semLead);
      }
      if (mudouEtapa) {
        setLeadDetalhe((prev) =>
          prev && prev.lead_id === lead.lead_id
            ? {
                ...prev,
                etapa_id: etapaDestino.id,
                etapa_nome: etapaDestino.nome,
                etapa_ordem: etapaDestino.ordem,
              }
            : prev
        );
      }

      if (!mudouEtapa) {
        setMovendoLeadId(null);
        return;
      }

      const { error: upErr } = await supabase
        .from('crm_pipeline_leads')
        .upsert(
          {
            id_pipeline: lead.pipeline_id,
            id_lead: lead.lead_id,
            id_etapa: etapaDestino.id,
          },
          { onConflict: 'id_lead' }
        );

      if (upErr) {
        console.error('Erro ao mover lead de etapa:', upErr);
        setError('Não foi possível mover o lead para a etapa selecionada.');
        setLeads((prev) =>
          prev.map((item) =>
            item.lead_id === lead.lead_id
              ? {
                  ...item,
                  etapa_id: estadoAnterior.etapa_id,
                  etapa_nome: estadoAnterior.etapa_nome,
                  etapa_ordem: estadoAnterior.etapa_ordem,
                }
              : item
          )
        );
        setLeadDetalhe((prev) =>
          prev && prev.lead_id === lead.lead_id
            ? {
                ...prev,
                etapa_id: estadoAnterior.etapa_id,
                etapa_nome: estadoAnterior.etapa_nome,
                etapa_ordem: estadoAnterior.etapa_ordem,
              }
            : prev
        );
        if (typeof indiceDestino === 'number') {
          setKanbanLeadOrder((prev) => {
            const idsAtuais = leads.map((item) => item.lead_id);
            const ativos = prev.filter((id) => idsAtuais.includes(id));
            const novos = idsAtuais.filter((id) => !ativos.includes(id));
            return [...ativos, ...novos];
          });
        }
      }

      setMovendoLeadId(null);
    },
    [etapasMap, kanbanLeadOrder, leads, ordenarLeadsPorKanban]
  );

  const avancarLeadParaProximaEtapa = useCallback(
    async (lead: LeadRelatorioRow) => {
      if (!lead.pipeline_id) return;
      const etapas = (etapasMap[lead.pipeline_id] || []).slice().sort((a, b) => a.ordem - b.ordem);
      if (etapas.length === 0) return;
      const indiceAtual = etapas.findIndex((e) => e.id === lead.etapa_id);
      if (indiceAtual < 0 || indiceAtual >= etapas.length - 1) return;
      const proximaEtapa = etapas[indiceAtual + 1];
      await moverLeadParaEtapa(lead, proximaEtapa.id);
    },
    [etapasMap, moverLeadParaEtapa]
  );

  return (
    <div className="py-6 space-y-6">
      <PageTitle
        icon={<Target size={28} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />}
        title="Gestão de Leads"
        rightContent={
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-gray-200 dark:border-neutral-700 overflow-hidden">
              <button
                onClick={() => setVisualizacao('tabela')}
                className={`px-3 py-2 text-xs font-semibold inline-flex items-center gap-1.5 ${visualizacao === 'tabela' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-neutral-900 text-gray-700 dark:text-gray-300'}`}
              >
                <Table2 size={14} />
                Tabela
              </button>
              <button
                onClick={() => setVisualizacao('kanban')}
                className={`px-3 py-2 text-xs font-semibold inline-flex items-center gap-1.5 ${visualizacao === 'kanban' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-neutral-900 text-gray-700 dark:text-gray-300'}`}
              >
                <LayoutGrid size={14} />
                Kanban
              </button>
            </div>
            <button onClick={abrirDrawerCriar} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold">
              <Plus size={16} />
              Novo funil
            </button>
            <button
              onClick={() => {
                const p = pipelines.find((x) => x.id === pipelineFiltro);
                if (p) abrirDrawerEditar(p);
              }}
              disabled={pipelineFiltro === 'todos'}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-neutral-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-neutral-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Pencil size={16} />
              Editar funil
            </button>
          </div>
        }
      />

      {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 dark:border-rose-500/35 dark:bg-rose-500/10 dark:text-rose-300 px-4 py-3 text-sm">{error}</div>}

      <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-800 dark:text-neutral-200 inline-flex items-center gap-2">
            <Filter size={15} />
            Filtros e colunas
          </p>
          <div className="relative">
            <button
              onClick={() => setMenuColunasOpen((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 shadow-sm hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500/20 text-xs font-semibold"
            >
              <SlidersHorizontal size={14} />
              Colunas
            </button>
            {menuColunasOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg p-2 z-20">
                {(Object.keys(COLUNA_LABELS) as ColunaTabela[]).map((coluna) => (
                  <label key={coluna} className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 dark:text-neutral-300">
                    <input
                      type="checkbox"
                      checked={colunasVisiveis[coluna]}
                      onChange={() => setColunasVisiveis((prev) => ({ ...prev, [coluna]: !prev[coluna] }))}
                    />
                    {COLUNA_LABELS[coluna]}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {visualizacao === 'kanban' && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 mr-1">Status do negócio:</span>
            {(['aberto', 'ganho', 'perdido'] as StatusNegocio[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusNegocioFiltro(status)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                  statusNegocioFiltro === status
                    ? STATUS_NEGOCIO_ESTILO[status]
                    : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-neutral-700 dark:text-slate-300 dark:hover:bg-neutral-800'
                }`}
              >
                {STATUS_NEGOCIO_LABELS[status]}
                <span className="opacity-80">({contagemStatusNegocio[status]})</span>
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-9 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Buscar lead</label>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome, email, WhatsApp, quiz..."
              className={campoFiltroClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Funil</label>
            <div className="relative" ref={funilRef}>
              <button
                type="button"
                onClick={() => setMenuFunilOpen((v) => !v)}
                className={`${campoFiltroClass} inline-flex items-center justify-between`}
              >
                <span>{pipelineFiltro === 'todos' ? 'Todos' : pipelines.find((p) => p.id === pipelineFiltro)?.nome || 'Selecionar funil'}</span>
                <ChevronDown size={14} className="text-slate-500 dark:text-slate-400" />
              </button>
              {menuFunilOpen && (
                <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-xl p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPipelineFiltro('todos');
                      setEtapasFiltroSelecionadas([]);
                      setMenuFunilOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm ${pipelineFiltro === 'todos' ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800'}`}
                  >
                    Todos
                  </button>
                  {pipelines.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPipelineFiltro(p.id);
                        setEtapasFiltroSelecionadas([]);
                        setMenuFunilOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm ${pipelineFiltro === p.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800'}`}
                    >
                      {p.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Etapa</label>
            <div className="relative" ref={etapasRef}>
              <button
                type="button"
                onClick={() => pipelineFiltro !== 'todos' && setMenuEtapasOpen((v) => !v)}
                disabled={pipelineFiltro === 'todos'}
                className={`${campoFiltroClass} inline-flex items-center justify-between disabled:opacity-60`}
              >
                <span>{etapasFiltroLabel}</span>
                <ChevronDown size={14} className="text-slate-500 dark:text-slate-400" />
              </button>
              {menuEtapasOpen && pipelineFiltro !== 'todos' && (
                <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-xl p-1 max-h-64 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => setEtapasFiltroSelecionadas([])}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm ${etapasFiltroSelecionadas.length === 0 ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800'}`}
                  >
                    Todas
                  </button>
                  {etapasFiltro.map((e) => {
                    const ativo = etapasFiltroSelecionadas.includes(e.id);
                    return (
                      <label key={e.id} className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm cursor-pointer ${ativo ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800'}`}>
                        <input
                          type="checkbox"
                          checked={ativo}
                          onChange={() =>
                            setEtapasFiltroSelecionadas((prev) =>
                              prev.includes(e.id) ? prev.filter((id) => id !== e.id) : [...prev, e.id]
                            )
                          }
                        />
                        <span>{e.ordem}. {e.nome}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Origem</label>
            <div className="relative" ref={origemRef}>
              <button
                type="button"
                onClick={() => setMenuOrigemOpen((v) => !v)}
                className={`${campoFiltroClass} inline-flex items-center justify-between`}
              >
                <span>{origemFiltro === 'todas' ? 'Todas' : origemFiltro}</span>
                <ChevronDown size={14} className="text-slate-500 dark:text-slate-400" />
              </button>
              {menuOrigemOpen && (
                <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-xl p-1 max-h-64 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setOrigemFiltro('todas');
                      setMenuOrigemOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm ${origemFiltro === 'todas' ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800'}`}
                  >
                    Todas
                  </button>
                  {origensDisponiveis.map((origem) => (
                    <button
                      key={origem}
                      type="button"
                      onClick={() => {
                        setOrigemFiltro(origem);
                        setMenuOrigemOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm ${origemFiltro === origem ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800'}`}
                    >
                      {origem}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Responsável</label>
            <div className="relative" ref={responsavelRef}>
              <button
                type="button"
                onClick={() => setMenuResponsavelOpen((v) => !v)}
                className={`${campoFiltroClass} inline-flex items-center justify-between`}
              >
                <span>{responsavelFiltroLabel}</span>
                <ChevronDown size={14} className="text-slate-500 dark:text-slate-400" />
              </button>
              {menuResponsavelOpen && (
                <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-xl p-1 max-h-64 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setResponsavelFiltro('todos');
                      setMenuResponsavelOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm ${responsavelFiltro === 'todos' ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800'}`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResponsavelFiltro('sem_responsavel');
                      setMenuResponsavelOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm ${responsavelFiltro === 'sem_responsavel' ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800'}`}
                  >
                    Sem responsável
                  </button>
                  {responsaveisEquipe.map((membro) => (
                    <button
                      key={membro.id_usuario}
                      type="button"
                      onClick={() => {
                        setResponsavelFiltro(membro.id_usuario);
                        setMenuResponsavelOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm ${responsavelFiltro === membro.id_usuario ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800'}`}
                    >
                      {membro.nome_completo || membro.id_usuario}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">E-mail preenchido</label>
            <div className="relative" ref={emailRef}>
              <button
                type="button"
                onClick={() => setMenuEmailOpen((v) => !v)}
                className={`${campoFiltroClass} inline-flex items-center justify-between`}
              >
                <span>{emailPreenchidoFiltroLabel}</span>
                <ChevronDown size={14} className="text-slate-500 dark:text-slate-400" />
              </button>
              {menuEmailOpen && (
                <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-xl p-1">
                  {([
                    { value: 'todos', label: 'Todos' },
                    { value: 'true', label: 'Sim' },
                    { value: 'false', label: 'Não' },
                  ] as const).map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        setEmailPreenchidoFiltro(item.value);
                        setMenuEmailOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm ${emailPreenchidoFiltro === item.value ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800'}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Período</label>
            <div className="relative" ref={periodoRef}>
              <button
                type="button"
                onClick={() => setPeriodoOpen((v) => !v)}
                className={`${campoFiltroClass} inline-flex items-center justify-between`}
              >
                <span className={`${dataInicioFiltro ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>{periodoLabel}</span>
                <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <CalendarDays size={14} />
                  <ChevronDown size={14} />
                </span>
              </button>
              {periodoOpen && (
                <div className="absolute z-30 mt-2 w-[640px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-2xl p-4 right-0">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      type="button"
                      onClick={() => setMesCalendarioBase((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                      className="p-2 rounded-lg border border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-800"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Selecione início e fim</p>
                    <button
                      type="button"
                      onClick={() => setMesCalendarioBase((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                      className="p-2 rounded-lg border border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-800"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[0, 1].map((offset) => {
                      const mesAtual = new Date(mesCalendarioBase.getFullYear(), mesCalendarioBase.getMonth() + offset, 1);
                      const dias = montarDiasMes(mesAtual);
                      return (
                        <div key={`${mesAtual.getFullYear()}-${mesAtual.getMonth()}`}>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                            {nomesMeses[mesAtual.getMonth()]} {mesAtual.getFullYear()}
                          </p>
                          <div className="grid grid-cols-7 gap-1">
                            {nomesSemana.map((nome) => (
                              <span key={nome} className="text-[10px] text-slate-500 dark:text-slate-400 text-center font-semibold py-1">
                                {nome}
                              </span>
                            ))}
                            {dias.map((dia, idx) => {
                              if (!dia) return <span key={`vazio-${idx}`} className="h-8" />;
                              const selecionado = diaSelecionado(dia);
                              const noIntervalo = diaNoIntervalo(dia);
                              return (
                                <button
                                  key={toISODate(dia)}
                                  type="button"
                                  onClick={() => selecionarDiaPeriodo(dia)}
                                  className={`h-8 rounded-lg text-xs font-medium transition ${
                                    selecionado
                                      ? 'bg-blue-600 text-white'
                                      : noIntervalo
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300'
                                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800'
                                  }`}
                                >
                                  {dia.getDate()}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDataInicioFiltro('');
                        setDataFimFiltro('');
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-neutral-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                    >
                      Limpar
                    </button>
                    <button
                      type="button"
                      onClick={() => setPeriodoOpen(false)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {(dataInicioFiltro || dataFimFiltro) && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                setDataInicioFiltro('');
                setDataFimFiltro('');
              }}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
            >
              Limpar período
            </button>
          </div>
        )}
      </div>

      {visualizacao === 'kanban' ? (
        <div
          ref={kanbanRef}
          className="overflow-hidden"
          style={{ height: `${kanbanAltura}px` }}
        >
          <div className="h-full flex flex-col gap-3">
            {statusNegocioFiltro === 'aberto' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(['ganho', 'perdido'] as StatusNegocio[]).map((status) => {
                  const label = status === 'ganho' ? 'Marcar como ganho' : 'Marcar como perdido';
                  const descricao =
                    status === 'ganho'
                      ? 'Arraste o lead aqui para concluir como negócio ganho.'
                      : 'Arraste o lead aqui para concluir como negócio perdido.';
                  return (
                    <div
                      key={status}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverInfo(null);
                        setDragOverStatusNegocio(status);
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        setDragOverInfo(null);
                        setDragOverStatusNegocio(status);
                      }}
                      onDragLeave={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const dentroDaZona =
                          e.clientX >= rect.left &&
                          e.clientX <= rect.right &&
                          e.clientY >= rect.top &&
                          e.clientY <= rect.bottom;
                        if (dentroDaZona) return;
                        setDragOverStatusNegocio((prev) => (prev === status ? null : prev));
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const leadIdArrastado = e.dataTransfer.getData('text/plain') || dragLeadId;
                        const leadArrastado = leadsKanbanFiltrados.find((item) => item.lead_id === leadIdArrastado) || null;
                        if (leadArrastado) {
                          void atualizarStatusNegocioLead(leadArrastado, status);
                        }
                        setDragOverInfo(null);
                        setDragOverStatusNegocio(null);
                        setDragLeadId(null);
                      }}
                      className={`rounded-xl border-2 border-dashed px-4 py-3 transition-colors ${
                        dragOverStatusNegocio === status
                          ? status === 'ganho'
                            ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-500/10'
                            : 'border-rose-400 bg-rose-50 dark:border-rose-500 dark:bg-rose-500/10'
                          : 'border-slate-200 bg-slate-50/60 dark:border-neutral-700 dark:bg-neutral-800/60'
                      }`}
                    >
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{descricao}</p>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex-1 min-h-0">
              {statusNegocioFiltro !== 'aberto' ? (
                <div className="h-full overflow-y-auto pr-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300/70 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600/70 [&::-webkit-scrollbar-thumb]:rounded-full">
                  {leadsKanbanFiltrados.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 text-center py-10">
                      Nenhum lead em {STATUS_NEGOCIO_LABELS[statusNegocioFiltro].toLowerCase()} para os filtros atuais.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {leadsKanbanFiltrados.map((lead) => (
                        <div
                          key={lead.lead_id}
                          className={`rounded-xl border bg-white dark:bg-neutral-900 p-4 shadow-sm ${
                            movendoLeadId === lead.lead_id
                              ? 'border-blue-300 ring-2 ring-blue-200/70 dark:border-blue-500/40 dark:ring-blue-500/25'
                              : 'border-slate-200 dark:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{lead.nome || 'Sem nome'}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{lead.email || '-'}</p>
                            </div>
                            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${STATUS_NEGOCIO_ESTILO[statusNegocioFiltro]}`}>
                              {STATUS_NEGOCIO_LABELS[statusNegocioFiltro]}
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-lg bg-slate-50 dark:bg-neutral-800/70 px-2.5 py-2">
                              <p className="text-slate-500 dark:text-slate-400">Funil</p>
                              <p className="font-medium text-slate-700 dark:text-slate-200 truncate">{lead.pipeline_nome || '-'}</p>
                            </div>
                            <div className="rounded-lg bg-slate-50 dark:bg-neutral-800/70 px-2.5 py-2">
                              <p className="text-slate-500 dark:text-slate-400">Etapa</p>
                              <p className="font-medium text-slate-700 dark:text-slate-200 truncate">{lead.etapa_nome || '-'}</p>
                            </div>
                            <div className="rounded-lg bg-slate-50 dark:bg-neutral-800/70 px-2.5 py-2">
                              <p className="text-slate-500 dark:text-slate-400">Data do fechamento</p>
                              <p className="font-medium text-slate-700 dark:text-slate-200">
                                {formatarData(lead.data_fechamento || lead.atualizado_em || lead.ultimo_evento_em || lead.criado_em)}
                              </p>
                            </div>
                            <div className="rounded-lg bg-slate-50 dark:bg-neutral-800/70 px-2.5 py-2">
                              <p className="text-slate-500 dark:text-slate-400">
                                {statusNegocioFiltro === 'perdido' ? 'Motivo da perda' : 'Resultado'}
                              </p>
                              <p className="font-medium text-slate-700 dark:text-slate-200 truncate">
                                {statusNegocioFiltro === 'perdido'
                                  ? lead.motivo_perda || lead.status_conversao || '-'
                                  : lead.status_conversao || '-'}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-end">
                            <button
                              onClick={() => void abrirDetalheLead(lead, 'view')}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 dark:border-neutral-700 dark:text-slate-200 dark:hover:bg-neutral-800"
                            >
                              <Eye size={12} />
                              Ver dados
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : pipelineFiltro === 'todos' ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 text-center py-10">
              Selecione um funil para visualizar o kanban por etapas.
            </div>
          ) : (
            <div className="h-full overflow-x-auto overflow-y-hidden">
              <div className="flex h-full items-stretch gap-4 min-w-max">
              {etapasFiltro.map((etapa, etapaIdx) => {
                const leadsDaEtapa = ordenarLeadsPorKanban(leadsKanbanFiltrados.filter((l) => l.etapa_id === etapa.id));
                const placeholderAtivo = Boolean(dragLeadId && dragOverInfo?.etapaId === etapa.id);
                const placeholderIndex = placeholderAtivo
                  ? Math.max(0, Math.min(dragOverInfo?.index ?? leadsDaEtapa.length, leadsDaEtapa.length))
                  : -1;
                const mostrarPreviewCard = Boolean(
                  placeholderAtivo && leadArrastando && leadArrastando.etapa_id !== etapa.id
                );
                return (
                  <div
                    key={etapa.id}
                    className={`w-[320px] h-full flex-shrink-0 flex flex-col min-h-0 rounded-lg transition-colors ${
                      placeholderAtivo ? 'bg-blue-50/70 dark:bg-blue-500/10' : ''
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverStatusNegocio(null);
                      if (e.target !== e.currentTarget) return;
                      const indexFinal = leadsDaEtapa.length;
                      if (!dragOverInfo || dragOverInfo.etapaId !== etapa.id || dragOverInfo.index !== indexFinal) {
                        setDragOverInfo({ etapaId: etapa.id, index: indexFinal });
                      }
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setDragOverStatusNegocio(null);
                      setDragOverInfo((prev) => prev ?? { etapaId: etapa.id, index: leadsDaEtapa.length });
                    }}
                    onDragLeave={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const dentroDaColuna =
                        e.clientX >= rect.left &&
                        e.clientX <= rect.right &&
                        e.clientY >= rect.top &&
                        e.clientY <= rect.bottom;
                      if (dentroDaColuna) return;
                      setDragOverInfo((prev) => (prev?.etapaId === etapa.id ? null : prev));
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const leadIdArrastado = e.dataTransfer.getData('text/plain') || dragLeadId;
                      const leadArrastado = leadsKanbanFiltrados.find((item) => item.lead_id === leadIdArrastado) || null;
                      if (leadArrastado) {
                        const indiceDestino =
                          dragOverInfo?.etapaId === etapa.id
                            ? dragOverInfo.index
                            : leadsDaEtapa.length;
                        void moverLeadParaEtapa(leadArrastado, etapa.id, indiceDestino);
                      }
                      setDragOverInfo(null);
                      setDragOverStatusNegocio(null);
                      setDragLeadId(null);
                    }}
                  >
                    <div className={`px-3 py-2 rounded-md ${corCabecalhoKanbanPorIndice(etapaIdx)}`}>
                      <p className="text-sm font-semibold">
                        {etapa.ordem}. {etapa.nome} ({leadsDaEtapa.length})
                      </p>
                    </div>
                    <div className="pt-2 space-y-2 flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300/70 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600/70 [&::-webkit-scrollbar-thumb]:rounded-full">
                      {leadsDaEtapa.length === 0 && !placeholderAtivo ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400">Nenhum lead nesta etapa.</p>
                      ) : (
                        leadsDaEtapa.map((lead, cardIndex) => {
                          const etapasLead = lead.pipeline_id ? (etapasMap[lead.pipeline_id] || []).slice().sort((a, b) => a.ordem - b.ordem) : [];
                          const indiceEtapaAtual = etapasLead.findIndex((e) => e.id === lead.etapa_id);
                          const podeAvancarEtapa = indiceEtapaAtual >= 0 && indiceEtapaAtual < etapasLead.length - 1;
                          const mostrarLinhaAntes = !mostrarPreviewCard && placeholderAtivo && placeholderIndex === cardIndex;
                          const mostrarLinhaDepois = !mostrarPreviewCard && placeholderAtivo && placeholderIndex === cardIndex + 1;
                          return (
                          <div key={lead.lead_id} className="space-y-1">
                          {mostrarPreviewCard && placeholderIndex === cardIndex && leadArrastando && (
                            <div className="mb-1">{renderPreviewCardKanban(leadArrastando, etapaIdx)}</div>
                          )}
                          {mostrarLinhaAntes && (
                            <div className="h-1 rounded-full bg-blue-400/80 dark:bg-blue-400/60" />
                          )}
                          <div
                            draggable
                            onDragStart={(e) => {
                              const target = e.target as HTMLElement;
                              if (target.closest('button, a, input, textarea, select, [data-no-drag]')) {
                                e.preventDefault();
                                return;
                              }
                              e.dataTransfer.setData('text/plain', lead.lead_id);
                              e.dataTransfer.effectAllowed = 'move';
                              const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
                              ghost.style.position = 'fixed';
                              ghost.style.top = '-1000px';
                              ghost.style.left = '-1000px';
                              ghost.style.width = `${e.currentTarget.clientWidth}px`;
                              ghost.style.pointerEvents = 'none';
                              ghost.style.opacity = '0.95';
                              ghost.style.transform = 'scale(0.98)';
                              ghost.style.zIndex = '9999';
                              document.body.appendChild(ghost);
                              e.dataTransfer.setDragImage(ghost, 24, 20);
                              window.setTimeout(() => {
                                if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
                              }, 0);
                              setDragLeadId(lead.lead_id);
                              setDragOverStatusNegocio(null);
                              setMenuCardLeadId(null);
                            }}
                            onDragEnd={() => {
                              setDragLeadId(null);
                              setDragOverInfo(null);
                              setDragOverStatusNegocio(null);
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              const posicaoDepois = e.clientY > rect.top + rect.height / 2;
                              const indiceDestino = posicaoDepois ? cardIndex + 1 : cardIndex;
                              if (!dragOverInfo || dragOverInfo.etapaId !== etapa.id || dragOverInfo.index !== indiceDestino) {
                                setDragOverInfo({ etapaId: etapa.id, index: indiceDestino });
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragOverStatusNegocio(null);
                              const leadIdArrastado = e.dataTransfer.getData('text/plain') || dragLeadId;
                              const leadArrastado = leadsKanbanFiltrados.find((item) => item.lead_id === leadIdArrastado) || null;
                              if (leadArrastado) {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const posicaoDepois = e.clientY > rect.top + rect.height / 2;
                                const indiceDestino = posicaoDepois ? cardIndex + 1 : cardIndex;
                                void moverLeadParaEtapa(leadArrastado, etapa.id, indiceDestino);
                              }
                              setDragOverInfo(null);
                              setDragOverStatusNegocio(null);
                              setDragLeadId(null);
                            }}
                            onClick={(e) => {
                              const target = e.target as HTMLElement;
                              if (target.closest('button, a, input, textarea, select, [data-no-open-card]')) return;
                              void abrirDetalheLead(lead, 'view');
                            }}
                            className={`rounded-lg border border-slate-200 dark:border-neutral-700 border-l-4 bg-white dark:bg-neutral-900 p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 ${corBordaEsquerdaCardKanbanPorIndice(etapaIdx)} ${
                              dragLeadId === lead.lead_id ? 'opacity-50' : ''
                            } ${movendoLeadId === lead.lead_id ? 'ring-2 ring-blue-200 dark:ring-blue-500/30' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 min-w-0">
                                <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                  {obterIniciais(lead.nome)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{lead.nome || 'Sem nome'}</p>
                                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{lead.email || '-'}</p>
                                </div>
                              </div>
                              <div className="relative">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void avancarLeadParaProximaEtapa(lead);
                                    }}
                                    disabled={!podeAvancarEtapa}
                                    className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                                    title="Avançar para próxima etapa"
                                  >
                                    <ArrowRight size={12} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMenuCardLeadId((prev) => (prev === lead.lead_id ? null : lead.lead_id));
                                    }}
                                    className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                                    title="Ações"
                                  >
                                    <MoreVertical size={12} />
                                  </button>
                                </div>
                                {menuCardLeadId === lead.lead_id && (
                                  <div
                                    className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={() => {
                                        setTagEditorLeadId(lead.lead_id);
                                        setMenuCardLeadId(null);
                                      }}
                                      className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                                    >
                                      Adicionar tag
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-xs text-gray-600 dark:text-gray-300">Score {lead.score_qualificacao ?? 0}</span>
                              <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${badgeColorPorTexto(lead.origem)}`}>
                                {lead.origem || '-'}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <p className="text-[11px] text-gray-600 dark:text-gray-300 truncate">{lead.whatsapp || '-'}</p>
                              <a
                                href={linkWhatsApp(lead.whatsapp) || '#'}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => {
                                  const link = linkWhatsApp(lead.whatsapp);
                                  if (!link) {
                                    e.preventDefault();
                                    return;
                                  }
                                  void registrarInteracaoAutomatica(
                                    lead,
                                    'WhatsApp',
                                    `Tentativa de contato via WhatsApp (${lead.whatsapp || '-'})`,
                                    'Tentativa'
                                  );
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-green-200 bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 disabled:opacity-50 dark:border-green-500/30 dark:bg-green-500/15 dark:text-green-300"
                              >
                                <MessageCircle size={12} />
                                WhatsApp
                              </a>
                            </div>
                            <div className="mt-2">
                              {(lead.tags || []).length > 0 && (
                                <div className="space-y-1.5">
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tags</p>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {(lead.tags || []).map((tag) => (
                                      <span key={`${lead.lead_id}-${tag}`} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                                        {tag}
                                        <button
                                          onClick={() => void removerTagLead(lead, tag)}
                                          className="text-slate-400 hover:text-rose-500"
                                          title="Remover tag"
                                        >
                                          <X size={11} />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {tagEditorLeadId === lead.lead_id && (
                                <div className="mt-2 flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={tagInputByLead[lead.lead_id] || ''}
                                    onChange={(e) => setTagInputByLead((prev) => ({ ...prev, [lead.lead_id]: e.target.value }))}
                                    onKeyDown={async (e) => {
                                      if (e.key !== 'Enter') return;
                                      e.preventDefault();
                                      const ok = await adicionarTagLead(lead);
                                      if (ok) setTagEditorLeadId(null);
                                    }}
                                    placeholder="Nova tag"
                                    className="flex-1 px-2 py-1 rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-500"
                                    autoFocus
                                  />
                                  <button
                                    onClick={async () => {
                                      const ok = await adicionarTagLead(lead);
                                      if (ok) setTagEditorLeadId(null);
                                    }}
                                    disabled={salvandoTagLeadId === lead.lead_id}
                                    className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-blue-600 text-white disabled:opacity-50"
                                    title="Salvar tag"
                                  >
                                    <Plus size={12} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setTagEditorLeadId(null);
                                      setTagInputByLead((prev) => ({ ...prev, [lead.lead_id]: '' }));
                                    }}
                                    className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                                    title="Cancelar"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          {mostrarLinhaDepois && (
                            <div className="h-1 rounded-full bg-blue-400/80 dark:bg-blue-400/60" />
                          )}
                          </div>
                        )})
                      )}
                      {mostrarPreviewCard && placeholderIndex === leadsDaEtapa.length && leadArrastando && (
                        <div className="mt-1">{renderPreviewCardKanban(leadArrastando, etapaIdx)}</div>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-blue-600 text-white dark:bg-blue-600 dark:text-white">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide text-[11px] w-12 text-white">#</th>
                  {colunasVisiveis.data && <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide text-[11px] text-white w-[112px]">Data</th>}
                  {colunasVisiveis.lead && <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide text-[11px] text-white min-w-[260px]">Lead</th>}
                  {colunasVisiveis.email && <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide text-[11px] text-white">E-mail</th>}
                  {colunasVisiveis.whatsapp && <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide text-[11px] text-white">WhatsApp</th>}
                  {colunasVisiveis.origem && <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide text-[11px] text-white">Origem</th>}
                  {colunasVisiveis.quiz && <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide text-[11px] text-white">Quiz</th>}
                  {colunasVisiveis.funil && <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide text-[11px] text-white">Funil</th>}
                  {colunasVisiveis.etapa && <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide text-[11px] text-white">Etapa</th>}
                  {colunasVisiveis.score && <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide text-[11px] text-white">Score</th>}
                  {colunasVisiveis.ultimo_evento && <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide text-[11px] text-white">Últ. evento</th>}
                  {colunasVisiveis.utm_source && <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide text-[11px] text-white">UTM Source</th>}
                  {colunasVisiveis.utm_medium && <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide text-[11px] text-white">UTM Medium</th>}
                  {colunasVisiveis.utm_campaign && <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide text-[11px] text-white">UTM Campaign</th>}
                  {colunasVisiveis.utm_term && <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide text-[11px] text-white">UTM Term</th>}
                  {colunasVisiveis.utm_content && <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide text-[11px] text-white">UTM Content</th>}
                  {colunasVisiveis.utm_id && <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide text-[11px] text-white">UTM ID</th>}
                  <th className="text-right px-4 py-3 font-semibold uppercase tracking-wide text-[11px] w-64 text-white">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={`skeleton-${index}`} className="border-t border-gray-100 dark:border-neutral-800">
                      <td className="px-4 py-3">
                        <div className="h-4 w-6 rounded bg-slate-200 dark:bg-neutral-700 animate-pulse" />
                      </td>
                      {colunasVisiveis.data && <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-slate-200 dark:bg-neutral-700 animate-pulse" /></td>}
                      {colunasVisiveis.lead && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-neutral-700 animate-pulse" />
                            <div className="h-4 w-44 rounded bg-slate-200 dark:bg-neutral-700 animate-pulse" />
                          </div>
                        </td>
                      )}
                      {colunasVisiveis.email && <td className="px-4 py-3"><div className="h-4 w-40 rounded bg-slate-200 dark:bg-neutral-700 animate-pulse" /></td>}
                      {colunasVisiveis.whatsapp && <td className="px-4 py-3"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-neutral-700 animate-pulse" /></td>}
                      {colunasVisiveis.origem && <td className="px-4 py-3"><div className="h-5 w-20 rounded bg-slate-200 dark:bg-neutral-700 animate-pulse" /></td>}
                      {colunasVisiveis.quiz && <td className="px-4 py-3"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-neutral-700 animate-pulse" /></td>}
                      {colunasVisiveis.funil && <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-slate-200 dark:bg-neutral-700 animate-pulse" /></td>}
                      {colunasVisiveis.etapa && <td className="px-4 py-3"><div className="h-5 w-24 rounded bg-slate-200 dark:bg-neutral-700 animate-pulse" /></td>}
                      {colunasVisiveis.score && <td className="px-4 py-3"><div className="h-4 w-10 rounded bg-slate-200 dark:bg-neutral-700 animate-pulse" /></td>}
                      {colunasVisiveis.ultimo_evento && <td className="px-4 py-3"><div className="h-4 w-32 rounded bg-slate-200 dark:bg-neutral-700 animate-pulse" /></td>}
                      {colunasVisiveis.utm_source && <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-slate-200 dark:bg-neutral-700 animate-pulse" /></td>}
                      {colunasVisiveis.utm_medium && <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-slate-200 dark:bg-neutral-700 animate-pulse" /></td>}
                      {colunasVisiveis.utm_campaign && <td className="px-4 py-3"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-neutral-700 animate-pulse" /></td>}
                      {colunasVisiveis.utm_term && <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-slate-200 dark:bg-neutral-700 animate-pulse" /></td>}
                      {colunasVisiveis.utm_content && <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-slate-200 dark:bg-neutral-700 animate-pulse" /></td>}
                      {colunasVisiveis.utm_id && <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-slate-200 dark:bg-neutral-700 animate-pulse" /></td>}
                      <td className="px-4 py-3 text-right">
                        <div className="ml-auto h-8 w-8 rounded-lg bg-slate-200 dark:bg-neutral-700 animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : leadsFiltrados.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={totalColunasTabela}>
                      Nenhum lead encontrado para os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  leadsFiltrados.map((lead, index) => (
                    <tr key={lead.lead_id} className="border-t border-gray-100 dark:border-neutral-800 hover:bg-gray-50/70 dark:hover:bg-neutral-800/40">
                      <td className="px-4 py-3 font-semibold text-slate-500 dark:text-neutral-400">{index + 1}</td>
                      {colunasVisiveis.data && (
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {formatarDataSomenteData(lead.ultimo_evento_em || lead.atualizado_em || lead.criado_em)}
                        </td>
                      )}
                      {colunasVisiveis.lead && (
                        <td className="px-4 py-3 min-w-[260px]">
                          <button
                            type="button"
                            onClick={() => {
                              void abrirDetalheLead(lead, 'view');
                            }}
                            className="w-full flex items-center gap-3 rounded-lg px-1.5 py-1 -mx-1.5 -my-1 text-left hover:bg-slate-100/70 dark:hover:bg-neutral-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                            title="Ver detalhes do lead"
                          >
                            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center text-xs font-semibold">
                              {obterIniciais(lead.nome)}
                            </div>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {lead.nome || 'Sem nome'}
                            </span>
                          </button>
                        </td>
                      )}
                      {colunasVisiveis.email && <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{lead.email || '-'}</td>}
                      {colunasVisiveis.whatsapp && <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{lead.whatsapp || '-'}</td>}
                      {colunasVisiveis.origem && (
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${badgeColorPorTexto(lead.origem)}`}>
                            {lead.origem || '-'}
                          </span>
                        </td>
                      )}
                      {colunasVisiveis.quiz && <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{lead.quiz_titulo || '-'}</td>}
                      {colunasVisiveis.funil && <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{lead.pipeline_nome || '-'}</td>}
                      {colunasVisiveis.etapa && (
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${badgeColorPorTexto(lead.etapa_nome)}`}>
                            {lead.etapa_nome || '-'}
                          </span>
                        </td>
                      )}
                      {colunasVisiveis.score && <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{lead.score_qualificacao ?? 0}</td>}
                      {colunasVisiveis.ultimo_evento && (
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {formatarData(lead.ultimo_evento_em || lead.atualizado_em || lead.criado_em)}
                        </td>
                      )}
                      {colunasVisiveis.utm_source && <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{lead.utm_source || '-'}</td>}
                      {colunasVisiveis.utm_medium && <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{lead.utm_medium || '-'}</td>}
                      {colunasVisiveis.utm_campaign && <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{lead.utm_campaign || '-'}</td>}
                      {colunasVisiveis.utm_term && <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{lead.utm_term || '-'}</td>}
                      {colunasVisiveis.utm_content && <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{lead.utm_content || '-'}</td>}
                      {colunasVisiveis.utm_id && <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{lead.utm_id || '-'}</td>}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={linkWhatsApp(lead.whatsapp) || '#'}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => {
                              const link = linkWhatsApp(lead.whatsapp);
                              if (!link) {
                                e.preventDefault();
                                return;
                              }
                              void registrarInteracaoAutomatica(
                                lead,
                                'WhatsApp',
                                `Tentativa de contato via WhatsApp (${lead.whatsapp || '-'})`,
                                'Tentativa'
                              );
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-semibold transition-colors ${
                              linkWhatsApp(lead.whatsapp)
                                ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-500/30 dark:bg-green-500/15 dark:text-green-300'
                                : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-500'
                            }`}
                            aria-label="Enviar Whats"
                          >
                            <MessageCircle size={12} />
                            Enviar Whats
                          </a>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              const rect = event.currentTarget.getBoundingClientRect();
                              setMenuAcoes((prev) =>
                                prev?.leadId === lead.lead_id
                                  ? null
                                  : { leadId: lead.lead_id, top: rect.bottom + 6, left: rect.right - 176 }
                              );
                            }}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                            aria-label="Abrir ações"
                          >
                            <MoreVertical size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mounted &&
        menuAcoes &&
        createPortal(
          <div
            className="fixed z-[130] w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
            style={{ top: menuAcoes.top, left: menuAcoes.left }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const leadMenu = leadsFiltrados.find((lead) => lead.lead_id === menuAcoes.leadId);
              if (!leadMenu) return null;
              return (
                <>
                  <button
                    onClick={() => {
                      void abrirDetalheLead(leadMenu, 'view');
                      setMenuAcoes(null);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-neutral-200 dark:hover:bg-neutral-800 inline-flex items-center gap-2"
                  >
                    <Eye size={13} />
                    Visualizar
                  </button>
                  <button
                    onClick={() => {
                      void abrirDetalheLead(leadMenu, 'edit');
                      setMenuAcoes(null);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-neutral-200 dark:hover:bg-neutral-800 inline-flex items-center gap-2"
                  >
                    <Pencil size={13} />
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      setLeadParaExcluir(leadMenu);
                      setConfirmarExcluirTexto('');
                      setMenuAcoes(null);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10 inline-flex items-center gap-2"
                  >
                    <Trash2 size={13} />
                    Excluir lead
                  </button>
                </>
              );
            })()}
          </div>,
          document.body
        )}

      {mounted &&
        createPortal(
          <AnimatePresence>
            {drawerOpen && (
              <motion.div className="fixed inset-0 z-[120] flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.button className="absolute inset-0 bg-black/45" aria-label="Fechar" onClick={() => setDrawerOpen(false)} />
                <motion.div
                  className="relative z-10 w-full max-w-xl h-screen bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 shadow-2xl p-6 overflow-y-auto rounded-l-2xl rounded-r-none"
                  initial={{ x: 56, opacity: 0.92 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 56, opacity: 0.94 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {pipelineEditId ? 'Editar funil' : 'Novo funil'}
                    </h2>
                    <button onClick={() => setDrawerOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Nome</label>
                      <input type="text" value={formNome} onChange={(e) => setFormNome(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Descrição</label>
                      <textarea value={formDescricao} onChange={(e) => setFormDescricao(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm resize-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Valor estimado padrão (R$)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formValorEstimadoPadrao}
                        onChange={(e) => setFormValorEstimadoPadrao(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm"
                      />
                      <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                        Esse valor será aplicado automaticamente quando um lead entrar neste funil.
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Playbook vinculado</label>
                      <select
                        value={formPlaybookId}
                        onChange={(e) => setFormPlaybookId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm"
                      >
                        <option value="">Sem playbook</option>
                        {playbooksAtivos.map((playbook) => (
                          <option key={playbook.id} value={playbook.id}>
                            {playbook.nome}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                        O mesmo playbook pode ser usado em vários funis.
                      </p>
                      {playbooksAtivos.length === 0 && (
                        <button
                          onClick={abrirDrawerNovoPlaybook}
                          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-300"
                        >
                          <Plus size={12} />
                          Criar primeiro playbook
                        </button>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">Etapas</label>
                        <button onClick={() => setFormEtapas((prev) => [...prev, ''])} className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          + adicionar etapa
                        </button>
                      </div>
                      <div className="space-y-2">
                        {formEtapas.map((etapa, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="w-6 text-xs text-gray-400">{idx + 1}.</span>
                            <input
                              type="text"
                              value={etapa}
                              onChange={(e) => setFormEtapas((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))}
                              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm"
                            />
                            <div className="flex items-center gap-1">
                              <button onClick={() => moverEtapa(idx, 'up')} disabled={idx === 0} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed">
                                <ArrowUp size={14} />
                              </button>
                              <button onClick={() => moverEtapa(idx, 'down')} disabled={idx === formEtapas.length - 1} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed">
                                <ArrowDown size={14} />
                              </button>
                              {formEtapas.length > 1 && (
                                <button onClick={() => setFormEtapas((prev) => prev.filter((_, i) => i !== idx))} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800">
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button onClick={salvarPipeline} disabled={salvandoPipeline || !formNome.trim() || etapasValidas.length === 0} className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
                      {salvandoPipeline ? 'Salvando...' : pipelineEditId ? 'Salvar alterações' : 'Criar funil'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {mounted &&
        createPortal(
          <AnimatePresence>
            {playbookDrawerOpen && (
              <motion.div className="fixed inset-0 z-[121] flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.button className="absolute inset-0 bg-black/45" aria-label="Fechar" onClick={() => setPlaybookDrawerOpen(false)} />
                <motion.div
                  className="relative z-10 w-full max-w-2xl h-screen bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 shadow-2xl p-6 overflow-y-auto rounded-l-2xl rounded-r-none"
                  initial={{ x: 56, opacity: 0.92 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 56, opacity: 0.94 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Novo playbook</h2>
                    <button onClick={() => setPlaybookDrawerOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Nome</label>
                      <input
                        type="text"
                        value={playbookNomeForm}
                        onChange={(e) => setPlaybookNomeForm(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Descrição</label>
                      <textarea
                        value={playbookDescricaoForm}
                        onChange={(e) => setPlaybookDescricaoForm(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Configuração JSON</label>
                      <textarea
                        value={playbookConfigForm}
                        onChange={(e) => setPlaybookConfigForm(e.target.value)}
                        rows={16}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-mono resize-y"
                      />
                    </div>
                    <button
                      onClick={() => void salvarPlaybook()}
                      disabled={salvandoPlaybook || !playbookNomeForm.trim()}
                      className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {salvandoPlaybook ? 'Salvando...' : 'Criar playbook'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {mounted &&
        createPortal(
          <AnimatePresence>
            {leadDetalhe && (
              <motion.div className="fixed inset-0 z-[121] flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.button className="absolute inset-0 bg-black/45" aria-label="Fechar" onClick={() => setLeadDetalhe(null)} />
                <motion.div
                  className="relative z-10 w-full max-w-lg h-screen bg-gradient-to-b from-white via-slate-50 to-white dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-950 border-l border-slate-200 dark:border-neutral-700 shadow-[0_0_40px_rgba(15,23,42,0.24)] p-6 overflow-y-auto rounded-l-3xl rounded-r-none"
                  initial={{ x: 48, opacity: 0.95 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 48, opacity: 0.95 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {leadDrawerMode === 'edit' ? 'Editar lead' : 'Detalhes do lead'}
                    </h3>
                    <div className="flex items-center gap-2">
                      {leadDrawerMode === 'view' && (
                        <button
                          onClick={() => {
                            if (!leadDetalhe) return;
                            router.push(`/leads/${leadDetalhe.lead_id}`);
                            setLeadDetalhe(null);
                          }}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500/20"
                          title="Expandir detalhes"
                        >
                          <Maximize2 size={14} />
                        </button>
                      )}
                      <button onClick={() => setLeadDetalhe(null)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500">
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                  {leadDrawerMode === 'edit' ? (
                    <div className="space-y-4 text-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Nome</label>
                          <input
                            type="text"
                            value={leadForm.nome}
                            onChange={(e) => setLeadForm((prev) => ({ ...prev, nome: e.target.value }))}
                            className={campoModalLeadClass}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">E-mail</label>
                          <input
                            type="email"
                            value={leadForm.email}
                            onChange={(e) => setLeadForm((prev) => ({ ...prev, email: e.target.value }))}
                            className={campoModalLeadClass}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">WhatsApp</label>
                          <input
                            type="text"
                            value={leadForm.whatsapp}
                            onChange={(e) => setLeadForm((prev) => ({ ...prev, whatsapp: e.target.value }))}
                            className={campoModalLeadClass}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Responsável</label>
                          <select
                            value={leadForm.id_responsavel}
                            onChange={(e) => setLeadForm((prev) => ({ ...prev, id_responsavel: e.target.value }))}
                            className={campoModalLeadClass}
                          >
                            <option value="">Sem responsável</option>
                            {responsaveisEquipe.map((membro) => (
                              <option key={membro.id_usuario} value={membro.id_usuario}>
                                {membro.nome_completo || membro.id_usuario}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Origem</label>
                          <input
                            type="text"
                            value={leadForm.origem}
                            onChange={(e) => setLeadForm((prev) => ({ ...prev, origem: e.target.value }))}
                            className={campoModalLeadClass}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Status</label>
                          <input
                            type="text"
                            value={leadForm.status_conversao}
                            onChange={(e) => setLeadForm((prev) => ({ ...prev, status_conversao: e.target.value }))}
                            className={campoModalLeadClass}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Score</label>
                          <input
                            type="number"
                            value={leadForm.score_qualificacao}
                            onChange={(e) => setLeadForm((prev) => ({ ...prev, score_qualificacao: Number(e.target.value || 0) }))}
                            className={campoModalLeadClass}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Valor estimado</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={leadForm.valor_estimado_contrato}
                            onChange={(e) =>
                              setLeadForm((prev) => ({
                                ...prev,
                                valor_estimado_contrato: parseValorMonetario(e.target.value),
                              }))
                            }
                            className={campoModalLeadClass}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Quiz</label>
                          <select
                            value={leadForm.id_quiz}
                            onChange={(e) => setLeadForm((prev) => ({ ...prev, id_quiz: e.target.value }))}
                            className={campoModalLeadClass}
                          >
                            <option value="">Sem quiz</option>
                            {quizzes.map((q) => (
                              <option key={q.id} value={q.id}>
                                {q.titulo}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Funil</label>
                          <select
                            value={leadForm.pipeline_id}
                            onChange={(e) => {
                              const novoPipelineId = e.target.value;
                              const valorPadrao = obterValorPadraoPipeline(novoPipelineId);
                              setLeadForm((prev) => ({
                                ...prev,
                                pipeline_id: novoPipelineId,
                                etapa_id: '',
                                valor_estimado_contrato: valorPadrao,
                              }));
                            }}
                            className={campoModalLeadClass}
                          >
                            <option value="">Sem funil</option>
                            {pipelines.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Etapa</label>
                          <select
                            value={leadForm.etapa_id}
                            onChange={(e) => setLeadForm((prev) => ({ ...prev, etapa_id: e.target.value }))}
                            disabled={!leadForm.pipeline_id}
                            className={`${campoModalLeadClass} disabled:opacity-60`}
                          >
                            <option value="">Sem etapa</option>
                            {etapasEdicao.map((etapa) => (
                              <option key={etapa.id} value={etapa.id}>
                                {etapa.ordem}. {etapa.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-end gap-2">
                        <button
                          onClick={() => setLeadDrawerMode('view')}
                          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 text-sm font-medium text-slate-700 dark:text-slate-200"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => void salvarEdicaoLead()}
                          disabled={salvandoEdicaoLead}
                          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-60"
                        >
                          {salvandoEdicaoLead ? 'Salvando...' : 'Salvar alterações'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <LeadDetailsView
                      lead={leadDetalhe}
                      userId={user?.id || null}
                      autorPadrao={(user?.user_metadata as { full_name?: string } | undefined)?.full_name || user?.email || null}
                      timelineRefreshKey={timelineRefreshKey}
                      layout="drawer"
                    />
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {mounted &&
        createPortal(
          <AnimatePresence>
            {leadParaExcluir && (
              <motion.div className="fixed inset-0 z-[140] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.button
                  className="absolute inset-0 bg-black/45"
                  aria-label="Fechar confirmação"
                  onClick={() => {
                    setLeadParaExcluir(null);
                    setConfirmarExcluirTexto('');
                  }}
                />
                <motion.div
                  initial={{ y: 12, opacity: 0.92 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 12, opacity: 0.92 }}
                  className="relative z-10 w-full max-w-md rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-white dark:bg-neutral-900 shadow-2xl p-5"
                >
                  <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">Confirmar exclusão do lead</h4>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    Para excluir <span className="font-semibold">{leadParaExcluir.nome || 'Sem nome'}</span>, digite <span className="font-semibold">excluir</span> abaixo.
                  </p>
                  <input
                    type="text"
                    value={confirmarExcluirTexto}
                    onChange={(e) => setConfirmarExcluirTexto(e.target.value)}
                    placeholder="Digite: excluir"
                    className={`mt-4 ${campoModalLeadClass}`}
                  />
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setLeadParaExcluir(null);
                        setConfirmarExcluirTexto('');
                      }}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 text-sm font-medium text-slate-700 dark:text-slate-200"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => void excluirLead()}
                      disabled={!confirmacaoExclusaoOk || excluindoLead}
                      className="px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold disabled:opacity-50"
                    >
                      {excluindoLead ? 'Excluindo...' : 'Excluir lead'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}


