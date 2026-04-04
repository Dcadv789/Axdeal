'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileText, History, Layers3, Loader2, Paperclip, Receipt, UploadCloud, Wallet } from 'lucide-react';
import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import { supabase } from '@/lib/supabase';

type TipoBaixa = 'receber' | 'pagar';
export type AbaInterna = 'baixa' | 'parcelas' | 'historico' | 'comprovantes';

export interface BaixaDraft {
  ativa: boolean;
  parcela: ParcelaLite;
  dataPagamento: string;
  valorAmortizado: number;
  valorAPagar: number;
  valorRestante: number;
  valorBaixaExcedido: boolean;
  observacoes: string;
  contaId: string;
  formaPagamentoId: string;
  desconto: number;
  jurosMulta: number;
  taxa: number;
  acrescimo: number;
}

export interface ParcelaLite {
  id: string;
  id_empresa: string;
  numero_parcela: number | null;
  total_parcelas?: number | null;
  descricao_parcela: string | null;
  valor_original: number;
  valor_acrescimos: number | null;
  valor_quitado_total: number | null;
  saldo_devedor: number | null;
  criado_em?: string | null;
  data_vencimento: string;
  data_quitacao_total: string | null;
  status: string | null;
  lancamento: string | null;
  id_categoria: string | null;
  id_pedido_venda?: string | null;
  id_proposta?: string | null;
  id_os?: string | null;
  id_despesa: string | null;
  id_contrato: string | null;
  id_conta_bancaria: string | null;
  observacoes_pagamento?: string | null;
}

interface ExtratoLite {
  id: string;
  id_parcela: string | null;
  descricao: string | null;
  valor_total: number;
  data_pagamento: string;
  id_usuario?: string | null;
  id_forma_pagamento?: string | null;
}

interface HistoricoFinanceiroLite {
  id?: string | null;
  id_referencia?: string | null;
  data_evento: string | null;
  data_registro?: string | null;
  tipo_evento: string | null;
  status_anterior: string | null;
  status_novo: string | null;
  valor_movimentado: number | null;
  observacao: string | null;
}

interface FinanceiroBaixaLancamentoPanelProps {
  idEmpresa: string;
  tipo: TipoBaixa;
  parcela: ParcelaLite;
  parcelasRelacionadasIniciais?: ParcelaLite[];
  contaBancariaPadraoId?: string;
  lancamentoLabel: string;
  abaAtiva: AbaInterna;
  onUpdated?: () => Promise<void> | void;
  onDraftChange?: (draft: BaixaDraft) => void;
  onSelectParcela?: (parcelaId: string) => void;
  onConfirmBaixa?: () => void;
  baixaLoading?: boolean;
  onConfirmEstorno?: (extratoId?: string) => void;
  estornoLoading?: boolean;
}

const FIELD =
  'h-10 w-full rounded-xl border border-[#BFDBFE] bg-white px-3 text-sm text-slate-900 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-slate-100';

const STATUS_LABELS: Record<string, string> = {
  EM_ABERTO: 'Em Aberto',
  PAGO: 'Pago',
  PARCIALMENTE_PAGO: 'Parcialmente pago',
  VENCIDO: 'Vencido',
  CANCELADO: 'Cancelado',
};

function formatarMoeda(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function formatarData(v?: string | null): string {
  if (!v) return '-';
  const valorNormalizado = String(v).includes('T') ? String(v) : `${v}T00:00:00`;
  const d = new Date(valorNormalizado);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(d);
}

function valorLiquido(p: ParcelaLite): number {
  return Number((Number(p.valor_original || 0) + Number(p.valor_acrescimos || 0)).toFixed(2));
}

function valorPendente(p: ParcelaLite): number {
  const saldo = Number(p.saldo_devedor ?? NaN);
  if (Number.isFinite(saldo) && saldo > 0) return Number(saldo.toFixed(2));
  return valorLiquido(p);
}

function parcelasLabel(p: ParcelaLite): string {
  const n = p.numero_parcela || 1;
  const t = Number(p.total_parcelas || 0) > 0 ? Number(p.total_parcelas) : n;
  return `${n}/${t}`;
}

function chaveRel(p: ParcelaLite): string | null {
  if (p.id_pedido_venda) return `v:${p.id_pedido_venda}`;
  if (p.id_os) return `o:${p.id_os}`;
  if (p.id_despesa) return `d:${p.id_despesa}`;
  if (p.id_proposta) return `p:${p.id_proposta}`;
  if (p.id_contrato) return `c:${p.id_contrato}`;
  return null;
}

function formatarStatus(status?: string | null): string {
  if (!status) return '-';
  return STATUS_LABELS[status] || status;
}

function statusBadgeClass(status?: string | null): string {
  switch (status) {
    case 'PAGO':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300';
    case 'VENCIDO':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300';
    case 'PARCIALMENTE_PAGO':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300';
    default:
      return 'bg-slate-200 text-slate-700 dark:bg-neutral-700 dark:text-slate-200';
  }
}

export default function FinanceiroBaixaLancamentoPanel({
  idEmpresa,
  tipo,
  parcela,
  parcelasRelacionadasIniciais = [],
  contaBancariaPadraoId,
  lancamentoLabel,
  abaAtiva,
  onUpdated,
  onDraftChange,
  onSelectParcela,
  onConfirmBaixa,
  baixaLoading = false,
  onConfirmEstorno,
  estornoLoading = false,
}: FinanceiroBaixaLancamentoPanelProps) {
  const [parcelaAtiva, setParcelaAtiva] = useState<ParcelaLite>(parcela);
  const [comprovanteArquivo, setComprovanteArquivo] = useState<File | null>(null);
  const [comprovanteErro, setComprovanteErro] = useState<string | null>(null);
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [valorPagoDigits, setValorPagoDigits] = useState('');
  const [jurosMultaDigits, setJurosMultaDigits] = useState('');
  const [descontoDigits, setDescontoDigits] = useState('');
  const [taxaDigits, setTaxaDigits] = useState('');
  const [acrescimoDigits, setAcrescimoDigits] = useState('');
  const [observacoes, setObservacoes] = useState('Conta Liquidada');
  const [contaId, setContaId] = useState('');
  const [formaPagamentoId, setFormaPagamentoId] = useState('');
  const [parcelasRelacionadas, setParcelasRelacionadas] = useState<ParcelaLite[]>(parcelasRelacionadasIniciais);
  const [extratoParcela, setExtratoParcela] = useState<ExtratoLite[]>([]);
  const [historicoFinanceiro, setHistoricoFinanceiro] = useState<HistoricoFinanceiroLite[]>([]);
  const [opcoesContas, setOpcoesContas] = useState<Array<{ value: string; label: string }>>([]);
  const [opcoesFormas, setOpcoesFormas] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    setParcelaAtiva(parcela);
  }, [
    parcela.id,
    parcela.status,
    parcela.data_vencimento,
    parcela.valor_original,
    parcela.valor_acrescimos,
    parcela.valor_quitado_total,
    parcela.saldo_devedor,
    parcela.id_conta_bancaria,
    parcela.observacoes_pagamento,
  ]);

  useEffect(() => {
    setParcelasRelacionadas(parcelasRelacionadasIniciais);
  }, [parcelasRelacionadasIniciais]);

  useEffect(() => {
    setDataPagamento(new Date().toISOString().split('T')[0]);
    setValorPagoDigits(Math.round(Math.abs(valorPendente(parcelaAtiva)) * 100).toString());
    setObservacoes(parcelaAtiva.observacoes_pagamento?.trim() || 'Conta Liquidada');
    setContaId(contaBancariaPadraoId || parcelaAtiva.id_conta_bancaria || '');
    setFormaPagamentoId('');
  }, [parcelaAtiva.id, parcelaAtiva.status, parcelaAtiva.saldo_devedor, contaBancariaPadraoId]);

  const carregarDados = useCallback(async () => {
    const [extratoRes, historicoRes, contasRes, formasRes] = await Promise.all([
      supabase
        .from('erp_extrato')
        .select('id,id_parcela,descricao,valor_total,data_pagamento,id_usuario,id_forma_pagamento')
        .eq('id_parcela', parcelaAtiva.id)
        .order('data_pagamento', { ascending: false }),
      supabase
        .from('erp_financeiro_historico')
        .select('id,id_referencia,data_evento,data_registro,tipo_evento,status_anterior,status_novo,valor_movimentado,observacao')
        .eq('id_referencia', parcelaAtiva.id)
        .order('data_registro', { ascending: false }),
      supabase.from('erp_contas_bancarias').select('id_conta,nome_conta').eq('id_empresa', idEmpresa),
      supabase.from('erp_formas_pagamento').select('id,nome').or(`id_empresa.is.null,id_empresa.eq.${idEmpresa}`),
    ]);

    const extratoData = (extratoRes.data || []) as ExtratoLite[];
    setExtratoParcela(extratoData);
    setHistoricoFinanceiro((historicoRes.data || []) as HistoricoFinanceiroLite[]);

    const contasOptions = ((contasRes.data || []) as Array<{ id_conta: string; nome_conta: string }>).map((i) => ({
      value: i.id_conta,
      label: i.nome_conta,
    }));
    const formasOptions = ((formasRes.data || []) as Array<{ id: string; nome: string }>).map((i) => ({
      value: i.id,
      label: i.nome,
    }));

    setOpcoesContas(contasOptions);
    setOpcoesFormas(formasOptions);

    setContaId((current) => current || contaBancariaPadraoId || parcelaAtiva.id_conta_bancaria || contasOptions[0]?.value || '');

    const key = chaveRel(parcelaAtiva);
    if (!key) {
      setParcelasRelacionadas([]);
      return;
    }

    let q = supabase
      .from('erp_parcelas')
      .select(
        'id,id_empresa,numero_parcela,total_parcelas,descricao_parcela,valor_original,valor_acrescimos,valor_quitado_total,saldo_devedor,criado_em,data_vencimento,data_quitacao_total,status,lancamento,id_categoria,id_pedido_venda,id_proposta,id_os,id_despesa,id_contrato,id_conta_bancaria,observacoes_pagamento'
      )
      .eq('id_empresa', idEmpresa);

    if (key.startsWith('v:')) q = q.eq('id_pedido_venda', key.slice(2));
    if (key.startsWith('o:')) q = q.eq('id_os', key.slice(2));
    if (key.startsWith('p:')) q = q.eq('id_proposta', key.slice(2));
    if (key.startsWith('d:')) q = q.eq('id_despesa', key.slice(2));
    if (key.startsWith('c:')) q = q.eq('id_contrato', key.slice(2));

    const relRes = await q.order('numero_parcela', { ascending: true });
    setParcelasRelacionadas((relRes.data || []) as ParcelaLite[]);
  }, [
    idEmpresa,
    parcelaAtiva.id,
    parcelaAtiva.id_pedido_venda,
    parcelaAtiva.id_os,
    parcelaAtiva.id_proposta,
    parcelaAtiva.id_despesa,
    parcelaAtiva.id_contrato,
    parcelaAtiva.id_conta_bancaria,
  ]);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    const ultimo = extratoParcela[0];
    if (ultimo?.id_forma_pagamento) {
      setFormaPagamentoId(ultimo.id_forma_pagamento);
      return;
    }

    setFormaPagamentoId((current) => {
      if (current) return current;
      const pixOption = opcoesFormas.find((item) => item.label.trim().toUpperCase() === 'PIX');
      return pixOption?.value || opcoesFormas[0]?.value || '';
    });
  }, [parcelaAtiva.id, extratoParcela, opcoesFormas]);

  const totalTransacao = Math.abs(valorPendente(parcelaAtiva));
  const valorBaixaInformado = Number(valorPagoDigits || '0') / 100;
  const valorAPagar = Number(
    (
      valorBaixaInformado +
      Number(jurosMultaDigits || '0') / 100 +
      Number(taxaDigits || '0') / 100 +
      Number(acrescimoDigits || '0') / 100 -
      Number(descontoDigits || '0') / 100
    ).toFixed(2)
  );
  const valorRestante = Number(Math.max(totalTransacao - valorBaixaInformado, 0).toFixed(2));
  const valorBaixaExcedido = valorBaixaInformado > totalTransacao;
  const baixaBloqueada = parcelaAtiva.status === 'PAGO';

  useEffect(() => {
    if (!onDraftChange) return;

    onDraftChange({
      ativa: !baixaBloqueada,
      parcela: parcelaAtiva,
      dataPagamento,
      valorAmortizado: valorBaixaInformado,
      valorAPagar,
      valorRestante,
      valorBaixaExcedido,
      observacoes,
      contaId,
      formaPagamentoId,
      desconto: Number(descontoDigits || '0') / 100 || 0,
      jurosMulta: Number(jurosMultaDigits || '0') / 100 || 0,
      taxa: Number(taxaDigits || '0') / 100 || 0,
      acrescimo: Number(acrescimoDigits || '0') / 100 || 0,
    });
  }, [
    onDraftChange,
    baixaBloqueada,
    parcelaAtiva,
    dataPagamento,
    valorBaixaInformado,
    valorAPagar,
    valorRestante,
    valorBaixaExcedido,
    observacoes,
    contaId,
    formaPagamentoId,
    descontoDigits,
    jurosMultaDigits,
    taxaDigits,
    acrescimoDigits,
  ]);

  return (
    <div className="min-w-0">
      {abaAtiva === 'baixa' && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[440px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-black">
            <div className="mb-4 border-b border-slate-200 pb-3 dark:border-neutral-800">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 dark:bg-neutral-900 dark:text-slate-300">
                <Layers3 className="h-3.5 w-3.5" />
                Parcelas vinculadas
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Selecione a parcela que deseja baixar.</p>
            </div>

            {parcelasRelacionadas.length <= 1 ? (
              <div className="text-sm text-slate-600 dark:text-slate-300">Parcela única, sem pedido ou ordem de serviço vinculado.</div>
            ) : (
              <div className="space-y-2">
                {parcelasRelacionadas.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => (onSelectParcela ? onSelectParcela(item.id) : setParcelaAtiva(item))}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                      parcelaAtiva.id === item.id
                        ? 'border-blue-300 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-950/25'
                        : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/60 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-blue-500/35 dark:hover:bg-blue-950/20'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Parcela {parcelasLabel(item)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Vencimento: {formatarData(item.data_vencimento)} | {formatarMoeda(Math.abs(valorLiquido(item)))}
                      </div>
                    </div>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(item.status)}`}>
                      {formatarStatus(item.status)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-black">
            <div className="mb-4 border-b border-slate-200 pb-3 dark:border-neutral-800">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                <Wallet className="h-3.5 w-3.5" />
                Dados da baixa
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Preencha os dados do recebimento ou pagamento da parcela selecionada.</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Data do pagamento</label>
                  <input
                    type="date"
                    disabled={baixaBloqueada}
                    value={dataPagamento}
                    onChange={(e) => setDataPagamento(e.target.value)}
                    className={`${FIELD} ${baixaBloqueada ? 'cursor-not-allowed bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-slate-400' : ''}`}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Conta bancária</label>
                  <SingleSelectDropdown
                    options={opcoesContas}
                    value={contaId}
                    onChange={setContaId}
                    disabled={baixaBloqueada}
                    placeholder="Selecione uma conta"
                    buttonClassName={`h-10 w-full !min-w-0 !rounded-xl !border-blue-200 dark:!border-blue-500/35 !bg-white dark:!bg-neutral-900 ${
                      baixaBloqueada ? '!bg-slate-100 !text-slate-500 dark:!bg-neutral-800 dark:!text-slate-400 cursor-not-allowed' : ''
                    }`}
                    menuClassName="!w-full !rounded-2xl !border-slate-200 dark:!border-neutral-700 !bg-white dark:!bg-neutral-900"
                    menuContentClassName="max-h-80"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Forma de pagamento</label>
                  <SingleSelectDropdown
                    options={opcoesFormas}
                    value={formaPagamentoId}
                    onChange={setFormaPagamentoId}
                    disabled={baixaBloqueada}
                    placeholder="Selecione uma forma"
                    buttonClassName={`h-10 w-full !min-w-0 !rounded-xl !border-blue-200 dark:!border-blue-500/35 !bg-white dark:!bg-neutral-900 ${
                      baixaBloqueada ? '!bg-slate-100 !text-slate-500 dark:!bg-neutral-800 dark:!text-slate-400 cursor-not-allowed' : ''
                    }`}
                    menuClassName="!w-full !rounded-2xl !border-slate-200 dark:!border-neutral-700 !bg-white dark:!bg-neutral-900"
                    menuContentClassName="max-h-80"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                {[
                  { label: 'Valor de baixa', value: valorPagoDigits, set: setValorPagoDigits },
                  { label: 'Juros/Multa', value: jurosMultaDigits, set: setJurosMultaDigits },
                  { label: 'Desconto', value: descontoDigits, set: setDescontoDigits },
                  { label: 'Taxa', value: taxaDigits, set: setTaxaDigits },
                  { label: 'Acréscimo', value: acrescimoDigits, set: setAcrescimoDigits },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">{f.label}</label>
                    <div className="flex items-center rounded-xl border border-blue-200 bg-white px-3 py-2 dark:border-blue-500/35 dark:bg-neutral-900">
                      <span className="mr-1 text-sm font-semibold text-slate-500 dark:text-slate-300">R$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        disabled={baixaBloqueada}
                        value={((Number(f.value || '0') || 0) / 100).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        onChange={(e) => f.set(e.target.value.replace(/\D/g, ''))}
                        className={`w-full bg-transparent text-sm outline-none ${baixaBloqueada ? 'cursor-not-allowed text-slate-500 dark:text-slate-400' : ''}`}
                      />
                    </div>
                    {f.label === 'Valor de baixa' && valorBaixaExcedido ? (
                      <p className="mt-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                        O valor de baixa não pode ser maior que o saldo devedor da parcela.
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Observações do pagamento</label>
                <textarea
                  disabled={baixaBloqueada}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                  className={`w-full resize-none rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm dark:border-blue-500/35 dark:bg-neutral-900 ${
                    baixaBloqueada ? 'cursor-not-allowed bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-slate-400' : ''
                  }`}
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  {valorBaixaInformado < totalTransacao ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-700/40 dark:bg-amber-900/20">
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] font-medium leading-none text-amber-700 dark:text-amber-300">Valor restante</p>
                        <p className="text-xs font-semibold leading-none text-amber-800 dark:text-amber-200">{formatarMoeda(valorRestante)}</p>
                      </div>
                    </div>
                  ) : null}
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-700/40 dark:bg-emerald-900/20">
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] font-medium leading-none text-emerald-700 dark:text-emerald-300">Valor a pagar</p>
                      <p className="text-xs font-semibold leading-none text-emerald-800 dark:text-emerald-200">{formatarMoeda(valorAPagar)}</p>
                    </div>
                  </div>
                </div>

                {baixaBloqueada ? (
                  <button
                    type="button"
                    onClick={() => onConfirmEstorno?.()}
                    disabled={estornoLoading}
                    className="inline-flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50"
                  >
                    {estornoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    <span>Estornar</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onConfirmBaixa}
                    disabled={baixaLoading || !contaId || !formaPagamentoId || valorBaixaExcedido || valorAPagar <= 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {baixaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    MARCAR COMO PAGO
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {abaAtiva === 'parcelas' && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <Layers3 className="h-4 w-4 text-blue-600 dark:text-blue-300" />
            Parcelas
          </div>
          {parcelasRelacionadas.length <= 1 ? (
            <div className="text-sm text-slate-600 dark:text-slate-300">Parcela única, sem pedido ou ordem de serviço vinculado.</div>
          ) : (
            <div className="space-y-2">
              {parcelasRelacionadas.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => (onSelectParcela ? onSelectParcela(item.id) : setParcelaAtiva(item))}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                    parcelaAtiva.id === item.id
                      ? 'border-blue-300 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-950/25'
                      : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/60 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-blue-500/35 dark:hover:bg-blue-950/20'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Parcela {parcelasLabel(item)}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Vencimento: {formatarData(item.data_vencimento)} | {formatarMoeda(Math.abs(valorLiquido(item)))}
                    </div>
                  </div>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(item.status)}`}>
                    {formatarStatus(item.status)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {abaAtiva === 'comprovantes' && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
              <Receipt className="h-4 w-4 text-blue-600 dark:text-blue-300" />
              Envio de comprovante
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Faça o upload do seu comprovante aqui. Formatos aceitos: PDF, PNG e JPG. Limite máximo: 2 MB.
            </p>
          </div>
          <div className="rounded-xl border-2 border-dashed border-blue-200 bg-white p-5 text-center dark:border-blue-500/35 dark:bg-neutral-900">
            <UploadCloud size={22} className="mx-auto text-blue-600 dark:text-blue-300" />
            <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">Arraste e solte o arquivo aqui</p>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-500/35 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50">
              <Paperclip size={14} />
              Escolher arquivo
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (!file) return;
                  const tipos = ['application/pdf', 'image/png', 'image/jpeg'];
                  if (!tipos.includes(file.type)) {
                    setComprovanteErro('Formato inválido. Use PDF, PNG ou JPG.');
                    setComprovanteArquivo(null);
                    return;
                  }
                  if (file.size > 2 * 1024 * 1024) {
                    setComprovanteErro('Arquivo acima do limite de 2 MB.');
                    setComprovanteArquivo(null);
                    return;
                  }
                  setComprovanteErro(null);
                  setComprovanteArquivo(file);
                }}
              />
            </label>
          </div>
          {comprovanteArquivo ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-700/50 dark:bg-emerald-900/20 dark:text-emerald-300">
              Arquivo selecionado: <span className="font-semibold">{comprovanteArquivo.name}</span> ({(comprovanteArquivo.size / 1024).toFixed(1)} KB)
            </div>
          ) : null}
          {comprovanteErro ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-700/50 dark:bg-rose-900/20 dark:text-rose-300">
              {comprovanteErro}
            </div>
          ) : null}
        </div>
      )}

      {abaAtiva === 'historico' && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600 dark:border-neutral-700 dark:bg-neutral-800/40 dark:text-slate-300">
          <div className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <History className="h-4 w-4 text-blue-600 dark:text-blue-300" />
            Histórico de baixas
          </div>
          {historicoFinanceiro.length > 0 ? (
            <div className="space-y-2">
              {historicoFinanceiro.map((item, index) => (
                <div
                  key={item.id || `${item.data_registro || item.data_evento || 'hist'}-${index}`}
                  className="grid gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900 md:grid-cols-[160px_160px_minmax(0,1fr)_160px_minmax(0,1fr)]"
                >
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Data evento</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{formatarData(item.data_evento)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Tipo evento</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{item.tipo_evento || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Mudança de status</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {`${formatarStatus(item.status_anterior)} -> ${formatarStatus(item.status_novo)}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Valor movimentado</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{formatarMoeda(Math.abs(item.valor_movimentado || 0))}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Observação</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{item.observacao?.trim() || '-'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-400">
              Nenhum histórico financeiro foi encontrado para esta parcela.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
