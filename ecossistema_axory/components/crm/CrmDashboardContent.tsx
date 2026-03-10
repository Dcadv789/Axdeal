'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Filter,
  MessageCircleMore,
  RefreshCw,
  Search,
  Target,
  TrendingUp,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react';
import { Card } from '@axdeal/ui';
import PageTitle from '@/components/ui/PageTitle';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { LeadRelatorioRow } from '@/components/crm/leadDetailsData';
import type { CrmPipeline, CrmPipelineEtapa } from '@/types/database';

type StatusNegocioFiltro = 'todos' | 'aberto' | 'ganho' | 'perdido';
type PeriodoFiltro = 'todos' | 'hoje' | '7dias' | '30dias' | 'mes_atual' | 'mes_anterior' | 'personalizado';

interface CrmInteracaoRow {
  id: string;
  id_lead: string;
  tipo: string;
  descricao: string;
  status: string | null;
  autor_nome: string | null;
  criado_em: string | null;
}

interface PieSlice {
  label: string;
  value: number;
  color: string;
}

const PIE_COLORS = ['#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#14b8a6', '#8b5cf6', '#ec4899', '#64748b'];

function normalizarStatusNegocio(valor: string | null | undefined): 'aberto' | 'ganho' | 'perdido' {
  const status = (valor || '').trim().toLowerCase();
  if (status === 'ganho') return 'ganho';
  if (status === 'perdido') return 'perdido';
  return 'aberto';
}

function obterDataBaseLead(lead: LeadRelatorioRow): string | null {
  return lead.ultimo_evento_em || lead.criado_em || lead.atualizado_em || null;
}

function formatarNumero(valor: number) {
  return new Intl.NumberFormat('pt-BR').format(valor);
}

function formatarPercentual(valor: number) {
  return `${valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataHora(valor: string | null) {
  if (!valor) return '-';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '-';
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatarData(valor: string | null) {
  if (!valor) return '-';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '-';
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function obterPeriodoDatas(periodo: PeriodoFiltro) {
  const hoje = new Date();
  const localHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const toIso = (data: Date) => data.toISOString().slice(0, 10);

  if (periodo === 'todos' || periodo === 'personalizado') return { inicio: '', fim: '' };
  if (periodo === 'hoje') {
    const iso = toIso(localHoje);
    return { inicio: iso, fim: iso };
  }
  if (periodo === '7dias') {
    const inicio = new Date(localHoje);
    inicio.setDate(inicio.getDate() - 6);
    return { inicio: toIso(inicio), fim: toIso(localHoje) };
  }
  if (periodo === '30dias') {
    const inicio = new Date(localHoje);
    inicio.setDate(inicio.getDate() - 29);
    return { inicio: toIso(inicio), fim: toIso(localHoje) };
  }
  if (periodo === 'mes_atual') {
    const inicio = new Date(localHoje.getFullYear(), localHoje.getMonth(), 1);
    return { inicio: toIso(inicio), fim: toIso(localHoje) };
  }

  const inicioMesAnterior = new Date(localHoje.getFullYear(), localHoje.getMonth() - 1, 1);
  const fimMesAnterior = new Date(localHoje.getFullYear(), localHoje.getMonth(), 0);
  return { inicio: toIso(inicioMesAnterior), fim: toIso(fimMesAnterior) };
}

function parseNumeroSeguro(valor: unknown): number {
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
}

function obterValorEstimadoContrato(lead: LeadRelatorioRow): number {
  const valor = parseNumeroSeguro(
    (lead as LeadRelatorioRow & { valor_estimado_contrato?: number | string | null }).valor_estimado_contrato ?? 0
  );
  return valor > 0 ? valor : 0;
}

function montarConicGradient(slices: PieSlice[]) {
  const fatiasValidas = slices.filter((slice) => slice.value > 0);
  const total = fatiasValidas.reduce((acc, slice) => acc + slice.value, 0);
  if (total <= 0) return 'conic-gradient(#e2e8f0 0deg 360deg)';

  let acumulado = 0;
  const stops = fatiasValidas.map((slice) => {
    const inicio = (acumulado / total) * 360;
    acumulado += slice.value;
    const fim = (acumulado / total) * 360;
    return `${slice.color} ${inicio}deg ${fim}deg`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}

function PieChartCard({
  title,
  subtitle,
  slices,
  emptyText,
}: {
  title: string;
  subtitle: string;
  slices: PieSlice[];
  emptyText: string;
}) {
  const total = slices.reduce((acc, slice) => acc + slice.value, 0);
  const gradient = montarConicGradient(slices);

  return (
    <Card className="rounded-2xl border-slate-200 dark:border-neutral-700">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <BarChart3 size={16} className="text-blue-600 dark:text-blue-300" />
      </div>

      {total === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{emptyText}</p>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative h-36 w-36 shrink-0 rounded-full" style={{ background: gradient }}>
            <div className="absolute inset-5 rounded-full bg-white dark:bg-neutral-900 flex items-center justify-center">
              <div className="text-center">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Total</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatarNumero(total)}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            {slices.filter((slice) => slice.value > 0).map((slice) => {
              const percentual = total > 0 ? (slice.value / total) * 100 : 0;
              return (
                <div key={slice.label} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                    <p className="text-sm text-slate-700 dark:text-slate-200 truncate">{slice.label}</p>
                  </div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {formatarNumero(slice.value)} ({formatarPercentual(percentual)})
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function CrmDashboardContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadRelatorioRow[]>([]);
  const [interacoes, setInteracoes] = useState<CrmInteracaoRow[]>([]);
  const [pipelines, setPipelines] = useState<CrmPipeline[]>([]);
  const [etapasMap, setEtapasMap] = useState<Record<string, CrmPipelineEtapa[]>>({});

  const [busca, setBusca] = useState('');
  const [pipelineFiltro, setPipelineFiltro] = useState<string>('todos');
  const [origemFiltro, setOrigemFiltro] = useState<string>('todas');
  const [statusNegocioFiltro, setStatusNegocioFiltro] = useState<StatusNegocioFiltro>('todos');
  const [periodoFiltro, setPeriodoFiltro] = useState<PeriodoFiltro>('30dias');
  const [dataInicioFiltro, setDataInicioFiltro] = useState('');
  const [dataFimFiltro, setDataFimFiltro] = useState('');

  useEffect(() => {
    if (periodoFiltro === 'personalizado') return;
    const periodo = obterPeriodoDatas(periodoFiltro);
    setDataInicioFiltro(periodo.inicio);
    setDataFimFiltro(periodo.fim);
  }, [periodoFiltro]);

  const carregarDados = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: membroData, error: membroErr } = await supabase
        .from('sis_membros_equipe')
        .select('id_empresa')
        .eq('id_usuario', user.id)
        .maybeSingle();
      if (membroErr) throw membroErr;

      const idEmpresa = (membroData as { id_empresa?: string } | null)?.id_empresa || null;
      if (!idEmpresa) {
        setError('Empresa não encontrada para o usuário atual.');
        setLeads([]);
        setInteracoes([]);
        setPipelines([]);
        setEtapasMap({});
        setLoading(false);
        return;
      }

      const [leadsRes, pipelinesRes, interacoesRes] = await Promise.all([
        supabase.from('crm_vw_relatorio_leads').select('*').eq('id_empresa', idEmpresa).order('criado_em', { ascending: false }),
        supabase.from('crm_pipelines').select('*').eq('id_empresa', idEmpresa).eq('ativo', true).order('nome', { ascending: true }),
        supabase.from('crm_interacoes').select('id, id_lead, tipo, descricao, status, autor_nome, criado_em').order('criado_em', { ascending: false }).limit(400),
      ]);
      if (leadsRes.error) throw leadsRes.error;
      if (pipelinesRes.error) throw pipelinesRes.error;
      if (interacoesRes.error) throw interacoesRes.error;

      const leadsData = (leadsRes.data || []) as LeadRelatorioRow[];
      const pipelinesData = (pipelinesRes.data || []) as CrmPipeline[];
      setLeads(leadsData);
      setPipelines(pipelinesData);
      setPipelineFiltro((prev) => (prev === 'todos' || pipelinesData.some((p) => p.id === prev) ? prev : 'todos'));

      const pipelineIds = pipelinesData.map((pipeline) => pipeline.id);
      if (pipelineIds.length > 0) {
        const { data: etapasData, error: etapasErr } = await supabase
          .from('crm_pipeline_etapas')
          .select('id, id_pipeline, nome, ordem, cor, ativo, criado_em')
          .in('id_pipeline', pipelineIds)
          .eq('ativo', true)
          .order('ordem', { ascending: true });
        if (etapasErr) throw etapasErr;

        const mapa: Record<string, CrmPipelineEtapa[]> = {};
        pipelinesData.forEach((pipeline) => {
          mapa[pipeline.id] = [];
        });
        (etapasData || []).forEach((etapa) => {
          if (!mapa[etapa.id_pipeline]) mapa[etapa.id_pipeline] = [];
          mapa[etapa.id_pipeline].push(etapa as CrmPipelineEtapa);
        });
        setEtapasMap(mapa);
      } else {
        setEtapasMap({});
      }

      const leadIds = new Set(leadsData.map((lead) => lead.lead_id));
      const interacoesData = ((interacoesRes.data || []) as CrmInteracaoRow[]).filter((item) => leadIds.has(item.id_lead));
      setInteracoes(interacoesData);
    } catch (err) {
      console.error('Erro ao carregar dashboard do CRM:', err);
      setError('Não foi possível carregar os dados do dashboard.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  const origensDisponiveis = useMemo(() => {
    return Array.from(new Set(leads.map((lead) => (lead.origem || '').trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
    );
  }, [leads]);

  const leadsFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const inicio = dataInicioFiltro ? new Date(`${dataInicioFiltro}T00:00:00`) : null;
    const fim = dataFimFiltro ? new Date(`${dataFimFiltro}T23:59:59.999`) : null;

    return leads.filter((lead) => {
      const byPipeline = pipelineFiltro === 'todos' || lead.pipeline_id === pipelineFiltro;
      const byOrigem = origemFiltro === 'todas' || (lead.origem || '').trim().toLowerCase() === origemFiltro.toLowerCase();
      const statusLead = normalizarStatusNegocio(lead.status_negocio);
      const byStatus = statusNegocioFiltro === 'todos' || statusLead === statusNegocioFiltro;
      const byBusca =
        !termo ||
        (lead.nome || '').toLowerCase().includes(termo) ||
        (lead.email || '').toLowerCase().includes(termo) ||
        (lead.whatsapp || '').toLowerCase().includes(termo) ||
        (lead.quiz_titulo || '').toLowerCase().includes(termo) ||
        (lead.origem || '').toLowerCase().includes(termo) ||
        (lead.pipeline_nome || '').toLowerCase().includes(termo) ||
        (lead.etapa_nome || '').toLowerCase().includes(termo);

      const dataBase = obterDataBaseLead(lead);
      const dataLead = dataBase ? new Date(dataBase) : null;
      const byDataInicio = !inicio || (dataLead && dataLead >= inicio);
      const byDataFim = !fim || (dataLead && dataLead <= fim);

      return byPipeline && byOrigem && byStatus && byBusca && byDataInicio && byDataFim;
    });
  }, [leads, busca, pipelineFiltro, origemFiltro, statusNegocioFiltro, dataInicioFiltro, dataFimFiltro]);

  const leadsMap = useMemo(() => {
    return leads.reduce<Record<string, LeadRelatorioRow>>((acc, lead) => {
      acc[lead.lead_id] = lead;
      return acc;
    }, {});
  }, [leads]);

  const interacoesFiltradas = useMemo(() => {
    const ids = new Set(leadsFiltrados.map((lead) => lead.lead_id));
    return interacoes.filter((interacao) => ids.has(interacao.id_lead));
  }, [interacoes, leadsFiltrados]);

  const totalLeads = leadsFiltrados.length;
  const totalEmAberto = leadsFiltrados.filter((lead) => normalizarStatusNegocio(lead.status_negocio) === 'aberto').length;
  const totalGanhos = leadsFiltrados.filter((lead) => normalizarStatusNegocio(lead.status_negocio) === 'ganho').length;
  const totalPerdidos = leadsFiltrados.filter((lead) => normalizarStatusNegocio(lead.status_negocio) === 'perdido').length;
  const totalFechados = totalGanhos + totalPerdidos;
  const taxaConversao = totalFechados > 0 ? (totalGanhos / totalFechados) * 100 : 0;
  const scoreMedio = totalLeads > 0 ? leadsFiltrados.reduce((acc, lead) => acc + Number(lead.score_qualificacao || 0), 0) / totalLeads : 0;
  const taxaQualificacao = totalLeads > 0 ? (leadsFiltrados.filter((lead) => Number(lead.score_qualificacao || 0) > 600).length / totalLeads) * 100 : 0;
  const valorTotalPipelineAberto = leadsFiltrados
    .filter((lead) => normalizarStatusNegocio(lead.status_negocio) === 'aberto')
    .reduce((acc, lead) => acc + obterValorEstimadoContrato(lead), 0);

  const origemStats = useMemo(() => {
    const mapa = new Map<string, number>();
    leadsFiltrados.forEach((lead) => {
      const chave = (lead.origem || 'Não informada').trim() || 'Não informada';
      mapa.set(chave, (mapa.get(chave) || 0) + 1);
    });
    const total = leadsFiltrados.length || 1;
    return Array.from(mapa.entries())
      .map(([origem, quantidade]) => ({ origem, quantidade, percentual: (quantidade / total) * 100 }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [leadsFiltrados]);

  const maturidadeSlices = useMemo(() => {
    const contadores = [0, 0, 0, 0];
    leadsFiltrados.forEach((lead) => {
      const score = Number(lead.score_qualificacao || 0);
      if (score <= 350) contadores[0] += 1;
      else if (score <= 650) contadores[1] += 1;
      else if (score <= 850) contadores[2] += 1;
      else contadores[3] += 1;
    });
    return [
      { label: 'Nível 1 (0-350)', value: contadores[0], color: '#ef4444' },
      { label: 'Nível 2 (351-650)', value: contadores[1], color: '#f59e0b' },
      { label: 'Nível 3 (651-850)', value: contadores[2], color: '#2563eb' },
      { label: 'Nível 4 (851-1000)', value: contadores[3], color: '#22c55e' },
    ] as PieSlice[];
  }, [leadsFiltrados]);

  const motivosPerdaSlices = useMemo(() => {
    const mapa = new Map<string, number>();
    leadsFiltrados
      .filter((lead) => normalizarStatusNegocio(lead.status_negocio) === 'perdido')
      .forEach((lead) => {
        const motivo = (lead.motivo_perda || '').trim() || 'Não informado';
        mapa.set(motivo, (mapa.get(motivo) || 0) + 1);
      });

    return Array.from(mapa.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value], idx) => ({
        label,
        value,
        color: PIE_COLORS[idx % PIE_COLORS.length],
      }));
  }, [leadsFiltrados]);

  const performancePipelines = useMemo(() => {
    return pipelines
      .map((pipeline) => {
        const doFunil = leadsFiltrados.filter((lead) => lead.pipeline_id === pipeline.id);
        const total = doFunil.length;
        const aberto = doFunil.filter((lead) => normalizarStatusNegocio(lead.status_negocio) === 'aberto').length;
        const ganho = doFunil.filter((lead) => normalizarStatusNegocio(lead.status_negocio) === 'ganho').length;
        const perdido = doFunil.filter((lead) => normalizarStatusNegocio(lead.status_negocio) === 'perdido').length;
        const fechados = ganho + perdido;
        const conversao = fechados > 0 ? (ganho / fechados) * 100 : 0;
        const somaValor = doFunil.reduce((acc, lead) => acc + obterValorEstimadoContrato(lead), 0);
        const ticketMedio = total > 0 ? somaValor / total : 0;
        return { pipeline, total, aberto, ganho, perdido, conversao, ticketMedio };
      })
      .sort((a, b) => b.total - a.total);
  }, [pipelines, leadsFiltrados]);

  const pipelineAnaliseId = useMemo(() => {
    if (pipelineFiltro !== 'todos') return pipelineFiltro;
    return performancePipelines.find((item) => item.total > 0)?.pipeline.id || pipelines[0]?.id || null;
  }, [pipelineFiltro, performancePipelines, pipelines]);

  const etapasAnalise = useMemo(() => {
    if (!pipelineAnaliseId) return [] as Array<{ id: string; nome: string; ordem: number; total: number }>;
    const etapas = (etapasMap[pipelineAnaliseId] || []).slice().sort((a, b) => a.ordem - b.ordem);
    return etapas.map((etapa) => ({
      id: etapa.id,
      nome: etapa.nome,
      ordem: etapa.ordem,
      total: leadsFiltrados.filter((lead) => lead.pipeline_id === pipelineAnaliseId && lead.etapa_id === etapa.id).length,
    }));
  }, [pipelineAnaliseId, etapasMap, leadsFiltrados]);

  const maxEtapaTotal = Math.max(...etapasAnalise.map((item) => item.total), 1);

  const leadsRecentes = useMemo(() => {
    return leadsFiltrados
      .slice()
      .sort((a, b) => (obterDataBaseLead(b) || '').localeCompare(obterDataBaseLead(a) || ''))
      .slice(0, 8);
  }, [leadsFiltrados]);

  if (loading) {
    return (
      <div className="py-6 space-y-6">
        <PageTitle icon={<BarChart3 size={26} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />} title="Dashboard CRM" />
        <Card className="rounded-2xl border-slate-200 dark:border-neutral-700 animate-pulse"><div className="h-20 rounded-xl bg-slate-100 dark:bg-neutral-800" /></Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {Array.from({ length: 9 }).map((_, idx) => (
            <Card key={idx} className="rounded-2xl border-slate-200 dark:border-neutral-700 animate-pulse"><div className="h-24 rounded-xl bg-slate-100 dark:bg-neutral-800" /></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      <PageTitle
        icon={<BarChart3 size={26} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />}
        title="Dashboard CRM"
        rightContent={<button onClick={() => void carregarDados()} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 dark:border-blue-500/35 bg-blue-50 dark:bg-blue-500/15 px-3 py-2 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"><RefreshCw size={14} /> Atualizar</button>}
      />

      {error && <Card className="rounded-2xl border-rose-200 dark:border-rose-500/40 bg-rose-50/70 dark:bg-rose-500/10"><p className="text-sm font-medium text-rose-700 dark:text-rose-300">{error}</p></Card>}

      <Card className="rounded-2xl border-slate-200 dark:border-neutral-700">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3"><Filter size={15} className="text-blue-600 dark:text-blue-300" /> Filtros do dashboard</div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
          <label className="xl:col-span-2 relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar por nome, e-mail, WhatsApp, origem..." className="w-full h-10 rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 pl-9 pr-3 text-sm text-slate-700 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/35 focus:border-blue-500 transition-colors" /></label>
          <select value={pipelineFiltro} onChange={(event) => setPipelineFiltro(event.target.value)} className="h-10 rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 px-3 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/35 focus:border-blue-500 transition-colors"><option value="todos">Todos os funis</option>{pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.nome}</option>)}</select>
          <select value={origemFiltro} onChange={(event) => setOrigemFiltro(event.target.value)} className="h-10 rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 px-3 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/35 focus:border-blue-500 transition-colors"><option value="todas">Todas as origens</option>{origensDisponiveis.map((origem) => <option key={origem} value={origem}>{origem}</option>)}</select>
          <select value={statusNegocioFiltro} onChange={(event) => setStatusNegocioFiltro(event.target.value as StatusNegocioFiltro)} className="h-10 rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 px-3 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/35 focus:border-blue-500 transition-colors"><option value="todos">Todos os status</option><option value="aberto">Em aberto</option><option value="ganho">Ganhos</option><option value="perdido">Perdidos</option></select>
          <select value={periodoFiltro} onChange={(event) => setPeriodoFiltro(event.target.value as PeriodoFiltro)} className="h-10 rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 px-3 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/35 focus:border-blue-500 transition-colors"><option value="todos">Todo o período</option><option value="hoje">Hoje</option><option value="7dias">Últimos 7 dias</option><option value="30dias">Últimos 30 dias</option><option value="mes_atual">Mês atual</option><option value="mes_anterior">Mês anterior</option><option value="personalizado">Personalizado</option></select>
          <input type="date" value={dataInicioFiltro} onChange={(event) => { setPeriodoFiltro('personalizado'); setDataInicioFiltro(event.target.value); }} className="h-10 rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 px-3 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/35 focus:border-blue-500 transition-colors" />
          <input type="date" value={dataFimFiltro} onChange={(event) => { setPeriodoFiltro('personalizado'); setDataFimFiltro(event.target.value); }} className="h-10 rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 px-3 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/35 focus:border-blue-500 transition-colors" />
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <Card className="rounded-2xl border-slate-200 dark:border-neutral-700"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Leads no período</p><Users size={16} className="text-blue-600 dark:text-blue-300" /></div><p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{formatarNumero(totalLeads)}</p></Card>
        <Card className="rounded-2xl border-slate-200 dark:border-neutral-700"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Em aberto</p><Target size={16} className="text-blue-600 dark:text-blue-300" /></div><p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{formatarNumero(totalEmAberto)}</p></Card>
        <Card className="rounded-2xl border-slate-200 dark:border-neutral-700"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Ganhos</p><Trophy size={16} className="text-emerald-600 dark:text-emerald-300" /></div><p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{formatarNumero(totalGanhos)}</p></Card>
        <Card className="rounded-2xl border-slate-200 dark:border-neutral-700"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Perdidos</p><XCircle size={16} className="text-rose-600 dark:text-rose-300" /></div><p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{formatarNumero(totalPerdidos)}</p></Card>
        <Card className="rounded-2xl border-slate-200 dark:border-neutral-700"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Valor Total do Pipeline</p><CircleDollarSign size={16} className="text-blue-600 dark:text-blue-300" /></div><p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{formatarMoeda(valorTotalPipelineAberto)}</p><p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Somente leads em aberto</p></Card>
        <Card className="rounded-2xl border-slate-200 dark:border-neutral-700"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Taxa de conversão</p><TrendingUp size={16} className="text-blue-600 dark:text-blue-300" /></div><p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{formatarPercentual(taxaConversao)}</p><p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ganhos sobre leads fechados</p></Card>
        <Card className="rounded-2xl border-slate-200 dark:border-neutral-700"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Score médio</p><Target size={16} className="text-blue-600 dark:text-blue-300" /></div><p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{formatarNumero(Math.round(scoreMedio))}</p></Card>
        <Card className="rounded-2xl border-slate-200 dark:border-neutral-700"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Taxa de qualificação</p><CheckCircle2 size={16} className="text-blue-600 dark:text-blue-300" /></div><p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{formatarPercentual(taxaQualificacao)}</p><p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Leads com score maior que 600</p></Card>
        <Card className="rounded-2xl border-slate-200 dark:border-neutral-700"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Interações registradas</p><MessageCircleMore size={16} className="text-blue-600 dark:text-blue-300" /></div><p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{formatarNumero(interacoesFiltradas.length)}</p></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 rounded-2xl border-slate-200 dark:border-neutral-700">
          <div className="flex items-center justify-between gap-3 mb-4"><div><h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Distribuição por etapa</h3><p className="text-xs text-slate-500 dark:text-slate-400">{pipelineAnaliseId ? `Funil: ${pipelines.find((p) => p.id === pipelineAnaliseId)?.nome || 'Selecionado'}` : 'Nenhum funil ativo encontrado'}</p></div><Filter size={16} className="text-blue-600 dark:text-blue-300" /></div>
          {!etapasAnalise.length ? <p className="text-sm text-slate-500 dark:text-slate-400">Sem dados de etapas para o filtro atual.</p> : <div className="space-y-3">{etapasAnalise.map((etapa) => { const largura = Math.max((etapa.total / maxEtapaTotal) * 100, etapa.total > 0 ? 6 : 0); return <div key={etapa.id}><div className="flex items-center justify-between text-sm mb-1.5"><p className="text-slate-700 dark:text-slate-200 font-medium">{etapa.ordem}. {etapa.nome}</p><p className="text-slate-500 dark:text-slate-400">{formatarNumero(etapa.total)}</p></div><div className="h-2.5 rounded-full bg-slate-100 dark:bg-neutral-800 overflow-hidden"><div className="h-full rounded-full bg-blue-600 dark:bg-blue-400 transition-all" style={{ width: `${largura}%` }} /></div></div>; })}</div>}
        </Card>
        <Card className="rounded-2xl border-slate-200 dark:border-neutral-700"><div className="flex items-center justify-between gap-3 mb-4"><h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Leads por origem</h3><BarChart3 size={16} className="text-blue-600 dark:text-blue-300" /></div>{!origemStats.length ? <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma origem encontrada para os filtros atuais.</p> : <div className="space-y-3">{origemStats.slice(0, 8).map((item) => <div key={item.origem}><div className="flex items-center justify-between text-sm mb-1.5"><p className="text-slate-700 dark:text-slate-200 font-medium truncate pr-2">{item.origem}</p><p className="text-slate-500 dark:text-slate-400">{formatarNumero(item.quantidade)}</p></div><div className="h-2 rounded-full bg-slate-100 dark:bg-neutral-800 overflow-hidden"><div className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400 transition-all" style={{ width: `${Math.max(item.percentual, item.quantidade > 0 ? 6 : 0)}%` }} /></div></div>)}</div>}</Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <PieChartCard title="Maturidade dos Leads" subtitle="Distribuição pelas 4 faixas de score" slices={maturidadeSlices} emptyText="Sem leads para analisar no recorte atual." />
        <PieChartCard title="Motivos de Perda" subtitle="Baseado nos leads marcados como perdidos" slices={motivosPerdaSlices} emptyText="Nenhum lead perdido no recorte atual." />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 rounded-2xl border-slate-200 dark:border-neutral-700"><div className="flex items-center justify-between gap-3 mb-4"><h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Performance por funil</h3><Target size={16} className="text-blue-600 dark:text-blue-300" /></div>{!performancePipelines.length ? <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum funil encontrado.</p> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-neutral-700"><th className="py-2.5 pr-3 font-semibold">Funil</th><th className="py-2.5 pr-3 font-semibold">Total</th><th className="py-2.5 pr-3 font-semibold">Abertos</th><th className="py-2.5 pr-3 font-semibold">Ganhos</th><th className="py-2.5 pr-3 font-semibold">Perdidos</th><th className="py-2.5 pr-3 font-semibold">Ticket Médio</th><th className="py-2.5 pr-0 font-semibold">Conversão</th></tr></thead><tbody>{performancePipelines.map((item) => <tr key={item.pipeline.id} className="border-b border-slate-100 dark:border-neutral-800/80 last:border-b-0 text-slate-700 dark:text-slate-200"><td className="py-2.5 pr-3 font-medium">{item.pipeline.nome}</td><td className="py-2.5 pr-3">{formatarNumero(item.total)}</td><td className="py-2.5 pr-3">{formatarNumero(item.aberto)}</td><td className="py-2.5 pr-3 text-emerald-600 dark:text-emerald-300">{formatarNumero(item.ganho)}</td><td className="py-2.5 pr-3 text-rose-600 dark:text-rose-300">{formatarNumero(item.perdido)}</td><td className="py-2.5 pr-3">{formatarMoeda(item.ticketMedio)}</td><td className="py-2.5 pr-0">{formatarPercentual(item.conversao)}</td></tr>)}</tbody></table></div>}</Card>
        <Card className="rounded-2xl border-slate-200 dark:border-neutral-700"><div className="flex items-center justify-between gap-3 mb-4"><h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Interações recentes</h3><MessageCircleMore size={16} className="text-blue-600 dark:text-blue-300" /></div>{!interacoesFiltradas.length ? <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma interação no recorte atual.</p> : <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">{interacoesFiltradas.slice(0, 10).map((interacao) => { const lead = leadsMap[interacao.id_lead]; return <div key={interacao.id} className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3"><div className="flex items-center justify-between gap-2 mb-1"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">{interacao.tipo}</p><p className="text-[11px] text-slate-500 dark:text-slate-400">{formatarDataHora(interacao.criado_em)}</p></div><p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{lead?.nome || 'Lead'}</p><p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{interacao.autor_nome || 'Sem autor'}</p><p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-3">{interacao.descricao}</p></div>; })}</div>}</Card>
      </div>

      <Card className="rounded-2xl border-slate-200 dark:border-neutral-700">
        <div className="flex items-center justify-between gap-3 mb-4"><h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Leads recentes</h3></div>
        {!leadsRecentes.length ? <p className="text-sm text-slate-500 dark:text-slate-400">Sem leads para o período e filtros selecionados.</p> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-neutral-700"><th className="py-2.5 pr-3 font-semibold">Lead</th><th className="py-2.5 pr-3 font-semibold">Origem</th><th className="py-2.5 pr-3 font-semibold">Funil / Etapa</th><th className="py-2.5 pr-3 font-semibold">Status</th><th className="py-2.5 pr-3 font-semibold">Score</th><th className="py-2.5 pr-0 font-semibold">Data</th></tr></thead><tbody>{leadsRecentes.map((lead) => { const status = normalizarStatusNegocio(lead.status_negocio); const statusLabel = status === 'ganho' ? 'Ganho' : status === 'perdido' ? 'Perdido' : 'Aberto'; const statusClass = status === 'ganho' ? 'text-emerald-700 dark:text-emerald-300' : status === 'perdido' ? 'text-rose-700 dark:text-rose-300' : 'text-blue-700 dark:text-blue-300'; return <tr key={lead.lead_id} className="border-b border-slate-100 dark:border-neutral-800/80 last:border-b-0 text-slate-700 dark:text-slate-200"><td className="py-2.5 pr-3"><p className="font-medium text-slate-900 dark:text-slate-100">{lead.nome || 'Sem nome'}</p><p className="text-xs text-slate-500 dark:text-slate-400">{lead.email || lead.whatsapp || '-'}</p></td><td className="py-2.5 pr-3">{lead.origem || '-'}</td><td className="py-2.5 pr-3"><p>{lead.pipeline_nome || 'Sem funil'}</p><p className="text-xs text-slate-500 dark:text-slate-400">{lead.etapa_nome || 'Sem etapa'}</p></td><td className={`py-2.5 pr-3 font-semibold ${statusClass}`}>{statusLabel}</td><td className="py-2.5 pr-3">{formatarNumero(Number(lead.score_qualificacao || 0))}</td><td className="py-2.5 pr-0">{formatarData(obterDataBaseLead(lead))}</td></tr>; })}</tbody></table></div>}
      </Card>
    </div>
  );
}
