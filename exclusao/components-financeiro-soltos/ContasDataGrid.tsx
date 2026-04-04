'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Banknote, CalendarClock, CircleDashed, Loader2, ShieldAlert, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type LancamentoTipo = 'RECEITA' | 'DESPESA';
type FiltroRapido = 'todas' | 'atrasadas' | 'hoje' | 'mes';
type FiltroStatus = 'todos' | 'EM_ABERTO' | 'PAGO' | 'PARCIALMENTE_PAGO' | 'VENCIDO' | 'CANCELADO';

type ParcelaRow = {
  id: string;
  descricao_parcela: string | null;
  valor_original: number | null;
  valor_quitado_total: number | null;
  data_vencimento: string;
  status: string | null;
  lancamento: string | null;
  id_categoria: string | null;
  id_conta_bancaria: string | null;
  saldo_devedor?: number | null;
};

type CategoriaRow = {
  id_categoria: string;
  nome_categoria: string;
};

type ContaRow = {
  id_conta: string;
  nome_conta: string;
};

interface ContasDataGridProps {
  lancamento: LancamentoTipo;
  titulo: string;
  subtitulo: string;
}

function formatarMoeda(valor: number | null | undefined): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0));
}

function formatarData(valor: string): string {
  const data = new Date(`${valor.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(data.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(data);
}

function getLocalISODate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function compareISODate(a: string, b: string): number {
  return a.localeCompare(b);
}

function statusMeta(status: string | null | undefined) {
  const base = (status || '').toUpperCase();
  if (base === 'PAGO') {
    return { label: 'Pago', className: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/20' };
  }
  if (base === 'PARCIALMENTE_PAGO') {
    return { label: 'Parcialmente pago', className: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/20' };
  }
  if (base === 'VENCIDO') {
    return { label: 'Vencido', className: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/20' };
  }
  if (base === 'EM_ABERTO') {
    return { label: 'Em aberto', className: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-700/40 dark:text-slate-200 dark:ring-slate-700/50' };
  }
  if (base === 'CANCELADO') {
    return { label: 'Cancelado', className: 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-500/15 dark:text-zinc-300 dark:ring-zinc-500/20' };
  }
  return { label: status || '-', className: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-700/40 dark:text-slate-200 dark:ring-slate-700/50' };
}

function quickFilterLabel(filtro: FiltroRapido) {
  switch (filtro) {
    case 'atrasadas':
      return 'Atrasadas';
    case 'hoje':
      return 'Vencem hoje';
    case 'mes':
      return 'Este mês';
    default:
      return 'Todas';
  }
}

function statusFilterLabel(status: FiltroStatus) {
  switch (status) {
    case 'EM_ABERTO':
      return 'Em Aberto';
    case 'PAGO':
      return 'Pago';
    case 'PARCIALMENTE_PAGO':
      return 'Parcialmente Pago';
    case 'VENCIDO':
      return 'Vencido';
    case 'CANCELADO':
      return 'Cancelado';
    default:
      return 'Todos';
  }
}

export default function ContasDataGrid({ lancamento, titulo, subtitulo }: ContasDataGridProps) {
  const { idEmpresa } = useAuth();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [rows, setRows] = useState<ParcelaRow[]>([]);
  const [mapaCategorias, setMapaCategorias] = useState<Map<string, string>>(new Map());
  const [mapaContas, setMapaContas] = useState<Map<string, string>>(new Map());
  const [filtroRapido, setFiltroRapido] = useState<FiltroRapido>('todas');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos');

  useEffect(() => {
    const carregar = async () => {
      if (!idEmpresa) {
        setRows([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setErro(null);

      try {
        const { data: parcelasData, error: parcelasError } = await supabase
          .from('erp_parcelas')
          .select('id, descricao_parcela, valor_original, valor_quitado_total, saldo_devedor, data_vencimento, status, lancamento, id_categoria, id_conta_bancaria')
          .eq('id_empresa', idEmpresa)
          .eq('lancamento', lancamento)
          .order('data_vencimento', { ascending: true });

        if (parcelasError) throw parcelasError;

        const parcelas = (parcelasData || []) as ParcelaRow[];
        setRows(parcelas);

        const idsCategorias = Array.from(new Set(parcelas.map((item) => item.id_categoria).filter(Boolean))) as string[];
        const idsContas = Array.from(new Set(parcelas.map((item) => item.id_conta_bancaria).filter(Boolean))) as string[];

        const [resCategorias, resContas] = await Promise.all([
          idsCategorias.length
            ? supabase.from('erp_categorias').select('id_categoria, nome_categoria').in('id_categoria', idsCategorias)
            : Promise.resolve({ data: [], error: null }),
          idsContas.length
            ? supabase.from('erp_contas_bancarias').select('id_conta, nome_conta').in('id_conta', idsContas)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if ((resCategorias as { error?: { message?: string } }).error) throw (resCategorias as { error: unknown }).error;
        if ((resContas as { error?: { message?: string } }).error) throw (resContas as { error: unknown }).error;

        const categoriasData = ((resCategorias as { data?: CategoriaRow[] }).data || []) as CategoriaRow[];
        const contasData = ((resContas as { data?: ContaRow[] }).data || []) as ContaRow[];

        setMapaCategorias(new Map(categoriasData.map((item) => [item.id_categoria, item.nome_categoria])));
        setMapaContas(new Map(contasData.map((item) => [item.id_conta, item.nome_conta])));
      } catch (error) {
        console.error('Erro ao carregar contas financeiras:', error);
        setErro('Não foi possível carregar as contas. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    void carregar();
  }, [idEmpresa, lancamento]);

  const hojeISO = getLocalISODate();
  const inicioMes = `${hojeISO.slice(0, 7)}-01`;
  const fimMesDate = new Date();
  const fimMes = getLocalISODate(new Date(fimMesDate.getFullYear(), fimMesDate.getMonth() + 1, 0));

  const linhasFiltradas = useMemo(() => {
    return rows.filter((row) => {
      const vencimentoISO = row.data_vencimento.slice(0, 10);
      const status = (row.status || '').toUpperCase();
      const vencido = status === 'VENCIDO' || (status === 'EM_ABERTO' && compareISODate(vencimentoISO, hojeISO) < 0);
      const venceHoje = status === 'EM_ABERTO' && vencimentoISO === hojeISO;
      const esteMes = vencimentoISO >= inicioMes && vencimentoISO <= fimMes;
      const statusMatch = filtroStatus === 'todos' || status === filtroStatus;

      if (!statusMatch) return false;
      if (filtroRapido === 'atrasadas') return vencido;
      if (filtroRapido === 'hoje') return venceHoje;
      if (filtroRapido === 'mes') return esteMes;
      return true;
    });
  }, [rows, filtroRapido, filtroStatus, hojeISO, inicioMes, fimMes]);

  const resumo = useMemo(() => {
    const atrasadas = rows.filter((row) => {
      const vencimentoISO = row.data_vencimento.slice(0, 10);
      const status = (row.status || '').toUpperCase();
      return status === 'VENCIDO' || (status === 'EM_ABERTO' && compareISODate(vencimentoISO, hojeISO) < 0);
    }).length;

    const vencemHoje = rows.filter((row) => {
      const vencimentoISO = row.data_vencimento.slice(0, 10);
      return (row.status || '').toUpperCase() === 'EM_ABERTO' && vencimentoISO === hojeISO;
    }).length;

    const desteMes = rows.filter((row) => {
      const vencimentoISO = row.data_vencimento.slice(0, 10);
      return vencimentoISO >= inicioMes && vencimentoISO <= fimMes;
    }).length;

    return {
      total: rows.length,
      atrasadas,
      vencemHoje,
      desteMes,
    };
  }, [rows, hojeISO, inicioMes, fimMes]);

  const badgeLancamento = lancamento === 'RECEITA' ? 'Receita' : 'Despesa';
  const statusOpcoes: FiltroStatus[] = ['todos', 'EM_ABERTO', 'PAGO', 'PARCIALMENTE_PAGO', 'VENCIDO', 'CANCELADO'];

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 md:flex-row md:items-end md:justify-between dark:border-neutral-800">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
              {badgeLancamento}
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{titulo}</h1>
            <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">{subtitulo}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryChip icon={<Banknote className="h-4 w-4" />} label="Total" value={String(resumo.total)} />
            <SummaryChip icon={<ShieldAlert className="h-4 w-4" />} label="Atrasadas" value={String(resumo.atrasadas)} />
            <SummaryChip icon={<AlertTriangle className="h-4 w-4" />} label="Hoje" value={String(resumo.vencemHoje)} />
            <SummaryChip icon={<Sparkles className="h-4 w-4" />} label="Este mês" value={String(resumo.desteMes)} />
          </div>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:bg-neutral-800 dark:text-slate-300">
              Status
            </span>
            {statusOpcoes.map((status) => {
              const ativo = filtroStatus === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFiltroStatus(status)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                    ativo
                      ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-slate-300 dark:hover:bg-neutral-800'
                  }`}
                >
                  {statusFilterLabel(status)}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            {(['todas', 'atrasadas', 'hoje', 'mes'] as FiltroRapido[]).map((filtro) => {
              const ativo = filtroRapido === filtro;
              const contagem =
                filtro === 'todas'
                  ? resumo.total
                  : filtro === 'atrasadas'
                    ? resumo.atrasadas
                    : filtro === 'hoje'
                      ? resumo.vencemHoje
                      : resumo.desteMes;

              return (
                <button
                  key={filtro}
                  type="button"
                  onClick={() => setFiltroRapido(filtro)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                    ativo
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-slate-300 dark:hover:bg-neutral-800'
                  }`}
                >
                  {quickFilterLabel(filtro)}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ativo ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-slate-300'}`}>
                    {contagem}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-neutral-800">
          {loading ? (
            <div className="flex items-center justify-center px-6 py-16">
              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                Carregando contas...
              </div>
            </div>
          ) : erro ? (
            <div className="px-6 py-16 text-center text-sm text-rose-600 dark:text-rose-300">{erro}</div>
          ) : linhasFiltradas.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-slate-300">
                <CircleDashed className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Nenhuma conta encontrada</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ajuste o filtro rápido ou verifique os lançamentos dessa natureza.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur dark:bg-neutral-900/95">
                  <tr>
                    <Th>Descrição</Th>
                    <Th>Vencimento</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Valor original</Th>
                    <Th className="text-right">Quitado</Th>
                    <Th className="text-right">Saldo</Th>
                    <Th>Categoria / Conta</Th>
                  </tr>
                </thead>
                <tbody>
                  {linhasFiltradas.map((row) => {
                    const status = statusMeta(row.status);
                    const vencimentoISO = row.data_vencimento.slice(0, 10);
                    const vencendoHoje = (row.status || '').toUpperCase() === 'EM_ABERTO' && vencimentoISO === hojeISO;
                    const vencido = (row.status || '').toUpperCase() === 'VENCIDO' || ((row.status || '').toUpperCase() === 'EM_ABERTO' && compareISODate(vencimentoISO, hojeISO) < 0);
                    const valorOriginal = Number(row.valor_original || 0);
                    const valorQuitado = Number(row.valor_quitado_total || 0);
                    const saldo = Number(row.saldo_devedor ?? Math.max(0, valorOriginal - valorQuitado));

                    return (
                      <tr
                        key={row.id}
                        className={[
                          'group transition-colors',
                          vencendoHoje ? 'bg-amber-50/80 dark:bg-amber-500/10' : '',
                          vencido ? 'bg-rose-50/60 dark:bg-rose-500/10' : '',
                          !vencendoHoje && !vencido ? 'hover:bg-slate-50 dark:hover:bg-neutral-800/60' : '',
                        ].join(' ')}
                      >
                        <Td first>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{row.descricao_parcela || 'Sem descrição'}</p>
                                {vencendoHoje && (
                                  <p className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    Vence hoje
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </Td>
                        <Td>
                          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                            <CalendarClock className="h-4 w-4 text-slate-400" />
                            {formatarData(row.data_vencimento)}
                          </div>
                        </Td>
                        <Td>
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
                        </Td>
                        <Td className="text-right font-medium text-slate-700 dark:text-slate-200">{formatarMoeda(valorOriginal)}</Td>
                        <Td className="text-right font-medium text-slate-700 dark:text-slate-200">{formatarMoeda(valorQuitado)}</Td>
                        <Td className="text-right font-semibold text-slate-900 dark:text-slate-100">{formatarMoeda(saldo)}</Td>
                        <Td>
                          <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                            <p className="truncate">{row.id_categoria ? (mapaCategorias.get(row.id_categoria) || '-') : '-'}</p>
                            <p className="truncate text-xs text-slate-400 dark:text-slate-500">{row.id_conta_bancaria ? (mapaContas.get(row.id_conta_bancaria) || '-') : '-'}</p>
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        <span className="text-slate-400 dark:text-slate-500">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`border-b border-slate-200 px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:border-neutral-800 dark:text-slate-400 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, first = false, className = '' }: { children: React.ReactNode; first?: boolean; className?: string }) {
  return (
    <td
      className={`border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-700 dark:border-neutral-800 dark:text-slate-200 ${first ? 'w-[340px]' : ''} ${className}`}
    >
      {children}
    </td>
  );
}
