import { CreditCard, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCalculoParcelas } from '../hooks/useCalculoParcelas';
import type { CondicaoPagamento, Parcela } from '../types';
import DatePickerPT from './DatePickerPT';
import { supabase } from '@/lib/supabase';

interface CondicoesComerciaisProps {
  cobrancaRecorrente: boolean;
  setCobrancaRecorrente: (valor: boolean) => void;
  condicoes: CondicaoPagamento[];
  condicaoSelecionada: CondicaoPagamento | null;
  selecionarCondicao: (id: string) => void;
  parcelas: Parcela[];
  setParcelas: (parcelas: Parcela[]) => void;
  quantidadeParcelas: string;
  setQuantidadeParcelas: (valor: string) => void;
  valorTotal: number;
  dataProposta: string;
  isViewMode: boolean;
  isVenda?: boolean;
  tipoDocumento?: 'proposta' | 'venda' | 'os';
  idEmpresa?: string | null;
  atualizarParcela: (id: string, campo: keyof Parcela, valor: string | number) => void;
  removerParcela: (id: string) => void;
  recalcularValores: (novoValorTotal: number) => void;
}

type RecorrenciaTipo = 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual';
type FormaPagamentoOption = { id: string; nome: string };

const RECORRENCIAS: Array<{ value: RecorrenciaTipo; label: string; meses: number }> = [
  { value: 'mensal', label: 'Mensal', meses: 1 },
  { value: 'bimestral', label: 'Bimestral', meses: 2 },
  { value: 'trimestral', label: 'Trimestral', meses: 3 },
  { value: 'semestral', label: 'Semestral', meses: 6 },
  { value: 'anual', label: 'Anual', meses: 12 },
];

export default function CondicoesComerciais({
  cobrancaRecorrente,
  setCobrancaRecorrente,
  condicoes,
  condicaoSelecionada,
  selecionarCondicao,
  parcelas,
  setParcelas,
  quantidadeParcelas,
  setQuantidadeParcelas,
  valorTotal,
  dataProposta,
  isViewMode,
  isVenda,
  tipoDocumento = 'proposta',
  idEmpresa = null,
  atualizarParcela: atualizarParcelaProp,
}: CondicoesComerciaisProps) {
  const [recorrencia, setRecorrencia] = useState<RecorrenciaTipo>('mensal');
  const [diaVencimentoPadrao, setDiaVencimentoPadrao] = useState<number>(10);
  const [cobrancaRecorrenteUi, setCobrancaRecorrenteUi] = useState(cobrancaRecorrente);
  const [edicaoParcelasIniciada, setEdicaoParcelasIniciada] = useState(false);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamentoOption[]>([]);
  const ultimaGeracaoCondicaoRef = useRef<string | null>(null);

  const { calcularParcelasDeCondicao } = useCalculoParcelas();
  const formasPagamentoPorId = useMemo(
    () => new Map(formasPagamento.map((forma) => [forma.id, forma.nome])),
    [formasPagamento]
  );

  useEffect(() => {
    const carregarFormasPagamento = async () => {
      if (!idEmpresa) {
        setFormasPagamento([]);
        return;
      }

      const { data, error } = await supabase
        .from('erp_formas_pagamento')
        .select('id, nome')
        .or(`id_empresa.is.null,id_empresa.eq.${idEmpresa}`);

      if (error) {
        console.error('Erro ao carregar formas de pagamento:', error);
        setFormasPagamento([]);
        return;
      }

      const normalizadas = ((data || []) as Array<{ id: string; nome: string | null }>)
        .map((item) => ({ id: item.id, nome: String(item.nome || '').trim() }))
        .filter((item) => item.id && item.nome);

      setFormasPagamento(normalizadas);
    };

    void carregarFormasPagamento();
  }, [idEmpresa]);

  useEffect(() => {
    setCobrancaRecorrenteUi(cobrancaRecorrente);
  }, [cobrancaRecorrente]);

  const criarIdParcelaGerada = (prefixo: string, index: number) => `${prefixo}-${index + 1}`;

  const aplicarParcelasGeradas = (novasParcelas: Parcela[]) => {
    setEdicaoParcelasIniciada(false);
    setParcelas(novasParcelas);
    setQuantidadeParcelas(novasParcelas.length.toString());
  };

  const montarChaveGeracaoCondicao = (condicao: CondicaoPagamento | null) => {
    if (!condicao) return null;
    return `${condicao.id}|${valorTotal}|${dataProposta}`;
  };

  const getDiasNoMes = (ano: number, mesBaseZero: number): number => new Date(ano, mesBaseZero + 1, 0).getDate();

  const montarDataComDiaPadrao = (ano: number, mesBaseZero: number, dia: number): Date => {
    const diaNormalizado = Math.min(Math.max(dia, 1), getDiasNoMes(ano, mesBaseZero));
    return new Date(ano, mesBaseZero, diaNormalizado, 0, 0, 0, 0);
  };

  const gerarParcelasPlaceholder = (condicao: CondicaoPagamento): Parcela[] => {
    const regras = Array.isArray(condicao.regras) ? condicao.regras : [];
    if (!regras.length || !dataProposta) return [];

    const dataBase = new Date(`${dataProposta}T00:00:00`);
    return regras.map((regra, index) => {
      const dataVencimento = new Date(dataBase);
      dataVencimento.setDate(dataVencimento.getDate() + (regra?.dias || 0));

      return {
        id: criarIdParcelaGerada(`condicao-${condicao.id || 'padrao'}`, index),
        numero: index + 1,
        valor: '0,00',
        vencimento: dataVencimento.toISOString().split('T')[0],
        formaPagamento: '',
        idFormaPagamento: null,
        observacoes: '',
      };
    });
  };

  const gerarParcelasRecorrentes = (): Parcela[] => {
    const qtd = Math.max(0, parseInt(quantidadeParcelas, 10) || 0);
    if (!dataProposta || qtd <= 0) return [];

    const dataBase = new Date(`${dataProposta}T00:00:00`);
    if (Number.isNaN(dataBase.getTime())) return [];

    const intervaloMeses = RECORRENCIAS.find((item) => item.value === recorrencia)?.meses ?? 1;
    let primeiroVencimento = montarDataComDiaPadrao(
      dataBase.getFullYear(),
      dataBase.getMonth(),
      diaVencimentoPadrao
    );

    if (primeiroVencimento < dataBase) {
      primeiroVencimento = montarDataComDiaPadrao(
        dataBase.getFullYear(),
        dataBase.getMonth() + intervaloMeses,
        diaVencimentoPadrao
      );
    }

    const total = valorTotal > 0 ? valorTotal : 0;
    const valorBasePorParcela = Math.floor((total / qtd) * 100) / 100;
    let somaCalculada = 0;

    return Array.from({ length: qtd }, (_, index) => {
      const dataVencimento = montarDataComDiaPadrao(
        primeiroVencimento.getFullYear(),
        primeiroVencimento.getMonth() + index * intervaloMeses,
        diaVencimentoPadrao
      );

      const isUltima = index === qtd - 1;
      const valorParcela = isUltima
        ? Math.max(0, Math.round((total - somaCalculada) * 100) / 100)
        : valorBasePorParcela;

      if (!isUltima) {
        somaCalculada += valorParcela;
      }

      return {
        id: criarIdParcelaGerada('recorrente', index),
        numero: index + 1,
        valor: valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        vencimento: dataVencimento.toISOString().split('T')[0],
        formaPagamento: '',
        idFormaPagamento: null,
        observacoes: '',
      };
    });
  };

  const gerarParcelasSemCondicao = (): Parcela[] => {
    const qtd = parseInt(quantidadeParcelas, 10) || 0;
    if (!dataProposta || qtd <= 0) return [];

    const valorParcela = valorTotal > 0 ? valorTotal / qtd : 0;
    const novasParcelas: Parcela[] = [];
    const dataBase = new Date(`${dataProposta}T00:00:00`);

    for (let i = 0; i < qtd; i += 1) {
      const dataVencimento = new Date(dataBase);
      dataVencimento.setMonth(dataVencimento.getMonth() + i);

      novasParcelas.push({
        id: criarIdParcelaGerada('livre', i),
        numero: i + 1,
        valor: valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        vencimento: dataVencimento.toISOString().split('T')[0],
        formaPagamento: '',
        idFormaPagamento: null,
        observacoes: '',
      });
    }

    return novasParcelas;
  };

  const aplicarCondicaoEAtualizarParcelas = (condicao: CondicaoPagamento | null) => {
    if (!condicao || !dataProposta) return;
    const regrasValidas = Array.isArray(condicao.regras) && condicao.regras.length > 0;
    if (!regrasValidas) return;
    ultimaGeracaoCondicaoRef.current = montarChaveGeracaoCondicao(condicao);

    try {
      const parcelasGeradas =
        valorTotal > 0
          ? calcularParcelasDeCondicao(condicao, valorTotal, dataProposta)
          : gerarParcelasPlaceholder(condicao);

      if (parcelasGeradas.length > 0) {
        aplicarParcelasGeradas(parcelasGeradas);
      } else {
        setEdicaoParcelasIniciada(false);
        setParcelas([]);
        setQuantidadeParcelas('0');
      }
    } catch (error) {
      console.error('Erro ao gerar parcelas pela condi\u00e7\u00e3o selecionada:', error);
    }
  };

  useEffect(() => {
    if (!dataProposta) return;
    if (diaVencimentoPadrao >= 1 && diaVencimentoPadrao <= 31) return;
    const diaBase = new Date(`${dataProposta}T00:00:00`).getDate();
    if (!Number.isNaN(diaBase)) {
      setDiaVencimentoPadrao(Math.min(31, Math.max(1, diaBase)));
    }
  }, [dataProposta, diaVencimentoPadrao]);

  useEffect(() => {
    if (!cobrancaRecorrenteUi) return;
    selecionarCondicao('');
    setEdicaoParcelasIniciada(false);
    ultimaGeracaoCondicaoRef.current = null;
  }, [cobrancaRecorrenteUi, selecionarCondicao]);

  useEffect(() => {
    if (!condicaoSelecionada) return;
    if (cobrancaRecorrenteUi) return;
    if (edicaoParcelasIniciada) return;
    const chaveGeracao = montarChaveGeracaoCondicao(condicaoSelecionada);
    if (chaveGeracao && ultimaGeracaoCondicaoRef.current === chaveGeracao) return;

    const parcelasJaHidratadasOuEditadas = parcelas.some(
      (parcela) =>
        parcela.id.startsWith('parcela-carregada-') ||
        String(parcela.formaPagamento || '').trim() !== '' ||
        Boolean(parcela.idFormaPagamento) ||
        String(parcela.observacoes || '').trim() !== ''
    );

    if (parcelasJaHidratadasOuEditadas) return;
    aplicarCondicaoEAtualizarParcelas(condicaoSelecionada);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condicaoSelecionada?.id, valorTotal, dataProposta, cobrancaRecorrenteUi, edicaoParcelasIniciada]);

  useEffect(() => {
    if (!cobrancaRecorrenteUi) return;
    if (edicaoParcelasIniciada) return;
    aplicarParcelasGeradas(gerarParcelasRecorrentes());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cobrancaRecorrenteUi, recorrencia, diaVencimentoPadrao, quantidadeParcelas, valorTotal, dataProposta, edicaoParcelasIniciada]);

  useEffect(() => {
    if (cobrancaRecorrenteUi) return;
    if (condicaoSelecionada) return;
    if (!dataProposta) return;
    if (edicaoParcelasIniciada) return;
    aplicarParcelasGeradas(gerarParcelasSemCondicao());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cobrancaRecorrenteUi, condicaoSelecionada?.id, quantidadeParcelas, valorTotal, dataProposta, edicaoParcelasIniciada]);

  const handleAtualizarParcelas = () => {
    if (!dataProposta) {
      setEdicaoParcelasIniciada(false);
      setParcelas([]);
      return;
    }

    if (cobrancaRecorrenteUi) {
      aplicarParcelasGeradas(gerarParcelasRecorrentes());
      return;
    }

    if (condicaoSelecionada && condicaoSelecionada.regras && condicaoSelecionada.regras.length > 0) {
      aplicarCondicaoEAtualizarParcelas(condicaoSelecionada);
      return;
    }

    aplicarParcelasGeradas(gerarParcelasSemCondicao());
  };

  const recalcularParcelasAposAlteracao = (parcelaId: string, novoValor: string) => {
    const valorNumerico = parseFloat(novoValor.replace(',', '.')) || 0;
    const parcelaIndex = parcelas.findIndex((p) => p.id === parcelaId);
    if (parcelaIndex === -1) return;

    if (parcelaIndex === parcelas.length - 1) {
      atualizarParcelaProp(parcelaId, 'valor', novoValor);
      return;
    }

    let valorTotalDefinido = 0;
    for (let i = 0; i <= parcelaIndex; i += 1) {
      if (i === parcelaIndex) {
        valorTotalDefinido += valorNumerico;
      } else {
        const valorParcela = parseFloat(parcelas[i].valor.replace(',', '.')) || 0;
        valorTotalDefinido += valorParcela;
      }
    }

    const valorRestante = valorTotal - valorTotalDefinido;
    if (valorRestante <= 0) {
      atualizarParcelaProp(parcelaId, 'valor', novoValor);
      return;
    }

    const parcelasSeguintes = parcelas.length - (parcelaIndex + 1);
    if (parcelasSeguintes === 0) {
      atualizarParcelaProp(parcelaId, 'valor', novoValor);
      return;
    }

    const valorBasePorParcela = Math.floor((valorRestante / parcelasSeguintes) * 100) / 100;
    let somaCalculada = 0;

    const parcelasAtualizadas = parcelas.map((p, index) => {
      if (index === parcelaIndex) {
        return { ...p, valor: novoValor };
      }
      if (index < parcelaIndex) {
        return p;
      }

      const isUltimaParcela = index === parcelas.length - 1;
      let valorParcela: number;
      if (isUltimaParcela) {
        valorParcela = Math.round((valorRestante - somaCalculada) * 100) / 100;
      } else {
        valorParcela = valorBasePorParcela;
        somaCalculada += valorParcela;
      }

      return {
        ...p,
        valor: valorParcela.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      };
    });

    setEdicaoParcelasIniciada(true);
    setParcelas(parcelasAtualizadas);
  };

  const atualizarParcela = (id: string, campo: keyof Parcela, valor: string | number) => {
    setEdicaoParcelasIniciada(true);
    ultimaGeracaoCondicaoRef.current = null;

    if (campo === 'valor' && typeof valor === 'string') {
      recalcularParcelasAposAlteracao(id, valor);
      return;
    }

    atualizarParcelaProp(id, campo, valor);
  };

  const handleToggleRecorrencia = () => {
    if (isViewMode) return;

    const proximoValor = !cobrancaRecorrenteUi;
    setCobrancaRecorrenteUi(proximoValor);
    setCobrancaRecorrente(proximoValor);

    if (typeof window !== 'undefined') {
      console.log('[NovaProposta] cobranca recorrente:', proximoValor);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-black">
      <div className="mb-6 flex flex-col gap-2">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-10 w-10 min-w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            <CreditCard size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{'Condi\u00e7\u00f5es Comerciais'}</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {tipoDocumento === 'os'
                ? 'Defina as condi\u00e7\u00f5es comerciais da ordem de servi\u00e7o'
                : isVenda
                  ? 'Defina as condi\u00e7\u00f5es comerciais da venda'
                  : 'Defina as condi\u00e7\u00f5es comerciais da proposta'}
            </p>
          </div>
        </div>
        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
          {'Estado atual da recorr\u00eancia:'} {cobrancaRecorrenteUi ? 'ATIVO' : 'INATIVO'}
        </p>
      </div>

      <div className="min-h-0 space-y-6">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{'Cobran\u00e7a Recorrente'}</label>
            <button
              type="button"
              onClick={handleToggleRecorrencia}
              disabled={isViewMode}
              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-2.5 transition-colors ${
                cobrancaRecorrenteUi
                  ? 'border-blue-300 bg-blue-50 dark:border-blue-500/50 dark:bg-blue-900/20'
                  : 'border-[#BFDBFE] bg-white dark:border-blue-500/35 dark:bg-neutral-900'
              } ${isViewMode ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            >
              <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-200">Contrato / Mensalidade</span>
              <span
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                  cobrancaRecorrenteUi ? 'bg-blue-600' : 'bg-slate-300 dark:bg-neutral-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    cobrancaRecorrenteUi ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </span>
            </button>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{'Condi\u00e7\u00f5es de Pagamento'}</label>
            <select
              value={cobrancaRecorrenteUi ? '' : condicaoSelecionada?.id || ''}
              onChange={(e) => {
                const { value } = e.target;

                if (!value) {
                  setEdicaoParcelasIniciada(false);
                  ultimaGeracaoCondicaoRef.current = null;
                  selecionarCondicao('');
                  setParcelas([]);
                  setQuantidadeParcelas('0');
                  return;
                }

                const condicao = condicoes.find((item) => item.id === value) || null;
                selecionarCondicao(value);
                aplicarCondicaoEAtualizarParcelas(condicao);
              }}
              disabled={isViewMode || cobrancaRecorrenteUi}
              className="w-full rounded-xl border border-[#BFDBFE] bg-white px-4 py-2.5 text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:bg-gray-50 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-gray-100 dark:disabled:bg-neutral-800"
            >
              <option value="">
                {cobrancaRecorrenteUi ? 'Desativado para contrato/mensalidade' : 'Nenhuma condi\u00e7\u00e3o'}
              </option>
              {condicoes.map((condicao) => (
                <option key={condicao.id} value={condicao.id}>
                  {condicao.nome || 'Sem nome'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Quantidade de Parcelas</label>
            <div className="flex gap-3">
              <input
                type="number"
                min="1"
                value={quantidadeParcelas}
                onChange={(e) => setQuantidadeParcelas(e.target.value)}
                disabled={isViewMode}
                className="flex-1 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 dark:border-[#262626] dark:bg-neutral-900 dark:text-gray-100 dark:disabled:bg-neutral-800"
              />
              <button
                type="button"
                onClick={handleAtualizarParcelas}
                disabled={isViewMode || !dataProposta}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw size={16} />
                Atualizar
              </button>
            </div>
          </div>
        </div>

        {cobrancaRecorrenteUi && (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">{'Configura\u00e7\u00e3o da recorr\u00eancia'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {'Defina a frequ\u00eancia e o dia padr\u00e3o de vencimento das parcelas.'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{'Qual a recorr\u00eancia?'}</label>
                <select
                  value={recorrencia}
                  onChange={(e) => setRecorrencia(e.target.value as RecorrenciaTipo)}
                  disabled={isViewMode}
                  className="w-full rounded-xl border border-[#BFDBFE] bg-white px-4 py-2.5 text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:bg-gray-50 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-gray-100 dark:disabled:bg-neutral-800"
                >
                  {RECORRENCIAS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{'Dia de vencimento padr\u00e3o'}</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={diaVencimentoPadrao}
                  onChange={(e) => {
                    const valor = Math.min(31, Math.max(1, parseInt(e.target.value || '1', 10)));
                    setDiaVencimentoPadrao(valor);
                  }}
                  disabled={isViewMode}
                  className="w-full rounded-xl border border-[#BFDBFE] bg-white px-4 py-2.5 text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:bg-gray-50 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-gray-100 dark:disabled:bg-neutral-800"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {'Exemplo: mensal + dia 10 gera parcela todo dia 10 de cada m\u00eas.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {parcelas.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Parcelas</h3>
            <div className="space-y-4">
              {parcelas.map((parcela) => (
                <div
                  key={parcela.id}
                  className="rounded-lg border border-[#E5E7EB] bg-gray-50 p-4 dark:border-[#262626] dark:bg-neutral-800"
                >
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="w-20 flex-shrink-0">
                      <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400">Parcela</label>
                      <input
                        type="text"
                        value={parcela.numero}
                        disabled
                        className="w-full rounded-lg border border-[#E5E7EB] bg-gray-50 px-3 py-2.5 text-center text-sm text-gray-900 cursor-not-allowed dark:border-[#262626] dark:bg-neutral-800 dark:text-gray-100"
                      />
                    </div>

                    <div className="w-40 flex-shrink-0">
                      <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400">Vencimento</label>
                      <DatePickerPT
                        value={parcela.vencimento}
                        onChange={(value) => atualizarParcela(parcela.id, 'vencimento', value)}
                        disabled={isViewMode}
                      />
                    </div>

                    <div className="w-36 flex-shrink-0">
                      <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400">Valor</label>
                      <input
                        type="text"
                        value={parcela.valor ? `R$ ${parcela.valor}` : 'R$ 0,00'}
                        onChange={(e) => {
                          const somenteNumeros = e.target.value.replace(/\D/g, '');
                          const valorNum = parseInt(somenteNumeros || '0', 10) / 100;
                          const formatado = valorNum.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          });
                          atualizarParcela(parcela.id, 'valor', formatado);
                        }}
                        onBlur={(e) => {
                          const somenteNumeros = e.target.value.replace(/\D/g, '');
                          const valorNum = parseInt(somenteNumeros || '0', 10) / 100;
                          const formatado = valorNum.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          });
                          if (formatado !== parcela.valor) {
                            atualizarParcela(parcela.id, 'valor', formatado);
                          }
                        }}
                        disabled={isViewMode}
                        placeholder="R$ 0,00"
                        className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 dark:border-[#262626] dark:bg-neutral-900 dark:text-gray-100 dark:disabled:bg-neutral-800"
                      />
                    </div>

                    <div className="w-48 flex-shrink-0">
                      <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400">Forma de Pagamento</label>
                      <select
                        value={parcela.idFormaPagamento || ''}
                        onChange={(e) => {
                          const idSelecionado = e.target.value || null;
                          const nomeSelecionado = idSelecionado ? formasPagamentoPorId.get(idSelecionado) || '' : '';
                          atualizarParcela(parcela.id, 'idFormaPagamento', idSelecionado);
                          atualizarParcela(parcela.id, 'formaPagamento', nomeSelecionado);
                        }}
                        disabled={isViewMode}
                        className="w-full rounded-xl border border-[#BFDBFE] bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:bg-gray-50 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-gray-100 dark:disabled:bg-neutral-800"
                      >
                        <option value="">Selecione</option>
                        {formasPagamento.map((forma) => (
                          <option key={forma.id} value={forma.id}>
                            {forma.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="min-w-[240px] flex-1">
                      <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400">{'Observa\u00e7\u00f5es'}</label>
                      <input
                        type="text"
                        value={parcela.observacoes}
                        onChange={(e) => atualizarParcela(parcela.id, 'observacoes', e.target.value)}
                        disabled={isViewMode}
                        placeholder={'Observa\u00e7\u00f5es adicionais...'}
                        className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 dark:border-[#262626] dark:bg-neutral-900 dark:text-gray-100 dark:disabled:bg-neutral-800"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
