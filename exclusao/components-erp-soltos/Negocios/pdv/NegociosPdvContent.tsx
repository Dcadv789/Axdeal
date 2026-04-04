'use client';

import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Monitor, Receipt, Search, ShoppingBag, UserRound } from 'lucide-react';

import SearchBar from '@/components/erp/PropostasContent/SearchBar';
import ColumnVisibilityDropdown from '@/components/ui/ColumnVisibilityDropdown';

type PaymentMethod = 'Dinheiro' | 'PIX' | 'Cartao';
type PdvColumnKey = 'venda' | 'data' | 'cliente' | 'documento' | 'pagamento' | 'itens' | 'total';

type PdvSale = {
  id: string;
  data: string;
  metodoPagamento: PaymentMethod;
  cliente: string;
  vendedor: string | null;
  linkedDocumentCode: string | null;
  linkedDocumentDescription: string | null;
  subtotal: number;
  desconto: number;
  total: number;
  itens: Array<{
    id: string;
    nome: string;
    preco: number;
    quantidade: number;
    desconto: number;
  }>;
};

const STORAGE_SALES_KEY = 'vendas_realizadas';
const STORAGE_COLUMNS_KEY = 'erp.negocios.pdv.colunas';
const DEFAULT_VISIBLE_COLUMNS: Record<PdvColumnKey, boolean> = {
  venda: true,
  data: true,
  cliente: true,
  documento: true,
  pagamento: true,
  itens: true,
  total: true,
};
const COLUMN_OPTIONS: Array<{ key: PdvColumnKey; label: string; tooltip: string }> = [
  { key: 'venda', label: 'Venda', tooltip: 'Código da venda e resumo do desconto aplicado.' },
  { key: 'data', label: 'Data', tooltip: 'Data e horário em que a venda foi registrada no PDV.' },
  { key: 'cliente', label: 'Cliente / Vendedor', tooltip: 'Cliente atendido e vendedor vinculado ao cupom.' },
  { key: 'documento', label: 'Documento', tooltip: 'Pedido, ordem de serviço ou cupom avulso relacionado.' },
  { key: 'pagamento', label: 'Pagamento', tooltip: 'Forma de pagamento utilizada na venda.' },
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
    return 'Data indisponível';
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

export default function NegociosPdvContent() {
  const [sales, setSales] = useState<PdvSale[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'todos' | PaymentMethod>('todos');
  const [appliedPaymentFilter, setAppliedPaymentFilter] = useState<'todos' | PaymentMethod>('todos');
  const [visibleColumns, setVisibleColumns] = useState<Record<PdvColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);

  useEffect(() => {
    setHydrated(true);

    try {
      const rawSales = window.localStorage.getItem(STORAGE_SALES_KEY);
      const parsedSales = rawSales ? (JSON.parse(rawSales) as PdvSale[]) : [];
      setSales(Array.isArray(parsedSales) ? parsedSales : []);
    } catch {
      setSales([]);
    }

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

        return matchesSearch && matchesPayment;
      });
  }, [appliedPaymentFilter, appliedSearchTerm, sales]);

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
  };

  const clearFilters = () => {
    setSearchTerm('');
    setAppliedSearchTerm('');
    setPaymentFilter('todos');
    setAppliedPaymentFilter('todos');
  };

  return (
    <div className="space-y-6 pb-6">
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
              <option value="Cartao">Cartão</option>
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
            Vendas visíveis
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
        {!hydrated ? (
          <div className="px-6 py-16 text-center text-sm text-slate-500 dark:text-slate-400">
            Carregando histórico do PDV...
          </div>
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
          <div className="overflow-auto">
            <table className="min-w-full table-fixed">
              <thead className="bg-blue-600 dark:bg-blue-700">
                <tr>
                  {visibleColumns.venda && (
                    <th className="w-[170px] border-b border-blue-500/30 px-5 py-2 text-left text-xs font-bold uppercase tracking-wider text-white dark:border-blue-400/30">
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
                    <th className="w-[160px] border-b border-blue-500/30 px-5 py-2 text-left text-xs font-bold uppercase tracking-wider text-white dark:border-blue-400/30">
                      Documento
                    </th>
                  )}
                  {visibleColumns.pagamento && (
                    <th className="w-[140px] border-b border-blue-500/30 px-5 py-2 text-left text-xs font-bold uppercase tracking-wider text-white dark:border-blue-400/30">
                      Pagamento
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
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] bg-white dark:divide-[#262626] dark:bg-black">
                {filteredSales.map((sale) => {
                  const itemsCount = sale.itens.reduce((sum, item) => sum + item.quantidade, 0);

                  return (
                    <tr key={sale.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800">
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
                        <td className="px-5 py-3 align-top text-sm text-gray-600 dark:text-gray-400">
                          {formatDateTime(sale.data)}
                        </td>
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
                            <p className="font-medium text-gray-900 dark:text-white">
                              {sale.linkedDocumentCode || 'Cupom avulso'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {sale.linkedDocumentDescription || 'Sem documento comercial vinculado'}
                            </p>
                          </div>
                        </td>
                      )}
                      {visibleColumns.pagamento && (
                        <td className="px-5 py-3 align-top text-sm text-gray-700 dark:text-gray-300">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getPaymentBadgeClasses(sale.metodoPagamento)}`}
                          >
                            {sale.metodoPagamento === 'Cartao' ? 'Cartão' : sale.metodoPagamento}
                          </span>
                        </td>
                      )}
                      {visibleColumns.itens && (
                        <td className="px-5 py-3 align-top text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                          {itemsCount}
                        </td>
                      )}
                      {visibleColumns.total && (
                        <td className="px-5 py-3 align-top text-right text-sm font-semibold text-gray-900 dark:text-white">
                          {money.format(sale.total)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
