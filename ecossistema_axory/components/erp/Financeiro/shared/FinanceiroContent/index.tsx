import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Loader2, MoreVertical, Copy, Trash2, ChevronDown, ChevronLeft, ChevronRight, X, Wallet, CalendarDays, UploadCloud, Paperclip, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import DateRangePicker from '../../../Negocios/propostas/components/DateRangePicker';
import SearchBar from '../../../Negocios/propostas/components/SearchBar';
import MultiSelectDropdown from '../../../Negocios/propostas/components/MultiSelectDropdown';
import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import ColumnVisibilityDropdown from '@/components/ui/ColumnVisibilityDropdown';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { MainTab } from './types';

interface FinanceiroContentProps {
  activeTab?: MainTab;
}

/** Interface alinhada com a tabela erp_parcelas */
interface Parcela {
  id: string;
  id_empresa: string;
  numero_parcela: number | null;
  total_parcelas?: number | null;
  descricao_parcela: string | null;
  valor_original: number;
  valor_acrescimos: number | null;
  valor_quitado_total: number | null;
  saldo_devedor: number | null;
  data_emissao?: string | null;
  criado_em?: string | null;
  data_vencimento: string;
  data_quitacao_total: string | null;
  status: string | null;
  lancamento: string | null;
  id_categoria: string | null;
  id_departamento?: string | null;
  id_projeto?: string | null;
  id_pedido_venda?: string | null;
  id_proposta?: string | null;
  id_os?: string | null;
  id_contato?: string | null;
  id_despesa: string | null;
  id_contrato: string | null;
  id_conta_bancaria: string | null;
  observacoes_pagamento?: string | null;
}

interface ExtratoItem {
  id: string;
  id_parcela: string | null;
  id_conta_bancaria: string;
  id_categoria: string | null;
  descricao: string | null;
  valor_total: number;
  valor_desconto?: number | null;
  data_pagamento: string;
  tipo_movimentacao: 'entrada' | 'saida';
  conciliado: boolean;
  id_forma_pagamento?: string | null;
}

interface CodigoItem {
  id: string;
  codigo: string;
  titulo?: string | null;
  id_vendedor?: string | null;
}

interface ContaItem {
  id_conta: string;
  nome_conta: string;
}

interface CategoriaItem {
  id_categoria: string;
  nome_categoria: string;
}

interface DepartamentoItem {
  id: string;
  nome: string;
}

interface ProjetoItem {
  id: string;
  nome: string;
}

interface VendedorItem {
  id: string;
  nome_completo: string;
}

interface DespesaItem {
  id: string;
  descricao: string;
}

interface ContratoItem {
  id: string;
  status: string;
}

interface FormaPagamentoItem {
  id: string;
  nome: string;
}

interface ContatoItem {
  id: string;
  nome_razao_social: string;
  tag_principal?: string | null;
}

function formatarCodigo4Digitos(valor: unknown): string {
  const somenteDigitos = String(valor ?? '').replace(/\D/g, '');
  if (!somenteDigitos) return '';
  return somenteDigitos.padStart(4, '0');
}

function renderTextoComNumeroFinalNegrito(texto: string) {
  const match = texto.match(/^(.*>\s*)(\d+)$/);
  if (!match) return texto;
  return (
    <>
      <span>{match[1]}</span>
      <span className="font-bold">{match[2]}</span>
    </>
  );
}

interface BaixaParcelaFormState {
  parcela: Parcela;
  tipo: 'receber' | 'pagar';
  dataPagamento: string;
  valorPagoDigits: string;
  jurosMultaDigits: string;
  descontoDigits: string;
  taxaDigits: string;
  acrescimoDigits: string;
  observacoes: string;
  contaId: string;
  formaPagamentoId: string;
}

type ParcelaColumnKey =
  | 'select'
  | 'vencimento'
  | 'parcela'
  | 'lancamento'
  | 'conta'
  | 'departamento'
  | 'projeto'
  | 'vendedor'
  | 'forma'
  | 'valor'
  | 'status'
  | 'acoes';

const PARCELA_COLUMN_ORDER: ParcelaColumnKey[] = [
  'select',
  'vencimento',
  'parcela',
  'lancamento',
  'conta',
  'departamento',
  'projeto',
  'vendedor',
  'forma',
  'valor',
  'status',
  'acoes',
];

const PARCELA_COLUMN_LABELS: Record<ParcelaColumnKey, string> = {
  select: 'Selecao',
  vencimento: 'Vencimento',
  parcela: 'Parcela',
  lancamento: 'Lançamento',
  conta: 'Conta',
  departamento: 'Departamento',
  projeto: 'Projeto',
  vendedor: 'Vendedor',
  forma: 'Forma de Pgto',
  valor: 'Valor',
  status: 'Status',
  acoes: 'Ações',
};
const PARCELA_FIXED_VISIBLE_COLUMNS: ParcelaColumnKey[] = [
  'select',
  'vencimento',
  'parcela',
  'lancamento',
  'valor',
  'status',
  'acoes',
];
const PARCELA_TOGGLEABLE_COLUMNS = PARCELA_COLUMN_ORDER.filter(
  (key) => !PARCELA_FIXED_VISIBLE_COLUMNS.includes(key)
);

const PARCELA_COLUMN_WIDTHS: Record<ParcelaColumnKey, number> = {
  select: 50,
  vencimento: 100,
  parcela: 120,
  lancamento: 430,
  conta: 130,
  departamento: 140,
  projeto: 130,
  vendedor: 160,
  forma: 100,
  valor: 130,
  status: 115,
  acoes: 115,
};
const PARCELA_LANCAMENTO_MIN_WIDTH = 180;

const EXTRATO_COLUMN_WIDTHS = {
  select: 40,
  data: 64,
  descricao: 340,
  lancamento: 170,
  conta: 140,
  departamento: 150,
  projeto: 150,
  vendedor: 160,
  forma: 84,
  valor: 120,
  tipo: 100,
} as const;
const MAX_COMPROVANTE_BYTES = 2 * 1024 * 1024;

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}

function formatarValorInputBRL(digits: string): string {
  const somenteNumeros = (digits || '').replace(/\D/g, '');
  const centavos = Number(somenteNumeros || '0');
  const valor = centavos / 100;
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarStatusParcela(status: string | null | undefined): string {
  const valor = (status || '').toUpperCase();
  const mapa: Record<string, string> = {
    EM_ABERTO: 'Em Aberto',
    PAGO: 'Pago',
    PARCIALMENTE_PAGO: 'Parcialmente Pago',
    VENCIDO: 'Vencido',
    CANCELADO: 'Cancelado',
  };
  return mapa[valor] || 'Sem status';
}

function classeStatusParcela(status: string | null | undefined): string {
  const valor = (status || '').toUpperCase();
  if (valor === 'PAGO') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  if (valor === 'PARCIALMENTE_PAGO') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  if (valor === 'VENCIDO') return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
  if (valor === 'CANCELADO') return 'bg-slate-200 text-slate-700 dark:bg-neutral-700 dark:text-slate-200';
  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
}

function parseISODateLocal(valor: string): Date | null {
  if (!valor) return null;
  const [ano, mes, dia] = valor.split('-').map(Number);
  if (!ano || !mes || !dia) return null;
  return new Date(ano, mes - 1, dia);
}

function toISODateLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = `${data.getMonth() + 1}`.padStart(2, '0');
  const dia = `${data.getDate()}`.padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function montarDiasMes(base: Date): Array<Date | null> {
  const ano = base.getFullYear();
  const mes = base.getMonth();
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const diasNoMes = ultimoDia.getDate();
  const inicioSemana = (primeiroDia.getDay() + 6) % 7;
  const totalCelulas = 42;

  return Array.from({ length: totalCelulas }, (_, idx) => {
    const dia = idx - inicioSemana + 1;
    if (dia < 1 || dia > diasNoMes) return null;
    return new Date(ano, mes, dia);
  });
}

function mesmoDia(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function DatePickerPagamento({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mesBase, setMesBase] = useState(() => {
    const data = parseISODateLocal(value) || new Date();
    return new Date(data.getFullYear(), data.getMonth(), 1);
  });
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const selecionada = parseISODateLocal(value);
  const dias = montarDiasMes(mesBase);
  const NOMES_MESES = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const NOMES_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="h-10 w-full rounded-xl border border-blue-200 bg-white px-3 flex items-center justify-between gap-3 text-sm hover:border-blue-400 transition-colors dark:border-blue-500/35 dark:bg-neutral-800 dark:hover:border-blue-400/50"
      >
        <span className={value ? 'text-slate-700 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}>
          {value ? formatarData(value) : 'Selecionar data'}
        </span>
        <CalendarDays size={15} className="text-slate-500 dark:text-slate-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 rounded-2xl border border-slate-200 bg-white shadow-xl p-4 w-[340px] dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setMesBase((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-neutral-700 dark:text-slate-300 dark:hover:bg-neutral-800"
            >
              <ChevronLeft size={14} className="mx-auto" />
            </button>
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-100">
              {NOMES_MESES[mesBase.getMonth()]} {mesBase.getFullYear()}
            </div>
            <button
              type="button"
              onClick={() => setMesBase((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-neutral-700 dark:text-slate-300 dark:hover:bg-neutral-800"
            >
              <ChevronRight size={14} className="mx-auto" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            {NOMES_SEMANA.map((nome) => (
              <div key={nome} className="h-6 flex items-center justify-center">
                {nome}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {dias.map((dia, idx) => {
              if (!dia) return <div key={`vazio-${idx}`} className="h-8" />;
              const isSelected = mesmoDia(dia, selecionada);
              return (
                <button
                  key={`${dia.getTime()}-${idx}`}
                  type="button"
                  onClick={() => {
                    onChange(toISODateLocal(dia));
                    setOpen(false);
                  }}
                  className={[
                    'h-8 w-8 mx-auto rounded-lg text-xs font-medium transition-colors',
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-neutral-800',
                  ].join(' ')}
                >
                  {dia.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function valorLiquidoParcela(parcela: Parcela): number {
  const original = Number(parcela.valor_original || 0);
  const acrescimos = Number(parcela.valor_acrescimos || 0);
  return original + acrescimos;
}

function valorPendenteParcela(parcela: Parcela): number {
  const saldo = Number(parcela.saldo_devedor ?? NaN);
  if (Number.isFinite(saldo) && saldo > 0) return saldo;
  return valorLiquidoParcela(parcela);
}

function formatarData(valor?: string | null): string {
  if (!valor) return '-';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(data);
}

function statusPago(status: string | null | undefined): boolean {
  const base = (status || '').toLowerCase();
  return base.includes('pago') || base.includes('quitad') || base.includes('conclu');
}

function erroTabelaInexistente(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const message = String((error as { message?: string }).message || '').toLowerCase();
  return message.includes('does not exist') || message.includes('relation') || message.includes('42p01');
}

function dataDentroDoIntervalo(valor: string | null | undefined, inicio: string, fim: string): boolean {
  if (!valor) return false;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return false;

  if (inicio) {
    const inicioData = new Date(`${inicio}T00:00:00`);
    if (data < inicioData) return false;
  }

  if (fim) {
    const fimData = new Date(`${fim}T23:59:59`);
    if (data > fimData) return false;
  }

  return true;
}

export default function FinanceiroContent({ activeTab = 'contas_pagar' }: FinanceiroContentProps) {
  const router = useRouter();
  const { idEmpresa, user } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [mainTabAtiva, setMainTabAtiva] = useState<MainTab>(activeTab);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [baixandoParcelaId, setBaixandoParcelaId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openMenuParcelaId, setOpenMenuParcelaId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const [parcelVisibleCols, setParcelVisibleCols] = useState<Record<ParcelaColumnKey, boolean>>({
    select: true,
    vencimento: true,
    parcela: true,
    lancamento: true,
    conta: true,
    departamento: true,
    projeto: true,
    vendedor: true,
    forma: true,
    valor: true,
    status: true,
    acoes: true,
  });
  const [colunasCarregadas, setColunasCarregadas] = useState(false);
  const [openBuscasAvancadas, setOpenBuscasAvancadas] = useState(false);
  const [baixaParcelaForm, setBaixaParcelaForm] = useState<BaixaParcelaFormState | null>(null);
  const [baixaDrawerTab, setBaixaDrawerTab] = useState<'baixa' | 'parcelas' | 'historico' | 'comprovantes'>('baixa');
  const [mostrarPagamentosEfetivados, setMostrarPagamentosEfetivados] = useState(false);
  const [salvandoBaixa, setSalvandoBaixa] = useState(false);
  const [acaoMassaLoading, setAcaoMassaLoading] = useState<'liquidar' | 'desliquidar' | 'excluir' | null>(null);
  const [comprovanteArquivo, setComprovanteArquivo] = useState<File | null>(null);
  const [comprovanteErro, setComprovanteErro] = useState<string | null>(null);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDataRanges, setFilterDataRanges] = useState<Record<string, { inicio: string; fim: string }>>({
    vencimento: { inicio: '', fim: '' },
    emissao: { inicio: '', fim: '' },
    pagamento: { inicio: '', fim: '' },
  });
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterDepartamentos, setFilterDepartamentos] = useState<string[]>([]);
  const [filterProjetos, setFilterProjetos] = useState<string[]>([]);
  const [filterVendedores, setFilterVendedores] = useState<string[]>([]);
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const [parcelasTableWrapperEl, setParcelasTableWrapperEl] = useState<HTMLDivElement | null>(null);
  const [parcelasTableViewportWidth, setParcelasTableViewportWidth] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const comprovanteInputRef = useRef<HTMLInputElement | null>(null);

  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [extrato, setExtrato] = useState<ExtratoItem[]>([]);

  const [mapaVendas, setMapaVendas] = useState<Map<string, CodigoItem>>(new Map());
  const [mapaPropostas, setMapaPropostas] = useState<Map<string, CodigoItem>>(new Map());
  const [mapaOrdens, setMapaOrdens] = useState<Map<string, CodigoItem>>(new Map());
  const [mapaContratos, setMapaContratos] = useState<Map<string, ContratoItem>>(new Map());
  const [mapaDespesas, setMapaDespesas] = useState<Map<string, DespesaItem>>(new Map());
  const [mapaContas, setMapaContas] = useState<Map<string, ContaItem>>(new Map());
  const [mapaFormasPagamento, setMapaFormasPagamento] = useState<Map<string, FormaPagamentoItem>>(new Map());
  const [mapaContatos, setMapaContatos] = useState<Map<string, ContatoItem>>(new Map());
  const [mapaCategorias, setMapaCategorias] = useState<Map<string, CategoriaItem>>(new Map());
  const [mapaDepartamentos, setMapaDepartamentos] = useState<Map<string, DepartamentoItem>>(new Map());
  const [mapaProjetos, setMapaProjetos] = useState<Map<string, ProjetoItem>>(new Map());
  const [mapaVendedores, setMapaVendedores] = useState<Map<string, VendedorItem>>(new Map());

  const colunasStorageKey = useMemo(() => `erp.financeiro.colunas.${user?.id || idEmpresa || 'default'}`, [user?.id, idEmpresa]);
  const normalizeParcelVisibleCols = useCallback(
    (cols: Record<ParcelaColumnKey, boolean>): Record<ParcelaColumnKey, boolean> => {
      const next = { ...cols };
      PARCELA_FIXED_VISIBLE_COLUMNS.forEach((key) => {
        next[key] = true;
      });
      return next;
    },
    []
  );
  const showColConta = parcelVisibleCols.conta;
  const showColDepartamento = parcelVisibleCols.departamento;
  const showColProjeto = parcelVisibleCols.projeto;
  const showColVendedor = parcelVisibleCols.vendedor;

  useEffect(() => {
    setMainTabAtiva(activeTab);
  }, [activeTab]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setFilterStatus([]);
  }, [mainTabAtiva]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setColunasCarregadas(false);

    try {
      const raw = window.localStorage.getItem(colunasStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Record<ParcelaColumnKey, boolean>>;
        setParcelVisibleCols((prev) => normalizeParcelVisibleCols({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('Erro ao carregar preferencias de colunas:', error);
    } finally {
      setColunasCarregadas(true);
    }
  }, [colunasStorageKey]);

  useEffect(() => {
    if (!colunasCarregadas || typeof window === 'undefined') return;

    window.localStorage.setItem(
      colunasStorageKey,
      JSON.stringify(normalizeParcelVisibleCols(parcelVisibleCols))
    );
  }, [colunasCarregadas, colunasStorageKey, parcelVisibleCols, normalizeParcelVisibleCols]);

  useEffect(() => {
    const element = parcelasTableWrapperEl;
    if (!element || typeof window === 'undefined') return;

    const updateWidth = () => setParcelasTableViewportWidth(element.clientWidth || 0);
    updateWidth();

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(element);
    window.addEventListener('resize', updateWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [parcelasTableWrapperEl]);

  const widthStyle = useCallback((width: number) => ({ width: `${width}px` }), []);

  const startColumnResize = useCallback(
    (
      _table: 'parcelas' | 'extrato',
      _key: string,
      _currentWidth: number,
      _event: ReactMouseEvent<HTMLSpanElement>
    ) => {
      // Resize por arraste desativado. Mantemos larguras fixas por configuracao.
    },
    []
  );

  const carregarDados = useCallback(async () => {
    if (!idEmpresa) {
      setLoading(false);
      setParcelas([]);
      setExtrato([]);
      return;
    }

    setLoading(true);
    setErro(null);

    const [resParcelas, resExtrato] = await Promise.all([
      supabase
        .from('erp_parcelas')
        .select(
          'id, id_empresa, numero_parcela, total_parcelas, descricao_parcela, valor_original, valor_acrescimos, valor_quitado_total, saldo_devedor, criado_em, data_vencimento, data_quitacao_total, status, lancamento, observacoes_pagamento, id_categoria, id_departamento, id_projeto, id_pedido_venda, id_proposta, id_os, id_contato, id_despesa, id_contrato, id_conta_bancaria'
        )
        .eq('id_empresa', idEmpresa)
        .order('data_vencimento', { ascending: true }),
      supabase
        .from('erp_extrato')
        .select('id, id_parcela, id_conta_bancaria, id_categoria, descricao, valor_total, valor_desconto, id_forma_pagamento, data_pagamento, tipo_movimentacao, conciliado')
        .eq('id_empresa', idEmpresa)
        .order('data_pagamento', { ascending: false })
        .limit(300),
    ]);

    if (resParcelas.error || resExtrato.error) {
      console.error('Erro ao carregar financeiro:', resParcelas.error || resExtrato.error);
      setErro('Nao foi possivel carregar os dados do financeiro.');
      setLoading(false);
      return;
    }

    const parcelasData = (resParcelas.data || []) as Parcela[];
    const extratoData = (resExtrato.data || []) as ExtratoItem[];

    setParcelas(parcelasData);
    setExtrato(extratoData);

    const idsPedidosVenda = Array.from(new Set(parcelasData.map((p) => p.id_pedido_venda).filter(Boolean))) as string[];
    const idsPropostas = Array.from(new Set(parcelasData.map((p) => p.id_proposta).filter(Boolean))) as string[];
    const idsOrdens = Array.from(new Set(parcelasData.map((p) => p.id_os).filter(Boolean))) as string[];
    const idsContratos = Array.from(new Set(parcelasData.map((p) => p.id_contrato).filter(Boolean))) as string[];
    const idsContatos = Array.from(new Set(parcelasData.map((p) => p.id_contato).filter(Boolean))) as string[];
    const idsDespesas = Array.from(new Set(parcelasData.map((p) => p.id_despesa).filter(Boolean))) as string[];
    const idsCategorias = Array.from(
      new Set([...parcelasData.map((p) => p.id_categoria), ...extratoData.map((e) => e.id_categoria)].filter(Boolean))
    ) as string[];

    const [resPedidosVenda, resPropostas, resOrdens, resContratos, resContatos, resDespesas, resContas, resFormasPagamento, resCategorias, resDepartamentos, resProjetos] = await Promise.all([
      idsPedidosVenda.length > 0
        ? supabase.from('erp_pedidos_venda').select('id, codigo_numero, titulo, id_vendedor').in('id', idsPedidosVenda)
        : Promise.resolve({ data: [], error: null }),
      idsPropostas.length > 0
        ? supabase.from('erp_propostas').select('id, codigo:codigo_completo, id_vendedor').in('id', idsPropostas)
        : Promise.resolve({ data: [], error: null }),
      idsOrdens.length > 0
        ? supabase.from('erp_os').select('id, codigo:codigo_os').in('id', idsOrdens)
        : Promise.resolve({ data: [], error: null }),
      idsContratos.length > 0
        ? supabase.from('erp_contratos').select('id, status').in('id', idsContratos)
        : Promise.resolve({ data: [], error: null }),
      idsContatos.length > 0
        ? supabase.from('erp_contatos').select('id, nome_razao_social, tag_principal').in('id', idsContatos)
        : Promise.resolve({ data: [], error: null }),
      idsDespesas.length > 0
        ? supabase.from('erp_despesas').select('id, descricao').in('id', idsDespesas)
        : Promise.resolve({ data: [], error: null }),
      supabase.from('erp_contas_bancarias').select('id_conta, nome_conta').eq('id_empresa', idEmpresa),
      supabase
        .from('erp_formas_pagamento')
        .select('id, nome')
        .or(`id_empresa.is.null,id_empresa.eq.${idEmpresa}`),
      idsCategorias.length > 0
        ? supabase.from('erp_categorias').select('id_categoria, nome_categoria').in('id_categoria', idsCategorias)
        : Promise.resolve({ data: [], error: null }),
      supabase.from('erp_departamentos').select('id, nome').eq('id_empresa', idEmpresa),
      supabase.from('erp_projetos').select('id, nome').eq('id_empresa', idEmpresa),
    ]);

    const resVendedores = await supabase
      .from('erp_vendedores')
      .select('id, nome_completo')
      .eq('id_empresa', idEmpresa);

    if (resVendedores.error && !erroTabelaInexistente(resVendedores.error)) {
      console.error('Erro ao carregar vendedores:', resVendedores.error);
    }

    if (resPedidosVenda.error || resPropostas.error || resContatos.error || resContas.error || resFormasPagamento.error || resCategorias.error || resDepartamentos.error || resProjetos.error) {
      console.error(
        'Erro ao carregar referencias do financeiro:',
        resPedidosVenda.error || resPropostas.error || resContatos.error || resContas.error || resFormasPagamento.error || resCategorias.error || resDepartamentos.error || resProjetos.error
      );
      setErro('Nao foi possivel carregar todas as referencias do financeiro.');
    }

    if (resOrdens.error && !erroTabelaInexistente(resOrdens.error)) {
      console.error('Erro ao carregar ordens de serviço:', resOrdens.error);
      setErro('Erro ao carregar ordens de serviço.');
    }

    if (resDespesas.error && !erroTabelaInexistente(resDespesas.error)) {
      console.error('Erro ao carregar despesas:', resDespesas.error);
      setErro('Erro ao carregar despesas.');
    }

    if (resContratos.error && !erroTabelaInexistente(resContratos.error)) {
      console.error('Erro ao carregar contratos:', resContratos.error);
      setErro('Erro ao carregar contratos.');
    }

    const pedidosVendaFormatados = ((resPedidosVenda.data || []) as Array<{ id: string; codigo_numero: string | number | null; titulo?: string | null; id_vendedor?: string | null }>).map((item) => ({
      id: item.id,
      codigo: formatarCodigo4Digitos(item.codigo_numero),
      titulo: item.titulo ?? null,
      id_vendedor: item.id_vendedor ?? null,
    }));

    setMapaVendas(new Map(pedidosVendaFormatados.map((item) => [item.id, item])));
    setMapaPropostas(new Map(((resPropostas.data || []) as CodigoItem[]).map((item) => [item.id, item])));
    setMapaOrdens(new Map((((resOrdens.data || []) as CodigoItem[]) || []).map((item) => [item.id, item])));
    setMapaContratos(new Map((((resContratos.data || []) as ContratoItem[]) || []).map((item) => [item.id, item])));
    setMapaContatos(new Map((((resContatos.data || []) as ContatoItem[]) || []).map((item) => [item.id, item])));
    setMapaDespesas(new Map((((resDespesas.data || []) as DespesaItem[]) || []).map((item) => [item.id, item])));
    setMapaContas(new Map(((resContas.data || []) as ContaItem[]).map((item) => [item.id_conta, item])));
    setMapaFormasPagamento(new Map((((resFormasPagamento.data || []) as FormaPagamentoItem[]) || []).map((item) => [item.id, item])));
    setMapaCategorias(new Map(((resCategorias.data || []) as CategoriaItem[]).map((item) => [item.id_categoria, item])));
    setMapaDepartamentos(new Map(((resDepartamentos.data || []) as DepartamentoItem[]).map((item) => [item.id, item])));
    setMapaProjetos(new Map(((resProjetos.data || []) as ProjetoItem[]).map((item) => [item.id, item])));
    setMapaVendedores(new Map(((resVendedores.data || []) as VendedorItem[]).map((item) => [item.id, item])));

    setLoading(false);
  }, [idEmpresa]);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    if (!baixaParcelaForm) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [baixaParcelaForm]);

  const parcelaPorId = useMemo(() => new Map(parcelas.map((parcela) => [parcela.id, parcela])), [parcelas]);
  const ultimoExtratoPorParcela = useMemo(() => {
    const mapa = new Map<string, ExtratoItem>();
    extrato.forEach((item) => {
      if (!item.id_parcela) return;
      const atual = mapa.get(item.id_parcela);
      const atualTs = atual ? new Date(atual.data_pagamento).getTime() : 0;
      const novoTs = new Date(item.data_pagamento).getTime();
      if (!atual || novoTs >= atualTs) {
        mapa.set(item.id_parcela, item);
      }
    });
    return mapa;
  }, [extrato]);

  /** Contas a receber: parcelas sem id_despesa (vendas, propostas, OS, contratos) */
  const parcelasReceber = useMemo(
    () => parcelas.filter((parcela) => !parcela.id_despesa),
    [parcelas]
  );

  const parcelasPagar = useMemo(() => parcelas.filter((parcela) => Boolean(parcela.id_despesa)), [parcelas]);

  const toggleAllParcelas = (lista: Parcela[]) => {
    const ids = lista.map((p) => p.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) => (allSelected ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]));
  };

  const toggleOneParcela = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleAllExtrato = () => {
    const ids = extrato.map((e) => e.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) => (allSelected ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]));
  };

  const toggleOneExtrato = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        const isButton = Object.values(menuButtonRefs.current).some((btn) => btn?.contains(e.target as Node));
        if (!isButton) setOpenMenuParcelaId(null);
      }
    };
    if (openMenuParcelaId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuParcelaId]);

  const handleMenuClick = (parcelaId: string) => {
    const btn = menuButtonRefs.current[parcelaId];
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setMenuPosition({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setOpenMenuParcelaId((prev) => (prev === parcelaId ? null : parcelaId));
  };

  const copiarParcela = (parcela: Parcela) => {
    const texto = `${lancamentoParcela(parcela)} - ${parcelasLabel(parcela)} - ${formatarMoeda(valorLiquidoParcela(parcela))} - Venc: ${formatarData(parcela.data_vencimento)}`;
    navigator.clipboard.writeText(texto);
    setOpenMenuParcelaId(null);
  };

  const abrirDetalhesParcela = (parcela: Parcela, tipo: 'receber' | 'pagar') => {
    setOpenMenuParcelaId(null);
    router.push(`/erp/financeiro/lancamentos/${parcela.id}?origem=${tipo}`);
  };

  const excluirParcela = async (parcela: Parcela) => {
    if (!idEmpresa) return;
    setOpenMenuParcelaId(null);
    setErro(null);
    const { error } = await supabase.from('erp_parcelas').delete().eq('id', parcela.id).eq('id_empresa', idEmpresa);
    if (error) {
      setErro(error.message || 'Nao foi possivel excluir a parcela.');
      return;
    }
    await carregarDados();
  };

  const resumo = useMemo(() => {
    const receberAberto = parcelasReceber
      .filter((parcela) => !statusPago(parcela.status))
      .reduce((soma, parcela) => soma + valorLiquidoParcela(parcela), 0);

    const pagarAberto = parcelasPagar
      .filter((parcela) => !statusPago(parcela.status))
      .reduce((soma, parcela) => soma + valorLiquidoParcela(parcela), 0);

    const saldoExtrato = extrato.reduce((soma, item) => soma + Number(item.valor_total || 0), 0);

    return { receberAberto, pagarAberto, saldoExtrato };
  }, [parcelasReceber, parcelasPagar, extrato]);

  /** Formato: "Pedido [codigo]", "Ordem de Serviço [codigo]", "Proposta [codigo]", etc. Se nada associado, usa lancamento. */
  const lancamentoParcela = useCallback(
    (parcela: Parcela): string => {
      if (parcela.id_pedido_venda) {
        const pedido = mapaVendas.get(parcela.id_pedido_venda);
        const identificadorPedido = pedido?.codigo || pedido?.titulo?.trim() || '';
        return identificadorPedido ? `Pedido de Venda > ${identificadorPedido}` : 'Pedido de Venda';
      }
      if (parcela.id_os) {
        const os = mapaOrdens.get(parcela.id_os);
        return os ? `Ordem de Serviço ${os.codigo}` : 'Ordem de Serviço';
      }
      if (parcela.id_proposta) {
        const proposta = mapaPropostas.get(parcela.id_proposta);
        return proposta ? `Orçamento ${proposta.codigo}` : 'Orçamento';
      }
      if (parcela.id_contrato) {
        const contrato = mapaContratos.get(parcela.id_contrato);
        return contrato?.status ? `Contrato ${contrato.status}` : 'Contrato';
      }
      if (parcela.id_despesa) {
        const despesa = mapaDespesas.get(parcela.id_despesa);
        return despesa?.descricao ? `Despesa ${despesa.descricao}` : 'Despesa';
      }
      return parcela.lancamento && parcela.lancamento.trim() ? parcela.lancamento.trim() : '-';
    },
    [mapaVendas, mapaOrdens, mapaPropostas, mapaContratos, mapaDespesas]
  );

  const origemBadgeParcela = useCallback(
    (parcela: Parcela): string | null => {
    if (parcela.id_pedido_venda) {
      const pedido = mapaVendas.get(parcela.id_pedido_venda);
      const identificadorPedido = pedido?.codigo || pedido?.titulo?.trim() || '';
      return identificadorPedido ? `Pedido de Venda > ${identificadorPedido}` : 'Pedido de Venda';
    }
      if (parcela.id_os) {
        const os = mapaOrdens.get(parcela.id_os);
        return `O.S (${os?.codigo || '-'})`;
      }
      if (parcela.id_proposta) {
        const proposta = mapaPropostas.get(parcela.id_proposta);
        return `Proposta (${proposta?.codigo || '-'})`;
      }
      return null;
    },
    [mapaVendas, mapaOrdens, mapaPropostas]
  );

  /** Conta parcelas por grupo (mesmo id_pedido_venda, id_proposta, etc.) para exibir "1/10" */
  const totalPorParent = useMemo(() => {
    const map = new Map<string, number>();
    parcelas.forEach((p) => {
      const key = p.id_pedido_venda
        ? `v:${p.id_pedido_venda}`
        : p.id_proposta
          ? `p:${p.id_proposta}`
          : p.id_os
            ? `o:${p.id_os}`
            : p.id_contrato
              ? `c:${p.id_contrato}`
              : p.id_despesa
                ? `d:${p.id_despesa}`
                : null;
      if (key) {
        map.set(key, (map.get(key) || 0) + 1);
      }
    });
    return map;
  }, [parcelas]);

  const parcelasLabel = useCallback(
    (parcela: Parcela): string => {
      const key = parcela.id_pedido_venda
        ? `v:${parcela.id_pedido_venda}`
        : parcela.id_proposta
          ? `p:${parcela.id_proposta}`
          : parcela.id_os
            ? `o:${parcela.id_os}`
            : parcela.id_contrato
              ? `c:${parcela.id_contrato}`
              : parcela.id_despesa
                ? `d:${parcela.id_despesa}`
                : null;
      const total = Number(parcela.total_parcelas || 0) > 0
        ? Number(parcela.total_parcelas)
        : key
          ? totalPorParent.get(key) || 1
          : 1;
      const num = parcela.numero_parcela ?? 1;
      return `${num}/${total}`;
    },
    [totalPorParent]
  );

  const chaveRelacionamentoParcela = useCallback((parcela: Parcela): string | null => {
    if (parcela.id_pedido_venda) return `v:${parcela.id_pedido_venda}`;
    if (parcela.id_os) return `o:${parcela.id_os}`;
    if (parcela.id_despesa) return `d:${parcela.id_despesa}`;
    if (parcela.id_proposta) return `p:${parcela.id_proposta}`;
    if (parcela.id_contrato) return `c:${parcela.id_contrato}`;
    return null;
  }, []);

  const nomeDepartamentoParcela = useCallback(
    (parcela: Parcela): string => {
      if (!parcela.id_departamento) return '-';
      return mapaDepartamentos.get(parcela.id_departamento)?.nome || '-';
    },
    [mapaDepartamentos]
  );

  const nomeProjetoParcela = useCallback(
    (parcela: Parcela): string => {
      if (!parcela.id_projeto) return '-';
      return mapaProjetos.get(parcela.id_projeto)?.nome || '-';
    },
    [mapaProjetos]
  );

  const nomeVendedorParcela = useCallback(
    (parcela: Parcela): string => {
      const idVendedor =
        (parcela.id_proposta ? mapaPropostas.get(parcela.id_proposta)?.id_vendedor : null) ||
        (parcela.id_pedido_venda ? mapaVendas.get(parcela.id_pedido_venda)?.id_vendedor : null);

      if (!idVendedor) return '-';
      return mapaVendedores.get(idVendedor)?.nome_completo || '-';
    },
    [mapaPropostas, mapaVendas, mapaVendedores]
  );

  const nomeClienteParcela = useCallback(
    (parcela: Parcela): string => {
      if (!parcela.id_contato) return '';
      return mapaContatos.get(parcela.id_contato)?.nome_razao_social || '';
    },
    [mapaContatos]
  );

  const idVendedorParcela = useCallback(
    (parcela: Parcela): string | null =>
      (parcela.id_proposta ? mapaPropostas.get(parcela.id_proposta)?.id_vendedor || null : null) ||
      (parcela.id_pedido_venda ? mapaVendas.get(parcela.id_pedido_venda)?.id_vendedor || null : null) ||
      null,
    [mapaPropostas, mapaVendas]
  );

  const opcoesDepartamentos = useMemo(
    () =>
      Array.from(mapaDepartamentos.values())
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        .map((item) => ({ value: item.id, label: item.nome })),
    [mapaDepartamentos]
  );

  const opcoesProjetos = useMemo(
    () =>
      Array.from(mapaProjetos.values())
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        .map((item) => ({ value: item.id, label: item.nome })),
    [mapaProjetos]
  );

  const opcoesVendedores = useMemo(
    () =>
      Array.from(mapaVendedores.values())
        .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo, 'pt-BR'))
        .map((item) => ({ value: item.id, label: item.nome_completo })),
    [mapaVendedores]
  );

  const opcoesContasBancarias = useMemo(
    () =>
      Array.from(mapaContas.values())
        .sort((a, b) => a.nome_conta.localeCompare(b.nome_conta, 'pt-BR'))
        .map((item) => ({ value: item.id_conta, label: item.nome_conta })),
    [mapaContas]
  );

  const opcoesFormasPagamento = useMemo(
    () =>
      Array.from(mapaFormasPagamento.values())
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        .map((item) => ({ value: item.id, label: item.nome })),
    [mapaFormasPagamento]
  );

  const valorDataPorTipoParcela = useCallback(
    (parcela: Parcela, tipo: string): string | null => {
      switch (tipo) {
        case 'emissao':
          return parcela.criado_em || null;
        case 'vencimento':
          return parcela.data_vencimento || null;
        case 'pagamento':
          return parcela.data_quitacao_total || null;
        default:
          return null;
      }
    },
    []
  );

  const valorDataPorTipoExtrato = useCallback(
    (item: ExtratoItem, tipo: string): string | null => {
      const parcela = item.id_parcela ? parcelaPorId.get(item.id_parcela) : null;
      switch (tipo) {
        case 'emissao':
          return parcela?.criado_em || item.data_pagamento || null;
        case 'vencimento':
          return parcela?.data_vencimento || null;
        case 'pagamento':
          return item.data_pagamento || null;
        default:
          return null;
      }
    },
    [parcelaPorId]
  );

  const atualizarRangePorTipo = useCallback((tipo: string, inicio: string, fim: string) => {
    setFilterDataRanges((prev) => ({
      ...prev,
      [tipo]: { inicio, fim },
    }));
  }, []);

  const filtrarParcela = useCallback(
    (p: Parcela): boolean => {
      const termo = filterSearch.toLowerCase().trim();
      if (termo) {
        const lanc = lancamentoParcela(p).toLowerCase();
        const desc = (p.descricao_parcela || '').toLowerCase();
        const lancCol = (p.lancamento || '').toLowerCase();
        const label = parcelasLabel(p).toLowerCase();
        if (!lanc.includes(termo) && !desc.includes(termo) && !lancCol.includes(termo) && !label.includes(termo)) {
          return false;
        }
      }
      const rangeVencimento = filterDataRanges.vencimento;
      if ((rangeVencimento.inicio || rangeVencimento.fim) && !dataDentroDoIntervalo(p.data_vencimento, rangeVencimento.inicio, rangeVencimento.fim)) {
        return false;
      }
      const rangeEmissao = filterDataRanges.emissao;
      if ((rangeEmissao.inicio || rangeEmissao.fim) && !dataDentroDoIntervalo(valorDataPorTipoParcela(p, 'emissao'), rangeEmissao.inicio, rangeEmissao.fim)) {
        return false;
      }
      const rangePagamento = filterDataRanges.pagamento;
      if ((rangePagamento.inicio || rangePagamento.fim) && !dataDentroDoIntervalo(valorDataPorTipoParcela(p, 'pagamento'), rangePagamento.inicio, rangePagamento.fim)) {
        return false;
      }
      if (filterStatus.length > 0 && (mainTabAtiva === 'contas_receber' || mainTabAtiva === 'contas_pagar')) {
        const statusAtual = (p.status || '').toUpperCase();
        if (!filterStatus.includes(statusAtual)) return false;
      }
      if (filterDepartamentos.length > 0) {
        if (!p.id_departamento || !filterDepartamentos.includes(p.id_departamento)) return false;
      }
      if (filterProjetos.length > 0) {
        if (!p.id_projeto || !filterProjetos.includes(p.id_projeto)) return false;
      }
      if (filterVendedores.length > 0) {
        const idVendedor = idVendedorParcela(p);
        if (!idVendedor || !filterVendedores.includes(idVendedor)) return false;
      }
      return true;
    },
    [
      filterSearch,
      filterDataRanges,
      filterStatus,
      filterDepartamentos,
      filterProjetos,
      filterVendedores,
      mainTabAtiva,
      idVendedorParcela,
      lancamentoParcela,
      parcelasLabel,
      valorDataPorTipoParcela,
    ]
  );

  const filtrarExtratoItem = useCallback(
    (item: ExtratoItem): boolean => {
      const termo = filterSearch.toLowerCase().trim();
      if (termo) {
        const parcela = item.id_parcela ? parcelaPorId.get(item.id_parcela) : null;
        const lanc = parcela ? lancamentoParcela(parcela).toLowerCase() : '';
        const desc = (item.descricao || '').toLowerCase();
        if (!lanc.includes(termo) && !desc.includes(termo)) return false;
      }
      const rangeVencimento = filterDataRanges.vencimento;
      if ((rangeVencimento.inicio || rangeVencimento.fim) && !dataDentroDoIntervalo(valorDataPorTipoExtrato(item, 'vencimento'), rangeVencimento.inicio, rangeVencimento.fim)) {
        return false;
      }
      const rangeEmissao = filterDataRanges.emissao;
      if ((rangeEmissao.inicio || rangeEmissao.fim) && !dataDentroDoIntervalo(valorDataPorTipoExtrato(item, 'emissao'), rangeEmissao.inicio, rangeEmissao.fim)) {
        return false;
      }
      const rangePagamento = filterDataRanges.pagamento;
      if ((rangePagamento.inicio || rangePagamento.fim) && !dataDentroDoIntervalo(valorDataPorTipoExtrato(item, 'pagamento'), rangePagamento.inicio, rangePagamento.fim)) {
        return false;
      }
      if (filterStatus.length > 0 && mainTabAtiva === 'extrato') {
        const matchEntrada = filterStatus.includes('entrada') && item.tipo_movimentacao === 'entrada';
        const matchSaida = filterStatus.includes('saida') && item.tipo_movimentacao === 'saida';
        if (!matchEntrada && !matchSaida) return false;
      }
      if (filterDepartamentos.length > 0) {
        const parcela = item.id_parcela ? parcelaPorId.get(item.id_parcela) : null;
        if (!parcela?.id_departamento || !filterDepartamentos.includes(parcela.id_departamento)) return false;
      }
      if (filterProjetos.length > 0) {
        const parcela = item.id_parcela ? parcelaPorId.get(item.id_parcela) : null;
        if (!parcela?.id_projeto || !filterProjetos.includes(parcela.id_projeto)) return false;
      }
      if (filterVendedores.length > 0) {
        const parcela = item.id_parcela ? parcelaPorId.get(item.id_parcela) : null;
        if (!parcela) return false;
        const idVendedor = idVendedorParcela(parcela);
        if (!idVendedor || !filterVendedores.includes(idVendedor)) return false;
      }
      return true;
    },
    [
      filterSearch,
      filterDataRanges,
      filterStatus,
      filterDepartamentos,
      filterProjetos,
      filterVendedores,
      mainTabAtiva,
      parcelaPorId,
      idVendedorParcela,
      lancamentoParcela,
      valorDataPorTipoExtrato,
    ]
  );

  const renderResumoLista = (totalExibido: number, totalSelecionado: number, valorTotalExibido: number, valorTotalSelecionado: number) => {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        {totalSelecionado > 0 && (
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-700 dark:border-blue-500/30 dark:bg-blue-950/30 dark:text-blue-300">
            {totalSelecionado} selecionados Â· {formatarMoeda(valorTotalSelecionado)}
          </span>
        )}
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 dark:border-neutral-700 dark:bg-neutral-900">
          {totalExibido} lançamentos exibidos
        </span>
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 dark:border-neutral-700 dark:bg-neutral-900">
          Total: {formatarMoeda(valorTotalExibido)}
        </span>
      </div>
    );
  };

  const filteredParcelasReceber = useMemo(
    () => parcelasReceber.filter(filtrarParcela),
    [parcelasReceber, filtrarParcela]
  );

  const filteredParcelasPagar = useMemo(
    () => parcelasPagar.filter(filtrarParcela),
    [parcelasPagar, filtrarParcela]
  );

  const filteredExtrato = useMemo(
    () => extrato.filter(filtrarExtratoItem),
    [extrato, filtrarExtratoItem]
  );

  useEffect(() => {
    const currentIds =
      mainTabAtiva === 'extrato'
        ? filteredExtrato.map((e) => e.id)
        : mainTabAtiva === 'contas_receber'
          ? filteredParcelasReceber.map((p) => p.id)
          : filteredParcelasPagar.map((p) => p.id);
    setSelectedIds((prev) => prev.filter((id) => currentIds.includes(id)));
  }, [mainTabAtiva, filteredExtrato, filteredParcelasReceber, filteredParcelasPagar]);

  const listaAtualIds =
    mainTabAtiva === 'extrato'
      ? filteredExtrato.map((e) => e.id)
      : mainTabAtiva === 'contas_receber'
        ? filteredParcelasReceber.map((p) => p.id)
        : filteredParcelasPagar.map((p) => p.id);
  const allSelected = listaAtualIds.length > 0 && listaAtualIds.every((id) => selectedIds.includes(id));
  const hasPartialSelection = selectedIds.length > 0 && !allSelected;
  const contatoBaixaParcela = baixaParcelaForm?.parcela.id_contato
    ? mapaContatos.get(baixaParcelaForm.parcela.id_contato)
    : null;
  const totalTransacaoBaixa = baixaParcelaForm ? Math.abs(valorPendenteParcela(baixaParcelaForm.parcela)) : 0;
  const valorBaixaInformado = baixaParcelaForm ? Number(baixaParcelaForm.valorPagoDigits || '0') / 100 : 0;
  const valorAPagarBaixa = baixaParcelaForm
    ? Number(
        (
          valorBaixaInformado +
          Number(baixaParcelaForm.jurosMultaDigits || '0') / 100 +
          Number(baixaParcelaForm.taxaDigits || '0') / 100 +
          Number(baixaParcelaForm.acrescimoDigits || '0') / 100 -
          Number(baixaParcelaForm.descontoDigits || '0') / 100
        ).toFixed(2)
      )
    : 0;
  const valorRestanteBaixa = Number(Math.max(totalTransacaoBaixa - valorBaixaInformado, 0).toFixed(2));
  const valorBaixaExcedido = baixaParcelaForm ? valorBaixaInformado > totalTransacaoBaixa : false;
  const pagamentosEfetivadosParcela = useMemo(() => {
    if (!baixaParcelaForm?.parcela.id) return [] as ExtratoItem[];
    return extrato
      .filter((item) => item.id_parcela === baixaParcelaForm.parcela.id)
      .sort((a, b) => (new Date(b.data_pagamento).getTime() || 0) - (new Date(a.data_pagamento).getTime() || 0));
  }, [baixaParcelaForm, extrato]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = hasPartialSelection;
    }
  }, [hasPartialSelection]);

  const abrirDrawerBaixaParcela = (parcela: Parcela, tipo: 'receber' | 'pagar') => {
    const hoje = new Date().toISOString().split('T')[0];
    const valorCentavos = Math.round(Math.abs(valorLiquidoParcela(parcela)) * 100).toString();
    const ultimoExtrato = ultimoExtratoPorParcela.get(parcela.id);
    setBaixaParcelaForm({
      parcela,
      tipo,
      dataPagamento: hoje,
      valorPagoDigits: valorCentavos,
      jurosMultaDigits: '',
      descontoDigits: '',
      taxaDigits: '',
      acrescimoDigits: '',
      observacoes: parcela.observacoes_pagamento?.trim() || 'Conta Liquidada',
      contaId: parcela.id_conta_bancaria || '',
      formaPagamentoId: ultimoExtrato?.id_forma_pagamento || '',
    });
    setBaixaDrawerTab('baixa');
    setMostrarPagamentosEfetivados(false);
    setComprovanteArquivo(null);
    setComprovanteErro(null);
  };

  const fecharDrawerBaixaParcela = () => {
    if (salvandoBaixa) return;
    setBaixaParcelaForm(null);
    setMostrarPagamentosEfetivados(false);
    setComprovanteArquivo(null);
    setComprovanteErro(null);
  };

  const validarArquivoComprovante = useCallback((file: File): string | null => {
    const tiposAceitos = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!tiposAceitos.includes(file.type)) {
      return 'Formato inválido. Use PDF, PNG ou JPG.';
    }
    if (file.size > MAX_COMPROVANTE_BYTES) {
      return 'Arquivo acima do limite de 2 MB.';
    }
    return null;
  }, []);

  const selecionarComprovante = useCallback((file: File | null) => {
    if (!file) return;
    const erroValidacao = validarArquivoComprovante(file);
    if (erroValidacao) {
      setComprovanteErro(erroValidacao);
      setComprovanteArquivo(null);
      return;
    }
    setComprovanteErro(null);
    setComprovanteArquivo(file);
  }, [validarArquivoComprovante]);

  const confirmarBaixaParcela = async () => {
    if (!idEmpresa || !baixaParcelaForm) return;
    const usuarioId = user?.id;
    if (!usuarioId) {
      toast.error('Usuário não identificado para efetivar a baixa.');
      return;
    }
    const {
      parcela,
      dataPagamento,
      valorPagoDigits,
      jurosMultaDigits,
      descontoDigits,
      taxaDigits,
      acrescimoDigits,
      observacoes,
      contaId,
      formaPagamentoId,
    } = baixaParcelaForm;
    const valorPagoBase = Number(valorPagoDigits || '0') / 100;
    const jurosMulta = Number(jurosMultaDigits || '0') / 100;
    const desconto = Number(descontoDigits || '0') / 100;
    const taxa = Number(taxaDigits || '0') / 100;
    const acrescimo = Number(acrescimoDigits || '0') / 100;
    const valorTotalTransacao = Math.abs(valorPendenteParcela(parcela));
    if (valorPagoBase > valorTotalTransacao) {
      toast.error('O valor de baixa não pode ser maior que o saldo devedor da transação.');
      return;
    }

    const valorQuitado = Number((valorPagoBase + jurosMulta + taxa + acrescimo - desconto).toFixed(2));
    if (!Number.isFinite(valorQuitado) || valorQuitado < 0) {
      toast.error('Informe um valor válido para a baixa.');
      return;
    }
    if (!contaId) {
      toast.error('Selecione uma conta bancária.');
      return;
    }
    if (!formaPagamentoId) {
      toast.error('Selecione uma forma de pagamento.');
      return;
    }
    if (valorPagoBase <= 0) {
      toast.error('Informe um valor válido para a baixa.');
      return;
    }

    setSalvandoBaixa(true);
    if (statusPago(parcela.status)) {
      setSalvandoBaixa(false);
      return;
    }

    setBaixandoParcelaId(parcela.id);
    setErro(null);
    const dataRef = dataPagamento
      ? new Date(`${dataPagamento}T00:00:00`).toISOString()
      : new Date().toISOString();

    const { error: rpcError } = await supabase.rpc('erp_rpc_baixar_parcela_universal', {
      p_id_parcela: parcela.id,
      p_id_usuario: usuarioId,
      p_id_conta_bancaria: contaId,
      p_valor_nominal: valorPagoBase,
      p_valor_juros: jurosMulta || 0,
      p_valor_taxa: taxa || 0,
      p_valor_acrescimo: acrescimo || 0,
      p_valor_desconto: desconto || 0,
      p_data_pagamento: dataRef,
      p_id_forma_pagamento: formaPagamentoId,
      p_observacoes: observacoes.trim() || null,
      p_id_extrato_vinculado: null,
    });

    if (rpcError) {
      console.error('Erro ao baixar parcela:', rpcError);
      toast.error(rpcError.message || 'Não foi possível baixar a parcela.');
      setBaixandoParcelaId(null);
      setSalvandoBaixa(false);
      return;
    }

    await carregarDados();
    toast.success('Baixa efetivada com sucesso.');
    setBaixandoParcelaId(null);
    setSalvandoBaixa(false);
    setBaixaParcelaForm(null);
  };

  const liquidarParcelasSelecionadas = async (lista: Parcela[], tipo: 'receber' | 'pagar') => {
    if (!idEmpresa || !user?.id) {
      toast.error('Usuário não identificado para efetivar a baixa em massa.');
      return;
    }

    const selecionadas = lista.filter((item) => selectedIds.includes(item.id));
    const pendentes = selecionadas.filter((item) => !statusPago(item.status));
    if (pendentes.length === 0) {
      toast.error('Selecione ao menos um item pendente para liquidar.');
      return;
    }

    const contaFallback = opcoesContasBancarias[0]?.value || '';
    const formaPix = opcoesFormasPagamento.find((item) => item.label.trim().toUpperCase() === 'PIX')?.value || '';
    const formaFallback = formaPix || opcoesFormasPagamento[0]?.value || '';

    if (!contaFallback) {
      toast.error('Nenhuma conta bancária disponível para liquidar em massa.');
      return;
    }
    if (!formaFallback) {
      toast.error('Nenhuma forma de pagamento disponível para liquidar em massa.');
      return;
    }

    setAcaoMassaLoading('liquidar');
    setErro(null);

    let sucesso = 0;
    for (const parcela of pendentes) {
      const contaId = parcela.id_conta_bancaria || contaFallback;
      const valorNominal = Math.abs(valorPendenteParcela(parcela));
      const dataRef = new Date().toISOString();
      const { error } = await supabase.rpc('erp_rpc_baixar_parcela_universal', {
        p_id_parcela: parcela.id,
        p_id_usuario: user.id,
        p_id_conta_bancaria: contaId,
        p_valor_nominal: valorNominal,
        p_valor_juros: 0,
        p_valor_taxa: 0,
        p_valor_acrescimo: 0,
        p_valor_desconto: 0,
        p_data_pagamento: dataRef,
        p_id_forma_pagamento: formaFallback,
        p_observacoes: `${tipo === 'receber' ? 'Recebimento' : 'Pagamento'} liquidado em massa`,
        p_id_extrato_vinculado: null,
      });

      if (error) {
        setAcaoMassaLoading(null);
        toast.error(error.message || 'Não foi possível liquidar os itens selecionados.');
        return;
      }
      sucesso += 1;
    }

    await carregarDados();
    setSelectedIds([]);
    setAcaoMassaLoading(null);
    toast.success(`${sucesso} ${sucesso === 1 ? 'item liquidado' : 'itens liquidados'} com sucesso.`);
  };

  const desliquidarParcelasSelecionadas = async (lista: Parcela[]) => {
    if (!user?.id) {
      toast.error('Usuário não identificado para estornar em massa.');
      return;
    }

    const selecionadas = lista.filter((item) => selectedIds.includes(item.id));
    const pagas = selecionadas.filter((item) => statusPago(item.status));
    if (pagas.length === 0) {
      toast.error('Selecione ao menos um item pago para desliquidar.');
      return;
    }

    setAcaoMassaLoading('desliquidar');
    setErro(null);

    let sucesso = 0;
    for (const parcela of pagas) {
      const { error } = await supabase.rpc('erp_rpc_estornar_parcela_universal', {
        p_id_parcela: parcela.id,
        p_id_usuario: user.id,
        p_motivo_estorno: 'Estorno em massa',
      });

      if (error) {
        setAcaoMassaLoading(null);
        toast.error(error.message || 'Não foi possível desliquidar os itens selecionados.');
        return;
      }
      sucesso += 1;
    }

    await carregarDados();
    setSelectedIds([]);
    setAcaoMassaLoading(null);
    toast.success(`${sucesso} ${sucesso === 1 ? 'item desliquidado' : 'itens desliquidados'} com sucesso.`);
  };

  const excluirParcelasSelecionadas = async (lista: Parcela[]) => {
    if (!idEmpresa) return;

    const selecionadas = lista.filter((item) => selectedIds.includes(item.id));
    if (selecionadas.length === 0) {
      toast.error('Selecione ao menos um item para excluir.');
      return;
    }

    const possuiPagas = selecionadas.some((item) => statusPago(item.status));
    if (possuiPagas) {
      toast.error('Não é permitido excluir itens pagos em ação em massa.');
      return;
    }

    setAcaoMassaLoading('excluir');
    setErro(null);

    const ids = selecionadas.map((item) => item.id);
    const { error } = await supabase.from('erp_parcelas').delete().in('id', ids).eq('id_empresa', idEmpresa);
    if (error) {
      setAcaoMassaLoading(null);
      toast.error(error.message || 'Não foi possível excluir os itens selecionados.');
      return;
    }

    await carregarDados();
    setSelectedIds([]);
    setAcaoMassaLoading(null);
    toast.success(`${ids.length} ${ids.length === 1 ? 'item excluído' : 'itens excluídos'} com sucesso.`);
  };

  const renderTabelaParcelas = (lista: Parcela[], tipo: 'receber' | 'pagar') => {
    if (loading) {
      const visibleParcelaColumns = PARCELA_COLUMN_ORDER.filter((key) => parcelVisibleCols[key]);
      const fixedColumnsWidthWithoutLancamento = visibleParcelaColumns
        .filter((key) => key !== 'lancamento')
        .reduce((total, key) => total + PARCELA_COLUMN_WIDTHS[key], 0);
      const lancamentoWidth =
        parcelVisibleCols.lancamento
          ? Math.max(
              PARCELA_LANCAMENTO_MIN_WIDTH,
              (parcelasTableViewportWidth || fixedColumnsWidthWithoutLancamento + PARCELA_COLUMN_WIDTHS.lancamento) -
                fixedColumnsWidthWithoutLancamento
            )
          : 0;
      const parcelaTableWidth = fixedColumnsWidthWithoutLancamento + lancamentoWidth;
      const getParcelaColumnWidth = (key: ParcelaColumnKey) =>
        key === 'lancamento' ? lancamentoWidth : PARCELA_COLUMN_WIDTHS[key];

      return (
        <>
          <div ref={setParcelasTableWrapperEl} className="w-full overflow-x-auto rounded-lg border border-[#E5E7EB] dark:border-[#262626]">
            <table
              className="table-fixed"
              style={{ width: `${parcelaTableWidth}px`, minWidth: `${parcelaTableWidth}px` }}
            >
              <colgroup>
                {visibleParcelaColumns.map((key) => (
                  <col key={key} style={{ width: `${getParcelaColumnWidth(key)}px` }} />
                ))}
              </colgroup>
              <thead className="bg-blue-600 dark:bg-blue-700">
                <tr>
                  {parcelVisibleCols.select && (
                    <th className="pl-4 pr-3 py-2 text-left border-b border-blue-500/30 dark:border-blue-400/30">
                      <input
                        type="checkbox"
                        checked={false}
                        readOnly
                        aria-label="Selecionar todas"
                        className="h-4 w-4 rounded border-white/35 bg-transparent accent-blue-500 focus:ring-2 focus:ring-white/40"
                      />
                    </th>
                  )}
                  {parcelVisibleCols.vencimento && (
                    <th className="whitespace-nowrap px-2 py-2 text-left text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30">
                      Vencimento
                    </th>
                  )}
                  {parcelVisibleCols.parcela && (
                    <th className="whitespace-nowrap px-2 py-2 text-center text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30">
                      Parcela
                    </th>
                  )}
                  {parcelVisibleCols.lancamento && (
                    <th className="px-2 py-2 text-left text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30">
                      Lançamento
                    </th>
                  )}
                  {parcelVisibleCols.conta && (
                    <th className="whitespace-nowrap px-2 py-2 text-left text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30">
                      Conta
                    </th>
                  )}
                  {parcelVisibleCols.departamento && (
                    <th className="whitespace-nowrap px-2 py-2 text-left text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30">
                      Departamento
                    </th>
                  )}
                  {parcelVisibleCols.projeto && (
                    <th className="whitespace-nowrap px-2 py-2 text-left text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30">
                      Projeto
                    </th>
                  )}
                  {parcelVisibleCols.vendedor && (
                    <th className="whitespace-nowrap px-2 py-2 text-left text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30">
                      Vendedor
                    </th>
                  )}
                  {parcelVisibleCols.forma && (
                    <th className="whitespace-nowrap px-2 py-2 text-left text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30">
                      Forma de Pgto
                    </th>
                  )}
                  {parcelVisibleCols.valor && (
                    <th className="whitespace-nowrap px-2 py-2 text-right text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30">
                      Valor
                    </th>
                  )}
                  {parcelVisibleCols.status && (
                    <th className="whitespace-nowrap px-2 py-2 text-right text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30">
                      Status
                    </th>
                  )}
                  {parcelVisibleCols.acoes && (
                    <th className="whitespace-nowrap pl-2 pr-5 py-2 text-right text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30">
                      AÇÕES
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-900 divide-y divide-[#E5E7EB] dark:divide-[#262626]">
                {Array.from({ length: 8 }).map((_, index) => (
                  <tr key={`parcelas-skeleton-${index}`} className="hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                    {parcelVisibleCols.select && (
                      <td className="pl-4 pr-3 py-3">
                        <div className="h-4 w-4 rounded bg-slate-200 dark:bg-neutral-700" />
                      </td>
                    )}
                    {parcelVisibleCols.vencimento && (
                      <td className="whitespace-nowrap px-2 py-3"><div className="h-4 w-16 rounded bg-slate-200 dark:bg-neutral-700" /></td>
                    )}
                    {parcelVisibleCols.parcela && (
                      <td className="whitespace-nowrap px-2 py-3 text-center"><div className="mx-auto h-4 w-12 rounded bg-slate-200 dark:bg-neutral-700" /></td>
                    )}
                    {parcelVisibleCols.lancamento && (
                      <td className="px-2 py-3"><div className="h-4 w-4/5 rounded bg-slate-200 dark:bg-neutral-700" /></td>
                    )}
                    {parcelVisibleCols.conta && (
                      <td className="whitespace-nowrap px-2 py-3"><div className="h-4 w-20 rounded bg-slate-200 dark:bg-neutral-700" /></td>
                    )}
                    {parcelVisibleCols.departamento && (
                      <td className="whitespace-nowrap px-2 py-3"><div className="h-4 w-24 rounded bg-slate-200 dark:bg-neutral-700" /></td>
                    )}
                    {parcelVisibleCols.projeto && (
                      <td className="whitespace-nowrap px-2 py-3"><div className="h-4 w-20 rounded bg-slate-200 dark:bg-neutral-700" /></td>
                    )}
                    {parcelVisibleCols.vendedor && (
                      <td className="whitespace-nowrap px-2 py-3"><div className="h-4 w-24 rounded bg-slate-200 dark:bg-neutral-700" /></td>
                    )}
                    {parcelVisibleCols.forma && (
                      <td className="whitespace-nowrap px-2 py-3"><div className="h-4 w-16 rounded bg-slate-200 dark:bg-neutral-700" /></td>
                    )}
                    {parcelVisibleCols.valor && (
                      <td className="whitespace-nowrap px-2 py-3 text-right"><div className="ml-auto h-4 w-20 rounded bg-slate-200 dark:bg-neutral-700" /></td>
                    )}
                    {parcelVisibleCols.status && (
                      <td className="whitespace-nowrap px-2 py-3 text-right"><div className="ml-auto h-6 w-16 rounded-full bg-slate-200 dark:bg-neutral-700" /></td>
                    )}
                    {parcelVisibleCols.acoes && (
                      <td className="whitespace-nowrap px-2 py-3 text-right"><div className="ml-auto h-8 w-8 rounded-lg bg-slate-200 dark:bg-neutral-700" /></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
    }

    if (lista.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Nenhuma parcela encontrada para esta visualizacao.
        </div>
      );
    }

    const totalExibido = lista.length;
    const totalSelecionado = lista.filter((item) => selectedIds.includes(item.id)).length;
    const valorTotalExibido = lista.reduce((soma, item) => soma + Math.abs(valorLiquidoParcela(item)), 0);
    const valorTotalSelecionado = lista
      .filter((item) => selectedIds.includes(item.id))
      .reduce((soma, item) => soma + Math.abs(valorLiquidoParcela(item)), 0);
    const visibleParcelaColumns = PARCELA_COLUMN_ORDER.filter((key) => parcelVisibleCols[key]);
    const fixedColumnsWidthWithoutLancamento = visibleParcelaColumns
      .filter((key) => key !== 'lancamento')
      .reduce((total, key) => total + PARCELA_COLUMN_WIDTHS[key], 0);
    const lancamentoWidth =
      parcelVisibleCols.lancamento
        ? Math.max(
            PARCELA_LANCAMENTO_MIN_WIDTH,
            (parcelasTableViewportWidth || fixedColumnsWidthWithoutLancamento + PARCELA_COLUMN_WIDTHS.lancamento) -
              fixedColumnsWidthWithoutLancamento
          )
        : 0;
    const parcelaTableWidth = fixedColumnsWidthWithoutLancamento + lancamentoWidth;
    const getParcelaColumnWidth = (key: ParcelaColumnKey) =>
      key === 'lancamento' ? lancamentoWidth : PARCELA_COLUMN_WIDTHS[key];

    return (
      <>
        {totalSelecionado > 0 && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-700/40 dark:bg-amber-900/20">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Ações em massa</p>
                <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                  Qualquer ação executada aqui será aplicada a todos os vencimentos selecionados.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void liquidarParcelasSelecionadas(lista, tipo)}
                  disabled={acaoMassaLoading !== null}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {acaoMassaLoading === 'liquidar' ? <Loader2 size={16} className="animate-spin" /> : null}
                  Liquidar
                </button>
                <button
                  type="button"
                  onClick={() => void desliquidarParcelasSelecionadas(lista)}
                  disabled={acaoMassaLoading !== null}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {acaoMassaLoading === 'desliquidar' ? <Loader2 size={16} className="animate-spin" /> : null}
                  Desliquidar
                </button>
                <button
                  type="button"
                  onClick={() => void excluirParcelasSelecionadas(lista)}
                  disabled={acaoMassaLoading !== null}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {acaoMassaLoading === 'excluir' ? <Loader2 size={16} className="animate-spin" /> : null}
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}
        <div ref={setParcelasTableWrapperEl} className="w-full overflow-x-auto rounded-lg border border-[#E5E7EB] dark:border-[#262626]">
          <table
            className="table-fixed"
            style={{ width: `${parcelaTableWidth}px`, minWidth: `${parcelaTableWidth}px` }}
          >
            <colgroup>
              {visibleParcelaColumns.map((key) => (
                <col key={key} style={{ width: `${getParcelaColumnWidth(key)}px` }} />
              ))}
            </colgroup>
            <thead className="bg-blue-600 dark:bg-blue-700">
              <tr>
                {parcelVisibleCols.select && (
                  <th className="pl-4 pr-3 py-2 text-left border-b border-blue-500/30 dark:border-blue-400/30">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => toggleAllParcelas(lista)}
                      aria-label="Selecionar todas"
                      className="h-4 w-4 rounded border-white/35 bg-transparent accent-blue-500 focus:ring-2 focus:ring-white/40"
                    />
                  </th>
                )}
                {parcelVisibleCols.vencimento && (
                  <th className="whitespace-nowrap px-2 py-2 text-left text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30">
                    Vencimento
                  </th>
                )}
                {parcelVisibleCols.parcela && (
                  <th className="whitespace-nowrap px-2 py-2 text-center text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30">
                    Parcela
                  </th>
                )}
                {parcelVisibleCols.lancamento && (
                  <th className="px-2 py-2 text-left text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30">
                    Lançamento
                  </th>
                )}
                {parcelVisibleCols.conta && (
                  <th className="whitespace-nowrap px-2 py-2 text-left text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30">
                    Conta
                  </th>
                )}
                {parcelVisibleCols.departamento && (
                  <th className="whitespace-nowrap px-2 py-2 text-left text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30">
                    Departamento
                  </th>
                )}
                {parcelVisibleCols.projeto && (
                  <th className="whitespace-nowrap px-2 py-2 text-left text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30">
                    Projeto
                  </th>
                )}
                {parcelVisibleCols.vendedor && (
                  <th className="whitespace-nowrap px-2 py-2 text-left text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30">
                    Vendedor
                  </th>
                )}
                {parcelVisibleCols.forma && (
                  <th className="whitespace-nowrap px-2 py-2 text-left text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30">
                    Forma de Pgto
                  </th>
                )}
                {parcelVisibleCols.valor && (
                  <th className="whitespace-nowrap px-2 py-2 text-right text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30">
                    Valor
                  </th>
                )}
                {parcelVisibleCols.status && (
                  <th className="whitespace-nowrap px-2 py-2 text-right text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30">
                    Status
                  </th>
                )}
                {parcelVisibleCols.acoes && (
                  <th className="whitespace-nowrap pl-2 pr-5 py-2 text-right text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30">
                    AÇÕES
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-neutral-900 divide-y divide-[#E5E7EB] dark:divide-[#262626]">
              {lista.map((parcela) => {
                const pago = statusPago(parcela.status);
                const conta = parcela.id_conta_bancaria ? mapaContas.get(parcela.id_conta_bancaria)?.nome_conta || '-' : '-';
                const ultimoExtratoFormaParcela = ultimoExtratoPorParcela.get(parcela.id);
                const formaPag = ultimoExtratoFormaParcela?.id_forma_pagamento
                  ? mapaFormasPagamento.get(ultimoExtratoFormaParcela.id_forma_pagamento)?.nome || '-'
                  : '-';
                const valorAbs = Math.abs(valorLiquidoParcela(parcela));

                return (
                  <tr key={parcela.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                    {parcelVisibleCols.select && (
                      <td className="pl-4 pr-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(parcela.id)}
                          onChange={() => toggleOneParcela(parcela.id)}
                          aria-label="Selecionar parcela"
                          className="h-4 w-4 rounded border-gray-300/70 accent-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-neutral-600/70 dark:bg-neutral-900"
                        />
                      </td>
                    )}
                    {parcelVisibleCols.vencimento && (
                      <td className="whitespace-nowrap px-2 py-3 text-sm text-gray-700 dark:text-gray-200">{formatarData(parcela.data_vencimento)}</td>
                    )}
                    {parcelVisibleCols.parcela && (
                      <td className="whitespace-nowrap px-2 py-3 text-center text-sm text-gray-700 dark:text-gray-200">{parcelasLabel(parcela)}</td>
                    )}
                    {parcelVisibleCols.lancamento && (
                      <td className="px-2 py-3">
                        <div className="min-w-0 text-sm text-gray-700 dark:text-gray-200">
                          <div className="min-w-0 truncate">
                            {renderTextoComNumeroFinalNegrito(lancamentoParcela(parcela))}
                          </div>
                          <div className="mt-1 flex min-w-0 items-center gap-2">
                            {nomeClienteParcela(parcela) && (
                              <span className="min-w-0 truncate text-xs text-gray-500 dark:text-gray-400">
                                {nomeClienteParcela(parcela)}
                              </span>
                            )}
                            <span className="inline-flex shrink-0 items-center rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0 text-[10px] font-semibold text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300">
                              {parcelasLabel(parcela)}
                            </span>
                          </div>
                        </div>
                      </td>
                    )}
                    {parcelVisibleCols.conta && (
                      <td className="whitespace-nowrap px-2 py-3 text-sm text-gray-700 dark:text-gray-200">{conta}</td>
                    )}
                    {parcelVisibleCols.departamento && (
                      <td className="whitespace-nowrap px-2 py-3 text-sm text-gray-700 dark:text-gray-200">{nomeDepartamentoParcela(parcela)}</td>
                    )}
                    {parcelVisibleCols.projeto && (
                      <td className="whitespace-nowrap px-2 py-3 text-sm text-gray-700 dark:text-gray-200">{nomeProjetoParcela(parcela)}</td>
                    )}
                    {parcelVisibleCols.vendedor && (
                      <td className="whitespace-nowrap px-2 py-3 text-sm text-gray-700 dark:text-gray-200">{nomeVendedorParcela(parcela)}</td>
                    )}
                    {parcelVisibleCols.forma && (
                      <td className="whitespace-nowrap px-2 py-3 text-sm text-gray-700 dark:text-gray-200">{formaPag}</td>
                    )}
                    {parcelVisibleCols.valor && (
                      <td className="whitespace-nowrap px-2 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {tipo === 'pagar' ? '- ' : ''}
                        {formatarMoeda(valorAbs)}
                      </td>
                    )}
                    {parcelVisibleCols.status && (
                      <td className="whitespace-nowrap px-2 py-3 text-right">
                        <div className="flex justify-end">
                          <span
                            className={`inline-flex rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                              pago
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            }`}
                          >
                            {pago ? 'Pago' : 'Pendente'}
                          </span>
                        </div>
                      </td>
                    )}
                    {parcelVisibleCols.acoes && (
                      <td className="whitespace-nowrap px-2 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {pago ? (
                            <span
                              title="Baixada"
                              className="inline-flex rounded-lg p-1.5 text-emerald-600 dark:text-emerald-300 opacity-50 cursor-default"
                            >
                              <CheckCircle2 size={17} />
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => abrirDrawerBaixaParcela(parcela, tipo)}
                              disabled={baixandoParcelaId === parcela.id}
                              title="Marcar como Pago"
                              aria-label="Marcar como Pago"
                              className="rounded-lg p-1.5 text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30 disabled:opacity-60"
                            >
                              {baixandoParcelaId === parcela.id ? (
                                <Loader2 size={17} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={17} />
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            ref={(el) => {
                              menuButtonRefs.current[parcela.id] = el;
                            }}
                            onClick={() => handleMenuClick(parcela.id)}
                            title="Mais opcoes"
                            className="rounded-lg p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-neutral-800"
                          >
                            <MoreVertical size={18} className="text-gray-600 dark:text-gray-400" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {openMenuParcelaId && (() => {
            const parcela = lista.find((p) => p.id === openMenuParcelaId);
            if (!parcela) return null;
            return (
              <div
                ref={menuRef}
                style={{
                  position: 'fixed',
                  top: `${menuPosition.top}px`,
                  right: `${menuPosition.right}px`,
                  zIndex: 9999,
                }}
                className="w-56 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl"
              >
                <button
                  onClick={() => abrirDetalhesParcela(parcela, tipo)}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors whitespace-nowrap rounded-t-lg"
                >
                  <FileText size={16} className="text-gray-600 dark:text-gray-400 flex-shrink-0" />
                  <span>Detalhes</span>
                </button>
                <button
                  onClick={() => copiarParcela(parcela)}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors whitespace-nowrap border-t border-gray-200 dark:border-gray-700"
                >
                  <Copy size={16} className="text-gray-600 dark:text-gray-400 flex-shrink-0" />
                  <span>Copiar</span>
                </button>
                <button
                  onClick={() => excluirParcela(parcela)}
                  className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-3 transition-colors border-t border-gray-200 dark:border-gray-700 whitespace-nowrap rounded-b-lg"
                >
                  <Trash2 size={16} className="flex-shrink-0" />
                  <span>Excluir</span>
                </button>
              </div>
            );
          })()}
        </div>
        <div className="mt-2 flex justify-end">
          {renderResumoLista(totalExibido, totalSelecionado, valorTotalExibido, valorTotalSelecionado)}
        </div>
      </>
    );
  };

  const renderDashboard = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 p-4">
            <div className="h-3 w-40 rounded bg-slate-200 dark:bg-neutral-700" />
            <div className="mt-4 h-8 w-32 rounded bg-slate-200 dark:bg-neutral-700" />
          </div>
        </div>
      );
    }

    if (mainTabAtiva === 'contas_pagar') {
      return (
        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Em aberto para pagar</p>
            <p className="mt-4 text-2xl font-bold text-rose-600 dark:text-rose-300">{formatarMoeda(resumo.pagarAberto)}</p>
          </div>
        </div>
      );
    }
    if (mainTabAtiva === 'contas_receber') {
      return (
        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Em aberto para receber</p>
            <p className="mt-4 text-2xl font-bold text-emerald-600 dark:text-emerald-300">{formatarMoeda(resumo.receberAberto)}</p>
          </div>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Saldo no extrato</p>
          <p className={`mt-4 text-2xl font-bold ${resumo.saldoExtrato >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-rose-600 dark:text-rose-300'}`}>
            {formatarMoeda(resumo.saldoExtrato)}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="pt-0 pb-6 space-y-4">
      {renderDashboard()}

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5" />
          <span>{erro}</span>
        </div>
      )}

      <>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 dark:border-[#262626] dark:bg-neutral-950">
            <div className="grid grid-cols-1 gap-y-3 xl:grid-cols-[230px_180px_minmax(320px,1fr)_auto] xl:items-end xl:gap-x-4">
            <div className="flex flex-col gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Data de vencimento
              </div>
              <DateRangePicker
                dataInicio={filterDataRanges.vencimento.inicio}
                dataFim={filterDataRanges.vencimento.fim}
                onChange={(inicio, fim) => atualizarRangePorTipo('vencimento', inicio, fim)}
                className="w-[230px]"
                buttonClassName="min-w-[230px] !rounded-lg !border-blue-200 dark:!border-blue-500/35"
              />
            </div>
                <div className="flex flex-col gap-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Status
                  </div>
                  <MultiSelectDropdown
                options={
                  mainTabAtiva === 'extrato'
                    ? [
                        { value: '', label: 'Todos' },
                        { value: 'entrada', label: 'Entrada' },
                        { value: 'saida', label: 'Saída' },
                      ]
                    : [
                        { value: '', label: 'Todos' },
                        { value: 'EM_ABERTO', label: 'Em Aberto' },
                        { value: 'PAGO', label: 'Pago' },
                        { value: 'PARCIALMENTE_PAGO', label: 'Parcialmente Pago' },
                        { value: 'VENCIDO', label: 'Vencido' },
                        { value: 'CANCELADO', label: 'Cancelado' },
                      ]
                }
                selectedValues={filterStatus}
                onChange={setFilterStatus}
                placeholder="Status"
                buttonClassName="h-10 min-w-[180px] !rounded-lg !border-blue-200 dark:!border-blue-500/35 !bg-white dark:!bg-neutral-900 hover:!border-blue-400 dark:hover:!border-blue-400/50 focus:!ring-blue-200 dark:focus:!ring-blue-500/30 !text-slate-700 dark:!text-slate-100"
                    menuClassName="!rounded-2xl !border-slate-200 dark:!border-neutral-700 !bg-white dark:!bg-neutral-900"
                  />
                </div>
            <div className="flex min-w-0 flex-col gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Busca
              </div>
              <SearchBar
                value={filterSearch}
                onChange={setFilterSearch}
                className="w-full min-w-0"
                placeholder={
                  mainTabAtiva === 'extrato'
                    ? 'Buscar por lançamento ou descrição...'
                    : 'Buscar por lançamento, parcela...'
                }
              />
            </div>
            <div className="flex items-end justify-end gap-3">
              <ColumnVisibilityDropdown
                options={PARCELA_TOGGLEABLE_COLUMNS.map((columnKey) => ({
                  key: columnKey,
                  label: PARCELA_COLUMN_LABELS[columnKey],
                }))}
                values={parcelVisibleCols}
                onToggle={(columnKey, checked) =>
                  setParcelVisibleCols((prev) => ({ ...prev, [columnKey]: checked }))
                }
              />
              <button
                type="button"
                onClick={() => setOpenBuscasAvancadas((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
              >
                Filtros Avançados
                <ChevronDown size={18} className={`transition-transform ${openBuscasAvancadas ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          <div
            className={`grid overflow-hidden transition-all duration-300 ease-out ${
              openBuscasAvancadas ? 'mt-4 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'
            }`}
          >
            <div
              className={`min-h-0 transform transition-all duration-300 ease-out ${
                openBuscasAvancadas ? 'translate-y-0' : '-translate-y-1'
              }`}
            >
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-950/40">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-300">
                Filtros Avançados
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Data de emissão
                  </div>
                  <DateRangePicker
                    dataInicio={filterDataRanges.emissao.inicio}
                    dataFim={filterDataRanges.emissao.fim}
                    onChange={(inicio, fim) => atualizarRangePorTipo('emissao', inicio, fim)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Data de pagamento
                  </div>
                  <DateRangePicker
                    dataInicio={filterDataRanges.pagamento.inicio}
                    dataFim={filterDataRanges.pagamento.fim}
                    onChange={(inicio, fim) => atualizarRangePorTipo('pagamento', inicio, fim)}
                  />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Departamento
                  </div>
                  <MultiSelectDropdown
                    options={opcoesDepartamentos}
                    selectedValues={filterDepartamentos}
                    onChange={setFilterDepartamentos}
                    placeholder="Departamento"
                    buttonClassName="h-10 w-full !rounded-xl !border-blue-200 dark:!border-blue-500/35 !bg-white dark:!bg-neutral-900 hover:!border-blue-400 dark:hover:!border-blue-400/50 focus:!ring-blue-200 dark:focus:!ring-blue-500/30 !text-slate-700 dark:!text-slate-100"
                    menuClassName="!rounded-2xl !border-slate-200 dark:!border-neutral-700 !bg-white dark:!bg-neutral-900"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Projeto
                  </div>
                  <MultiSelectDropdown
                    options={opcoesProjetos}
                    selectedValues={filterProjetos}
                    onChange={setFilterProjetos}
                    placeholder="Projeto"
                    buttonClassName="h-10 w-full !rounded-xl !border-blue-200 dark:!border-blue-500/35 !bg-white dark:!bg-neutral-900 hover:!border-blue-400 dark:hover:!border-blue-400/50 focus:!ring-blue-200 dark:focus:!ring-blue-500/30 !text-slate-700 dark:!text-slate-100"
                    menuClassName="!rounded-2xl !border-slate-200 dark:!border-neutral-700 !bg-white dark:!bg-neutral-900"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Vendedor
                  </div>
                  <MultiSelectDropdown
                    options={opcoesVendedores}
                    selectedValues={filterVendedores}
                    onChange={setFilterVendedores}
                    placeholder="Vendedor"
                    buttonClassName="h-10 w-full !rounded-xl !border-blue-200 dark:!border-blue-500/35 !bg-white dark:!bg-neutral-900 hover:!border-blue-400 dark:hover:!border-blue-400/50 focus:!ring-blue-200 dark:focus:!ring-blue-500/30 !text-slate-700 dark:!text-slate-100"
                    menuClassName="!rounded-2xl !border-slate-200 dark:!border-neutral-700 !bg-white dark:!bg-neutral-900"
                  />
                </div>
              </div>
            </div>
            </div>
          </div>
          </div>
          {mainTabAtiva === 'extrato' && (
              <>
                <div className="w-full overflow-x-auto rounded-lg border border-[#E5E7EB] dark:border-[#262626]">
                  <table className="min-w-[1750px] w-max table-fixed">
                    <colgroup>
                      <col style={widthStyle(EXTRATO_COLUMN_WIDTHS.select)} />
                      <col style={widthStyle(EXTRATO_COLUMN_WIDTHS.data)} />
                      <col style={widthStyle(EXTRATO_COLUMN_WIDTHS.descricao)} />
                      <col style={widthStyle(EXTRATO_COLUMN_WIDTHS.lancamento)} />
                      {showColConta && <col style={widthStyle(EXTRATO_COLUMN_WIDTHS.conta)} />}
                      {showColDepartamento && <col style={widthStyle(EXTRATO_COLUMN_WIDTHS.departamento)} />}
                      {showColProjeto && <col style={widthStyle(EXTRATO_COLUMN_WIDTHS.projeto)} />}
                      {showColVendedor && <col style={widthStyle(EXTRATO_COLUMN_WIDTHS.vendedor)} />}
                      <col style={widthStyle(EXTRATO_COLUMN_WIDTHS.forma)} />
                      <col style={widthStyle(EXTRATO_COLUMN_WIDTHS.valor)} />
                      <col style={widthStyle(EXTRATO_COLUMN_WIDTHS.tipo)} />
                    </colgroup>
                    <thead className="bg-blue-600 dark:bg-blue-700">
                      <tr>
              <th className="pl-4 pr-3 py-2 text-left border-b border-blue-500/30 dark:border-blue-400/30 relative">
                          <input
                            ref={selectAllRef}
                            type="checkbox"
                            checked={allSelected}
                            onChange={() => {
                              const ids = filteredExtrato.map((e) => e.id);
                              const allSel = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
                              setSelectedIds((prev) => (allSel ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]));
                            }}
                            aria-label="Selecionar todas"
                            className="h-4 w-4 rounded border-white/35 bg-transparent accent-blue-500 focus:ring-2 focus:ring-white/40"
                          />
                          <span
                            role="presentation"
                            aria-hidden="true"
                            title="Redimensionar coluna"
                            className="absolute right-[-2px] top-0 h-full w-2 cursor-col-resize"
                            onMouseDown={(e) => startColumnResize('extrato', 'select', EXTRATO_COLUMN_WIDTHS.select, e)}
                          />
                        </th>
                        <th className="whitespace-nowrap px-2 py-2 text-left text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30 relative">
                          <div className="relative flex items-center justify-between gap-1">
                            <span className="inline-block">Data</span>
                            <span
                              role="presentation"
                              aria-hidden="true"
                              title="Redimensionar coluna"
                              className="absolute right-[-2px] top-0 h-full w-2 cursor-col-resize"
                              onMouseDown={(e) => startColumnResize('extrato', 'data', EXTRATO_COLUMN_WIDTHS.data, e)}
                            />
                          </div>
                        </th>
                        <th className="px-2 py-2 text-left text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30 relative">
                          <div className="relative flex items-center justify-between gap-1">
                            <span>Descricao</span>
                            <span
                              role="presentation"
                              aria-hidden="true"
                              title="Redimensionar coluna"
                              className="absolute right-[-2px] top-0 h-full w-2 cursor-col-resize"
                              onMouseDown={(e) => startColumnResize('extrato', 'descricao', EXTRATO_COLUMN_WIDTHS.descricao, e)}
                            />
                          </div>
                        </th>
                        <th className="whitespace-nowrap px-2 py-2 text-left text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30 relative">
                          <div className="relative flex items-center justify-between gap-1">
                            <span>Lançamento</span>
                            <span
                              role="presentation"
                              aria-hidden="true"
                              title="Redimensionar coluna"
                              className="absolute right-[-2px] top-0 h-full w-2 cursor-col-resize"
                              onMouseDown={(e) => startColumnResize('extrato', 'lancamento', EXTRATO_COLUMN_WIDTHS.lancamento, e)}
                            />
                          </div>
                        </th>
                        {showColConta && (
                          <th className="whitespace-nowrap px-2 py-2 text-left text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30 relative">
                            <div className="relative flex items-center justify-between gap-1">
                              <span>Conta</span>
                              <span
                                role="presentation"
                                aria-hidden="true"
                                title="Redimensionar coluna"
                                className="absolute right-[-2px] top-0 h-full w-2 cursor-col-resize"
                                onMouseDown={(e) => startColumnResize('extrato', 'conta', EXTRATO_COLUMN_WIDTHS.conta, e)}
                              />
                            </div>
                          </th>
                        )}
                        {showColDepartamento && (
                          <th className="whitespace-nowrap px-2 py-2 text-left text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30 relative">
                            <div className="relative flex items-center justify-between gap-1">
                              <span>Departamento</span>
                              <span
                                role="presentation"
                                aria-hidden="true"
                                title="Redimensionar coluna"
                                className="absolute right-[-2px] top-0 h-full w-2 cursor-col-resize"
                                onMouseDown={(e) => startColumnResize('extrato', 'departamento', EXTRATO_COLUMN_WIDTHS.departamento, e)}
                              />
                            </div>
                          </th>
                        )}
                        {showColProjeto && (
                          <th className="whitespace-nowrap px-2 py-2 text-left text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30 relative">
                            <div className="relative flex items-center justify-between gap-1">
                              <span>Projeto</span>
                              <span
                                role="presentation"
                                aria-hidden="true"
                                title="Redimensionar coluna"
                                className="absolute right-[-2px] top-0 h-full w-2 cursor-col-resize"
                                onMouseDown={(e) => startColumnResize('extrato', 'projeto', EXTRATO_COLUMN_WIDTHS.projeto, e)}
                              />
                            </div>
                          </th>
                        )}
                        {showColVendedor && (
                          <th className="whitespace-nowrap px-2 py-2 text-left text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30 relative">
                            <div className="relative flex items-center justify-between gap-1">
                              <span>Vendedor</span>
                              <span
                                role="presentation"
                                aria-hidden="true"
                                title="Redimensionar coluna"
                                className="absolute right-[-2px] top-0 h-full w-2 cursor-col-resize"
                                onMouseDown={(e) => startColumnResize('extrato', 'vendedor', EXTRATO_COLUMN_WIDTHS.vendedor, e)}
                              />
                            </div>
                          </th>
                        )}
                          <th className="whitespace-nowrap px-2 py-2 text-left text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30 relative">
                            <div className="relative flex items-center justify-between gap-1">
                              <span>Forma de Pgto</span>
                              <span
                                role="presentation"
                                aria-hidden="true"
                                title="Redimensionar coluna"
                                className="absolute right-[-2px] top-0 h-full w-2 cursor-col-resize"
                                onMouseDown={(e) => startColumnResize('extrato', 'forma', EXTRATO_COLUMN_WIDTHS.forma, e)}
                              />
                            </div>
                          </th>
                        <th className="whitespace-nowrap px-2 py-2 text-right text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30 relative">
                          <div className="relative flex items-center justify-between gap-1">
                            <span>Valor</span>
                            <span
                              role="presentation"
                              aria-hidden="true"
                              title="Redimensionar coluna"
                              className="absolute right-[-2px] top-0 h-full w-2 cursor-col-resize"
                              onMouseDown={(e) => startColumnResize('extrato', 'valor', EXTRATO_COLUMN_WIDTHS.valor, e)}
                            />
                          </div>
                        </th>
                        <th className="whitespace-nowrap px-2 py-2 text-left text-xs font-bold text-white uppercase tracking-wider border-b border-blue-500/30 dark:border-blue-400/30 relative">
                          <div className="relative flex items-center justify-between gap-1">
                            <span>Tipo</span>
                            <span
                              role="presentation"
                              aria-hidden="true"
                              title="Redimensionar coluna"
                              className="absolute right-[-2px] top-0 h-full w-2 cursor-col-resize"
                              onMouseDown={(e) => startColumnResize('extrato', 'tipo', EXTRATO_COLUMN_WIDTHS.tipo, e)}
                            />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-neutral-900 divide-y divide-[#E5E7EB] dark:divide-[#262626]">
                      {loading ? (
                        Array.from({ length: 8 }).map((_, index) => (
                          <tr key={`extrato-skeleton-${index}`} className="hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                            <td className="pl-4 pr-3 py-3" colSpan={11}>
                              <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-neutral-700" />
                            </td>
                          </tr>
                        ))
                      ) : filteredExtrato.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                            Não há movimentações a exibir.
                          </td>
                        </tr>
                      ) : filteredExtrato.map((item) => {
                        const parcela = item.id_parcela ? parcelaPorId.get(item.id_parcela) : null;
                        const lancamento = parcela ? lancamentoParcela(parcela) : (item.descricao || '-');
                        const conta = mapaContas.get(item.id_conta_bancaria)?.nome_conta || '-';
                        const formaPag =
                          (item.id_forma_pagamento ? mapaFormasPagamento.get(item.id_forma_pagamento)?.nome : null) || '-';
                        const valorAbs = Math.abs(Number(item.valor_total || 0));

                        return (
                          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                          <td className="pl-4 pr-3 py-3">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(item.id)}
                                onChange={() => toggleOneExtrato(item.id)}
                                aria-label={`Selecionar movimentacao`}
                                className="h-4 w-4 rounded border-gray-300/70 accent-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-neutral-600/70 dark:bg-neutral-900"
                              />
                            </td>
                          <td className="whitespace-nowrap px-2 py-3 text-sm text-gray-700 dark:text-gray-200">
                            <span className="inline-block">{formatarData(item.data_pagamento)}</span>
                          </td>
                            <td className="px-2 py-3">
                              <div className="truncate text-sm text-gray-700 dark:text-gray-200">{item.descricao || '-'}</div>
                            </td>
                            <td className="whitespace-nowrap px-2 py-3 text-sm text-gray-700 dark:text-gray-200">
                              <div className="min-w-0">
                                <div className="min-w-0 truncate">{renderTextoComNumeroFinalNegrito(lancamento)}</div>
                                {parcela && (
                                  <div className="mt-1">
                                    <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0 text-[10px] font-semibold text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300">
                                      {parcelasLabel(parcela)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                            {showColConta && (
                              <td className="whitespace-nowrap px-2 py-3 text-sm text-gray-700 dark:text-gray-200">{conta}</td>
                            )}
                            {showColDepartamento && (
                              <td className="whitespace-nowrap px-2 py-3 text-sm text-gray-700 dark:text-gray-200">
                                {parcela ? nomeDepartamentoParcela(parcela) : '-'}
                              </td>
                            )}
                            {showColProjeto && (
                              <td className="whitespace-nowrap px-2 py-3 text-sm text-gray-700 dark:text-gray-200">
                                {parcela ? nomeProjetoParcela(parcela) : '-'}
                              </td>
                            )}
                            {showColVendedor && (
                              <td className="whitespace-nowrap px-2 py-3 text-sm text-gray-700 dark:text-gray-200">
                                {parcela ? nomeVendedorParcela(parcela) : '-'}
                              </td>
                            )}
                            <td className="whitespace-nowrap px-2 py-3 text-sm text-gray-700 dark:text-gray-200">{formaPag}</td>
                            <td className={`whitespace-nowrap px-2 py-3 text-right text-sm font-semibold ${item.valor_total >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>
                              {item.valor_total < 0 ? '- ' : ''}
                              {formatarMoeda(valorAbs)}
                            </td>
                            <td className="whitespace-nowrap px-2 py-3 text-sm text-gray-700 dark:text-gray-200">
                              {item.tipo_movimentacao === 'entrada' ? 'Entrada' : 'Saida'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 flex justify-end">
                  {renderResumoLista(
                    filteredExtrato.length,
                    filteredExtrato.filter((item) => selectedIds.includes(item.id)).length,
                    filteredExtrato.reduce((soma, item) => soma + Math.abs(Number(item.valor_total || 0)), 0),
                    filteredExtrato
                      .filter((item) => selectedIds.includes(item.id))
                      .reduce((soma, item) => soma + Math.abs(Number(item.valor_total || 0)), 0)
                  )}
                </div>
              </>
          )}

          {mainTabAtiva === 'contas_receber' && renderTabelaParcelas(filteredParcelasReceber, 'receber')}
          {mainTabAtiva === 'contas_pagar' && renderTabelaParcelas(filteredParcelasPagar, 'pagar')}
        </>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {baixaParcelaForm && (
              <motion.div className="fixed inset-0 z-[120] flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.button className="absolute inset-0 bg-black/45" aria-label="Fechar" onClick={fecharDrawerBaixaParcela} />
                <motion.div
                  className="relative z-10 h-screen w-full max-w-[700px] overflow-y-auto rounded-l-2xl rounded-r-none border border-gray-200 bg-white p-6 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900"
                  initial={{ x: 56, opacity: 0.92 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 56, opacity: 0.94 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
                        <Wallet size={16} />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {baixaParcelaForm.tipo === 'receber' ? 'Baixar Recebimento' : 'Baixar Pagamento'}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Confirme os dados antes de marcar a parcela como paga
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {origemBadgeParcela(baixaParcelaForm.parcela) && (
                        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-500/35 dark:bg-blue-950/40 dark:text-blue-300">
                          {renderTextoComNumeroFinalNegrito(origemBadgeParcela(baixaParcelaForm.parcela) || '')}
                        </span>
                      )}
                      <button
                        onClick={fecharDrawerBaixaParcela}
                        className="rounded-xl border border-blue-200 bg-blue-50 p-2 text-blue-700 shadow-sm transition-colors hover:bg-blue-100 dark:border-blue-500/35 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-900/40"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="mb-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">Lançamento</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {lancamentoParcela(baixaParcelaForm.parcela)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="mb-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">Contato</p>
                          {contatoBaixaParcela ? (
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {contatoBaixaParcela.nome_razao_social}
                              </p>
                              {contatoBaixaParcela.tag_principal?.trim() ? (
                                <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:border-indigo-500/35 dark:bg-indigo-950/30 dark:text-indigo-300">
                                  {contatoBaixaParcela.tag_principal}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400 dark:text-gray-500">Sem contato vinculado</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-5">
                        <div>
                          <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">Data de vencimento</p>
                          <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
                            {formatarData(baixaParcelaForm.parcela.data_vencimento)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">Data de emissão</p>
                          <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
                            {formatarData(baixaParcelaForm.parcela.criado_em)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">Valor total</p>
                          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {formatarMoeda(Math.abs(valorLiquidoParcela(baixaParcelaForm.parcela)))}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">Status</p>
                          <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${classeStatusParcela(baixaParcelaForm.parcela.status)}`}>
                            {formatarStatusParcela(baixaParcelaForm.parcela.status)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-1 dark:border-neutral-700 dark:bg-neutral-800/60">
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { id: 'baixa', label: 'Baixa' },
                          { id: 'parcelas', label: 'Parcelas' },
                          { id: 'historico', label: 'Histórico' },
                          { id: 'comprovantes', label: 'Comprovantes' },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setBaixaDrawerTab(tab.id as 'baixa' | 'parcelas' | 'historico' | 'comprovantes')}
                            className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                              baixaDrawerTab === tab.id
                                ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-200 dark:bg-neutral-900 dark:text-blue-300 dark:ring-blue-500/40'
                                : 'text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-neutral-700/80'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {baixaDrawerTab === 'baixa' ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Data do pagamento</label>
                          <DatePickerPagamento
                            value={baixaParcelaForm.dataPagamento}
                            onChange={(value) =>
                              setBaixaParcelaForm((prev) => (prev ? { ...prev, dataPagamento: value } : prev))
                            }
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Valor de baixa</label>
                          <div className="flex items-center rounded-xl border border-blue-200 bg-white px-3 py-2 dark:border-blue-500/35 dark:bg-neutral-800">
                            <span className="mr-2 text-sm font-semibold text-slate-500 dark:text-slate-300">R$</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatarValorInputBRL(baixaParcelaForm.valorPagoDigits)}
                              onChange={(e) =>
                                setBaixaParcelaForm((prev) =>
                                  prev ? { ...prev, valorPagoDigits: e.target.value.replace(/\D/g, '') } : prev
                                )
                              }
                              className="w-full bg-transparent text-sm outline-none"
                            />
                          </div>
                          {valorBaixaExcedido && (
                            <p className="mt-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                              O valor de baixa não pode ser maior que o valor total da transação.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Juros/Multa</label>
                          <div className="flex items-center rounded-xl border border-blue-200 bg-white px-3 py-2 dark:border-blue-500/35 dark:bg-neutral-800">
                            <span className="mr-1 text-sm font-semibold text-slate-500 dark:text-slate-300">R$</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatarValorInputBRL(baixaParcelaForm.jurosMultaDigits)}
                              onChange={(e) =>
                                setBaixaParcelaForm((prev) =>
                                  prev ? { ...prev, jurosMultaDigits: e.target.value.replace(/\D/g, '') } : prev
                                )
                              }
                              className="w-full bg-transparent text-sm outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Desconto</label>
                          <div className="flex items-center rounded-xl border border-blue-200 bg-white px-3 py-2 dark:border-blue-500/35 dark:bg-neutral-800">
                            <span className="mr-1 text-sm font-semibold text-slate-500 dark:text-slate-300">R$</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatarValorInputBRL(baixaParcelaForm.descontoDigits)}
                              onChange={(e) =>
                                setBaixaParcelaForm((prev) =>
                                  prev ? { ...prev, descontoDigits: e.target.value.replace(/\D/g, '') } : prev
                                )
                              }
                              className="w-full bg-transparent text-sm outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Taxa</label>
                          <div className="flex items-center rounded-xl border border-blue-200 bg-white px-3 py-2 dark:border-blue-500/35 dark:bg-neutral-800">
                            <span className="mr-1 text-sm font-semibold text-slate-500 dark:text-slate-300">R$</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatarValorInputBRL(baixaParcelaForm.taxaDigits)}
                              onChange={(e) =>
                                setBaixaParcelaForm((prev) =>
                                  prev ? { ...prev, taxaDigits: e.target.value.replace(/\D/g, '') } : prev
                                )
                              }
                              className="w-full bg-transparent text-sm outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Acréscimo</label>
                          <div className="flex items-center rounded-xl border border-blue-200 bg-white px-3 py-2 dark:border-blue-500/35 dark:bg-neutral-800">
                            <span className="mr-1 text-sm font-semibold text-slate-500 dark:text-slate-300">R$</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatarValorInputBRL(baixaParcelaForm.acrescimoDigits)}
                              onChange={(e) =>
                                setBaixaParcelaForm((prev) =>
                                  prev ? { ...prev, acrescimoDigits: e.target.value.replace(/\D/g, '') } : prev
                                )
                              }
                              className="w-full bg-transparent text-sm outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Conta bancária</label>
                          <SingleSelectDropdown
                            options={opcoesContasBancarias}
                            value={baixaParcelaForm.contaId || ''}
                            onChange={(value) =>
                              setBaixaParcelaForm((prev) => (prev ? { ...prev, contaId: value } : prev))
                            }
                            placeholder="Selecione uma conta"
                            buttonClassName="h-10 w-full !rounded-xl !border-blue-200 dark:!border-blue-500/35 !bg-white dark:!bg-neutral-900 hover:!border-blue-400 dark:hover:!border-blue-400/50 focus:!ring-blue-200 dark:focus:!ring-blue-500/30 !text-slate-700 dark:!text-slate-100"
                            menuClassName="!w-full !rounded-2xl !border-slate-200 dark:!border-neutral-700 !bg-white dark:!bg-neutral-900"
                            menuContentClassName="max-h-80"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Forma de pagamento</label>
                          <SingleSelectDropdown
                            options={opcoesFormasPagamento}
                            value={baixaParcelaForm.formaPagamentoId || ''}
                            onChange={(value) =>
                              setBaixaParcelaForm((prev) => (prev ? { ...prev, formaPagamentoId: value } : prev))
                            }
                            placeholder="Selecione uma forma"
                            buttonClassName="h-10 w-full !rounded-xl !border-blue-200 dark:!border-blue-500/35 !bg-white dark:!bg-neutral-900 hover:!border-blue-400 dark:hover:!border-blue-400/50 focus:!ring-blue-200 dark:focus:!ring-blue-500/30 !text-slate-700 dark:!text-slate-100"
                            menuClassName="!w-full !rounded-2xl !border-slate-200 dark:!border-neutral-700 !bg-white dark:!bg-neutral-900"
                            menuContentClassName="max-h-80"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Observações do pagamento</label>
                        <textarea
                          value={baixaParcelaForm.observacoes || 'Conta Liquidada'}
                          onChange={(e) =>
                            setBaixaParcelaForm((prev) => (prev ? { ...prev, observacoes: e.target.value } : prev))
                          }
                          rows={3}
                          className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm resize-none dark:border-blue-500/35 dark:bg-neutral-800"
                        />
                      </div>

                      {baixaParcelaForm.parcela.status === 'PARCIALMENTE_PAGO' && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 dark:border-neutral-700 dark:bg-neutral-800/40">
                          <button
                            type="button"
                            onClick={() => setMostrarPagamentosEfetivados((prev) => !prev)}
                            className="flex w-full items-center justify-between px-3 py-2 text-left"
                          >
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Pagamentos efetivados</span>
                            <ChevronDown
                              size={16}
                              className={`text-slate-500 transition-transform ${mostrarPagamentosEfetivados ? 'rotate-180' : ''}`}
                            />
                          </button>

                          {mostrarPagamentosEfetivados && (
                            <div className="space-y-2 border-t border-slate-200 px-3 pb-3 pt-2 dark:border-neutral-700">
                              {pagamentosEfetivadosParcela.length > 0 ? (
                                pagamentosEfetivadosParcela.map((pg) => (
                                  <div
                                    key={pg.id}
                                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                                        {pg.descricao || 'Pagamento registrado'}
                                      </p>
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        {formatarData(pg.data_pagamento)}
                                      </p>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                      {formatarMoeda(Math.abs(pg.valor_total || 0))}
                                    </p>
                                  </div>
                                ))
                              ) : (
                                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 dark:border-neutral-700 dark:text-slate-400">
                                  Nenhum pagamento efetivado encontrado para esta parcela.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    ) : baixaDrawerTab === 'parcelas' ? (
                      (() => {
                        const key = chaveRelacionamentoParcela(baixaParcelaForm.parcela);
                        if (!key) {
                          return (
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600 dark:border-neutral-700 dark:bg-neutral-800/40 dark:text-slate-300">
                              Parcela única, sem pedido ou ordem de serviço vinculado.
                            </div>
                          );
                        }

                        const relacionadas = parcelas
                          .filter((p) => chaveRelacionamentoParcela(p) === key)
                          .sort((a, b) => {
                            const na = a.numero_parcela ?? 0;
                            const nb = b.numero_parcela ?? 0;
                            return na - nb;
                          });

                        if (relacionadas.length <= 1) {
                          return (
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600 dark:border-neutral-700 dark:bg-neutral-800/40 dark:text-slate-300">
                              Parcela única, sem pedido ou ordem de serviço vinculado.
                            </div>
                          );
                        }

                        return (
                          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
                            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Parcelas relacionadas
                            </div>
                            <div className="space-y-2">
                              {relacionadas.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() =>
                                    setBaixaParcelaForm((prev) =>
                                      prev
                                        ? (() => {
                                            const ultimoExtratoItem = ultimoExtratoPorParcela.get(item.id);
                                            return {
                                              ...prev,
                                              parcela: item,
                                              valorPagoDigits: Math.round(Math.abs(valorLiquidoParcela(item)) * 100).toString(),
                                              contaId: item.id_conta_bancaria || prev.contaId,
                                              formaPagamentoId: ultimoExtratoItem?.id_forma_pagamento || prev.formaPagamentoId,
                                              observacoes: item.observacoes_pagamento?.trim() || prev.observacoes,
                                            };
                                          })()
                                        : prev
                                    )
                                  }
                                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                                    baixaParcelaForm.parcela.id === item.id
                                      ? 'border-blue-300 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-950/25'
                                      : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/60 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-blue-500/35 dark:hover:bg-blue-950/20'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                      Parcela {parcelasLabel(item)}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                      Vencimento: {formatarData(item.data_vencimento)} | {formatarMoeda(Math.abs(valorLiquidoParcela(item)))}
                                    </div>
                                  </div>
                                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${classeStatusParcela(item.status)}`}>
                                    {formatarStatusParcela(item.status)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })()
                    ) : baixaDrawerTab === 'comprovantes' ? (
                      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Envio de comprovante</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Faça o upload do seu comprovante aqui. Formatos aceitos: PDF, PNG e JPG. Limite máximo: 2 MB.
                          </p>
                        </div>

                        <div
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files?.[0] || null;
                            selecionarComprovante(file);
                          }}
                          className="rounded-xl border-2 border-dashed border-blue-200 bg-white p-5 text-center dark:border-blue-500/35 dark:bg-neutral-900"
                        >
                          <UploadCloud size={22} className="mx-auto text-blue-600 dark:text-blue-300" />
                          <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                            Arraste e solte o arquivo aqui
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">ou use o botão abaixo para selecionar</p>
                          <button
                            type="button"
                            onClick={() => comprovanteInputRef.current?.click()}
                            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-500/35 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
                          >
                            <Paperclip size={14} />
                            Escolher arquivo
                          </button>
                          <input
                            ref={comprovanteInputRef}
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                            className="hidden"
                            onChange={(e) => selecionarComprovante(e.target.files?.[0] || null)}
                          />
                        </div>

                        {comprovanteArquivo && (
                          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-700/50 dark:bg-emerald-900/20 dark:text-emerald-300">
                            Arquivo selecionado: <span className="font-semibold">{comprovanteArquivo.name}</span> ({(comprovanteArquivo.size / 1024).toFixed(1)} KB)
                          </div>
                        )}

                        {comprovanteErro && (
                          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-700/50 dark:bg-rose-900/20 dark:text-rose-300">
                            {comprovanteErro}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600 dark:border-neutral-700 dark:bg-neutral-800/40 dark:text-slate-300">
                        Conteúdo de <span className="font-semibold">Histórico</span> em construção.
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {valorBaixaInformado < totalTransacaoBaixa && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-700/40 dark:bg-amber-900/20">
                          <div className="flex items-center gap-2">
                            <p className="text-[11px] font-medium leading-none text-amber-700 dark:text-amber-300">Valor restante</p>
                            <p className="text-xs font-semibold leading-none text-amber-800 dark:text-amber-200">{formatarMoeda(valorRestanteBaixa)}</p>
                          </div>
                        </div>
                      )}
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-700/40 dark:bg-emerald-900/20">
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] font-medium leading-none text-emerald-700 dark:text-emerald-300">Valor a pagar</p>
                          <p className="text-xs font-semibold leading-none text-emerald-800 dark:text-emerald-200">{formatarMoeda(valorAPagarBaixa)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void confirmarBaixaParcela()}
                        disabled={salvandoBaixa || valorBaixaExcedido}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        {salvandoBaixa ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        Marcar como Pago
                      </button>
                    </div>
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
