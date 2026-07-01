'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BadgeDollarSign,
  CalendarDays,
  ChevronDown,
  CreditCard,
  Eye,
  FileText,
  Loader2,
  ReceiptText,
  Search,
  Trash2,
  User,
} from 'lucide-react';
import ClienteDrawer from '@/components/erp/Negocios/shared/ClienteDrawer';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/lib/context/company-context';
import { toast } from 'sonner';
import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import DatePickerPT from '@/components/erp/Negocios/propostas/NovaPropostaPage/components/DatePickerPT';

type ContratoTab = 'detalhes' | 'financeiro' | 'faturamento';

interface ContratoDetalhePageProps {
  contratoId?: string | null;
  mode?: 'new' | 'edit';
}

interface ClienteOption {
  id: string;
  nome: string;
  nomeRazaoSocial: string;
  nomeFantasia: string;
  cpf: string;
  cnpj: string;
}

interface ReguaCobrancaOption {
  id: string;
  nome: string;
}

interface ContaBancariaOption {
  id: string;
  nome: string;
}

interface OptionItem {
  id: string;
  nome: string;
}

interface VendedorOption {
  id: string;
  nome: string;
}

interface ParcelaFaturamento {
  id: string;
  numero_parcela: number;
  descricao_parcela: string | null;
  valor_original: number;
  valor_quitado_total: number | null;
  saldo_devedor: number | null;
  data_vencimento: string;
  data_quitacao_total: string | null;
  status: string | null;
  criado_em: string | null;
  competencia?: string | null;
  isPreview?: boolean;
}

interface FormState {
  idCliente: string;
  descricaoContrato: string;
  idCategoria: string;
  idVendedor: string;
  idDepartamento: string;
  idProjeto: string;
  tipoVigencia: 'determinado' | 'indeterminado';
  ocorrencia: 'Mensal' | 'Bimestral' | 'Trimestral' | 'Semestral' | 'Anual';
  numeroParcelas: string;
  idReguaCobranca: string;
  idContaBancaria: string;
  valorRecorrente: string;
  diaVencimento: string;
  dataInicio: string;
  dataFim: string;
  proximoFaturamento: string;
  dataProximoReajuste: string;
  indiceReajuste: 'IGP-M' | 'IPCA' | 'Fixo (%)' | '';
  percentualReajusteFixo: string;
  status: 'ativo' | 'cancelado';
}

const FIELD_CLASSNAME =
  'h-10 w-full rounded-xl border border-[#BFDBFE] bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-slate-100 dark:focus:ring-blue-500/30';

function formatarMoedaInput(valor: string) {
  const digits = valor.replace(/\D/g, '');
  const numero = Number(digits || '0') / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numero);
}

function formatarMoedaNumero(valor: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor || 0));
}

function parseMoneyInput(valor: string) {
  const normalizado = valor.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

function formatarDataBR(data: string | null | undefined) {
  if (!data) return '-';
  const [ano, mes, dia] = data.split('-').map(Number);
  if (!ano || !mes || !dia) return data;
  return new Intl.DateTimeFormat('pt-BR').format(new Date(ano, mes - 1, dia, 12));
}

function criarDataLocal(data: string) {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Date(ano, (mes || 1) - 1, dia || 1, 12);
}

function formatarDataISO(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function getCompetenciaFromDataVencimento(dataVencimento: string) {
  if (!dataVencimento) return null;
  const [ano, mes] = dataVencimento.split('-');
  if (!ano || !mes) return null;
  return `${ano}-${mes}-01`;
}

function adicionarMesesComVencimento(dataBase: string, meses: number, diaVencimento: number) {
  const base = criarDataLocal(dataBase);
  const alvo = new Date(base.getFullYear(), base.getMonth() + meses, 1, 12);
  const ultimoDiaMes = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0, 12).getDate();
  alvo.setDate(Math.min(Math.max(diaVencimento, 1), ultimoDiaMes));
  return formatarDataISO(alvo);
}

function getIntervaloOcorrencia(ocorrencia: FormState['ocorrencia']) {
  switch (ocorrencia) {
    case 'Bimestral':
      return 2;
    case 'Trimestral':
      return 3;
    case 'Semestral':
      return 6;
    case 'Anual':
      return 12;
    case 'Mensal':
    default:
      return 1;
  }
}

function getInitials(valor: string) {
  const partes = valor.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'CT';
  return partes
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() || '')
    .join('');
}

function atualizarDescricaoParcela(descricao: string | null | undefined, numeroParcela: number) {
  const descricaoBase = (descricao || '').trim();
  if (!descricaoBase) return `Contrato - Parcela ${numeroParcela}`;
  if (/ - Parcela \d+$/i.test(descricaoBase)) {
    return descricaoBase.replace(/ - Parcela \d+$/i, ` - Parcela ${numeroParcela}`);
  }
  return descricaoBase;
}

export default function ContratoDetalhePage({ contratoId = null, mode = 'new' }: ContratoDetalhePageProps) {
  const router = useRouter();
  const { companyId } = useCompany();
  const isNovo = mode === 'new' || !contratoId;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ContratoTab>('detalhes');
  const [erro, setErro] = useState<string | null>(null);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [reguasCobranca, setReguasCobranca] = useState<ReguaCobrancaOption[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancariaOption[]>([]);
  const [parcelasFaturamento, setParcelasFaturamento] = useState<ParcelaFaturamento[]>([]);
  const [parcelasFaturamentoPendentes, setParcelasFaturamentoPendentes] = useState<ParcelaFaturamento[]>([]);
  const [parcelasFaturamentoRemovidas, setParcelasFaturamentoRemovidas] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<OptionItem[]>([]);
  const [vendedores, setVendedores] = useState<VendedorOption[]>([]);
  const [departamentos, setDepartamentos] = useState<OptionItem[]>([]);
  const [projetos, setProjetos] = useState<OptionItem[]>([]);
  const [clienteBusca, setClienteBusca] = useState('');
  const [categoriaBusca, setCategoriaBusca] = useState('');
  const [clienteDropdownAberto, setClienteDropdownAberto] = useState(false);
  const [categoriaDropdownAberto, setCategoriaDropdownAberto] = useState(false);
  const [menuAcoesAberto, setMenuAcoesAberto] = useState(false);
  const [clienteDrawerAberto, setClienteDrawerAberto] = useState(false);
  const [gerandoParcelas, setGerandoParcelas] = useState(false);
  const [quantidadeParcelasFuturas, setQuantidadeParcelasFuturas] = useState('1');
  const menuAcoesRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState<FormState>({
    idCliente: '',
    descricaoContrato: '',
    idCategoria: '',
    idVendedor: '',
    idDepartamento: '',
    idProjeto: '',
    tipoVigencia: 'indeterminado',
    ocorrencia: 'Mensal',
    numeroParcelas: '12',
    idReguaCobranca: '',
    idContaBancaria: '',
    valorRecorrente: 'R$ 0,00',
    diaVencimento: '10',
    dataInicio: new Date().toISOString().slice(0, 10),
    dataFim: '',
    proximoFaturamento: '',
    dataProximoReajuste: '',
    indiceReajuste: '',
    percentualReajusteFixo: '',
    status: 'ativo',
  });

  useEffect(() => {
    const carregarContasBancarias = async () => {
      if (!companyId) return;

      const { data, error } = await supabase
        .from('erp_contas_bancarias')
        .select('id_conta, nome_conta')
        .eq('id_empresa', companyId)
        .order('nome_conta', { ascending: true });

      if (error) {
        toast.error(error.message || 'Não foi possível carregar as contas bancárias.');
        setContasBancarias([]);
        return;
      }

      setContasBancarias(
        ((data || []) as Array<{ id_conta: string; nome_conta?: string | null }>).map((conta) => ({
          id: conta.id_conta,
          nome: String(conta.nome_conta || 'Sem nome'),
        }))
      );
    };

    void carregarContasBancarias();
  }, [companyId]);

  useEffect(() => {
    const carregar = async () => {
      if (!companyId) {
        setErro('Empresa não identificada.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setErro(null);

      const [clientesRes, reguasRes, categoriasRes, vendedoresRes, departamentosRes, projetosRes] = await Promise.all([
        supabase
          .from('erp_contatos')
          .select('id, nome_razao_social, nome_fantasia, cpf, cnpj')
          .eq('id_empresa', companyId)
          .order('nome_razao_social', { ascending: true }),
        supabase
          .from('erp_reguas_cobranca')
          .select('id, nome')
          .eq('id_empresa', companyId)
          .order('nome', { ascending: true }),
        supabase
          .from('erp_categorias')
          .select('id_categoria, nome_categoria')
          .eq('id_empresa', companyId)
          .order('nome_categoria', { ascending: true }),
        supabase
          .from('erp_vendedores')
          .select('id, nome_completo')
          .eq('id_empresa', companyId)
          .eq('status', 'ATIVO')
          .order('nome_completo', { ascending: true }),
        supabase
          .from('erp_departamentos')
          .select('id, nome')
          .eq('id_empresa', companyId)
          .order('nome', { ascending: true }),
        supabase
          .from('erp_projetos')
          .select('id, nome')
          .eq('id_empresa', companyId)
          .order('nome', { ascending: true }),
      ]);

      setClientes(
        ((clientesRes.data || []) as Array<{ id: string; nome_razao_social?: string | null; nome_fantasia?: string | null; cpf?: string | null; cnpj?: string | null }>).map((cliente) => ({
          id: cliente.id,
          nome: String(cliente.nome_razao_social || cliente.nome_fantasia || 'Sem nome'),
          nomeRazaoSocial: String(cliente.nome_razao_social || ''),
          nomeFantasia: String(cliente.nome_fantasia || ''),
          cpf: String(cliente.cpf || ''),
          cnpj: String(cliente.cnpj || ''),
        }))
      );

      setReguasCobranca(
        ((reguasRes.data || []) as Array<{ id: string; nome?: string | null }>).map((regua) => ({
          id: regua.id,
          nome: String(regua.nome || 'Sem nome'),
        }))
      );
      setCategorias(
        ((categoriasRes.data || []) as Array<{ id_categoria: string; nome_categoria?: string | null }>).map((categoria) => ({
          id: categoria.id_categoria,
          nome: String(categoria.nome_categoria || 'Sem nome'),
        }))
      );
      setVendedores(
        ((vendedoresRes.data || []) as Array<{ id: string; nome_completo?: string | null }>).map((vendedor) => ({
          id: vendedor.id,
          nome: String(vendedor.nome_completo || 'Sem nome'),
        }))
      );
      setDepartamentos(
        ((departamentosRes.data || []) as Array<{ id: string; nome?: string | null }>).map((departamento) => ({
          id: departamento.id,
          nome: String(departamento.nome || 'Sem nome'),
        }))
      );
      setProjetos(
        ((projetosRes.data || []) as Array<{ id: string; nome?: string | null }>).map((projeto) => ({
          id: projeto.id,
          nome: String(projeto.nome || 'Sem nome'),
        }))
      );

      if (isNovo) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('erp_contratos')
        .select(
          'id, id_cliente, descricao, id_categoria, id_vendedor, id_departamento, id_projeto, id_regua_cobranca, id_conta_bancaria, valor_recorrente, dia_vencimento, data_inicio, data_fim, proximo_faturamento, data_proximo_reajuste, indice_reajuste, percentual_reajuste_fixo, status'
        )
        .eq('id', contratoId)
        .eq('id_empresa', companyId)
        .maybeSingle();

      if (error || !data) {
        setErro(error?.message || 'Contrato não encontrado.');
        setLoading(false);
        return;
      }

      setForm({
        idCliente: data.id_cliente || '',
        descricaoContrato: data.descricao || '',
        idCategoria: data.id_categoria || '',
        idVendedor: data.id_vendedor || '',
        idDepartamento: data.id_departamento || '',
        idProjeto: data.id_projeto || '',
        tipoVigencia: data.data_fim ? 'determinado' : 'indeterminado',
        ocorrencia: 'Mensal',
        numeroParcelas: '12',
        idReguaCobranca: data.id_regua_cobranca || '',
        idContaBancaria: data.id_conta_bancaria || '',
        valorRecorrente: formatarMoedaNumero(Number(data.valor_recorrente ?? 0)),
        diaVencimento: String(data.dia_vencimento ?? 10),
        dataInicio: data.data_inicio || '',
        dataFim: data.data_fim || '',
        proximoFaturamento: data.proximo_faturamento || '',
        dataProximoReajuste: data.data_proximo_reajuste || '',
        indiceReajuste:
          data.indice_reajuste === 'IGP-M' || data.indice_reajuste === 'IPCA' || data.indice_reajuste === 'Fixo (%)'
            ? data.indice_reajuste
            : '',
        percentualReajusteFixo:
          data.percentual_reajuste_fixo === null || data.percentual_reajuste_fixo === undefined
            ? ''
            : String(data.percentual_reajuste_fixo),
        status: data.status === 'cancelado' ? 'cancelado' : 'ativo',
      });

      const clienteAtual = clientesRes.data?.find((cliente) => cliente.id === data.id_cliente);
      const nomeClienteAtual =
        clienteAtual?.nome_razao_social || clienteAtual?.nome_fantasia || '';
      setClienteBusca(nomeClienteAtual);

      const categoriaAtual = categoriasRes.data?.find((categoria) => categoria.id_categoria === data.id_categoria);
      setCategoriaBusca(String(categoriaAtual?.nome_categoria || ''));

      setLoading(false);
    };

    void carregar();
  }, [companyId, contratoId, isNovo]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuAcoesRef.current && !menuAcoesRef.current.contains(event.target as Node)) {
        setMenuAcoesAberto(false);
      }
    };

    if (menuAcoesAberto) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuAcoesAberto]);

  useEffect(() => {
    void carregarParcelasFaturamento();
  }, [companyId, contratoId, isNovo]);

  const nomeClienteSelecionado = useMemo(
    () => clientes.find((cliente) => cliente.id === form.idCliente)?.nome || 'Selecione um cliente',
    [clientes, form.idCliente]
  );

  const nomeReguaSelecionada = useMemo(
    () => reguasCobranca.find((regua) => regua.id === form.idReguaCobranca)?.nome || 'Sem régua definida',
    [form.idReguaCobranca, reguasCobranca]
  );

  const tituloPrincipal = isNovo ? 'Contrato > Novo Contrato' : 'Contrato > Editar Contrato';
  const subtitulo = 'Preencha os dados principais do contrato e organize o restante nas abas abaixo.';
  const resumoReajuste =
    form.indiceReajuste === 'Fixo (%)'
      ? form.percentualReajusteFixo
        ? `Fixo ${form.percentualReajusteFixo}%`
        : 'Fixo (%)'
      : form.indiceReajuste || 'Sem reajuste';

  const parcelasFaturamentoExibidas = useMemo(
    () =>
      [...parcelasFaturamento.filter((parcela) => !parcelasFaturamentoRemovidas.includes(parcela.id)), ...parcelasFaturamentoPendentes].sort((a, b) => {
        const numero = Number(a.numero_parcela || 0) - Number(b.numero_parcela || 0);
        if (numero !== 0) return numero;
        return String(a.data_vencimento || '').localeCompare(String(b.data_vencimento || ''));
      }),
    [parcelasFaturamento, parcelasFaturamentoPendentes, parcelasFaturamentoRemovidas]
  );

  const clienteResultados = useMemo(() => {
    const termo = clienteBusca.trim().toLowerCase();
    if (!termo) return clientes.slice(0, 8);
    return clientes
      .filter((cliente) =>
        [cliente.nome, cliente.nomeRazaoSocial, cliente.nomeFantasia, cliente.cpf, cliente.cnpj]
          .filter(Boolean)
          .some((valor) => valor.toLowerCase().includes(termo))
      )
      .slice(0, 8);
  }, [clienteBusca, clientes]);

  const categoriaResultados = useMemo(() => {
    const termo = categoriaBusca.trim().toLowerCase();
    if (!termo) return categorias.slice(0, 8);
    return categorias.filter((categoria) => categoria.nome.toLowerCase().includes(termo)).slice(0, 8);
  }, [categoriaBusca, categorias]);

  const atualizarCampo = <K extends keyof FormState>(campo: K, valor: FormState[K]) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const selecionarCliente = (cliente: ClienteOption) => {
    atualizarCampo('idCliente', cliente.id);
    setClienteBusca(cliente.nome);
    setClienteDropdownAberto(false);
  };

  const selecionarCategoria = (categoria: OptionItem) => {
    atualizarCampo('idCategoria', categoria.id);
    setCategoriaBusca(categoria.nome);
    setCategoriaDropdownAberto(false);
  };

  const limparParcelasFaturamento = () => {
    const parcelasExistentesAtivas = parcelasFaturamento.filter((parcela) => !parcelasFaturamentoRemovidas.includes(parcela.id));
    const possuiParcelaPaga = parcelasExistentesAtivas.some(
      (parcela) => String(parcela.status || '').toUpperCase() === 'PAGO'
    );

    if (possuiParcelaPaga) {
      toast.error('Existem parcelas pagas que não podem ser limpas nesta página.');
      return;
    }

    setParcelasFaturamentoPendentes([]);
    setParcelasFaturamentoRemovidas(parcelasExistentesAtivas.map((parcela) => parcela.id));
    toast.success('Parcelas marcadas para limpeza. A alteração será efetivada ao salvar o contrato.');
  };

  const excluirParcelaFaturamento = (parcelaId: string) => {
    const parcelasAtivas = parcelasFaturamentoExibidas;
    const indiceRemovido = parcelasAtivas.findIndex((parcela) => parcela.id === parcelaId);
    if (indiceRemovido < 0) return;

    const parcelaRemovida = parcelasAtivas[indiceRemovido];
    const statusParcela = String(parcelaRemovida.status || '').toUpperCase();
    if (statusParcela === 'PAGO') {
      toast.error('Parcelas pagas não podem ser removidas nesta página.');
      return;
    }

    const datasOriginais = parcelasAtivas.map((parcela) => parcela.data_vencimento);
    const parcelasRestantes = parcelasAtivas.filter((parcela) => parcela.id !== parcelaId);
    const parcelasReordenadas = parcelasRestantes.map((parcela, index) => {
      const dataVencimento = datasOriginais[index] || parcela.data_vencimento;
      const numeroParcela = index + 1;
      const valorOriginal = Number(parcela.valor_original || 0);
      const valorQuitado = Number(parcela.valor_quitado_total || 0);

      return {
        ...parcela,
        numero_parcela: numeroParcela,
        descricao_parcela: atualizarDescricaoParcela(parcela.descricao_parcela, numeroParcela),
        data_vencimento: dataVencimento,
        competencia: getCompetenciaFromDataVencimento(dataVencimento),
        saldo_devedor: Math.max(valorOriginal - valorQuitado, 0),
      };
    });

    if (!parcelaRemovida.isPreview) {
      setParcelasFaturamentoRemovidas((prev) => (prev.includes(parcelaId) ? prev : [...prev, parcelaId]));
    }

    setParcelasFaturamento(parcelasReordenadas.filter((parcela) => !parcela.isPreview).map((parcela) => ({ ...parcela, isPreview: false })));
    setParcelasFaturamentoPendentes(parcelasReordenadas.filter((parcela) => parcela.isPreview));
    toast.success('Parcela removida. A reordenação será salva ao clicar em Salvar.');
  };

  const carregarParcelasFaturamento = async () => {
    if (!companyId || !contratoId || isNovo) {
      setParcelasFaturamento([]);
      return;
    }

    const { data, error } = await supabase
      .from('erp_parcelas')
      .select(
        'id, numero_parcela, descricao_parcela, valor_original, valor_quitado_total, saldo_devedor, data_vencimento, data_quitacao_total, status, criado_em'
      )
      .eq('id_empresa', companyId)
      .eq('id_contrato', contratoId)
      .order('numero_parcela', { ascending: true })
      .order('data_vencimento', { ascending: true });

    if (error) {
      toast.error('Não foi possível carregar o histórico de faturamento.');
      return;
    }

    setParcelasFaturamento((data || []) as ParcelaFaturamento[]);
  };

  const gerarParcelasContrato = async () => {
    if (!companyId) return;

    const valorTotal = parseMoneyInput(form.valorRecorrente);
    if (valorTotal <= 0) {
      toast.error('Informe um valor válido para gerar as parcelas.');
      return;
    }

    const intervaloMeses = getIntervaloOcorrencia(form.ocorrencia);
    const diaVencimentoDeterminado = form.proximoFaturamento
      ? Number(form.proximoFaturamento.split('-')[2] || 1)
      : Math.max(1, Math.min(31, Number(form.diaVencimento || 1)));
    const diaVencimento = form.tipoVigencia === 'determinado'
      ? diaVencimentoDeterminado
      : Math.max(1, Math.min(31, Number(form.diaVencimento || 1)));
    const quantidadeParcelas =
      form.tipoVigencia === 'determinado'
        ? Math.max(1, Number(form.numeroParcelas || 1))
        : Math.max(1, Number(quantidadeParcelasFuturas || 1));

    if (form.tipoVigencia === 'determinado' && !form.proximoFaturamento) {
      toast.error('Informe o primeiro vencimento para gerar as parcelas.');
      return;
    }

    const parcelasExistentesAtivas = parcelasFaturamento.filter(
      (parcela) => !parcelasFaturamentoRemovidas.includes(parcela.id)
    );
    const parcelasAtuais = [...parcelasExistentesAtivas, ...parcelasFaturamentoPendentes];
    const parcelaMaisRecente = parcelasAtuais
      .filter((parcela) => parcela.data_vencimento)
      .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))
      .at(-1);

    const dataBase = parcelaMaisRecente?.data_vencimento
      ? adicionarMesesComVencimento(parcelaMaisRecente.data_vencimento, intervaloMeses, diaVencimento)
      : form.tipoVigencia === 'determinado'
        ? (form.proximoFaturamento || '')
        : form.proximoFaturamento
          ? adicionarMesesComVencimento(form.proximoFaturamento, 0, diaVencimento)
          : adicionarMesesComVencimento(form.dataInicio, 0, diaVencimento);

    if (!dataBase) {
      toast.error('Defina a data base do faturamento antes de gerar parcelas.');
      return;
    }

    setGerandoParcelas(true);

    const maiorNumeroParcela = parcelasAtuais.reduce(
      (maior, parcela) => Math.max(maior, Number(parcela.numero_parcela || 0)),
      0
    );

    const valorTotalCentavos = Math.round(valorTotal * 100);
    const isDeterminado = form.tipoVigencia === 'determinado';
    const valorBaseCentavos = isDeterminado
      ? quantidadeParcelas > 1
        ? Math.floor(valorTotalCentavos / quantidadeParcelas)
        : valorTotalCentavos
      : valorTotalCentavos;
    const loteId = Date.now();

    const parcelasPreview: ParcelaFaturamento[] = Array.from({ length: quantidadeParcelas }, (_, index) => {
      const valorCentavos = isDeterminado
        ? index === quantidadeParcelas - 1
          ? valorTotalCentavos - valorBaseCentavos * (quantidadeParcelas - 1)
          : valorBaseCentavos
        : valorBaseCentavos;
      const valorParcela = valorCentavos / 100;
      const dataVencimento =
        index === 0 ? dataBase : adicionarMesesComVencimento(dataBase, intervaloMeses * index, diaVencimento);
      const numeroParcela = maiorNumeroParcela + index + 1;

      return {
        id: `preview-${loteId}-${numeroParcela}`,
        numero_parcela: numeroParcela,
        descricao_parcela: form.descricaoContrato?.trim()
          ? `${form.descricaoContrato.trim()} - Parcela ${numeroParcela}`
          : `Contrato - Parcela ${numeroParcela}`,
        valor_original: valorParcela,
        valor_quitado_total: 0,
        saldo_devedor: valorParcela,
        data_vencimento: dataVencimento,
        data_quitacao_total: null,
        status: 'EM_ABERTO',
        criado_em: null,
        competencia: getCompetenciaFromDataVencimento(dataVencimento),
        isPreview: true,
      };
    });

    const ultimaDataGerada = parcelasPreview.at(-1)?.data_vencimento || dataBase;
    const proximoFaturamento = adicionarMesesComVencimento(ultimaDataGerada, intervaloMeses, diaVencimento);

    setParcelasFaturamentoPendentes((prev) => [...prev, ...parcelasPreview]);
    atualizarCampo('proximoFaturamento', proximoFaturamento);
    setGerandoParcelas(false);

    toast.success(
      quantidadeParcelas === 1
        ? 'Prévia de parcela gerada. Ela será salva ao clicar em Salvar.'
        : 'Prévia das parcelas geradas. Elas serão salvas ao clicar em Salvar.'
    );
  };

  const salvar = async () => {
    if (!companyId) return;
    if (!form.idCliente) {
      toast.error('Selecione um cliente.');
      return;
    }

    setSaving(true);

    const payload = {
      id_empresa: companyId,
      id_cliente: form.idCliente,
      descricao: form.descricaoContrato.trim() || null,
      id_categoria: form.idCategoria || null,
      id_vendedor: form.idVendedor || null,
      id_departamento: form.idDepartamento || null,
      id_projeto: form.idProjeto || null,
      id_regua_cobranca: form.idReguaCobranca || null,
      id_conta_bancaria: form.idContaBancaria || null,
      valor_recorrente: parseMoneyInput(form.valorRecorrente),
      dia_vencimento: Math.max(1, Math.min(31, Number(form.diaVencimento || 1))),
      data_inicio: form.dataInicio || null,
      data_fim: form.tipoVigencia === 'determinado' ? form.dataFim || null : null,
      proximo_faturamento: form.proximoFaturamento || null,
      data_proximo_reajuste: form.dataProximoReajuste || null,
      indice_reajuste: form.indiceReajuste || null,
      percentual_reajuste_fixo:
        form.indiceReajuste === 'Fixo (%)' && form.percentualReajusteFixo !== ''
          ? Number(form.percentualReajusteFixo)
          : null,
      status: form.status,
    };

    console.log('[ContratoDetalhePage] payload contrato', payload);

    const response = isNovo
      ? await supabase.from('erp_contratos').insert(payload).select('id').single()
      : await supabase.from('erp_contratos').update(payload).eq('id', contratoId).eq('id_empresa', companyId).select('id').single();


    if (response.error) {
      setSaving(false);
      toast.error(response.error.message || 'Não foi possível salvar o contrato.');
      return;
    }

    const contratoSalvoId = response.data?.id || contratoId;

    console.log('[ContratoDetalhePage] resumo parcelas antes de salvar', {
      contratoSalvoId,
      tipoVigencia: form.tipoVigencia,
      parcelasExistentes: parcelasFaturamento.length,
      parcelasRemovidas: parcelasFaturamentoRemovidas.length,
      parcelasPendentes: parcelasFaturamentoPendentes.length,
    });

    if (contratoSalvoId && parcelasFaturamentoRemovidas.length > 0) {
      const parcelasRemovidasResponse = await supabase
        .from('erp_parcelas')
        .delete()
        .eq('id_empresa', companyId)
        .in('id', parcelasFaturamentoRemovidas)
        .neq('status', 'PAGO');

      if (parcelasRemovidasResponse.error) {
        setSaving(false);
        toast.error(parcelasRemovidasResponse.error.message || 'O contrato foi salvo, mas não foi possível limpar as parcelas selecionadas.');
        return;
      }
    }

    const parcelasExistentesParaAtualizar = parcelasFaturamento.filter(
      (parcela) => !parcelasFaturamentoRemovidas.includes(parcela.id)
    );

    if (contratoSalvoId && parcelasExistentesParaAtualizar.length > 0) {
      const parcelasUpdatePayload = parcelasExistentesParaAtualizar.map((parcela) => ({
        id: parcela.id,
        numero_parcela: parcela.numero_parcela,
        descricao_parcela: parcela.descricao_parcela || null,
        valor_original: parcela.valor_original,
        valor_quitado_total: parcela.valor_quitado_total || 0,
        saldo_devedor: parcela.saldo_devedor ?? parcela.valor_original,
        data_vencimento: parcela.data_vencimento,
        id_contato: form.idCliente || null,
        id_categoria: form.idCategoria || null,
        id_vendedor: form.idVendedor || null,
        id_departamento: form.idDepartamento || null,
        id_projeto: form.idProjeto || null,
        id_regua_cobranca: form.idReguaCobranca || null,
        id_conta_bancaria: form.idContaBancaria || null,
        competencia: getCompetenciaFromDataVencimento(parcela.data_vencimento),
        lancamento: 'RECEITA',
        origem_tipo: 'CONTRATO',
      }));

      console.log('[ContratoDetalhePage] payload update parcelas', parcelasUpdatePayload);

      const parcelasUpdateResponses = await Promise.all(
        parcelasUpdatePayload.map((parcelaPayload) =>
          supabase
            .from('erp_parcelas')
            .update({
              numero_parcela: parcelaPayload.numero_parcela,
              descricao_parcela: parcelaPayload.descricao_parcela,
              valor_original: parcelaPayload.valor_original,
              valor_quitado_total: parcelaPayload.valor_quitado_total,
              saldo_devedor: parcelaPayload.saldo_devedor,
              data_vencimento: parcelaPayload.data_vencimento,
              id_contato: parcelaPayload.id_contato,
              id_categoria: parcelaPayload.id_categoria,
              id_vendedor: parcelaPayload.id_vendedor,
              id_departamento: parcelaPayload.id_departamento,
              id_projeto: parcelaPayload.id_projeto,
              id_regua_cobranca: parcelaPayload.id_regua_cobranca,
              id_conta_bancaria: parcelaPayload.id_conta_bancaria,
              competencia: parcelaPayload.competencia,
              lancamento: parcelaPayload.lancamento,
              origem_tipo: parcelaPayload.origem_tipo,
            })
            .eq('id_empresa', companyId)
            .eq('id', parcelaPayload.id)
        )
      );

      const parcelasUpdateError = parcelasUpdateResponses.find((item) => item.error)?.error;
      if (parcelasUpdateError) {
        setSaving(false);
        toast.error(parcelasUpdateError.message || 'O contrato foi salvo, mas não foi possível atualizar as parcelas vinculadas.');
        return;
      }
    } else {
      console.log('[ContratoDetalhePage] payload update parcelas', []);
    }

    if (contratoSalvoId && parcelasFaturamentoPendentes.length > 0) {
      const parcelasPayload = parcelasFaturamentoPendentes.map((parcela) => ({
        id_empresa: companyId,
        id_contrato: contratoSalvoId,
        id_contato: form.idCliente || null,
        id_categoria: form.idCategoria || null,
        id_vendedor: form.idVendedor || null,
        id_departamento: form.idDepartamento || null,
        id_projeto: form.idProjeto || null,
        id_regua_cobranca: form.idReguaCobranca || null,
        id_conta_bancaria: form.idContaBancaria || null,
        lancamento: 'RECEITA',
        origem_tipo: 'CONTRATO',
        numero_parcela: parcela.numero_parcela,
        descricao_parcela: parcela.descricao_parcela || null,
        valor_original: parcela.valor_original,
        valor_quitado_total: parcela.valor_quitado_total || 0,
        saldo_devedor: parcela.saldo_devedor ?? parcela.valor_original,
        data_vencimento: parcela.data_vencimento,
        competencia: parcela.competencia || getCompetenciaFromDataVencimento(parcela.data_vencimento),
        status: parcela.status || 'EM_ABERTO',
      }));

      console.log('[ContratoDetalhePage] payload insert parcelas', parcelasPayload);

      const parcelasResponse = await supabase.from('erp_parcelas').insert(parcelasPayload);

      if (parcelasResponse.error) {
        setSaving(false);
        toast.error(parcelasResponse.error.message || 'O contrato foi salvo, mas não foi possível salvar as parcelas geradas.');
        return;
      }

      setParcelasFaturamentoPendentes([]);
    } else {
      console.log('[ContratoDetalhePage] payload insert parcelas', []);
    }

    setParcelasFaturamentoRemovidas([]);

    setSaving(false);
    toast.success('Contrato salvo com sucesso.');
    router.push('/erp/negocios/contratos');
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-[#E5E7EB] bg-white py-16 text-center text-gray-500 dark:border-[#262626] dark:bg-neutral-950 dark:text-gray-400">
        <Loader2 size={24} className="mx-auto mb-2 animate-spin text-blue-600 dark:text-blue-300" />
        Carregando contrato...
      </div>
    );
  }

  if (erro) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
        {erro}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden pt-2">
      <div className="z-30 flex-shrink-0 space-y-4 bg-[#F8FAFC] pb-4 dark:bg-transparent">
        <div className="relative z-30 overflow-visible rounded-2xl border border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-neutral-900/40 dark:bg-black">
          <div className="flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-lg font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                {getInitials('Contrato')}
              </div>
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="truncate text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    {tituloPrincipal}
                  </h2>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-neutral-800 dark:text-slate-300">
                    {form.status === 'ativo' ? 'Ativo' : 'Cancelado'}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                    Contrato recorrente
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{subtitulo}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 dark:bg-neutral-800 dark:text-slate-300">
                    <User className="h-3.5 w-3.5" />
                    {nomeClienteSelecionado}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                    <ReceiptText className="h-3.5 w-3.5" />
                    {nomeReguaSelecionada}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                    <CreditCard className="h-3.5 w-3.5" />
                    {form.valorRecorrente}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 dark:bg-neutral-800 dark:text-slate-300">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Dia {form.diaVencimento || '10'}
                  </span>
                </div>
              </div>
            </div>

            <div
              className="relative z-50 isolate flex shrink-0 flex-wrap items-center justify-end gap-2 self-end lg:self-start"
              ref={menuAcoesRef}
            >
              <button
                type="button"
                onClick={() => router.push('/erp/negocios/contratos')}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-neutral-800 dark:text-slate-300 dark:hover:bg-neutral-800"
              >
                <ArrowLeft size={16} />
                Voltar aos contratos
              </button>
              <button
                type="button"
                onClick={() => setMenuAcoesAberto((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
              >
                Ações
                <ChevronDown className={`h-4 w-4 transition-transform ${menuAcoesAberto ? 'rotate-180' : ''}`} />
              </button>

              {menuAcoesAberto && (
                <div className="absolute right-0 top-full z-[9999] mt-2 min-w-[220px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuAcoesAberto(false);
                        setClienteDrawerAberto(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-neutral-800"
                    >
                      <Eye size={15} className="text-slate-400 dark:text-slate-500" />
                      Ver Cliente
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuAcoesAberto(false);
                        void salvar();
                      }}
                      className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-neutral-800"
                    >
                      Salvar contrato
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuAcoesAberto(false);
                        router.push('/erp/negocios/contratos');
                      }}
                      className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-neutral-800"
                    >
                      Ir para listagem
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 border-t border-slate-200 px-6 py-5 md:grid-cols-2 xl:grid-cols-4 dark:border-neutral-900/60">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-4 dark:border-neutral-800 dark:bg-neutral-950/40">
              <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                <User className="h-3.5 w-3.5" />
                Cliente
              </div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{nomeClienteSelecionado}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-4 dark:border-neutral-800 dark:bg-neutral-950/40">
              <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                <ReceiptText className="h-3.5 w-3.5" />
                Régua
              </div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{nomeReguaSelecionada}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-4 dark:border-neutral-800 dark:bg-neutral-950/40">
              <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                <BadgeDollarSign className="h-3.5 w-3.5" />
                Valor total
              </div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{form.valorRecorrente}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-4 dark:border-neutral-800 dark:bg-neutral-950/40">
              <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                <CalendarDays className="h-3.5 w-3.5" />
                Reajuste
              </div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{resumoReajuste}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-neutral-900/40 dark:bg-black">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { id: 'detalhes', label: 'Detalhes', icon: <FileText className="h-4 w-4" /> },
              { id: 'financeiro', label: 'Financeiro', icon: <BadgeDollarSign className="h-4 w-4" /> },
              { id: 'faturamento', label: 'Faturamento', icon: <ReceiptText className="h-4 w-4" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ContratoTab)}
                className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-neutral-900 dark:text-slate-300 dark:hover:bg-neutral-800'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-4">
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {activeTab === 'detalhes' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-black">
              <h2 className="inline-flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                Detalhes
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Organize aqui os dados centrais do contrato e o contexto operacional.
              </p>

              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_220px_280px]">
                  <div className="min-w-0">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Descrição do contrato
                  </label>
                  <input
                    type="text"
                    value={form.descricaoContrato}
                    onChange={(event) => atualizarCampo('descricaoContrato', event.target.value)}
                    className={FIELD_CLASSNAME}
                    placeholder="Descreva o contrato"
                  />
                </div>

                  <div className="min-w-0 shrink-0">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Tipo de contrato
                  </label>
                  <div className="grid h-10 w-[220px] min-w-[220px] grid-cols-2 gap-1 rounded-xl border border-[#BFDBFE] bg-slate-50/80 p-1 dark:border-blue-500/35 dark:bg-neutral-900">
                    {[
                      { value: 'indeterminado', label: 'Indeterminado' },
                      { value: 'determinado', label: 'Determinado' },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => atualizarCampo('tipoVigencia', item.value as FormState['tipoVigencia'])}
                        className={`flex min-w-0 items-center justify-center overflow-hidden rounded-lg px-2 py-1.5 text-xs font-semibold leading-none transition-colors sm:text-sm ${
                          form.tipoVigencia === item.value
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-600 hover:bg-white/90 dark:text-slate-300 dark:hover:bg-neutral-800'
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                  <div className="relative min-w-0 w-full shrink-0">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Status
                  </label>
                  <SingleSelectDropdown
                    options={[
                      { value: 'ativo', label: 'Ativo' },
                      { value: 'cancelado', label: 'Cancelado' },
                    ]}
                    value={form.status}
                    onChange={(value) => atualizarCampo('status', value as 'ativo' | 'cancelado')}
                    placeholder="Selecione"
                    buttonClassName="!h-10 !w-full !min-w-0 !rounded-xl !border-[#BFDBFE] dark:!border-blue-500/35"
                    menuClassName="!rounded-2xl !border-slate-200 dark:!border-neutral-700 !bg-white dark:!bg-neutral-900"
                  />
                  </div>
                </div>

                <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_220px_280px]">
                  <div className="relative min-w-0 w-full">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Cliente
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={clienteBusca}
                      onChange={(event) => {
                        setClienteBusca(event.target.value);
                        atualizarCampo('idCliente', '');
                        setClienteDropdownAberto(true);
                      }}
                      onFocus={() => setClienteDropdownAberto(true)}
                      onBlur={() => setTimeout(() => setClienteDropdownAberto(false), 120)}
                      className={`${FIELD_CLASSNAME} pl-9`}
                      placeholder="Digite nome, CPF ou CNPJ"
                    />
                  </div>
                  {clienteDropdownAberto && clienteResultados.length > 0 ? (
                    <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
                      {clienteResultados.map((cliente) => (
                        <button
                          key={cliente.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selecionarCliente(cliente)}
                          className="flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-neutral-800"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-700 dark:text-slate-200">{cliente.nome}</span>
                            <span className="block truncate text-xs text-slate-400">
                              {[cliente.nomeFantasia, cliente.nomeRazaoSocial].filter(Boolean).join(' | ')}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs text-slate-400">{cliente.cnpj || cliente.cpf || ''}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                  <div className="min-w-0 shrink-0">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Data de início
                  </label>
                  <DatePickerPT
                    value={form.dataInicio}
                    onChange={(value) => atualizarCampo('dataInicio', value)}
                    className="h-10 rounded-xl !border !border-[#BFDBFE] pr-9 dark:!border-blue-500/35 dark:bg-neutral-900 dark:text-slate-100"
                  />
                </div>

                  <div className="min-w-0 w-full shrink-0">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Departamento
                  </label>
                  <SingleSelectDropdown
                    options={departamentos.map((departamento) => ({ value: departamento.id, label: departamento.nome }))}
                    value={form.idDepartamento}
                    onChange={(value) => atualizarCampo('idDepartamento', value)}
                    placeholder="Selecione"
                    buttonClassName="!h-10 !w-full !min-w-0 !rounded-xl !border-[#BFDBFE] dark:!border-blue-500/35"
                    menuClassName="!rounded-2xl !border-slate-200 dark:!border-neutral-700 !bg-white dark:!bg-neutral-900"
                    menuContentClassName="max-h-80"
                  />
                  </div>
                </div>

                <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_220px_280px]">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="min-w-0 w-full">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Categoria
                    </label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={categoriaBusca}
                        onChange={(event) => {
                          setCategoriaBusca(event.target.value);
                          atualizarCampo('idCategoria', '');
                          setCategoriaDropdownAberto(true);
                        }}
                        onFocus={() => setCategoriaDropdownAberto(true)}
                        onBlur={() => setTimeout(() => setCategoriaDropdownAberto(false), 120)}
                        className={`${FIELD_CLASSNAME} pl-9`}
                        placeholder="Digite para buscar"
                      />
                    </div>
                    {categoriaDropdownAberto && categoriaResultados.length > 0 ? (
                      <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
                        {categoriaResultados.map((categoria) => (
                          <button
                            key={categoria.id}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selecionarCategoria(categoria)}
                            className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-neutral-800"
                          >
                            {categoria.nome}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                    <div className="min-w-0">
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Vendedor
                      </label>
                      <SingleSelectDropdown
                        options={vendedores.map((vendedor) => ({ value: vendedor.id, label: vendedor.nome }))}
                        value={form.idVendedor}
                        onChange={(value) => atualizarCampo('idVendedor', value)}
                        placeholder="Selecione"
                        buttonClassName="!h-10 !w-full !min-w-0 !rounded-xl !border-[#BFDBFE] dark:!border-blue-500/35"
                        menuClassName="!rounded-2xl !border-slate-200 dark:!border-neutral-700 !bg-white dark:!bg-neutral-900"
                        menuContentClassName="max-h-80"
                      />
                    </div>
                  </div>

                  <div className="min-w-0 shrink-0">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Data de fim
                  </label>
                  <DatePickerPT
                    value={form.dataFim}
                    onChange={(value) => {
                      if (form.tipoVigencia === 'determinado') atualizarCampo('dataFim', value);
                    }}
                    disabled={form.tipoVigencia !== 'determinado'}
                    className={`h-10 rounded-xl !border !border-[#BFDBFE] pr-9 dark:!border-blue-500/35 dark:bg-neutral-900 dark:text-slate-100 ${
                      form.tipoVigencia !== 'determinado' ? 'cursor-not-allowed opacity-70' : ''
                    }`}
                  />
                </div>

                  <div className="min-w-0 w-full shrink-0">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Projeto
                  </label>
                  <SingleSelectDropdown
                    options={projetos.map((projeto) => ({ value: projeto.id, label: projeto.nome }))}
                    value={form.idProjeto}
                    onChange={(value) => atualizarCampo('idProjeto', value)}
                    placeholder="Selecione"
                    buttonClassName="!h-10 !w-full !min-w-0 !rounded-xl !border-[#BFDBFE] dark:!border-blue-500/35"
                    menuClassName="!rounded-2xl !border-slate-200 dark:!border-neutral-700 !bg-white dark:!bg-neutral-900"
                    menuContentClassName="max-h-80"
                  />
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'financeiro' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-black">
                <h2 className="inline-flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100">
                  <BadgeDollarSign className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                  Financeiro
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Ajuste aqui a configuração financeira recorrente do contrato.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-6">
                  {form.tipoVigencia === 'indeterminado' ? (
                    <>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Valor recorrente
                        </label>
                        <input
                          type="text"
                          value={form.valorRecorrente}
                          onChange={(event) => atualizarCampo('valorRecorrente', formatarMoedaInput(event.target.value))}
                          className={FIELD_CLASSNAME}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Vencimento
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={form.diaVencimento}
                          onChange={(event) => atualizarCampo('diaVencimento', event.target.value)}
                          className={FIELD_CLASSNAME}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Próximo faturamento
                        </label>
                        <DatePickerPT
                          value={form.proximoFaturamento}
                          onChange={(value) => {
                            if (form.tipoVigencia === 'indeterminado') atualizarCampo('proximoFaturamento', value);
                          }}
                          disabled={form.tipoVigencia !== 'indeterminado'}
                          className={`h-10 rounded-xl !border !border-[#BFDBFE] pr-9 dark:!border-blue-500/35 dark:bg-neutral-900 dark:text-slate-100 ${
                            form.tipoVigencia !== 'indeterminado' ? 'opacity-70 cursor-not-allowed' : ''
                          }`}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Régua de cobrança
                        </label>
                        <SingleSelectDropdown
                          options={reguasCobranca.map((regua) => ({ value: regua.id, label: regua.nome }))}
                          value={form.idReguaCobranca}
                          onChange={(value) => atualizarCampo('idReguaCobranca', value)}
                          placeholder="Selecione"
                          buttonClassName="!h-10 !w-full !min-w-0 !rounded-xl !border-[#BFDBFE] dark:!border-blue-500/35"
                          menuClassName="!w-full !rounded-2xl !border-slate-200 dark:!border-neutral-700 !bg-white dark:!bg-neutral-900"
                          menuContentClassName="max-h-80"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Conta bancária
                        </label>
                        <SingleSelectDropdown
                          options={contasBancarias.map((conta) => ({ value: conta.id, label: conta.nome }))}
                          value={form.idContaBancaria}
                          onChange={(value) => atualizarCampo('idContaBancaria', value)}
                          placeholder="Selecione"
                          buttonClassName="!h-10 !w-full !min-w-0 !rounded-xl !border-[#BFDBFE] dark:!border-blue-500/35"
                          menuClassName="!w-full !rounded-2xl !border-slate-200 dark:!border-neutral-700 !bg-white dark:!bg-neutral-900"
                          menuContentClassName="max-h-80"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Ocorrência
                        </label>
                        <SingleSelectDropdown
                          options={[
                            { value: 'Mensal', label: 'Mensal' },
                            { value: 'Bimestral', label: 'Bimestral' },
                            { value: 'Trimestral', label: 'Trimestral' },
                            { value: 'Semestral', label: 'Semestral' },
                            { value: 'Anual', label: 'Anual' },
                          ]}
                          value={form.ocorrencia}
                          onChange={(value) => atualizarCampo('ocorrencia', value as FormState['ocorrencia'])}
                          placeholder="Selecione"
                          buttonClassName="!h-10 !w-full !min-w-0 !rounded-xl !border-[#BFDBFE] dark:!border-blue-500/35"
                          menuClassName="!w-full !rounded-2xl !border-slate-200 dark:!border-neutral-700 !bg-white dark:!bg-neutral-900"
                          menuContentClassName="max-h-80"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Valor total
                        </label>
                        <input
                          type="text"
                          value={form.valorRecorrente}
                          onChange={(event) => atualizarCampo('valorRecorrente', formatarMoedaInput(event.target.value))}
                          className={FIELD_CLASSNAME}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Primeiro vencimento
                        </label>
                        <DatePickerPT
                          value={form.proximoFaturamento}
                          onChange={(value) => atualizarCampo('proximoFaturamento', value)}
                          className="h-10 rounded-xl !border !border-[#BFDBFE] pr-9 dark:!border-blue-500/35 dark:bg-neutral-900 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Ocorrência
                        </label>
                        <SingleSelectDropdown
                          options={[
                            { value: 'Mensal', label: 'Mensal' },
                            { value: 'Bimestral', label: 'Bimestral' },
                            { value: 'Trimestral', label: 'Trimestral' },
                            { value: 'Semestral', label: 'Semestral' },
                            { value: 'Anual', label: 'Anual' },
                          ]}
                          value={form.ocorrencia}
                          onChange={(value) => atualizarCampo('ocorrencia', value as FormState['ocorrencia'])}
                          placeholder="Selecione"
                          buttonClassName="!h-10 !w-full !min-w-0 !rounded-xl !border-[#BFDBFE] dark:!border-blue-500/35"
                          menuClassName="!w-full !rounded-2xl !border-slate-200 dark:!border-neutral-700 !bg-white dark:!bg-neutral-900"
                          menuContentClassName="max-h-80"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Régua de cobrança
                        </label>
                        <SingleSelectDropdown
                          options={reguasCobranca.map((regua) => ({ value: regua.id, label: regua.nome }))}
                          value={form.idReguaCobranca}
                          onChange={(value) => atualizarCampo('idReguaCobranca', value)}
                          placeholder="Selecione"
                          buttonClassName="!h-10 !w-full !min-w-0 !rounded-xl !border-[#BFDBFE] dark:!border-blue-500/35"
                          menuClassName="!w-full !rounded-2xl !border-slate-200 dark:!border-neutral-700 !bg-white dark:!bg-neutral-900"
                          menuContentClassName="max-h-80"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Conta bancária
                        </label>
                        <SingleSelectDropdown
                          options={contasBancarias.map((conta) => ({ value: conta.id, label: conta.nome }))}
                          value={form.idContaBancaria}
                          onChange={(value) => atualizarCampo('idContaBancaria', value)}
                          placeholder="Selecione"
                          buttonClassName="!h-10 !w-full !min-w-0 !rounded-xl !border-[#BFDBFE] dark:!border-blue-500/35"
                          menuClassName="!w-full !rounded-2xl !border-slate-200 dark:!border-neutral-700 !bg-white dark:!bg-neutral-900"
                          menuContentClassName="max-h-80"
                        />
                      </div>
                    </>
                  )}
                </div>
                {form.tipoVigencia === 'determinado' ? (
                  <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-6">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Número de parcelas
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={form.numeroParcelas}
                        onChange={(event) => atualizarCampo('numeroParcelas', event.target.value)}
                        className={FIELD_CLASSNAME}
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-black">
                <h3 className="inline-flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                  <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                  Reajuste de Contrato
                </h3>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Data do próximo reajuste
                    </label>
                    <DatePickerPT
                      value={form.dataProximoReajuste}
                      onChange={(value) => atualizarCampo('dataProximoReajuste', value)}
                      className="h-10 rounded-xl !border !border-[#BFDBFE] pr-9 dark:!border-blue-500/35 dark:bg-neutral-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Índice de reajuste
                    </label>
                    <SingleSelectDropdown
                      options={[
                        { value: 'IGP-M', label: 'IGP-M' },
                        { value: 'IPCA', label: 'IPCA' },
                        { value: 'Fixo (%)', label: 'Fixo (%)' },
                      ]}
                      value={form.indiceReajuste}
                      onChange={(value) => {
                        const novoIndice = value as FormState['indiceReajuste'];
                        atualizarCampo('indiceReajuste', novoIndice);
                        if (novoIndice !== 'Fixo (%)') {
                          atualizarCampo('percentualReajusteFixo', '');
                        }
                      }}
                      placeholder="Selecione"
                      buttonClassName="!h-10 !w-full !min-w-0 !rounded-xl !border-[#BFDBFE] dark:!border-blue-500/35"
                      menuClassName="!rounded-2xl !border-slate-200 dark:!border-neutral-700 !bg-white dark:!bg-neutral-900"
                    />
                  </div>
                  {form.indiceReajuste === 'Fixo (%)' ? (
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Percentual fixo
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.percentualReajusteFixo}
                        onChange={(event) => atualizarCampo('percentualReajusteFixo', event.target.value)}
                        className={FIELD_CLASSNAME}
                        placeholder="0,00"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'faturamento' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-black">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="inline-flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100">
                      <ReceiptText className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                      Faturamento
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Acompanhe o histórico das parcelas já geradas e crie novas parcelas com base na configuração do contrato.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    {form.tipoVigencia === 'indeterminado' ? (
                      <div className="w-full sm:w-[170px]">
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Número de parcelas
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={quantidadeParcelasFuturas}
                          onChange={(event) => setQuantidadeParcelasFuturas(event.target.value)}
                          className={FIELD_CLASSNAME}
                        />
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void gerarParcelasContrato()}
                      disabled={gerandoParcelas}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {gerandoParcelas ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Gerar novas parcelas
                    </button>
                    <button
                      type="button"
                      onClick={limparParcelasFaturamento}
                      disabled={parcelasFaturamentoExibidas.length === 0}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-black dark:text-slate-300 dark:hover:bg-neutral-900"
                    >
                      Limpar parcelas
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 dark:border-neutral-800 dark:bg-neutral-950/40">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Parcelas geradas
                    </div>
                    <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {parcelasFaturamentoExibidas.length}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 dark:border-neutral-800 dark:bg-neutral-950/40">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Próximo faturamento
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {formatarDataBR(form.proximoFaturamento)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 dark:border-neutral-800 dark:bg-neutral-950/40">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Modelo de geração
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {form.tipoVigencia === 'determinado'
                        ? `${form.numeroParcelas || '1'} parcelas ${form.ocorrencia.toLowerCase()}`
                        : `Recorrência ${form.ocorrencia.toLowerCase()}`}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-black">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Histórico de parcelas</h3>

                {parcelasFaturamentoExibidas.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center text-sm text-slate-500 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-slate-400">
                    Nenhuma parcela foi gerada para este contrato até o momento.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {parcelasFaturamentoExibidas.map((parcela) => {
                      const status = (parcela.status || 'EM_ABERTO').toUpperCase();
                      const statusClassName =
                        status === 'PAGO'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                          : status === 'VENCIDO'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300';

                      return (
                        <div
                          key={parcela.id}
                          className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-4 md:grid-cols-[120px_1.6fr_140px_160px_160px_56px] dark:border-neutral-800 dark:bg-neutral-950/40"
                        >
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                              Parcela
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {parcela.numero_parcela}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                              Descrição
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {parcela.descricao_parcela || 'Sem descrição'}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                              Vencimento
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {formatarDataBR(parcela.data_vencimento)}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                              Valor
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {formatarMoedaNumero(Number(parcela.valor_original || 0))}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                              Status
                            </div>
                            <div className="mt-2">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName}`}>
                                {status === 'EM_ABERTO' ? 'Em aberto' : status === 'PAGO' ? 'Pago' : status === 'VENCIDO' ? 'Vencido' : status}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-start justify-end md:pt-5">
                            <button
                              type="button"
                              onClick={() => excluirParcelaFaturamento(parcela.id)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-900/40 dark:bg-neutral-950 dark:text-rose-300 dark:hover:bg-rose-950/20"
                              title="Excluir parcela"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/erp/negocios/contratos')}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-neutral-800 dark:bg-black dark:text-slate-300 dark:hover:bg-neutral-800"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={() => void salvar()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salvar
          </button>
        </div>
      </div>
      <ClienteDrawer
        isOpen={clienteDrawerAberto}
        onClose={() => setClienteDrawerAberto(false)}
        clienteId={form.idCliente || null}
      />
    </div>
  );
}


