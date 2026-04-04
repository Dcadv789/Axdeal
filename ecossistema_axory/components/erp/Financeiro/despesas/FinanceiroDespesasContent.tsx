'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@axdeal/ui';
import {
  AlertCircle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  FolderTree,
  Loader2,
  Receipt,
} from 'lucide-react';
import { useCompany } from '@/lib/context/company-context';
import { supabase } from '@/lib/supabase';

interface ContaBancaria {
  id_conta: string;
  nome_conta: string;
  tipo_conta: string;
  ativo: boolean;
}

interface GrupoDre {
  id_grupo: string;
  nome_grupo: string;
  ordem: number;
  cor: string | null;
}

interface CategoriaDre {
  id_categoria: string;
  id_grupo: string;
  id_categoria_pai: string | null;
  nome_categoria: string;
  descricao: string | null;
  tipo_lancamento: 'entrada' | 'saida' | 'ambos';
  ordem: number;
}

function dataHojeIso(): string {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function ordenarPorOrdemENome<T extends { ordem: number }>(lista: T[], nome: keyof T): T[] {
  return [...lista].sort((a, b) => {
    if ((a.ordem || 0) !== (b.ordem || 0)) return (a.ordem || 0) - (b.ordem || 0);
    return String(a[nome] || '').localeCompare(String(b[nome] || ''), 'pt-BR');
  });
}

function parseValorMonetario(valor: string): number {
  const normalizado = valor.replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : NaN;
}

function formatarValorInput(valor: string): string {
  return valor.replace(/[^\d.,]/g, '');
}

export default function FinanceiroDespesasContent() {
  const { companyId } = useCompany();

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [grupos, setGrupos] = useState<GrupoDre[]>([]);
  const [categorias, setCategorias] = useState<CategoriaDre[]>([]);

  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [idConta, setIdConta] = useState('');
  const [idCategoria, setIdCategoria] = useState('');
  const [dataLancamento, setDataLancamento] = useState(dataHojeIso());
  const [jaFoiPago, setJaFoiPago] = useState(true);

  const [menuCategoriaAberto, setMenuCategoriaAberto] = useState(false);
  const [gruposExpandidos, setGruposExpandidos] = useState<Record<string, boolean>>({});
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Record<string, boolean>>({});

  const menuRef = useRef<HTMLDivElement | null>(null);

  const carregarDados = useCallback(async () => {
    if (!companyId) {
      setContas([]);
      setGrupos([]);
      setCategorias([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErro(null);

    const [resContas, resGrupos, resCategorias] = await Promise.all([
      supabase
        .from('erp_contas_bancarias')
        .select('id_conta, nome_conta, tipo_conta, ativo')
        .eq('id_empresa', companyId)
        .eq('ativo', true)
        .order('nome_conta', { ascending: true }),
      supabase
        .from('erp_grupos_dre')
        .select('id_grupo, nome_grupo, ordem, cor')
        .eq('id_empresa', companyId)
        .eq('ativo', true)
        .order('ordem', { ascending: true }),
      supabase
        .from('erp_categorias')
        .select('id_categoria, id_grupo, id_categoria_pai, nome_categoria, descricao, tipo_lancamento, ordem')
        .eq('id_empresa', companyId)
        .eq('ativo', true)
        .eq('tipo_lancamento', 'saida')
        .order('ordem', { ascending: true }),
    ]);

    if (resContas.error || resGrupos.error || resCategorias.error) {
      console.error('Erro ao carregar dados de despesas:', resContas.error || resGrupos.error || resCategorias.error);
      setErro('Nao foi possivel carregar os dados para lancamento de despesa.');
      setLoading(false);
      return;
    }

    const contasAtivas = (resContas.data || []) as ContaBancaria[];
    const gruposData = (resGrupos.data || []) as GrupoDre[];
    const categoriasData = (resCategorias.data || []) as CategoriaDre[];

    setContas(contasAtivas);
    setGrupos(gruposData);
    setCategorias(categoriasData);

    if (!idConta && contasAtivas.length > 0) setIdConta(contasAtivas[0].id_conta);

    setLoading(false);
  }, [companyId, idConta]);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    setGruposExpandidos((atual) => {
      const proximo = { ...atual };
      for (const grupo of grupos) {
        if (!(grupo.id_grupo in proximo)) proximo[grupo.id_grupo] = true;
      }
      return proximo;
    });
  }, [grupos]);

  useEffect(() => {
    setCategoriasExpandidas((atual) => {
      const proximo = { ...atual };
      for (const categoria of categorias) {
        if (!(categoria.id_categoria in proximo)) proximo[categoria.id_categoria] = true;
      }
      return proximo;
    });
  }, [categorias]);

  useEffect(() => {
    const handleClickFora = (evento: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(evento.target as Node)) {
        setMenuCategoriaAberto(false);
      }
    };

    if (menuCategoriaAberto) {
      window.addEventListener('mousedown', handleClickFora);
    }
    return () => window.removeEventListener('mousedown', handleClickFora);
  }, [menuCategoriaAberto]);

  const gruposOrdenados = useMemo(() => ordenarPorOrdemENome(grupos, 'nome_grupo'), [grupos]);

  const categoriasPorGrupoEPai = useMemo(() => {
    const mapa = new Map<string, CategoriaDre[]>();
    const categoriasOrdenadas = ordenarPorOrdemENome(categorias, 'nome_categoria');
    for (const categoria of categoriasOrdenadas) {
      const chave = `${categoria.id_grupo}:${categoria.id_categoria_pai || 'root'}`;
      const lista = mapa.get(chave) || [];
      lista.push(categoria);
      mapa.set(chave, lista);
    }
    return mapa;
  }, [categorias]);

  const categoriaPorId = useMemo(() => {
    const mapa = new Map<string, CategoriaDre>();
    for (const categoria of categorias) mapa.set(categoria.id_categoria, categoria);
    return mapa;
  }, [categorias]);

  const categoriaSelecionada = idCategoria ? categoriaPorId.get(idCategoria) || null : null;

  const nomeCategoriaCompleto = useMemo(() => {
    if (!categoriaSelecionada) return 'Selecionar categoria';
    const nomes: string[] = [categoriaSelecionada.nome_categoria];
    let atual = categoriaSelecionada;
    while (atual.id_categoria_pai) {
      const pai = categoriaPorId.get(atual.id_categoria_pai);
      if (!pai) break;
      nomes.unshift(pai.nome_categoria);
      atual = pai;
    }
    return nomes.join(' / ');
  }, [categoriaSelecionada, categoriaPorId]);

  const renderCategoriaNoMenu = (categoria: CategoriaDre, nivel: number): JSX.Element => {
    const filhas = categoriasPorGrupoEPai.get(`${categoria.id_grupo}:${categoria.id_categoria}`) || [];
    const temFilhas = filhas.length > 0;
    const expandida = categoriasExpandidas[categoria.id_categoria] ?? true;
    const selecionada = idCategoria === categoria.id_categoria;

    return (
      <div key={categoria.id_categoria} className="space-y-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!temFilhas}
            onClick={() =>
              setCategoriasExpandidas((atual) => ({
                ...atual,
                [categoria.id_categoria]: !expandida,
              }))
            }
            className={`h-6 w-6 rounded-md inline-flex items-center justify-center ${
              temFilhas
                ? 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-neutral-800'
                : 'text-transparent cursor-default'
            }`}
            style={{ marginLeft: `${nivel * 12}px` }}
          >
            {temFilhas ? (expandida ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <ChevronRight size={14} />}
          </button>

          <button
            type="button"
            onClick={() => {
              setIdCategoria(categoria.id_categoria);
              setMenuCategoriaAberto(false);
            }}
            className={`flex-1 text-left rounded-lg px-2 py-1.5 text-sm transition-colors ${
              selecionada
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-neutral-800'
            }`}
          >
            {categoria.nome_categoria}
          </button>
        </div>

        {temFilhas && expandida && <div className="space-y-1">{filhas.map((filha) => renderCategoriaNoMenu(filha, nivel + 1))}</div>}
      </div>
    );
  };

  const salvarDespesa = async () => {
    if (!companyId) {
      setErro('Empresa nao identificada.');
      return;
    }
    if (!idCategoria) {
      setErro('Selecione uma categoria de saida.');
      return;
    }
    if (!idConta) {
      setErro('Selecione uma conta bancaria.');
      return;
    }
    if (!descricao.trim()) {
      setErro('Informe uma descricao para a despesa.');
      return;
    }

    const valorNumerico = parseValorMonetario(valor);
    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      setErro('Informe um valor valido maior que zero.');
      return;
    }

    setErro(null);
    setSucesso(null);
    setSalvando(true);

    const dataIso = dataLancamento ? `${dataLancamento}T12:00:00.000Z` : new Date().toISOString();

    const { error } = await supabase.rpc('erp_fn_lancar_despesa_rapida', {
      p_id_empresa: companyId,
      p_valor: valorNumerico,
      p_descricao: descricao.trim(),
      p_id_categoria: idCategoria,
      p_id_conta_bancaria: idConta,
      p_data_pagamento: dataIso,
      p_ja_pago: jaFoiPago,
    });

    setSalvando(false);

    if (error) {
      console.error('Erro ao lancar despesa rapida:', error);
      setErro(error.message || 'Nao foi possivel salvar a despesa.');
      return;
    }

    setSucesso(jaFoiPago ? 'Despesa lancada e baixada com sucesso no extrato.' : 'Despesa lancada como pendente com sucesso.');
    setValor('');
    setDescricao('');
    setIdCategoria('');
    setDataLancamento(dataHojeIso());
  };

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Receipt size={28} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Despesas Rapidas</h1>
      </div>

      <Card>
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 p-4 space-y-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Novo lancamento</p>

              {erro && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5" />
                  <span>{erro}</span>
                </div>
              )}

              {sucesso && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300 flex items-start gap-2">
                  <CheckCircle2 size={16} className="mt-0.5" />
                  <span>{sucesso}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Valor</label>
                  <div className="relative">
                    <CircleDollarSign size={16} className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={valor}
                      onChange={(e) => setValor(formatarValorInput(e.target.value))}
                      placeholder="0,00"
                      className="w-full rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 pl-9 pr-3 py-2 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Data</label>
                  <div className="relative">
                    <CalendarDays size={16} className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
                    <input
                      type="date"
                      value={dataLancamento}
                      onChange={(e) => setDataLancamento(e.target.value)}
                      className="w-full rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 pl-9 pr-3 py-2 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Descricao</label>
                <textarea
                  rows={3}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Pagamento de campanha de marketing"
                  className="w-full rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div ref={menuRef} className="relative">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Categoria (saida)</label>
                  <button
                    type="button"
                    onClick={() => setMenuCategoriaAberto((aberto) => !aberto)}
                    className="w-full rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-500 inline-flex items-center justify-between gap-2"
                  >
                    <span className="truncate text-left">{nomeCategoriaCompleto}</span>
                    <ChevronDown size={16} className={`transition-transform ${menuCategoriaAberto ? 'rotate-180' : ''}`} />
                  </button>

                  {menuCategoriaAberto && (
                    <div className="absolute z-30 mt-2 w-full rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-2xl p-2 max-h-80 overflow-y-auto">
                      {gruposOrdenados.length === 0 ? (
                        <div className="px-2 py-3 text-xs text-slate-500 dark:text-slate-400">Nenhum grupo/categoria de saida encontrado.</div>
                      ) : (
                        <div className="space-y-2">
                          {gruposOrdenados.map((grupo) => {
                            const expandido = gruposExpandidos[grupo.id_grupo] ?? true;
                            const categoriasRaiz = categoriasPorGrupoEPai.get(`${grupo.id_grupo}:root`) || [];
                            return (
                              <div key={grupo.id_grupo} className="rounded-xl border border-slate-200 dark:border-neutral-700 p-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setGruposExpandidos((atual) => ({
                                      ...atual,
                                      [grupo.id_grupo]: !expandido,
                                    }))
                                  }
                                  className="w-full flex items-center justify-between gap-2 px-1 py-1 text-left"
                                >
                                  <div className="inline-flex items-center gap-2 min-w-0">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: grupo.cor || '#2563EB' }} />
                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{grupo.nome_grupo}</span>
                                  </div>
                                  {expandido ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                                </button>
                                {expandido && <div className="mt-1 space-y-1">{categoriasRaiz.map((cat) => renderCategoriaNoMenu(cat, 0))}</div>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Conta bancaria</label>
                  <div className="relative">
                    <Banknote size={16} className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
                    <select
                      value={idConta}
                      onChange={(e) => setIdConta(e.target.value)}
                      className="w-full rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 pl-9 pr-3 py-2 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-500"
                    >
                      <option value="">Selecione</option>
                      {contas.map((conta) => (
                        <option key={conta.id_conta} value={conta.id_conta}>
                          {conta.nome_conta} ({conta.tipo_conta})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-900/60 p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Ja foi pago?</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {jaFoiPago
                      ? 'Ao salvar, gera despesa + parcela paga + extrato.'
                      : 'Ao salvar, gera despesa + parcela pendente sem extrato.'}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={jaFoiPago}
                  onClick={() => setJaFoiPago((estado) => !estado)}
                  className={`relative h-7 w-12 rounded-full transition-colors ${jaFoiPago ? 'bg-blue-600' : 'bg-slate-300 dark:bg-neutral-700'}`}
                >
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${jaFoiPago ? 'translate-x-5' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void salvarDespesa()}
                  disabled={salvando || loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {salvando && <Loader2 size={15} className="animate-spin" />}
                  {salvando ? 'Salvando...' : 'Salvar despesa'}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Resumo do lancamento</p>

              <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-900/70 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Valor</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {valor ? `R$ ${valor}` : '-'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-900/70 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Categoria</p>
                <p className="text-sm text-slate-800 dark:text-slate-200">{categoriaSelecionada ? nomeCategoriaCompleto : '-'}</p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-900/70 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Conta</p>
                <p className="text-sm text-slate-800 dark:text-slate-200">
                  {contas.find((conta) => conta.id_conta === idConta)?.nome_conta || '-'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-900/70 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Efeito</p>
                <p className="text-sm text-slate-800 dark:text-slate-200">
                  {jaFoiPago ? 'Sai do saldo da conta imediatamente.' : 'Fica pendente para pagamento futuro.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
