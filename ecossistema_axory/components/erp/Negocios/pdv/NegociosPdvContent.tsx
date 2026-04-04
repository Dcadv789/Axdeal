'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, CreditCard, LayoutDashboard, Loader2, Monitor, Receipt, Search, ShoppingBag, UserRound, X } from 'lucide-react';

import SearchBar from '@/components/erp/Negocios/propostas/components/SearchBar';
import ColumnVisibilityDropdown from '@/components/ui/ColumnVisibilityDropdown';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/lib/context/company-context';
import { supabase } from '@/lib/supabase';

type PaymentMethod = 'Dinheiro' | 'PIX' | 'Cartao';
type PdvColumnKey = 'venda' | 'data' | 'cliente' | 'documento' | 'pagamento' | 'status' | 'itens' | 'total';
type PdvStatusFilter = 'todos' | 'CONCLUIDA' | 'CANCELADA';
type PdvPageSection = 'dashboard' | 'vendas' | 'conferencia';

type PdvSaleItem = {
  id: string;
  nome: string;
  preco: number;
  quantidade: number;
  desconto: number;
};

type PdvSale = {
  id: string;
  erpVendaId: string;
  data: string;
  metodoPagamento: PaymentMethod;
  cliente: string;
  vendedor: string | null;
  linkedDocumentCode: string | null;
  linkedDocumentDescription: string | null;
  subtotal: number;
  desconto: number;
  total: number;
  status: string | null;
  itens: PdvSaleItem[];
};

type CancelarVendaRpcResponse = {
  sucesso?: boolean;
  mensagem?: string;
};

type LookupRow = {
  id: string;
  nome?: string | null;
  nome_razao_social?: string | null;
  nome_fantasia?: string | null;
  nome_completo?: string | null;
  codigo_prefixo?: string | null;
  codigo_numero?: string | number | null;
  codigo_os?: string | null;
  titulo?: string | null;
  descricao?: string | null;
};

const STORAGE_COLUMNS_KEY = 'erp.negocios.pdv.colunas';
const DEFAULT_VISIBLE_COLUMNS: Record<PdvColumnKey, boolean> = {
  venda: true,
  data: true,
  cliente: true,
  documento: true,
  pagamento: true,
  status: true,
  itens: true,
  total: true,
};

const COLUMN_OPTIONS: Array<{ key: PdvColumnKey; label: string; tooltip: string }> = [
  { key: 'venda', label: 'Venda', tooltip: 'Codigo da venda e resumo do desconto aplicado.' },
  { key: 'data', label: 'Data', tooltip: 'Data e horario em que a venda foi registrada no PDV.' },
  { key: 'cliente', label: 'Cliente / Vendedor', tooltip: 'Cliente atendido e vendedor vinculado ao cupom.' },
  { key: 'documento', label: 'Documento', tooltip: 'Pedido, ordem de servico ou cupom avulso relacionado.' },
  { key: 'pagamento', label: 'Pagamento', tooltip: 'Forma de pagamento utilizada na venda.' },
  { key: 'status', label: 'Status', tooltip: 'Situacao atual da venda no PDV.' },
  { key: 'itens', label: 'Itens', tooltip: 'Quantidade total de itens vendidos no cupom.' },
  { key: 'total', label: 'Total', tooltip: 'Valor total pago pelo cliente na venda.' },
];

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Data indisponivel';
  }

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getPaymentBadgeClasses(method: PaymentMethod) {
  if (method === 'PIX') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300';
  }

  if (method === 'Dinheiro') {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300';
  }

  return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300';
}

function normalizeRpcResponse(data: unknown): CancelarVendaRpcResponse {
  if (Array.isArray(data)) {
    return normalizeRpcResponse(data[0]);
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    return {
      sucesso: typeof record.sucesso === 'boolean' ? record.sucesso : undefined,
      mensagem: typeof record.mensagem === 'string' ? record.mensagem : undefined,
    };
  }

  return {};
}

function getSaleStatusLabel(status?: string | null) {
  return isCancelledStatus(status) ? 'Cancelada' : 'Concluida';
}

function isCancelledStatus(status?: string | null) {
  const normalized = String(status || '').trim().toUpperCase();
  return normalized === 'CANCELADA' || normalized === 'CANCELADO';
}

function normalizePaymentMethod(value: unknown): PaymentMethod {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

  if (normalized.includes('PIX')) return 'PIX';
  if (normalized.includes('DINHEIRO')) return 'Dinheiro';
  return 'Cartao';
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildDocumentCode(prefix: unknown, number: unknown, fallbackPrefix: string) {
  const normalizedPrefix = String(prefix || fallbackPrefix).trim();
  const normalizedNumber = String(number || '').trim();

  if (normalizedNumber) {
    return normalizedPrefix ? `${normalizedPrefix}-${normalizedNumber}` : normalizedNumber;
  }

  return normalizedPrefix || fallbackPrefix;
}

export default function NegociosPdvContent() {
  const { toast } = useToast();
  const { companyId } = useCompany();
  const [activeSection, setActiveSection] = useState<PdvPageSection>('vendas');
  const [sales, setSales] = useState<PdvSale[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isLoadingSales, setIsLoadingSales] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'todos' | PaymentMethod>('todos');
  const [appliedPaymentFilter, setAppliedPaymentFilter] = useState<'todos' | PaymentMethod>('todos');
  const [statusFilter, setStatusFilter] = useState<PdvStatusFilter>('todos');
  const [appliedStatusFilter, setAppliedStatusFilter] = useState<PdvStatusFilter>('todos');
  const [visibleColumns, setVisibleColumns] = useState<Record<PdvColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);
  const [cancellingSaleId, setCancellingSaleId] = useState<string | null>(null);

  useEffect(() => {
    setHydrated(true);

    try {
      const rawColumns = window.localStorage.getItem(STORAGE_COLUMNS_KEY);
      if (!rawColumns) {
        return;
      }

      const parsedColumns = JSON.parse(rawColumns) as Partial<Record<PdvColumnKey, boolean>>;
      setVisibleColumns({ ...DEFAULT_VISIBLE_COLUMNS, ...parsedColumns });
    } catch {
      setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(STORAGE_COLUMNS_KEY, JSON.stringify(visibleColumns));
  }, [hydrated, visibleColumns]);

  const loadSales = useCallback(async () => {
    if (!companyId) {
      setSales([]);
      setIsLoadingSales(false);
      return;
    }

    setIsLoadingSales(true);

    try {
      const { data: salesData, error: salesError } = await supabase
        .from('erp_vendas_pdv')
        .select('*')
        .eq('id_empresa', companyId);

      if (salesError) {
        throw salesError;
      }

      const rawSales = Array.isArray(salesData) ? (salesData as Array<Record<string, unknown>>) : [];

      const contactIds = Array.from(
        new Set(rawSales.map((item) => String(item.id_contato || item.id_cliente || '')).filter(Boolean)),
      );
      const sellerIds = Array.from(new Set(rawSales.map((item) => String(item.id_vendedor || '')).filter(Boolean)));
      const paymentFormIds = Array.from(new Set(rawSales.map((item) => String(item.id_forma_pagamento || '')).filter(Boolean)));
      const pedidoIds = Array.from(new Set(rawSales.map((item) => String(item.id_pedido_venda || '')).filter(Boolean)));
      const osIds = Array.from(new Set(rawSales.map((item) => String(item.id_os_vinculada || item.id_os || '')).filter(Boolean)));
      const saleIds = Array.from(new Set(rawSales.map((item) => String(item.id || '')).filter(Boolean)));

      const [contactsRes, sellersRes, paymentFormsRes, pedidosRes, osRes, itemsRes] = await Promise.all([
        contactIds.length
          ? supabase.from('erp_contatos').select('id, nome_razao_social, nome_fantasia').in('id', contactIds)
          : Promise.resolve({ data: [], error: null }),
        sellerIds.length
          ? supabase.from('erp_vendedores').select('id, nome_completo').in('id', sellerIds)
          : Promise.resolve({ data: [], error: null }),
        paymentFormIds.length
          ? supabase.from('erp_formas_pagamento').select('id, nome').in('id', paymentFormIds)
          : Promise.resolve({ data: [], error: null }),
        pedidoIds.length
          ? supabase.from('erp_pedidos_venda').select('id, codigo_prefixo, codigo_numero, titulo').in('id', pedidoIds)
          : Promise.resolve({ data: [], error: null }),
        osIds.length
          ? supabase.from('erp_os').select('id, codigo_os, descricao').in('id', osIds)
          : Promise.resolve({ data: [], error: null }),
        saleIds.length
          ? supabase.from('erp_vendas_pdv_itens').select('*').in('id_venda_pdv', saleIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const contactsMap = new Map(
        ((contactsRes.data || []) as LookupRow[]).map((item) => [
          item.id,
          String(item.nome_razao_social || item.nome_fantasia || '').trim(),
        ]),
      );
      const sellersMap = new Map(
        ((sellersRes.data || []) as LookupRow[]).map((item) => [item.id, String(item.nome_completo || '').trim()]),
      );
      const paymentFormsMap = new Map(
        ((paymentFormsRes.data || []) as LookupRow[]).map((item) => [item.id, String(item.nome || '').trim()]),
      );
      const pedidosMap = new Map(
        ((pedidosRes.data || []) as LookupRow[]).map((item) => [
          item.id,
          {
            codigo: buildDocumentCode(item.codigo_prefixo, item.codigo_numero, 'PV'),
            descricao: String(item.titulo || '').trim() || 'Pedido de venda vinculado',
          },
        ]),
      );
      const osMap = new Map(
        ((osRes.data || []) as LookupRow[]).map((item) => [
          item.id,
          {
            codigo: String(item.codigo_os || 'OS').trim(),
            descricao: String(item.descricao || '').trim() || 'Ordem de servico vinculada',
          },
        ]),
      );
      const itemsBySaleId = new Map<string, PdvSaleItem[]>();
      for (const item of ((itemsRes.data || []) as Array<Record<string, unknown>>)) {
        const saleId = String(item.id_venda_pdv || '').trim();
        if (!saleId) {
          continue;
        }

        const mappedItem: PdvSaleItem = {
          id: String(item.id || `${saleId}-${Math.random()}`),
          nome: String(item.descricao || item.descricao_item || item.nome || 'Item'),
          preco: toNumber(item.valor_unitario || item.preco_unitario || item.preco || item.valor),
          quantidade: Math.max(1, toNumber(item.quantidade || item.qtd || 1)),
          desconto: toNumber(item.desconto || item.valor_desconto || item.desconto_item),
        };

        const existing = itemsBySaleId.get(saleId) || [];
        existing.push(mappedItem);
        itemsBySaleId.set(saleId, existing);
      }

      const mappedSales = rawSales.map<PdvSale>((row) => {
        const paymentFormName = paymentFormsMap.get(String(row.id_forma_pagamento || '').trim()) || '';
        const linkedPedido = pedidosMap.get(String(row.id_pedido_venda || '').trim());
        const linkedOs = osMap.get(String(row.id_os_vinculada || row.id_os || '').trim());
        const saleId = String(row.id || '').trim();
        const items = itemsBySaleId.get(saleId) || [];
        const itemCountFallback = Math.max(
          0,
          toNumber(
            row.quantidade_itens ||
              row.qtd_itens ||
              row.total_itens ||
              row.quantidade_total ||
              row.numero_itens ||
              items.reduce((sum, item) => sum + item.quantidade, 0),
          ),
        );

        return {
          id: String(row.codigo_venda || row.codigo || row.id || 'Venda'),
          erpVendaId: saleId,
          data: String(row.criado_em || row.data_venda || row.data_emissao || new Date().toISOString()),
          metodoPagamento: normalizePaymentMethod(row.forma_pagamento_texto || row.metodo_pagamento || paymentFormName),
          cliente:
            contactsMap.get(String(row.id_contato || row.id_cliente || '').trim()) ||
            String(row.cliente_nome || '').trim() ||
            'Consumidor Final',
          vendedor:
            sellersMap.get(String(row.id_vendedor || '').trim()) ||
            String(row.vendedor_nome || '').trim() ||
            null,
          linkedDocumentCode:
            linkedPedido?.codigo ||
            linkedOs?.codigo ||
            String(row.codigo_documento || row.documento || '').trim() ||
            null,
          linkedDocumentDescription:
            linkedPedido?.descricao ||
            linkedOs?.descricao ||
            String(row.descricao_documento || '').trim() ||
            null,
          subtotal:
            toNumber(row.subtotal || row.valor_subtotal || row.valor_bruto) ||
            items.reduce((sum, item) => sum + item.preco * item.quantidade, 0),
          desconto: toNumber(row.valor_desconto || row.desconto),
          total: toNumber(row.valor_total_recibo),
          status: String(row.status || 'ATIVA').trim() || 'ATIVA',
          itens:
            items.length > 0
              ? items
              : itemCountFallback > 0
                ? [
                    {
                      id: `count-${row.id}`,
                      nome: 'Itens do cupom',
                      preco: 0,
                      quantidade: itemCountFallback,
                      desconto: 0,
                    },
                  ]
                : [],
        };
      });

      setSales(mappedSales);
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : 'Nao foi possivel carregar as vendas do PDV.';

      setSales([]);
      toast({
        title: 'Erro ao carregar vendas',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoadingSales(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadSales();
  }, [loadSales]);

  const filteredSales = useMemo(() => {
    const normalizedSearch = appliedSearchTerm.trim().toLowerCase();

    return [...sales]
      .sort((left, right) => new Date(right.data).getTime() - new Date(left.data).getTime())
      .filter((sale) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          [
            sale.id,
            sale.cliente,
            sale.vendedor || '',
            sale.linkedDocumentCode || '',
            sale.metodoPagamento,
          ]
            .join(' ')
            .toLowerCase()
            .includes(normalizedSearch);

        const matchesPayment = appliedPaymentFilter === 'todos' || sale.metodoPagamento === appliedPaymentFilter;
        const normalizedStatus = isCancelledStatus(sale.status) ? 'CANCELADA' : 'CONCLUIDA';
        const matchesStatus = appliedStatusFilter === 'todos' || normalizedStatus === appliedStatusFilter;

        return matchesSearch && matchesPayment && matchesStatus;
      });
  }, [appliedPaymentFilter, appliedSearchTerm, appliedStatusFilter, sales]);

  const summary = useMemo(() => {
    return filteredSales.reduce(
      (accumulator, sale) => {
        accumulator.total += sale.total;
        accumulator.items += sale.itens.reduce((sum, item) => sum + item.quantidade, 0);
        return accumulator;
      },
      { total: 0, items: 0 },
    );
  }, [filteredSales]);

  const applyFilters = () => {
    setAppliedSearchTerm(searchTerm);
    setAppliedPaymentFilter(paymentFilter);
    setAppliedStatusFilter(statusFilter);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setAppliedSearchTerm('');
    setPaymentFilter('todos');
    setAppliedPaymentFilter('todos');
    setStatusFilter('todos');
    setAppliedStatusFilter('todos');
  };

  async function handleCancelarVenda(saleId: string) {
    const targetSale = sales.find((sale) => sale.id === saleId);
    if (!targetSale) {
      toast({
        title: 'Venda nao encontrada',
        description: 'Nao foi possivel localizar essa venda na listagem atual.',
        variant: 'destructive',
      });
      return;
    }

    if (!targetSale.erpVendaId) {
      toast({
        title: 'Venda sem UUID',
        description: 'Nao foi possivel identificar o UUID real dessa venda no banco.',
        variant: 'destructive',
      });
      return;
    }

    if (isCancelledStatus(targetSale.status)) {
      toast({
        title: 'Venda ja cancelada',
        description: 'Essa venda ja esta marcada como cancelada.',
      });
      return;
    }

    setCancellingSaleId(saleId);

    try {
      const { data, error } = await supabase.rpc('erp_rpc_cancelar_venda_pdv', {
        p_id_venda: targetSale.erpVendaId,
      });

      if (error) {
        throw error;
      }

      const rpcResult = normalizeRpcResponse(data);
      if (rpcResult.sucesso === false) {
        toast({
          title: 'Nao foi possivel cancelar',
          description: rpcResult.mensagem || 'A venda nao pode ser cancelada.',
          variant: 'destructive',
        });
        return;
      }

      await loadSales();

      toast({
        title: 'Venda cancelada',
        description: rpcResult.mensagem || 'A venda foi cancelada com sucesso.',
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : 'Nao foi possivel cancelar a venda.';

      toast({
        title: 'Erro ao cancelar',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setCancellingSaleId(null);
    }
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-2 dark:border-[#262626] dark:bg-black">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'vendas', label: 'Vendas', icon: Receipt },
            { id: 'conferencia', label: 'Conferencia', icon: ClipboardCheck },
          ].map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id as PdvPageSection)}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-black dark:text-slate-300 dark:hover:bg-neutral-900'
                }`}
              >
                <Icon size={16} />
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeSection === 'dashboard' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {['Card Principal 1', 'Card Principal 2', 'Card Principal 3', 'Card Principal 4'].map((title) => (
            <div
              key={title}
              className="min-h-[160px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-black"
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
            </div>
          ))}
        </div>
      ) : null}

      {activeSection === 'conferencia' ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm dark:border-neutral-800 dark:bg-black dark:text-slate-400">
          Area de conferencia em preparacao.
        </div>
      ) : null}

      {activeSection === 'vendas' ? (
        <>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 dark:border-[#262626] dark:bg-black">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[320px] flex-1">
                <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Search size={14} />
                  <span>Buscar vendas</span>
                </div>
                <SearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Buscar por venda, cliente, vendedor ou documento..."
                  className="w-full"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      applyFilters();
                    }
                  }}
                />
              </div>

              <div className="min-w-[220px]">
                <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <CreditCard size={14} />
                  <span>Pagamento</span>
                </div>
                <select
                  value={paymentFilter}
                  onChange={(event) => setPaymentFilter(event.target.value as 'todos' | PaymentMethod)}
                  className="h-10 w-full rounded-lg border border-blue-200 bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-transparent focus:ring-2 focus:ring-blue-200 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-slate-100 dark:focus:ring-blue-500/30"
                >
                  <option value="todos">Todos os meios</option>
                  <option value="PIX">PIX</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartao">Cartao</option>
                </select>
              </div>

              <div className="min-w-[220px]">
                <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Receipt size={14} />
                  <span>Status</span>
                </div>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as PdvStatusFilter)}
                  className="h-10 w-full rounded-lg border border-blue-200 bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-transparent focus:ring-2 focus:ring-blue-200 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-slate-100 dark:focus:ring-blue-500/30"
                >
                  <option value="todos">Todos os status</option>
                  <option value="CONCLUIDA">Concluidas</option>
                  <option value="CANCELADA">Canceladas</option>
                </select>
              </div>

              <ColumnVisibilityDropdown
                options={COLUMN_OPTIONS}
                values={visibleColumns}
                onToggle={(columnKey, checked) =>
                  setVisibleColumns((prev) => ({
                    ...prev,
                    [columnKey]: checked,
                  }))
                }
              />

              <button
                type="button"
                onClick={applyFilters}
                className="h-10 shrink-0 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Buscar
              </button>

              <button
                type="button"
                onClick={clearFilters}
                className="h-10 shrink-0 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-neutral-700 dark:text-slate-200 dark:hover:bg-neutral-800"
              >
                Limpar filtros
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-neutral-800 dark:bg-black">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                <Receipt size={14} />
                Vendas visiveis
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{filteredSales.length}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-neutral-800 dark:bg-black">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                <ShoppingBag size={14} />
                Itens vendidos
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{summary.items}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-neutral-800 dark:bg-black">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                <Monitor size={14} />
                Total movimentado
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{money.format(summary.total)}</div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white dark:border-[#262626] dark:bg-black">
            {!hydrated || isLoadingSales ? (
              <div className="px-6 py-16 text-center text-sm text-slate-500 dark:text-slate-400">Carregando historico do PDV...</div>
            ) : filteredSales.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-slate-300">
                  <Receipt size={24} />
                </div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Nenhuma venda encontrada</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Abra a frente de caixa para registrar a primeira venda ou ajuste os filtros aplicados.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full table-fixed">
              <thead className="bg-blue-600 dark:bg-blue-700">
                <tr>
                  {visibleColumns.venda && (
                    <th className="w-[190px] border-b border-blue-500/30 px-5 py-2 text-left text-xs font-bold uppercase tracking-wider text-white dark:border-blue-400/30">
                      Venda
                    </th>
                  )}
                  {visibleColumns.data && (
                    <th className="w-[170px] border-b border-blue-500/30 px-5 py-2 text-left text-xs font-bold uppercase tracking-wider text-white dark:border-blue-400/30">
                      Data
                    </th>
                  )}
                  {visibleColumns.cliente && (
                    <th className="w-[240px] border-b border-blue-500/30 px-5 py-2 text-left text-xs font-bold uppercase tracking-wider text-white dark:border-blue-400/30">
                      Cliente / Vendedor
                    </th>
                  )}
                  {visibleColumns.documento && (
                    <th className="w-[180px] border-b border-blue-500/30 px-5 py-2 text-left text-xs font-bold uppercase tracking-wider text-white dark:border-blue-400/30">
                      Documento
                    </th>
                  )}
                  {visibleColumns.pagamento && (
                    <th className="w-[140px] border-b border-blue-500/30 px-5 py-2 text-left text-xs font-bold uppercase tracking-wider text-white dark:border-blue-400/30">
                      Pagamento
                    </th>
                  )}
                  {visibleColumns.status && (
                    <th className="w-[140px] border-b border-blue-500/30 px-5 py-2 text-left text-xs font-bold uppercase tracking-wider text-white dark:border-blue-400/30">
                      Status
                    </th>
                  )}
                  {visibleColumns.itens && (
                    <th className="w-[110px] border-b border-blue-500/30 px-5 py-2 text-right text-xs font-bold uppercase tracking-wider text-white dark:border-blue-400/30">
                      Itens
                    </th>
                  )}
                  {visibleColumns.total && (
                    <th className="w-[140px] border-b border-blue-500/30 px-5 py-2 text-right text-xs font-bold uppercase tracking-wider text-white dark:border-blue-400/30">
                      Total
                    </th>
                  )}
                  <th className="w-[180px] border-b border-blue-500/30 px-5 py-2 text-right text-xs font-bold uppercase tracking-wider text-white dark:border-blue-400/30">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] bg-white dark:divide-[#262626] dark:bg-black">
                {filteredSales.map((sale) => {
                  const itemsCount = sale.itens.reduce((sum, item) => sum + item.quantidade, 0);
                  const isCancelled = isCancelledStatus(sale.status);
                  const isCancelling = cancellingSaleId === sale.id;

                  return (
                    <tr key={sale.erpVendaId} className="transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800">
                      {visibleColumns.venda && (
                        <td className="px-5 py-3 align-top text-sm text-gray-700 dark:text-gray-300">
                          <div className="space-y-1">
                            <p className="font-semibold text-gray-900 dark:text-white">{sale.id}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {sale.desconto > 0 ? `Desconto aplicado: ${money.format(sale.desconto)}` : 'Venda sem desconto geral'}
                            </p>
                          </div>
                        </td>
                      )}
                      {visibleColumns.data && (
                        <td className="px-5 py-3 align-top text-sm text-gray-600 dark:text-gray-400">{formatDateTime(sale.data)}</td>
                      )}
                      {visibleColumns.cliente && (
                        <td className="px-5 py-3 align-top text-sm text-gray-700 dark:text-gray-300">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <UserRound size={14} className="text-gray-400 dark:text-gray-500" />
                              <span className="font-medium text-gray-900 dark:text-white">{sale.cliente}</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {sale.vendedor ? `Vendedor: ${sale.vendedor}` : 'Sem vendedor informado'}
                            </p>
                          </div>
                        </td>
                      )}
                      {visibleColumns.documento && (
                        <td className="px-5 py-3 align-top text-sm text-gray-700 dark:text-gray-300">
                          <div className="space-y-1">
                            <p className="font-medium text-gray-900 dark:text-white">{sale.linkedDocumentCode || 'Cupom avulso'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {sale.linkedDocumentDescription || 'Sem documento comercial vinculado'}
                            </p>
                          </div>
                        </td>
                      )}
                      {visibleColumns.pagamento && (
                        <td className="px-5 py-3 align-top text-sm text-gray-700 dark:text-gray-300">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getPaymentBadgeClasses(sale.metodoPagamento)}`}>
                            {sale.metodoPagamento === 'Cartao' ? 'Cartao' : sale.metodoPagamento}
                          </span>
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="px-5 py-3 align-top text-sm text-gray-700 dark:text-gray-300">
                          <Badge
                            className={
                              isCancelled
                                ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                            }
                          >
                            {isCancelled ? 'Cancelada' : 'Concluida'}
                          </Badge>
                        </td>
                      )}
                      {visibleColumns.itens && (
                        <td className="px-5 py-3 align-top text-right text-sm font-medium text-gray-700 dark:text-gray-300">{itemsCount}</td>
                      )}
                      {visibleColumns.total && (
                        <td className="px-5 py-3 align-top text-right text-sm font-semibold text-gray-900 dark:text-white">
                          {money.format(sale.total)}
                        </td>
                      )}
                      <td className="px-5 py-3 align-top text-right">
                        {!isCancelled ? (
                          <button
                            type="button"
                            onClick={() => void handleCancelarVenda(sale.id)}
                            disabled={isCancelling}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                          >
                            {isCancelling ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                            Cancelar venda
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
