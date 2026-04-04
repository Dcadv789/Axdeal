'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@axdeal/ui';
import { AlertCircle, ArrowDownCircle, ArrowUpCircle, CalendarDays, Filter, Scale } from 'lucide-react';
import { useCompany } from '@/lib/context/company-context';
import { supabase } from '@/lib/supabase';

type FiltroTipo = 'todos' | 'receita' | 'despesa';
type FiltroStatus = 'todos' | 'pendente' | 'pago';

interface ParcelaBase {
  id: string;
  id_pedido_venda?: string | null;
  id_proposta?: string | null;
  id_os?: string | null;
  id_contrato?: string | null;
  id_despesa?: string | null;
  id_categoria?: string | null;
  numero_parcela: number;
  descricao_parcela: string | null;
  valor_original: number;
  data_vencimento: string;
  data_quitacao_total: string | null;
  status: string | null;
}

interface CodigoBase {
  id: string;
  codigo: string;
  titulo?: string | null;
}

interface DespesaBase {
  id: string;
  descricao: string;
}

interface CategoriaBase {
  id_categoria: string;
  nome_categoria: string;
}

interface LinhaConsolidada {
  id: string;
  parcela: ParcelaBase;
  origem: string;
  tipoFinanceiro: 'receita' | 'despesa';
  statusNormalizado: 'pendente' | 'pago';
  categoriaNome: string;
}

function formatarCodigo4Digitos(valor: unknown): string {
  const somenteDigitos = String(valor ?? '').replace(/\D/g, '');
  if (!somenteDigitos) return '';
  return somenteDigitos.padStart(4, '0');
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}

function formatarData(valor: string): string {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(data);
}

function inicioMesIso(): string {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  return `${ano}-${mes}-01`;
}

function hojeIso(): string {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function normalizarStatus(status: string | null | undefined): 'pendente' | 'pago' {
  const base = (status || '').toLowerCase();
  if (base.includes('pago') || base.includes('quitad') || base.includes('conclu')) return 'pago';
  return 'pendente';
}

function erroTabelaInexistente(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const message = String((error as { message?: string }).message || '').toLowerCase();
  return message.includes('does not exist') || message.includes('relation') || message.includes('42p01');
}

export default function FinanceiroReceitasDespesasContent() {
  const { companyId } = useCompany();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [parcelas, setParcelas] = useState<ParcelaBase[]>([]);
  const [mapaVendas, setMapaVendas] = useState<Map<string, CodigoBase>>(new Map());
  const [mapaPropostas, setMapaPropostas] = useState<Map<string, CodigoBase>>(new Map());
  const [mapaOrdens, setMapaOrdens] = useState<Map<string, CodigoBase>>(new Map());
  const [mapaDespesas, setMapaDespesas] = useState<Map<string, DespesaBase>>(new Map());
  const [mapaCategoria, setMapaCategoria] = useState<Map<string, CategoriaBase>>(new Map());

  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos');
  const [dataInicio, setDataInicio] = useState(inicioMesIso());
  const [dataFim, setDataFim] = useState(hojeIso());
  const [busca, setBusca] = useState('');

  const carregarDados = useCallback(async () => {
    if (!companyId) {
      setParcelas([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErro(null);

    const { data: parcelasData, error: parcelasError } = await supabase
      .from('erp_parcelas')
      .select(
        'id, id_pedido_venda, id_proposta, id_os, id_contrato, id_despesa, id_categoria, numero_parcela, descricao_parcela, valor_original, data_vencimento, data_quitacao_total, status'
      )
      .eq('id_empresa', companyId)
      .order('data_vencimento', { ascending: false });

    if (parcelasError) {
      console.error('Erro ao carregar parcelas de receitas/despesas:', parcelasError);
      setErro('Nao foi possivel carregar os dados financeiros.');
      setLoading(false);
      return;
    }

    const parcelasLista = (parcelasData || []) as ParcelaBase[];
    setParcelas(parcelasLista);

    const idsPedidosVenda = Array.from(new Set(parcelasLista.map((p) => p.id_pedido_venda).filter(Boolean))) as string[];
    const idsPropostas = Array.from(new Set(parcelasLista.map((p) => p.id_proposta).filter(Boolean))) as string[];
    const idsOrdens = Array.from(new Set(parcelasLista.map((p) => p.id_os).filter(Boolean))) as string[];
    const idsDespesas = Array.from(new Set(parcelasLista.map((p) => p.id_despesa).filter(Boolean))) as string[];
    const idsCategorias = Array.from(new Set(parcelasLista.map((p) => p.id_categoria).filter(Boolean))) as string[];

    const [resPedidosVenda, resPropostas, resOrdens, resDespesas, resCategorias] = await Promise.all([
      idsPedidosVenda.length > 0
        ? supabase.from('erp_pedidos_venda').select('id, codigo_numero, titulo').in('id', idsPedidosVenda)
        : Promise.resolve({ data: [], error: null }),
      idsPropostas.length > 0
        ? supabase.from('erp_propostas').select('id, codigo:codigo_completo').in('id', idsPropostas)
        : Promise.resolve({ data: [], error: null }),
      idsOrdens.length > 0
        ? supabase.from('erp_os').select('id, codigo').in('id', idsOrdens)
        : Promise.resolve({ data: [], error: null }),
      idsDespesas.length > 0
        ? supabase.from('erp_despesas').select('id, descricao').in('id', idsDespesas)
        : Promise.resolve({ data: [], error: null }),
      idsCategorias.length > 0
        ? supabase.from('erp_categorias').select('id_categoria, nome_categoria').in('id_categoria', idsCategorias)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (resPedidosVenda.error || resPropostas.error || resCategorias.error) {
      console.error('Erro ao carregar referencias de receitas/despesas:', resPedidosVenda.error || resPropostas.error || resCategorias.error);
      setErro('Nao foi possivel carregar todas as referencias financeiras.');
    }

    if (resOrdens.error && !erroTabelaInexistente(resOrdens.error)) {
      console.error('Erro ao carregar ordens de servico:', resOrdens.error);
      setErro('Nao foi possivel carregar as ordens de servico.');
    }

    if (resDespesas.error && !erroTabelaInexistente(resDespesas.error)) {
      console.error('Erro ao carregar despesas:', resDespesas.error);
      setErro('Nao foi possivel carregar as despesas.');
    }

    const pedidosVendaFormatados = ((resPedidosVenda.data || []) as Array<{ id: string; codigo_numero: string | number | null; titulo?: string | null }>).map((item) => ({
      id: item.id,
      codigo: formatarCodigo4Digitos(item.codigo_numero),
      titulo: item.titulo ?? null,
    }));

    setMapaVendas(new Map(pedidosVendaFormatados.map((item) => [item.id, item])));
    setMapaPropostas(new Map(((resPropostas.data || []) as CodigoBase[]).map((item) => [item.id, item])));
    setMapaOrdens(new Map((((resOrdens.data || []) as CodigoBase[]) || []).map((item) => [item.id, item])));
    setMapaDespesas(new Map((((resDespesas.data || []) as DespesaBase[]) || []).map((item) => [item.id, item])));
    setMapaCategoria(new Map(((resCategorias.data || []) as CategoriaBase[]).map((item) => [item.id_categoria, item])));

    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  const linhasConsolidadas = useMemo<LinhaConsolidada[]>(() => {
    return parcelas.map((parcela) => {
      let origem = '-';
      if (parcela.id_pedido_venda) {
        const pedido = mapaVendas.get(parcela.id_pedido_venda);
        const identificadorPedido = pedido?.codigo || pedido?.titulo?.trim() || '-';
        origem = `Pedido de Venda > ${identificadorPedido}`;
      } else if (parcela.id_os) {
        const ordem = mapaOrdens.get(parcela.id_os);
        origem = ordem ? `OS ${ordem.codigo}` : 'OS';
      } else if (parcela.id_proposta) {
        const proposta = mapaPropostas.get(parcela.id_proposta);
        origem = proposta ? `Proposta ${proposta.codigo}` : 'Proposta';
      } else if (parcela.id_contrato) {
        origem = 'Contrato';
      } else if (parcela.id_despesa) {
        const despesa = mapaDespesas.get(parcela.id_despesa);
        origem = despesa?.descricao || 'Despesa';
      }

      const tipoFinanceiro = parcela.id_despesa ? 'despesa' : 'receita';
      const statusNormalizado = normalizarStatus(parcela.status);
      const categoriaNome = parcela.id_categoria ? mapaCategoria.get(parcela.id_categoria)?.nome_categoria || '-' : '-';

      return {
        id: parcela.id,
        parcela,
        origem,
        tipoFinanceiro,
        statusNormalizado,
        categoriaNome,
      };
    });
  }, [parcelas, mapaVendas, mapaOrdens, mapaPropostas, mapaDespesas, mapaCategoria]);

  const linhasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const inicio = dataInicio ? new Date(`${dataInicio}T00:00:00`) : null;
    const fim = dataFim ? new Date(`${dataFim}T23:59:59`) : null;

    return linhasConsolidadas.filter((linha) => {
      if (filtroTipo !== 'todos' && linha.tipoFinanceiro !== filtroTipo) return false;
      if (filtroStatus !== 'todos' && linha.statusNormalizado !== filtroStatus) return false;

      const dataVenc = new Date(linha.parcela.data_vencimento);
      if (inicio && dataVenc < inicio) return false;
      if (fim && dataVenc > fim) return false;

      if (!termo) return true;

      const alvo = [linha.origem, linha.parcela.descricao_parcela || '', linha.categoriaNome]
        .join(' ')
        .toLowerCase();

      return alvo.includes(termo);
    });
  }, [linhasConsolidadas, filtroTipo, filtroStatus, dataInicio, dataFim, busca]);

  const resumo = useMemo(() => {
    let totalReceitas = 0;
    let totalDespesas = 0;
    let totalPendente = 0;
    let totalPago = 0;

    for (const linha of linhasFiltradas) {
      const valor = Number(linha.parcela.valor_original || 0);
      if (linha.tipoFinanceiro === 'receita') totalReceitas += valor;
      if (linha.tipoFinanceiro === 'despesa') totalDespesas += valor;
      if (linha.statusNormalizado === 'pendente') totalPendente += valor;
      if (linha.statusNormalizado === 'pago') totalPago += valor;
    }

    return {
      totalReceitas,
      totalDespesas,
      resultado: totalReceitas - totalDespesas,
      totalPendente,
      totalPago,
    };
  }, [linhasFiltradas]);

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Scale size={28} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Receitas e Despesas</h1>
      </div>

      <Card>
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Receitas</p>
              <p className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-300">{formatarMoeda(resumo.totalReceitas)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Despesas</p>
              <p className="mt-1 text-lg font-semibold text-rose-600 dark:text-rose-300">{formatarMoeda(resumo.totalDespesas)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Resultado</p>
              <p className={`mt-1 text-lg font-semibold ${resumo.resultado >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-rose-600 dark:text-rose-300'}`}>
                {formatarMoeda(resumo.resultado)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Pago</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{formatarMoeda(resumo.totalPago)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Pendente</p>
              <p className="mt-1 text-lg font-semibold text-amber-600 dark:text-amber-300">{formatarMoeda(resumo.totalPendente)}</p>
            </div>
          </div>

          {erro && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-slate-50/70 dark:bg-neutral-900/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-blue-600 dark:text-blue-300" />
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Filtros</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Tipo</label>
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value as FiltroTipo)}
                  className="w-full rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-500"
                >
                  <option value="todos">Todos</option>
                  <option value="receita">Receitas</option>
                  <option value="despesa">Despesas</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Status</label>
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value as FiltroStatus)}
                  className="w-full rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-500"
                >
                  <option value="todos">Todos</option>
                  <option value="pago">Pago</option>
                  <option value="pendente">Pendente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Data inicio</label>
                <div className="relative">
                  <CalendarDays size={15} className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 pl-8 pr-3 py-2 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Data fim</label>
                <div className="relative">
                  <CalendarDays size={15} className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 pl-8 pr-3 py-2 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Busca</label>
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Origem, descricao, categoria..."
                  className="w-full rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950">
            <table className="min-w-full text-sm">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Vencimento</th>
                  <th className="px-3 py-2 text-left font-semibold">Origem</th>
                  <th className="px-3 py-2 text-left font-semibold">Parcela</th>
                  <th className="px-3 py-2 text-left font-semibold">Categoria</th>
                  <th className="px-3 py-2 text-left font-semibold">Tipo</th>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                  <th className="px-3 py-2 text-right font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={`skeleton-${index}`} className="border-t border-slate-200 dark:border-neutral-800">
                      <td className="px-3 py-3" colSpan={7}>
                        <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-neutral-800" />
                      </td>
                    </tr>
                  ))
                ) : linhasFiltradas.length === 0 ? (
                  <tr className="border-t border-slate-200 dark:border-neutral-800">
                    <td colSpan={7} className="px-3 py-10 text-center text-slate-500 dark:text-slate-400">
                      Nenhum registro encontrado para os filtros informados.
                    </td>
                  </tr>
                ) : (
                  linhasFiltradas.map((linha) => (
                    <tr key={linha.id} className="border-t border-slate-200 dark:border-neutral-800">
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200 whitespace-nowrap">{formatarData(linha.parcela.data_vencimento)}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{linha.origem}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">Parcela {linha.parcela.numero_parcela || 1}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{linha.categoriaNome}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            linha.tipoFinanceiro === 'receita'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                          }`}
                        >
                          {linha.tipoFinanceiro === 'receita' ? <ArrowUpCircle size={13} /> : <ArrowDownCircle size={13} />}
                          {linha.tipoFinanceiro === 'receita' ? 'Receita' : 'Despesa'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            linha.statusNormalizado === 'pago'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                          }`}
                        >
                          {linha.statusNormalizado === 'pago' ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${
                          linha.tipoFinanceiro === 'receita'
                            ? 'text-emerald-600 dark:text-emerald-300'
                            : 'text-rose-600 dark:text-rose-300'
                        }`}
                      >
                        {linha.tipoFinanceiro === 'despesa' ? '- ' : '+ '}
                        {formatarMoeda(Math.abs(Number(linha.parcela.valor_original || 0)))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
