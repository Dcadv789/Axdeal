'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@axdeal/ui';
import { AlertCircle, CalendarDays, CircleDollarSign, Filter, Loader2, ReceiptText, WalletCards } from 'lucide-react';
import { useCompany } from '@/lib/context/company-context';
import { supabase } from '@/lib/supabase';

type FiltroTipoMovimentacao = 'todos' | 'entrada' | 'saida';
type FiltroConciliacao = 'todos' | 'conciliado' | 'nao_conciliado';

interface ExtratoItem {
  id: string;
  id_empresa: string;
  id_conta_bancaria: string;
  id_parcela: string | null;
  id_categoria: string | null;
  descricao: string | null;
  valor: number;
  data_pagamento: string;
  tipo_movimentacao: 'entrada' | 'saida';
  conciliado: boolean;
}

interface ContaBancaria {
  id_conta: string;
  nome_conta: string;
  tipo_conta: string;
}

interface Categoria {
  id_categoria: string;
  nome_categoria: string;
}

interface Parcela {
  id: string;
  numero_parcela: number;
  id_pedido_venda?: string | null;
  id_proposta?: string | null;
  id_os?: string | null;
  id_contrato?: string | null;
  id_despesa?: string | null;
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}

function formatarDataHora(valor: string): string {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data);
}

function dataHojeIso(): string {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function inicioMesIso(): string {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  return `${ano}-${mes}-01`;
}

export default function FinanceiroExtratoContent() {
  const { companyId } = useCompany();

  const [loading, setLoading] = useState(true);
  const [carregandoConsulta, setCarregandoConsulta] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [idContaFiltro, setIdContaFiltro] = useState('');
  const [idCategoriaFiltro, setIdCategoriaFiltro] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<FiltroTipoMovimentacao>('todos');
  const [conciliacaoFiltro, setConciliacaoFiltro] = useState<FiltroConciliacao>('todos');
  const [dataInicio, setDataInicio] = useState(inicioMesIso());
  const [dataFim, setDataFim] = useState(dataHojeIso());

  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [itensExtrato, setItensExtrato] = useState<ExtratoItem[]>([]);
  const [mapaConta, setMapaConta] = useState<Map<string, ContaBancaria>>(new Map());
  const [mapaCategoria, setMapaCategoria] = useState<Map<string, Categoria>>(new Map());
  const [mapaParcela, setMapaParcela] = useState<Map<string, Parcela>>(new Map());

  const carregarFiltros = useCallback(async () => {
    if (!companyId) {
      setContas([]);
      setCategorias([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErro(null);

    const [resContas, resCategorias] = await Promise.all([
      supabase
        .from('erp_contas_bancarias')
        .select('id_conta, nome_conta, tipo_conta')
        .eq('id_empresa', companyId)
        .eq('ativo', true)
        .order('nome_conta', { ascending: true }),
      supabase
        .from('erp_categorias')
        .select('id_categoria, nome_categoria')
        .eq('id_empresa', companyId)
        .eq('ativo', true)
        .order('nome_categoria', { ascending: true }),
    ]);

    if (resContas.error || resCategorias.error) {
      console.error('Erro ao carregar filtros do extrato:', resContas.error || resCategorias.error);
      setErro('Nao foi possivel carregar os filtros do extrato.');
      setLoading(false);
      return;
    }

    const contasData = (resContas.data || []) as ContaBancaria[];
    const categoriasData = (resCategorias.data || []) as Categoria[];

    setContas(contasData);
    setCategorias(categoriasData);
    setMapaConta(new Map(contasData.map((item) => [item.id_conta, item])));
    setMapaCategoria(new Map(categoriasData.map((item) => [item.id_categoria, item])));

    if (!idContaFiltro && contasData.length > 0) setIdContaFiltro('');
    setLoading(false);
  }, [companyId, idContaFiltro]);

  const consultarExtrato = useCallback(async () => {
    if (!companyId) {
      setItensExtrato([]);
      return;
    }

    setCarregandoConsulta(true);
    setErro(null);

    let query = supabase
      .from('erp_extrato')
      .select('id, id_empresa, id_conta_bancaria, id_parcela, id_categoria, descricao, valor, data_pagamento, tipo_movimentacao, conciliado')
      .eq('id_empresa', companyId)
      .order('data_pagamento', { ascending: false });

    if (idContaFiltro) query = query.eq('id_conta_bancaria', idContaFiltro);
    if (idCategoriaFiltro) query = query.eq('id_categoria', idCategoriaFiltro);
    if (tipoFiltro !== 'todos') query = query.eq('tipo_movimentacao', tipoFiltro);
    if (conciliacaoFiltro === 'conciliado') query = query.eq('conciliado', true);
    if (conciliacaoFiltro === 'nao_conciliado') query = query.eq('conciliado', false);
    if (dataInicio) query = query.gte('data_pagamento', `${dataInicio}T00:00:00.000Z`);
    if (dataFim) query = query.lte('data_pagamento', `${dataFim}T23:59:59.999Z`);

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao consultar extrato:', error);
      setErro('Nao foi possivel consultar o extrato.');
      setCarregandoConsulta(false);
      return;
    }

    const extrato = (data || []) as ExtratoItem[];
    setItensExtrato(extrato);

    const idsParcelas = Array.from(new Set(extrato.map((item) => item.id_parcela).filter((id): id is string => Boolean(id))));
    const idsCategoriasFaltantes = Array.from(
      new Set(
        extrato
          .map((item) => item.id_categoria)
          .filter((id): id is string => typeof id === 'string')
          .filter((id) => !mapaCategoria.has(id))
      )
    );
    const idsContasFaltantes = Array.from(
      new Set(extrato.map((item) => item.id_conta_bancaria).filter((id): id is string => Boolean(id) && !mapaConta.has(id)))
    );

    const promessas: Promise<void>[] = [];

    if (idsParcelas.length > 0) {
      promessas.push(
        (async () => {
          const { data: parcelasData, error: parcelasError } = await supabase
            .from('erp_parcelas')
            .select('id, numero_parcela, id_pedido_venda, id_proposta, id_os, id_contrato, id_despesa')
            .in('id', idsParcelas);

          if (parcelasError) {
            console.error('Erro ao buscar parcelas do extrato:', parcelasError);
            return;
          }

          const parcelas = (parcelasData || []) as Parcela[];
          const mapaParcelaLocal = new Map(parcelas.map((item) => [item.id, item]));
          setMapaParcela(mapaParcelaLocal);
        })()
      );
    } else {
      setMapaParcela(new Map());
    }

    if (idsCategoriasFaltantes.length > 0) {
      promessas.push(
        (async () => {
          const { data: categoriasData, error: categoriasError } = await supabase
            .from('erp_categorias')
            .select('id_categoria, nome_categoria')
            .in('id_categoria', idsCategoriasFaltantes);

          if (categoriasError) {
            console.error('Erro ao buscar categorias do extrato:', categoriasError);
            return;
          }

          const itens = (categoriasData || []) as Categoria[];
          setMapaCategoria((atual) => {
            const proximo = new Map(atual);
            for (const item of itens) proximo.set(item.id_categoria, item);
            return proximo;
          });
        })()
      );
    }

    if (idsContasFaltantes.length > 0) {
      promessas.push(
        (async () => {
          const { data: contasData, error: contasError } = await supabase
            .from('erp_contas_bancarias')
            .select('id_conta, nome_conta, tipo_conta')
            .in('id_conta', idsContasFaltantes);

          if (contasError) {
            console.error('Erro ao buscar contas do extrato:', contasError);
            return;
          }

          const itens = (contasData || []) as ContaBancaria[];
          setMapaConta((atual) => {
            const proximo = new Map(atual);
            for (const item of itens) proximo.set(item.id_conta, item);
            return proximo;
          });
        })()
      );
    }

    await Promise.all(promessas);
    setCarregandoConsulta(false);
  }, [companyId, idCategoriaFiltro, idContaFiltro, tipoFiltro, conciliacaoFiltro, dataInicio, dataFim, mapaCategoria, mapaConta]);

  useEffect(() => {
    void carregarFiltros();
  }, [carregarFiltros]);

  useEffect(() => {
    if (!companyId) return;
    void consultarExtrato();
  }, [companyId, consultarExtrato]);

  const resumo = useMemo(() => {
    let entradas = 0;
    let saidas = 0;
    for (const item of itensExtrato) {
      if (item.tipo_movimentacao === 'entrada') entradas += Number(item.valor || 0);
      if (item.tipo_movimentacao === 'saida') saidas += Math.abs(Number(item.valor || 0));
    }
    return {
      entradas,
      saidas,
      saldo: entradas - saidas,
    };
  }, [itensExtrato]);

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center gap-2">
        <ReceiptText size={28} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Consulta do Extrato</h1>
      </div>

      <Card>
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Entradas</p>
              {loading ? (
                <div className="mt-2 h-7 w-28 animate-pulse rounded bg-slate-200 dark:bg-neutral-700" />
              ) : (
                <p className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-300">{formatarMoeda(resumo.entradas)}</p>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Saidas</p>
              {loading ? (
                <div className="mt-2 h-7 w-28 animate-pulse rounded bg-slate-200 dark:bg-neutral-700" />
              ) : (
                <p className="mt-1 text-lg font-semibold text-rose-600 dark:text-rose-300">{formatarMoeda(resumo.saidas)}</p>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Saldo</p>
              {loading ? (
                <div className="mt-2 h-7 w-28 animate-pulse rounded bg-slate-200 dark:bg-neutral-700" />
              ) : (
                <p className={`mt-1 text-lg font-semibold ${resumo.saldo >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-rose-600 dark:text-rose-300'}`}>
                  {formatarMoeda(resumo.saldo)}
                </p>
              )}
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

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Conta bancaria</label>
                <div className="relative">
                  <WalletCards size={15} className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
                  <select
                    value={idContaFiltro}
                    onChange={(e) => setIdContaFiltro(e.target.value)}
                    className="w-full rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 pl-8 pr-3 py-2 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-500"
                  >
                    <option value="">Todas</option>
                    {contas.map((conta) => (
                      <option key={conta.id_conta} value={conta.id_conta}>
                        {conta.nome_conta}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Categoria</label>
                <select
                  value={idCategoriaFiltro}
                  onChange={(e) => setIdCategoriaFiltro(e.target.value)}
                  className="w-full rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-500"
                >
                  <option value="">Todas</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id_categoria} value={categoria.id_categoria}>
                      {categoria.nome_categoria}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Tipo</label>
                <select
                  value={tipoFiltro}
                  onChange={(e) => setTipoFiltro(e.target.value as FiltroTipoMovimentacao)}
                  className="w-full rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-500"
                >
                  <option value="todos">Todos</option>
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saida</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Conciliacao</label>
                <select
                  value={conciliacaoFiltro}
                  onChange={(e) => setConciliacaoFiltro(e.target.value as FiltroConciliacao)}
                  className="w-full rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-500"
                >
                  <option value="todos">Todos</option>
                  <option value="conciliado">Conciliado</option>
                  <option value="nao_conciliado">Nao conciliado</option>
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
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void consultarExtrato()}
                disabled={carregandoConsulta || loading}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {carregandoConsulta && <Loader2 size={14} className="animate-spin" />}
                Buscar
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950">
            <table className="min-w-full text-sm">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Data</th>
                  <th className="px-3 py-2 text-left font-semibold">Descricao</th>
                  <th className="px-3 py-2 text-left font-semibold">Conta</th>
                  <th className="px-3 py-2 text-left font-semibold">Categoria</th>
                  <th className="px-3 py-2 text-left font-semibold">Parcela/Origem</th>
                  <th className="px-3 py-2 text-left font-semibold">Tipo</th>
                  <th className="px-3 py-2 text-left font-semibold">Conciliacao</th>
                  <th className="px-3 py-2 text-right font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody>
                {loading || carregandoConsulta ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={`skeleton-${index}`} className="border-t border-slate-200 dark:border-neutral-800">
                      <td className="px-3 py-3" colSpan={8}>
                        <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-neutral-800" />
                      </td>
                    </tr>
                  ))
                ) : itensExtrato.length === 0 ? (
                  <tr className="border-t border-slate-200 dark:border-neutral-800">
                    <td colSpan={8} className="px-3 py-10 text-center text-slate-500 dark:text-slate-400">
                      Nenhuma movimentacao encontrada para os filtros informados.
                    </td>
                  </tr>
                ) : (
                  itensExtrato.map((item) => {
                    const conta = mapaConta.get(item.id_conta_bancaria);
                    const categoria = item.id_categoria ? mapaCategoria.get(item.id_categoria) : null;
                    const parcela = item.id_parcela ? mapaParcela.get(item.id_parcela) : null;
                    const origem = parcela
                      ? parcela.id_despesa
                        ? 'Despesa'
                        : parcela.id_contrato
                          ? 'Contrato'
                          : parcela.id_pedido_venda
                            ? 'Pedido'
                            : parcela.id_os
                              ? 'OS'
                              : parcela.id_proposta
                                ? 'Proposta'
                                : 'Negocio'
                      : null;
                    const valorAbs = Math.abs(Number(item.valor || 0));

                    return (
                      <tr key={item.id} className="border-t border-slate-200 dark:border-neutral-800">
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200 whitespace-nowrap">{formatarDataHora(item.data_pagamento)}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{item.descricao || '-'}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                          {conta ? `${conta.nome_conta}` : '-'}
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{categoria?.nome_categoria || '-'}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                          {parcela ? `Parcela ${parcela.numero_parcela}${origem ? ` - ${origem}` : ''}` : '-'}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              item.tipo_movimentacao === 'entrada'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                            }`}
                          >
                            {item.tipo_movimentacao === 'entrada' ? 'Entrada' : 'Saida'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              item.conciliado
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-slate-200'
                            }`}
                          >
                            {item.conciliado ? 'Conciliado' : 'Nao conciliado'}
                          </span>
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${
                            item.tipo_movimentacao === 'entrada'
                              ? 'text-emerald-600 dark:text-emerald-300'
                              : 'text-rose-600 dark:text-rose-300'
                          }`}
                        >
                          {item.tipo_movimentacao === 'saida' ? '- ' : '+ '}
                          {formatarMoeda(valorAbs)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-2">
            <CircleDollarSign size={14} />
            Total de registros: {loading ? '-' : itensExtrato.length}
          </div>
        </div>
      </Card>
    </div>
  );
}
