'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BadgeDollarSign, Building2, CalendarDays, FileText, Layers3, Loader2, Plus, RefreshCw, Save, Search, Tag, User, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import FinanceiroBaixaLancamentoPanel, { type AbaInterna, type BaixaDraft, type ParcelaLite } from './FinanceiroBaixaLancamentoPanel';
import DatePickerPT from '@/components/erp/Negocios/propostas/NovaPropostaPage/components/DatePickerPT';

type OrigemMenu = 'receber' | 'pagar';
type LancamentoTab = 'basicas' | 'financeiro' | 'observacoes' | 'baixa' | 'historico' | 'comprovantes';

interface FinanceiroLancamentoDetalhePageProps {
  lancamentoId: string;
  origem: OrigemMenu;
}

interface ParcelaRow {
  id: string;
  lancamento: string | null;
  descricao_parcela: string | null;
  numero_parcela: number | null;
  total_parcelas: number | null;
  data_vencimento: string;
  data_quitacao_total: string | null;
  status: string | null;
  valor_original: number;
  valor_acrescimos: number | null;
  valor_quitado_total: number | null;
  saldo_devedor: number | null;
  observacoes_pagamento: string | null;
  id_contato: string | null;
  id_categoria: string | null;
  id_departamento: string | null;
  id_projeto: string | null;
  id_conta_bancaria: string | null;
  id_pedido_venda: string | null;
  id_proposta: string | null;
  id_os: string | null;
  id_despesa: string | null;
  id_contrato: string | null;
  criado_em?: string | null;
}

interface OptionItem {
  id: string;
  nome: string;
}

interface CategoriaSearchResult {
  id_categoria: string;
  nome_categoria: string;
}

interface ClienteSearchResult {
  id: string;
  nome_razao_social: string | null;
  nome_fantasia: string | null;
  cpf: string | null;
  cnpj: string | null;
}

interface FormState {
  idContato: string;
  lancamento: string;
  descricaoParcela: string;
  status: string;
  dataEmissao: string;
  dataVencimento: string;
  valorOriginal: string;
  valorAcrescimos: string;
  saldoDevedor: string;
  observacoes: string;
  idContaBancaria: string;
  idCategoria: string;
  idDepartamento: string;
  idProjeto: string;
}

interface ParcelaGeradaPreview {
  id: string;
  numero: number;
  vencimento: string;
  valor: string;
  formaPagamento: string;
  idFormaPagamento: string | null;
  observacoes: string;
}

interface FormaPagamentoOption {
  id: string;
  nome: string;
}

const STATUS_OPTIONS = [
  { value: 'EM_ABERTO', label: 'Em aberto' },
  { value: 'PAGO', label: 'Pago' },
  { value: 'PARCIALMENTE_PAGO', label: 'Parcialmente pago' },
  { value: 'VENCIDO', label: 'Vencido' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

const FIELD_CLASSNAME =
  'h-10 w-full rounded-xl border border-[#BFDBFE] bg-white px-3 text-sm text-slate-900 outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-slate-100';
const TEXTAREA_CLASSNAME =
  'w-full rounded-xl border border-[#BFDBFE] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-slate-100';
const DROPDOWN_BUTTON_CLASSNAME =
  'h-10 w-full !min-w-0 !rounded-xl !border-[#BFDBFE] dark:!border-blue-500/35 !bg-white dark:!bg-neutral-900 hover:!border-blue-400 dark:hover:!border-blue-400/50 focus:!ring-blue-500/40 !text-slate-900 dark:!text-slate-100';
const DROPDOWN_MENU_CLASSNAME = '!w-full !rounded-2xl !border-slate-200 dark:!border-neutral-700 !bg-white dark:!bg-neutral-900';

function statusBadgeClass(status?: string | null): string {
  switch (status) {
    case 'PAGO':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300';
    case 'VENCIDO':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300';
    case 'PARCIALMENTE_PAGO':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-slate-300';
  }
}

function parseMoneyInput(value: string): number {
  const normalized = String(value || '')
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function formatMoneyInput(value: string): string {
  const numeric = parseMoneyInput(value);
  return numeric.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatCodigoNumero4(value: unknown): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? digits.padStart(4, '0') : '';
}

function chaveRelacaoParcela(parcela: ParcelaRow | null): string | null {
  if (!parcela) return null;
  if (parcela.id_pedido_venda) return `v:${parcela.id_pedido_venda}`;
  if (parcela.id_os) return `o:${parcela.id_os}`;
  if (parcela.id_despesa) return `d:${parcela.id_despesa}`;
  if (parcela.id_proposta) return `p:${parcela.id_proposta}`;
  if (parcela.id_contrato) return `c:${parcela.id_contrato}`;
  return null;
}

async function buscarParcelasRelacionadas(idEmpresa: string, parcela: ParcelaRow): Promise<ParcelaLite[]> {
  const chave = chaveRelacaoParcela(parcela);
  if (!chave) return [];

  let q = supabase
    .from('erp_parcelas')
    .select('id,id_empresa,numero_parcela,total_parcelas,descricao_parcela,valor_original,valor_acrescimos,valor_quitado_total,saldo_devedor,criado_em,data_vencimento,data_quitacao_total,status,lancamento,id_categoria,id_pedido_venda,id_proposta,id_os,id_despesa,id_contrato,id_conta_bancaria,observacoes_pagamento')
    .eq('id_empresa', idEmpresa);

  if (chave.startsWith('v:')) q = q.eq('id_pedido_venda', chave.slice(2));
  if (chave.startsWith('o:')) q = q.eq('id_os', chave.slice(2));
  if (chave.startsWith('d:')) q = q.eq('id_despesa', chave.slice(2));
  if (chave.startsWith('p:')) q = q.eq('id_proposta', chave.slice(2));
  if (chave.startsWith('c:')) q = q.eq('id_contrato', chave.slice(2));

  const { data } = await q.order('numero_parcela', { ascending: true });
  return (data || []) as ParcelaLite[];
}

function getDiasNoMes(ano: number, mesBaseZero: number): number {
  return new Date(ano, mesBaseZero + 1, 0).getDate();
}

function montarDataComDiaPadrao(ano: number, mesBaseZero: number, dia: number): Date {
  const diaNormalizado = Math.min(Math.max(dia, 1), getDiasNoMes(ano, mesBaseZero));
  return new Date(ano, mesBaseZero, diaNormalizado, 0, 0, 0, 0);
}

function gerarParcelasRecorrentesPreview(valorTotal: number, quantidade: number, dataBase: string): ParcelaGeradaPreview[] {
  if (!dataBase || quantidade <= 0) return [];

  const dataInicial = new Date(`${dataBase}T00:00:00`);
  if (Number.isNaN(dataInicial.getTime())) return [];

  const diaBase = dataInicial.getDate();
  let primeiroVencimento = montarDataComDiaPadrao(dataInicial.getFullYear(), dataInicial.getMonth(), diaBase);

  if (primeiroVencimento < dataInicial) {
    primeiroVencimento = montarDataComDiaPadrao(dataInicial.getFullYear(), dataInicial.getMonth() + 1, diaBase);
  }

  const valorSeguro = Math.max(valorTotal, 0);
  const valorBasePorParcela = Math.floor((valorSeguro / quantidade) * 100) / 100;
  let somaCalculada = 0;

  return Array.from({ length: quantidade }, (_, index) => {
    const dataVencimento = montarDataComDiaPadrao(
      primeiroVencimento.getFullYear(),
      primeiroVencimento.getMonth() + index,
      diaBase
    );

    const isUltima = index === quantidade - 1;
    const valorParcela = isUltima
      ? Math.max(0, Math.round((valorSeguro - somaCalculada) * 100) / 100)
      : valorBasePorParcela;

    if (!isUltima) {
      somaCalculada += valorParcela;
    }

    return {
      id: `recorrente-preview-${index + 1}`,
      numero: index + 1,
      vencimento: dataVencimento.toISOString().split('T')[0],
      valor: valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      formaPagamento: '',
      idFormaPagamento: null,
      observacoes: '',
    };
  });
}

function obterCompetencia(data?: string | null): string | null {
  if (!data) return null;
  const base = String(data).slice(0, 7);
  return /^\d{4}-\d{2}$/.test(base) ? `${base}-01` : null;
}

export default function FinanceiroLancamentoDetalhePage({ lancamentoId, origem }: FinanceiroLancamentoDetalhePageProps) {
  const router = useRouter();
  const { idEmpresa, user } = useAuth();
  const isNovoLancamento = lancamentoId === 'novo';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [baixaSaving, setBaixaSaving] = useState(false);
  const [estornoSaving, setEstornoSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<LancamentoTab>('basicas');
  const [currentLancamentoId, setCurrentLancamentoId] = useState(lancamentoId);
  const [parcela, setParcela] = useState<ParcelaRow | null>(null);
  const [parcelasRelacionadasBaixa, setParcelasRelacionadasBaixa] = useState<ParcelaLite[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [origemDocumento, setOrigemDocumento] = useState<string>('-');
  const [vendedorNome, setVendedorNome] = useState<string>('-');
  const [contas, setContas] = useState<OptionItem[]>([]);
  const [departamentos, setDepartamentos] = useState<OptionItem[]>([]);
  const [projetos, setProjetos] = useState<OptionItem[]>([]);
  const [clienteBusca, setClienteBusca] = useState('');
  const [clienteResultados, setClienteResultados] = useState<ClienteSearchResult[]>([]);
  const [clienteBuscando, setClienteBuscando] = useState(false);
  const [clienteDropdownAberto, setClienteDropdownAberto] = useState(false);
  const [categoriaBusca, setCategoriaBusca] = useState('');
  const [categoriaResultados, setCategoriaResultados] = useState<CategoriaSearchResult[]>([]);
  const [categoriaBuscando, setCategoriaBuscando] = useState(false);
  const [categoriaDropdownAberto, setCategoriaDropdownAberto] = useState(false);
  const [despesaRecorrente, setDespesaRecorrente] = useState(false);
  const [quantidadeParcelasRecorrencia, setQuantidadeParcelasRecorrencia] = useState('2');
  const [parcelasRecorrentes, setParcelasRecorrentes] = useState<ParcelaGeradaPreview[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamentoOption[]>([]);
  const [possuiParcelasVinculadas, setPossuiParcelasVinculadas] = useState(false);
  const [baixaDraft, setBaixaDraft] = useState<BaixaDraft | null>(null);

  const [form, setForm] = useState<FormState>({
    idContato: '',
    lancamento: '',
    descricaoParcela: '',
    status: 'EM_ABERTO',
    dataEmissao: '',
    dataVencimento: '',
    valorOriginal: '0.00',
    valorAcrescimos: '0.00',
    saldoDevedor: '0.00',
    observacoes: '',
    idContaBancaria: '',
    idCategoria: '',
    idDepartamento: '',
    idProjeto: '',
  });

  const voltarHref = origem === 'pagar' ? '/erp/financeiro/pagar' : '/erp/financeiro/receber';
  const tituloCabecalho = origem === 'pagar' ? 'Dados do Pagamento' : 'Dados do Recebimento';
  const labelNomeLancamento = origem === 'pagar' ? 'Nome da despesa' : 'Nome da receita';
  const formasPagamentoPorId = useMemo(
    () => new Map(formasPagamento.map((forma) => [forma.id, forma.nome])),
    [formasPagamento]
  );

  const parcelaLabel = useMemo(() => {
    if (!parcela) return '-';
    const numero = parcela.numero_parcela || 1;
    const total = parcela.total_parcelas && parcela.total_parcelas > 0 ? parcela.total_parcelas : numero;
    return `${numero}/${total}`;
  }, [parcela]);

  const recebimentoOrigemNaoAvulsa = useMemo(() => {
    if (!parcela || origem !== 'receber') return false;
    return Boolean(parcela.id_pedido_venda || parcela.id_proposta || parcela.id_os || parcela.id_contrato);
  }, [origem, parcela]);
  const parcelaPaga = parcela?.status === 'PAGO';

  const parcelaBaixaAtual = useMemo<ParcelaLite | null>(() => {
    if (!parcela || !idEmpresa) return null;
    return {
      id: parcela.id,
      id_empresa: idEmpresa,
      numero_parcela: parcela.numero_parcela,
      total_parcelas: parcela.total_parcelas,
      descricao_parcela: parcela.descricao_parcela,
      valor_original: parcela.valor_original,
      valor_acrescimos: parcela.valor_acrescimos,
      valor_quitado_total: parcela.valor_quitado_total,
      saldo_devedor: parcela.saldo_devedor,
      criado_em: parcela.criado_em || null,
      data_vencimento: parcela.data_vencimento,
      data_quitacao_total: parcela.data_quitacao_total,
      status: parcela.status,
      lancamento: parcela.lancamento,
      id_categoria: parcela.id_categoria,
      id_pedido_venda: parcela.id_pedido_venda || null,
      id_proposta: parcela.id_proposta || null,
      id_os: parcela.id_os || null,
      id_despesa: parcela.id_despesa,
      id_contrato: parcela.id_contrato,
      id_conta_bancaria: parcela.id_conta_bancaria,
      observacoes_pagamento: parcela.observacoes_pagamento || null,
    };
  }, [idEmpresa, parcela]);

  useEffect(() => {
    setCurrentLancamentoId(lancamentoId);
  }, [lancamentoId]);

  const carregarDados = useCallback(async () => {
    if (!idEmpresa || !currentLancamentoId) return;

    if (isNovoLancamento) {
      setLoading(true);
      const [contasRes, departamentosRes, projetosRes] = await Promise.all([
        supabase.from('erp_contas_bancarias').select('id_conta, nome_conta').eq('id_empresa', idEmpresa),
        supabase.from('erp_departamentos').select('id, nome').eq('id_empresa', idEmpresa),
        supabase.from('erp_projetos').select('id, nome').eq('id_empresa', idEmpresa),
      ]);

      setContas(((contasRes.data || []) as Array<{ id_conta: string; nome_conta: string }>).map((i) => ({ id: i.id_conta, nome: i.nome_conta })));
      setDepartamentos(((departamentosRes.data || []) as Array<{ id: string; nome: string }>).map((i) => ({ id: i.id, nome: i.nome })));
      setProjetos(((projetosRes.data || []) as Array<{ id: string; nome: string }>).map((i) => ({ id: i.id, nome: i.nome })));
      setParcela(null);
      setErro(null);
      setOrigemDocumento('Lançamento avulso');
      setVendedorNome('-');
      setClienteBusca('');
      setCategoriaBusca('');
      setDespesaRecorrente(false);
      setQuantidadeParcelasRecorrencia('2');
      setParcelasRecorrentes([]);
      setPossuiParcelasVinculadas(false);
      setParcelasRelacionadasBaixa([]);
      setForm({
        idContato: '',
        lancamento: '',
        descricaoParcela: '',
        status: 'EM_ABERTO',
        dataEmissao: new Date().toISOString().slice(0, 10),
        dataVencimento: '',
        valorOriginal: '0.00',
        valorAcrescimos: '0.00',
        saldoDevedor: '0.00',
        observacoes: '',
        idContaBancaria: '',
        idCategoria: '',
        idDepartamento: '',
        idProjeto: '',
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setErro(null);

      const { data, error } = await supabase
      .from('erp_parcelas')
      .select(
        'id, lancamento, descricao_parcela, numero_parcela, total_parcelas, data_vencimento, data_quitacao_total, status, valor_original, valor_acrescimos, valor_quitado_total, saldo_devedor, observacoes_pagamento, id_contato, id_categoria, id_departamento, id_projeto, id_conta_bancaria, id_pedido_venda, id_proposta, id_os, id_despesa, id_contrato, criado_em'
      )
      .eq('id', currentLancamentoId)
      .eq('id_empresa', idEmpresa)
      .maybeSingle();

    if (error || !data) {
      setErro(error?.message || 'Lançamento não encontrado.');
      setParcelasRelacionadasBaixa([]);
      setLoading(false);
      return;
    }

    const parcelaData = data as ParcelaRow;
    setParcela(parcelaData);
    const relacionadas = await buscarParcelasRelacionadas(idEmpresa, parcelaData);
    setParcelasRelacionadasBaixa(relacionadas);
    setForm({
      idContato: parcelaData.id_contato || '',
      lancamento: parcelaData.lancamento || '',
      descricaoParcela: parcelaData.descricao_parcela || '',
      status: parcelaData.status || 'EM_ABERTO',
      dataEmissao: String(parcelaData.criado_em || '').slice(0, 10),
      dataVencimento: parcelaData.data_vencimento || '',
      valorOriginal: String(parcelaData.valor_original ?? 0),
      valorAcrescimos: String(parcelaData.valor_acrescimos ?? 0),
      saldoDevedor: String(parcelaData.saldo_devedor ?? 0),
      observacoes: parcelaData.observacoes_pagamento || '',
      idContaBancaria: parcelaData.id_conta_bancaria || '',
      idCategoria: parcelaData.id_categoria || '',
      idDepartamento: parcelaData.id_departamento || '',
      idProjeto: parcelaData.id_projeto || '',
    });
    const quantidadeAtual = Math.max(1, Number(parcelaData.total_parcelas || 1));
    setDespesaRecorrente(quantidadeAtual > 1);
    setQuantidadeParcelasRecorrencia(String(quantidadeAtual > 1 ? quantidadeAtual : 2));
    setParcelasRecorrentes([]);

    const [contatoRes, contasRes, categoriaAtualRes, departamentosRes, projetosRes, pedidoRes, propostaRes, osRes, despesaRes, contratoRes] = await Promise.all([
      parcelaData.id_contato
        ? supabase.from('erp_contatos').select('id, nome_razao_social, nome_fantasia, cpf, cnpj').eq('id', parcelaData.id_contato).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase.from('erp_contas_bancarias').select('id_conta, nome_conta').eq('id_empresa', idEmpresa),
      parcelaData.id_categoria
        ? supabase.from('erp_categorias').select('id_categoria, nome_categoria').eq('id_categoria', parcelaData.id_categoria).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase.from('erp_departamentos').select('id, nome').eq('id_empresa', idEmpresa),
      supabase.from('erp_projetos').select('id, nome').eq('id_empresa', idEmpresa),
      parcelaData.id_pedido_venda
        ? supabase.from('erp_pedidos_venda').select('codigo_numero, titulo, id_vendedor').eq('id', parcelaData.id_pedido_venda).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      parcelaData.id_proposta
        ? supabase.from('erp_propostas').select('codigo_completo, id_vendedor').eq('id', parcelaData.id_proposta).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      parcelaData.id_os
        ? supabase.from('erp_os').select('codigo_os, id_vendedor').eq('id', parcelaData.id_os).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      parcelaData.id_despesa
        ? supabase.from('erp_despesas').select('descricao').eq('id', parcelaData.id_despesa).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      parcelaData.id_contrato
        ? supabase.from('erp_contratos').select('status').eq('id', parcelaData.id_contrato).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    setContas(((contasRes.data || []) as Array<{ id_conta: string; nome_conta: string }>).map((i) => ({ id: i.id_conta, nome: i.nome_conta })));
    setDepartamentos(((departamentosRes.data || []) as Array<{ id: string; nome: string }>).map((i) => ({ id: i.id, nome: i.nome })));
    setProjetos(((projetosRes.data || []) as Array<{ id: string; nome: string }>).map((i) => ({ id: i.id, nome: i.nome })));
    const contatoAtual = contatoRes.data as ClienteSearchResult | null;
    setClienteBusca(contatoAtual?.nome_razao_social || contatoAtual?.nome_fantasia || '');
    const categoriaAtual = categoriaAtualRes.data as CategoriaSearchResult | null;
    setCategoriaBusca(categoriaAtual?.nome_categoria || '');

    const idVendedor =
      ((pedidoRes.data as { id_vendedor?: string | null } | null)?.id_vendedor ?? null) ||
      ((propostaRes.data as { id_vendedor?: string | null } | null)?.id_vendedor ?? null) ||
      ((osRes.data as { id_vendedor?: string | null } | null)?.id_vendedor ?? null);
    if (idVendedor) {
      const vendedorRes = await supabase.from('erp_vendedores').select('nome_completo').eq('id', idVendedor).maybeSingle();
      setVendedorNome(((vendedorRes.data as { nome_completo?: string } | null)?.nome_completo || '-').trim() || '-');
    } else {
      setVendedorNome('-');
    }

    if (pedidoRes.data) {
      const pedido = pedidoRes.data as { codigo_numero?: string | number | null; titulo?: string | null };
      const codigo = formatCodigoNumero4(pedido.codigo_numero);
      setOrigemDocumento(codigo ? `Pedido de Venda > ${codigo}` : pedido.titulo?.trim() || 'Pedido de Venda');
    } else if (osRes.data) {
      const os = osRes.data as { codigo_os?: string | null };
      setOrigemDocumento(os.codigo_os ? `Ordem de Serviço > ${os.codigo_os}` : 'Ordem de Serviço');
    } else if (propostaRes.data) {
      const proposta = propostaRes.data as { codigo_completo?: string | null };
      setOrigemDocumento(proposta.codigo_completo || 'Proposta');
    } else if (despesaRes.data) {
      const despesa = despesaRes.data as { descricao?: string | null };
      setOrigemDocumento(despesa.descricao?.trim() || 'Despesa');
    } else if (contratoRes.data) {
      const contrato = contratoRes.data as { status?: string | null };
      setOrigemDocumento(`Contrato ${contrato.status || ''}`.trim());
    } else {
      setOrigemDocumento('Lançamento avulso');
    }

    setLoading(false);
  }, [currentLancamentoId, idEmpresa, isNovoLancamento]);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

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
    const verificarParcelasVinculadas = async () => {
      if (!idEmpresa || !parcela) {
        setPossuiParcelasVinculadas(false);
        return;
      }

      const chave = chaveRelacaoParcela(parcela);
      if (!chave) {
        setPossuiParcelasVinculadas(false);
        return;
      }

      let q = supabase.from('erp_parcelas').select('id', { count: 'exact', head: true }).eq('id_empresa', idEmpresa);
      if (chave.startsWith('v:')) q = q.eq('id_pedido_venda', chave.slice(2));
      if (chave.startsWith('o:')) q = q.eq('id_os', chave.slice(2));
      if (chave.startsWith('p:')) q = q.eq('id_proposta', chave.slice(2));
      if (chave.startsWith('d:')) q = q.eq('id_despesa', chave.slice(2));
      if (chave.startsWith('c:')) q = q.eq('id_contrato', chave.slice(2));

      const { count } = await q;
      setPossuiParcelasVinculadas(Number(count || 0) > 1);
    };

    void verificarParcelasVinculadas();
  }, [idEmpresa, parcela]);

  useEffect(() => {
    if (activeTab === 'financeiro') {
      setDespesaRecorrente(false);
    }
  }, [activeTab]);

  const handleSelecionarParcela = (parcelaId: string) => {
    if (!parcelaId || parcelaId === currentLancamentoId) return;
    setCurrentLancamentoId(parcelaId);
  };

  const handleTrocarTab = (tab: LancamentoTab) => {
    setActiveTab(tab);
  };

  useEffect(() => {
    if (!idEmpresa) return;

    const termo = clienteBusca.trim();
    const termoNormalizado = termo.replace(/\D/g, '');
    if (!termo || termo.length < 2) {
      setClienteResultados([]);
      setClienteBuscando(false);
      return;
    }

    const handle = window.setTimeout(async () => {
      setClienteBuscando(true);
      const filtros = [
        `nome_razao_social.ilike.%${termo}%`,
        `nome_fantasia.ilike.%${termo}%`,
      ];
      if (termoNormalizado) {
        filtros.push(`cpf.ilike.%${termoNormalizado}%`);
        filtros.push(`cnpj.ilike.%${termoNormalizado}%`);
      }

      const { data, error } = await supabase
        .from('erp_contatos')
        .select('id, nome_razao_social, nome_fantasia, cpf, cnpj')
        .eq('id_empresa', idEmpresa)
        .or(filtros.join(','))
        .limit(8);

      if (!error) {
        setClienteResultados((data || []) as ClienteSearchResult[]);
      }
      setClienteBuscando(false);
    }, 250);

    return () => window.clearTimeout(handle);
  }, [clienteBusca, idEmpresa]);

  useEffect(() => {
    const termo = categoriaBusca.trim();
    if (!termo || termo.length < 2) {
      setCategoriaResultados([]);
      setCategoriaBuscando(false);
      return;
    }

    const handle = window.setTimeout(async () => {
      setCategoriaBuscando(true);
      const { data, error } = await supabase
        .from('erp_categorias')
        .select('id_categoria, nome_categoria')
        .ilike('nome_categoria', `%${termo}%`)
        .limit(8);

      if (!error) {
        setCategoriaResultados((data || []) as CategoriaSearchResult[]);
      }
      setCategoriaBuscando(false);
    }, 250);

    return () => window.clearTimeout(handle);
  }, [categoriaBusca]);

  const atualizarCampo = <K extends keyof FormState>(campo: K, valor: FormState[K]) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const selecionarCliente = (cliente: ClienteSearchResult) => {
    atualizarCampo('idContato', cliente.id);
    setClienteBusca(cliente.nome_razao_social || cliente.nome_fantasia || '');
    setClienteResultados([]);
    setClienteDropdownAberto(false);
  };

  const selecionarCategoria = (categoria: CategoriaSearchResult) => {
    atualizarCampo('idCategoria', categoria.id_categoria);
    setCategoriaBusca(categoria.nome_categoria);
    setCategoriaResultados([]);
    setCategoriaDropdownAberto(false);
  };

  const handleGerarParcelasRecorrentes = () => {
    const quantidade = Math.max(0, parseInt(quantidadeParcelasRecorrencia, 10) || 0);
    const valorBase = parseMoneyInput(form.valorOriginal);
    const dataBase = form.dataVencimento || form.dataEmissao;

    if (!dataBase || quantidade <= 0) {
      setParcelasRecorrentes([]);
      return;
    }

    setParcelasRecorrentes(gerarParcelasRecorrentesPreview(valorBase, quantidade, dataBase));
  };

  const executarBaixaAoSalvar = async (draft: BaixaDraft) => {
    const usuarioId = user?.id;
    if (!usuarioId) {
      throw new Error('Não foi possível identificar o usuário logado para efetivar a baixa.');
    }
    const dataRef = draft.dataPagamento
      ? new Date(`${draft.dataPagamento}T00:00:00`).toISOString()
      : new Date().toISOString();
    const tipoMov = origem === 'receber' ? 'entrada' : 'saida';
    const novoStatus = 'PAGO';

    const { error } = await supabase.rpc('erp_rpc_baixar_parcela_universal', {
      p_id_parcela: draft.parcela.id,
      p_id_usuario: usuarioId,
      p_id_conta_bancaria: draft.contaId || null,
      p_valor_nominal: Number.isFinite(draft.valorAmortizado) ? draft.valorAmortizado : 0,
      p_valor_juros: Number.isFinite(draft.jurosMulta) ? draft.jurosMulta : 0,
      p_valor_taxa: Number.isFinite(draft.taxa) ? draft.taxa : 0,
      p_valor_acrescimo: Number.isFinite(draft.acrescimo) ? draft.acrescimo : 0,
      p_valor_desconto: Number.isFinite(draft.desconto) ? draft.desconto : 0,
      p_data_pagamento: dataRef,
      p_id_forma_pagamento: draft.formaPagamentoId || null,
      p_observacoes: draft.observacoes.trim() || null,
      p_id_extrato_vinculado: null,
    });

    if (error) {
      throw error;
    }

    return;

    const ins = await supabase.from('erp_extrato').insert({
      id_empresa: idEmpresa,
      id_parcela: draft.parcela.id,
      id_conta_bancaria: draft.contaId || null,
      id_categoria: draft.parcela.id_categoria || null,
      descricao: `${origem === 'receber' ? 'Recebimento' : 'Pagamento'} - ${form.lancamento || 'Lançamento financeiro'}`,
      valor_total: tipoMov === 'entrada' ? draft.valorAPagar : -draft.valorAPagar,
      valor_desconto: draft.desconto || 0,
      id_forma_pagamento: draft.formaPagamentoId || null,
      data_pagamento: dataRef,
      tipo_movimentacao: tipoMov,
      status: novoStatus,
      conciliado: false,
    });

    if (ins.error) {
      throw ins.error;
    }
  };

  const confirmarBaixa = async () => {
    if (!baixaDraft || !baixaDraft.ativa) return;
    if (!baixaDraft.contaId || !baixaDraft.formaPagamentoId || baixaDraft.valorBaixaExcedido || baixaDraft.valorAPagar <= 0) {
      toast.error('Preencha conta bancária, forma de pagamento e um valor de baixa válido.');
      return;
    }

    setBaixaSaving(true);
    try {
      await executarBaixaAoSalvar(baixaDraft);
      await carregarDados();
      toast.success('Baixa efetivada com sucesso.');
    } catch (baixaError) {
      const mensagem =
        baixaError && typeof baixaError === 'object' && 'message' in baixaError
          ? String((baixaError as { message: string }).message)
          : 'Não foi possível efetivar a baixa.';
      toast.warning(mensagem);
    } finally {
      setBaixaSaving(false);
    }
  };

  const confirmarEstorno = async (_extratoId?: string) => {
    if (!parcela?.id) return;
    const usuarioId = user?.id;
    if (!usuarioId) {
      toast.error('Não foi possível identificar o usuário logado para efetivar o estorno.');
      return;
    }

    setEstornoSaving(true);
    try {
      const { error } = await supabase.rpc('erp_rpc_estornar_parcela_universal', {
        p_id_parcela: parcela.id,
        p_id_usuario: usuarioId,
        p_motivo_estorno: 'Estorno manual',
      });

      if (error) throw error;

      await carregarDados();
      toast.success('Parcela estornada com sucesso.');
    } catch (estornoError) {
      const mensagem =
        estornoError && typeof estornoError === 'object' && 'message' in estornoError
          ? String((estornoError as { message: string }).message)
          : 'Não foi possível estornar a parcela.';
      toast.warning(mensagem);
    } finally {
      setEstornoSaving(false);
    }
  };

  const atualizarParcelaRecorrente = (
    parcelaId: string,
    campo: keyof ParcelaGeradaPreview,
    valor: string | number | null
  ) => {
    setParcelasRecorrentes((prev) =>
      prev.map((item) =>
        item.id === parcelaId
          ? {
              ...item,
              [campo]: valor,
            }
          : item
      )
    );
  };

  const salvar = async () => {
    if (!idEmpresa || (!parcela && !isNovoLancamento)) return;
    const statusNormalizado = form.status === 'Pendente' ? 'EM_ABERTO' : form.status;
    const deveExecutarBaixa = false;
    if (deveExecutarBaixa && baixaDraft?.valorBaixaExcedido) {
      toast.error('O valor de baixa não pode ser maior que o valor total da transação.');
      return;
    }
    if (deveExecutarBaixa && (!baixaDraft?.contaId || !baixaDraft.valorAPagar || baixaDraft.valorAPagar <= 0)) {
      toast.error('Preencha a conta bancária e um valor de baixa válido antes de salvar.');
      return;
    }
    setSaving(true);

    const parcelasPayload = despesaRecorrente
      ? parcelasRecorrentes.map((item) => ({
          numero_parcela: item.numero,
          data_vencimento: item.vencimento || null,
          valor: parseMoneyInput(item.valor),
          id_forma_pagamento: item.idFormaPagamento || null,
          forma_pagamento: item.formaPagamento || null,
          observacoes: item.observacoes?.trim() || null,
        }))
      : [];

    if (!isNovoLancamento && parcela) {
      const updatePayload: Record<string, unknown> = {
        id_contato: form.idContato || null,
        lancamento: form.lancamento.trim() || null,
        descricao_parcela: form.descricaoParcela.trim() || null,
        status: statusNormalizado,
        competencia: obterCompetencia(form.dataVencimento),
        data_vencimento: form.dataVencimento || null,
        valor_original: parseMoneyInput(form.valorOriginal),
        valor_acrescimos: parseMoneyInput(form.valorAcrescimos),
        saldo_devedor: parseMoneyInput(form.saldoDevedor),
        observacoes_pagamento: form.observacoes.trim() || null,
        id_conta_bancaria: form.idContaBancaria || null,
        id_categoria: form.idCategoria || null,
        id_departamento: form.idDepartamento || null,
        id_projeto: form.idProjeto || null,
      };
      const { error: updateError } = await supabase
        .from('erp_parcelas')
        .update(updatePayload)
        .eq('id', parcela.id)
        .eq('id_empresa', idEmpresa);

      if (updateError) {
        toast.error(updateError.message || 'Não foi possível atualizar o lançamento.');
        setSaving(false);
        return;
      }

      toast.success('Lançamento salvo com sucesso.');
      setSaving(false);
      router.push(voltarHref);
      return;
    }

    const formValues: Record<string, unknown> = {
      id_empresa: idEmpresa,
      id_lancamento: parcela?.id || null,
      tipo_lancamento: origem === 'pagar' ? 'DESPESA' : 'RECEITA',
      status: statusNormalizado,
      id_categoria: form.idCategoria || null,
      id_conta_bancaria: form.idContaBancaria || null,
      id_contato: form.idContato || null,
      lancamento: form.lancamento.trim() || null,
      descricao_parcela: form.descricaoParcela.trim() || null,
      data_emissao: form.dataEmissao || null,
      data_vencimento: form.dataVencimento || null,
      valor_original: parseMoneyInput(form.valorOriginal),
      valor_acrescimos: parseMoneyInput(form.valorAcrescimos),
      saldo_devedor: parseMoneyInput(form.saldoDevedor),
      observacoes: form.observacoes.trim() || null,
      id_departamento: form.idDepartamento || null,
      id_projeto: form.idProjeto || null,
      lancamento_parcelado: despesaRecorrente,
      quantidade_parcelas: despesaRecorrente ? Math.max(0, parseInt(quantidadeParcelasRecorrencia, 10) || 0) : 1,
      parcelas: parcelasPayload,
    };
    const { error } = await supabase.rpc('erp_rpc_gerenciar_financeiro_avulso_personalizado', { p_payload: formValues });
    if (error) {
      toast.error(error.message || 'Não foi possível salvar o lançamento.');
      setSaving(false);
      return;
    }

    if (deveExecutarBaixa && baixaDraft) {
      try {
        await executarBaixaAoSalvar(baixaDraft);
      } catch (baixaError) {
        const mensagem =
          baixaError && typeof baixaError === 'object' && 'message' in baixaError
            ? String((baixaError as { message: string }).message)
            : 'Lançamento salvo, mas não foi possível efetivar a baixa.';
        toast.warning(mensagem);
        setSaving(false);
        return;
      }
    }

    if (!deveExecutarBaixa) {
      toast.success('Lançamento salvo com sucesso.');
    }
    setSaving(false);
    if (deveExecutarBaixa && baixaDraft) {
      await carregarDados();
      toast.success('Baixa efetivada com sucesso.');
      return;
    }
    router.push(voltarHref);
  };

  if (loading && !parcela && !isNovoLancamento) {
    return (
      <div className="rounded-xl border border-[#E5E7EB] bg-white py-16 text-center text-gray-500 dark:border-[#262626] dark:bg-neutral-950 dark:text-gray-400">
        <Loader2 size={24} className="mx-auto mb-2 animate-spin text-blue-600 dark:text-blue-300" />
        Carregando lançamento...
      </div>
    );
  }

  if (!isNovoLancamento && !loading && (erro || !parcela)) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
        {erro || 'Lançamento não encontrado.'}
      </div>
    );
  }

  if (!idEmpresa) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
        Empresa não identificada.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden pt-2">
      <div className="z-30 flex-shrink-0 space-y-4 bg-[#F8FAFC] pb-4 dark:bg-transparent">
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-neutral-900/40 dark:bg-black">
          <div className="flex flex-col gap-5 px-6 py-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="truncate text-2xl font-semibold text-slate-900 dark:text-slate-100">{tituloCabecalho}</h2>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(form.status)}`}>
                    {STATUS_OPTIONS.find((i) => i.value === form.status)?.label || form.status}
                  </span>
                  {!isNovoLancamento ? <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">Parcela {parcelaLabel}</span> : null}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Edite os dados principais no topo e deixe os demais ajustes nas abas internas.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 dark:bg-neutral-800 dark:text-slate-300"><FileText className="h-3.5 w-3.5" />{origemDocumento}</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 dark:bg-neutral-800 dark:text-slate-300"><Layers3 className="h-3.5 w-3.5" />{vendedorNome}</span>
                {!isNovoLancamento && parcela ? <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 dark:bg-neutral-800 dark:text-slate-300"><CalendarDays className="h-3.5 w-3.5" />{new Date(`${parcela.data_vencimento}T00:00:00`).toLocaleDateString('pt-BR')}</span> : null}
              </div>
            </div>

            <div className="grid gap-4 border-t border-slate-200 pt-5 xl:grid-cols-[minmax(0,1.5fr)_205px_192px] dark:border-neutral-900/60">
              <div className="space-y-4">
                <div>
                  <div className="mb-1.5 flex h-7 items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400"><User className="h-3.5 w-3.5" />Cliente</label>
                  </div>
                  <div className="flex gap-2">
                    <div className={`relative min-w-0 flex-1 ${recebimentoOrigemNaoAvulsa ? 'opacity-100' : ''}`}>
                      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={clienteBusca}
                        disabled={recebimentoOrigemNaoAvulsa}
                        onFocus={() => setClienteDropdownAberto(true)}
                        onBlur={() => window.setTimeout(() => setClienteDropdownAberto(false), 150)}
                        onChange={(e) => {
                          setClienteBusca(e.target.value);
                          atualizarCampo('idContato', '');
                          setClienteDropdownAberto(true);
                        }}
                        placeholder="Busque por CPF, CNPJ, nome fantasia ou razão social"
                        className={`${FIELD_CLASSNAME} pl-10 ${recebimentoOrigemNaoAvulsa ? '!bg-slate-100 cursor-not-allowed text-slate-500 dark:!bg-neutral-800 dark:text-slate-400' : ''}`}
                      />
                      {clienteDropdownAberto && (
                        <div className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-30 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
                          {clienteBuscando ? (
                            <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Buscando clientes...
                            </div>
                          ) : clienteResultados.length > 0 ? (
                            <div className="max-h-64 space-y-1 overflow-y-auto">
                              {clienteResultados.map((cliente) => {
                                const nomePrincipal = cliente.nome_razao_social || cliente.nome_fantasia || 'Sem nome';
                                const detalhes = [cliente.nome_fantasia, cliente.cpf, cliente.cnpj].filter(Boolean).join(' • ');
                                return (
                                  <button
                                    key={cliente.id}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => selecionarCliente(cliente)}
                                    className="flex w-full flex-col rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-neutral-800"
                                  >
                                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{nomePrincipal}</span>
                                    {detalhes ? <span className="text-xs text-slate-500 dark:text-slate-400">{detalhes}</span> : null}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                              Nenhum cliente encontrado.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={() => router.push('/erp/cadastros/contatos')} className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20">
                      <Plus className="h-4 w-4" />
                      Novo
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 inline-flex h-7 items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400"><Tag className="h-3.5 w-3.5" />Categoria</label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={categoriaBusca}
                      onFocus={() => setCategoriaDropdownAberto(true)}
                      onBlur={() => window.setTimeout(() => setCategoriaDropdownAberto(false), 150)}
                      onChange={(e) => {
                        setCategoriaBusca(e.target.value);
                        atualizarCampo('idCategoria', '');
                        setCategoriaDropdownAberto(true);
                      }}
                      placeholder="Busque uma categoria"
                      className={`${FIELD_CLASSNAME} pl-10`}
                    />
                    {categoriaDropdownAberto && (
                      <div className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-30 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
                        {categoriaBuscando ? (
                          <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Buscando categorias...
                          </div>
                        ) : categoriaResultados.length > 0 ? (
                          <div className="max-h-64 space-y-1 overflow-y-auto">
                            {categoriaResultados.map((categoria) => (
                              <button
                                key={categoria.id_categoria}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => selecionarCategoria(categoria)}
                                className="flex w-full flex-col rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-neutral-800"
                              >
                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{categoria.nome_categoria}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                            Nenhuma categoria encontrada.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 inline-flex h-7 items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400"><CalendarDays className="h-3.5 w-3.5" />Data de vencimento</label>
                  <DatePickerPT
                    value={form.dataVencimento}
                    onChange={(value) => atualizarCampo('dataVencimento', value)}
                    disabled={parcelaPaga}
                    className={`h-10 rounded-xl border-[#BFDBFE] pr-9 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-slate-100 ${
                      parcelaPaga ? '!bg-slate-100 cursor-not-allowed text-slate-500 dark:!bg-neutral-800 dark:text-slate-400' : ''
                    }`}
                  />
                </div>
                <div>
                  <label className="mb-1.5 inline-flex h-7 items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400"><CalendarDays className="h-3.5 w-3.5" />Data de emissão</label>
                  <DatePickerPT value={form.dataEmissao} onChange={(value) => atualizarCampo('dataEmissao', value)} className="h-10 rounded-xl border-[#BFDBFE] pr-9 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-slate-100" />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 inline-flex h-7 items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400"><BadgeDollarSign className="h-3.5 w-3.5" />Valor da conta</label>
                  <input type="text" inputMode="decimal" disabled={recebimentoOrigemNaoAvulsa} value={formatMoneyInput(form.valorOriginal)} onChange={(e) => atualizarCampo('valorOriginal', e.target.value)} className={`${FIELD_CLASSNAME} ${recebimentoOrigemNaoAvulsa ? '!bg-slate-100 cursor-not-allowed text-slate-500 dark:!bg-neutral-800 dark:text-slate-400' : ''}`} />
                </div>
                <div>
                  <label className="mb-1.5 inline-flex h-7 items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400"><Building2 className="h-3.5 w-3.5" />Banco</label>
                  <SingleSelectDropdown
                    options={contas.map((i) => ({ value: i.id, label: i.nome }))}
                    value={form.idContaBancaria}
                    onChange={(value) => atualizarCampo('idContaBancaria', value)}
                    disabled={parcelaPaga}
                    placeholder="Selecione"
                    buttonClassName={`${DROPDOWN_BUTTON_CLASSNAME} ${
                      parcelaPaga ? '!cursor-not-allowed !bg-slate-50 dark:!bg-neutral-800 !text-slate-500 dark:!text-slate-400' : ''
                    }`}
                    menuClassName={DROPDOWN_MENU_CLASSNAME}
                    menuContentClassName="max-h-80"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-neutral-900/40 dark:bg-black">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700">
            {[
              { id: 'basicas', label: 'Detalhes', icon: <User className="h-4 w-4" /> },
              { id: 'financeiro', label: 'Detalhes financeiros', icon: <BadgeDollarSign className="h-4 w-4" /> },
              { id: 'observacoes', label: 'Observações', icon: <FileText className="h-4 w-4" /> },
              ...(!isNovoLancamento
                ? [
                    { id: 'baixa', label: 'Baixa', icon: <Wallet className="h-4 w-4" /> },
                    { id: 'historico', label: 'Histórico', icon: <Wallet className="h-4 w-4" /> },
                    { id: 'comprovantes', label: 'Comprovantes', icon: <Wallet className="h-4 w-4" /> },
                  ]
                : []),
            ].map((tab) => (
              <button key={tab.id} type="button" onClick={() => handleTrocarTab(tab.id as LancamentoTab)} className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-neutral-900 dark:text-slate-300 dark:hover:bg-neutral-800'}`}>{tab.icon}{tab.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-4">
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {activeTab === 'basicas' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-black">
                  <h2 className="inline-flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100"><User className="h-5 w-5 text-blue-600 dark:text-blue-300" />Detalhes</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Edite a identificação principal e os vínculos complementares do lançamento.</p>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-4">
                      <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{labelNomeLancamento}</label><input type="text" value={form.lancamento} onChange={(e) => atualizarCampo('lancamento', e.target.value)} className={FIELD_CLASSNAME} /></div>
                      <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Descrição da parcela</label><input type="text" value={form.descricaoParcela} onChange={(e) => atualizarCampo('descricaoParcela', e.target.value)} className={FIELD_CLASSNAME} /></div>
                      <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Origem do documento</label><div className="flex h-10 cursor-not-allowed items-center rounded-xl border border-[#BFDBFE] bg-slate-50 px-3 text-sm text-slate-500 dark:border-blue-500/35 dark:bg-neutral-800 dark:text-slate-400">{origemDocumento}</div></div>
                    </div>
                    <div className="space-y-4">
                      <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Departamento</label><SingleSelectDropdown options={departamentos.map((i) => ({ value: i.id, label: i.nome }))} value={form.idDepartamento} onChange={(value) => { if (!recebimentoOrigemNaoAvulsa) atualizarCampo('idDepartamento', value); }} placeholder="Selecione" buttonClassName={`${DROPDOWN_BUTTON_CLASSNAME} ${recebimentoOrigemNaoAvulsa ? '!cursor-not-allowed !bg-slate-50 dark:!bg-neutral-800 !text-slate-500 dark:!text-slate-400' : ''}`} menuClassName={DROPDOWN_MENU_CLASSNAME} menuContentClassName="max-h-80" /></div>
                      <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Projeto</label><SingleSelectDropdown options={projetos.map((i) => ({ value: i.id, label: i.nome }))} value={form.idProjeto} onChange={(value) => { if (!recebimentoOrigemNaoAvulsa) atualizarCampo('idProjeto', value); }} placeholder="Selecione" buttonClassName={`${DROPDOWN_BUTTON_CLASSNAME} ${recebimentoOrigemNaoAvulsa ? '!cursor-not-allowed !bg-slate-50 dark:!bg-neutral-800 !text-slate-500 dark:!text-slate-400' : ''}`} menuClassName={DROPDOWN_MENU_CLASSNAME} menuContentClassName="max-h-80" /></div>
                      <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Vendedor</label><div className="flex h-10 cursor-not-allowed items-center rounded-xl border border-[#BFDBFE] bg-slate-50 px-3 text-sm text-slate-500 dark:border-blue-500/35 dark:bg-neutral-800 dark:text-slate-400">{vendedorNome}</div></div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'financeiro' && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-black">
                    <h2 className="inline-flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100"><BadgeDollarSign className="h-5 w-5 text-blue-600 dark:text-blue-300" />Detalhes financeiros</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ajuste os demais dados financeiros sem repetir os campos do cabeçalho.</p>
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Acréscimos</label><input type="number" step="0.01" value={form.valorAcrescimos} onChange={(e) => atualizarCampo('valorAcrescimos', e.target.value)} className={FIELD_CLASSNAME} /></div>
                      <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Saldo devedor</label><input type="number" step="0.01" value={form.saldoDevedor} onChange={(e) => atualizarCampo('saldoDevedor', e.target.value)} className={FIELD_CLASSNAME} /></div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-black">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                          <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                          {origem === 'pagar' ? 'Despesa Parcelada' : 'Receita Parcelada'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Gere automaticamente as parcelas mensais com base no valor da conta e na data informada.
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={possuiParcelasVinculadas}
                        onClick={() => {
                          const proximoValor = !despesaRecorrente;
                          setDespesaRecorrente(proximoValor);
                          if (!proximoValor) setParcelasRecorrentes([]);
                        }}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-2.5 transition-colors md:w-[260px] ${
                          despesaRecorrente
                            ? 'border-blue-300 bg-blue-50 dark:border-blue-500/50 dark:bg-blue-900/20'
                            : 'border-[#BFDBFE] bg-white dark:border-blue-500/35 dark:bg-neutral-900'
                        } ${possuiParcelasVinculadas ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                          {despesaRecorrente ? 'Parcelamento Ativo' : 'Parcelamento Inativo'}
                        </span>
                        <span className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${despesaRecorrente ? 'bg-blue-600' : 'bg-slate-300 dark:bg-neutral-700'}`}>
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${despesaRecorrente ? 'translate-x-6' : 'translate-x-1'}`} />
                        </span>
                      </button>
                    </div>

                    {possuiParcelasVinculadas && (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                        Este lançamento já possui parcelas vinculadas, então o parcelamento não pode ser reconfigurado aqui.
                      </div>
                    )}

                    {despesaRecorrente && !possuiParcelasVinculadas && (
                      <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_220px_auto]">
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Número de parcelas</label>
                            <input type="number" min={2} value={quantidadeParcelasRecorrencia} onChange={(e) => setQuantidadeParcelasRecorrencia(e.target.value)} className={FIELD_CLASSNAME} />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Base para vencimento</label>
                            <div className="flex h-10 items-center rounded-xl border border-[#BFDBFE] bg-white px-3 text-sm text-slate-700 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-slate-200">
                              {form.dataVencimento
                                ? new Date(`${form.dataVencimento}T00:00:00`).toLocaleDateString('pt-BR')
                                : form.dataEmissao
                                  ? new Date(`${form.dataEmissao}T00:00:00`).toLocaleDateString('pt-BR')
                                  : '-'}
                            </div>
                          </div>
                          <div className="flex items-end">
                            <button type="button" onClick={handleGerarParcelasRecorrentes} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700">
                              <RefreshCw className="h-4 w-4" />
                              Gerar parcelas
                            </button>
                          </div>
                        </div>

                        {parcelasRecorrentes.length > 0 && (
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Parcelas geradas</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">A distribuição segue o mesmo padrão de rateio automático usado no fluxo comercial.</p>
                            </div>

                            <div className="space-y-4">
                              {parcelasRecorrentes.map((item) => (
                                <div
                                  key={item.id}
                                  className="rounded-lg border border-[#E5E7EB] bg-gray-50 p-4 dark:border-[#262626] dark:bg-neutral-800"
                                >
                                  <div className="flex flex-wrap items-end gap-4">
                                    <div className="w-20 flex-shrink-0">
                                      <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400">Parcela</label>
                                      <input
                                        type="text"
                                        value={item.numero}
                                        disabled
                                        className="w-full cursor-not-allowed rounded-lg border border-[#BFDBFE] bg-white px-3 py-2.5 text-center text-sm text-gray-900 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-gray-100"
                                      />
                                    </div>

                                    <div className="w-40 flex-shrink-0">
                                      <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400">Vencimento</label>
                                      <DatePickerPT
                                        value={item.vencimento}
                                        onChange={(value) => atualizarParcelaRecorrente(item.id, 'vencimento', value)}
                                        className="h-10 rounded-lg border-[#BFDBFE] pr-9 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-slate-100"
                                      />
                                    </div>

                                    <div className="w-36 flex-shrink-0">
                                      <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400">Valor</label>
                                      <input
                                        type="text"
                                        value={item.valor ? `R$ ${item.valor}` : 'R$ 0,00'}
                                        onChange={(e) => {
                                          const somenteNumeros = e.target.value.replace(/\D/g, '');
                                          const valorNum = parseInt(somenteNumeros || '0', 10) / 100;
                                          const formatado = valorNum.toLocaleString('pt-BR', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          });
                                          atualizarParcelaRecorrente(item.id, 'valor', formatado);
                                        }}
                                        onBlur={(e) => {
                                          const somenteNumeros = e.target.value.replace(/\D/g, '');
                                          const valorNum = parseInt(somenteNumeros || '0', 10) / 100;
                                          const formatado = valorNum.toLocaleString('pt-BR', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          });
                                          if (formatado !== item.valor) {
                                            atualizarParcelaRecorrente(item.id, 'valor', formatado);
                                          }
                                        }}
                                        placeholder="R$ 0,00"
                                        className="w-full rounded-lg border border-[#BFDBFE] bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-gray-100"
                                      />
                                    </div>

                                    <div className="w-48 flex-shrink-0">
                                      <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400">Forma de Pagamento</label>
                                      <SingleSelectDropdown
                                        options={formasPagamento.map((forma) => ({ value: forma.id, label: forma.nome }))}
                                        value={item.idFormaPagamento || ''}
                                        onChange={(value) => {
                                          const idSelecionado = value || null;
                                          const nomeSelecionado = idSelecionado ? formasPagamentoPorId.get(idSelecionado) || '' : '';
                                          atualizarParcelaRecorrente(item.id, 'idFormaPagamento', idSelecionado);
                                          atualizarParcelaRecorrente(item.id, 'formaPagamento', nomeSelecionado);
                                        }}
                                        placeholder="Selecione"
                                        buttonClassName={DROPDOWN_BUTTON_CLASSNAME}
                                        menuClassName={DROPDOWN_MENU_CLASSNAME}
                                        menuContentClassName="max-h-80"
                                      />
                                    </div>

                                    <div className="min-w-[240px] flex-1">
                                      <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400">Observações</label>
                                      <input
                                        type="text"
                                        value={item.observacoes}
                                        onChange={(e) => atualizarParcelaRecorrente(item.id, 'observacoes', e.target.value)}
                                        placeholder="Observações adicionais..."
                                        className="w-full rounded-lg border border-[#BFDBFE] bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-gray-100"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'observacoes' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-black">
                  <h2 className="inline-flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100"><FileText className="h-5 w-5 text-blue-600 dark:text-blue-300" />Observações</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Inclua detalhes adicionais do pagamento.</p>
                  <div className="mt-4">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Observações do pagamento</label>
                    <textarea rows={6} value={form.observacoes} onChange={(e) => atualizarCampo('observacoes', e.target.value)} className={TEXTAREA_CLASSNAME} />
                  </div>
                </div>
              )}

              {!isNovoLancamento && parcelaBaixaAtual && (['baixa', 'parcelas', 'historico', 'comprovantes'] as AbaInterna[]).includes(activeTab as AbaInterna) && (
                <FinanceiroBaixaLancamentoPanel
                  idEmpresa={idEmpresa}
                  tipo={origem === 'pagar' ? 'pagar' : 'receber'}
                  abaAtiva={activeTab as AbaInterna}
                  parcelasRelacionadasIniciais={parcelasRelacionadasBaixa}
                  contaBancariaPadraoId={form.idContaBancaria || parcelaBaixaAtual.id_conta_bancaria || ''}
                  parcela={parcelaBaixaAtual}
                  lancamentoLabel={form.lancamento || 'Lançamento financeiro'}
                  onUpdated={carregarDados}
                  onDraftChange={setBaixaDraft}
                  onSelectParcela={handleSelecionarParcela}
                  onConfirmBaixa={() => void confirmarBaixa()}
                  baixaLoading={baixaSaving}
                  onConfirmEstorno={() => void confirmarEstorno()}
                  estornoLoading={estornoSaving}
                />
              )}
            </div>

            <div className="flex-shrink-0 bg-transparent px-1 pb-2 pt-4">
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => router.push(voltarHref)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-neutral-800 dark:bg-black dark:text-slate-300 dark:hover:bg-neutral-800">Voltar</button>
                <button type="button" onClick={() => void salvar()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}Salvar</button>
              </div>
            </div>
      </div>
    </div>
  );
}
