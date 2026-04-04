'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/lib/context/company-context';
import SearchBar from '@/components/erp/Negocios/propostas/components/SearchBar';
import DateRangePicker from '@/components/erp/Negocios/propostas/components/DateRangePicker';
import MultiSelectDropdown from '@/components/erp/Negocios/propostas/components/MultiSelectDropdown';
import ColumnVisibilityDropdown from '@/components/ui/ColumnVisibilityDropdown';
import NegociosContratosTable, {
  type ContratoListItem,
  type ContratosColumnKey,
  type ContratosSortColumn,
  type ContratosSortDirection,
} from './NegociosContratosTable';

const STATUS_OPTIONS = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'cancelado', label: 'Cancelado' },
];

const COLUMN_LABELS: Record<ContratosColumnKey, string> = {
  cliente: 'Cliente',
  valor: 'Valor',
  dia_vencimento: 'Dia venc.',
  data_inicio: 'Início',
  proximo_faturamento: 'Próx. faturamento',
  status: 'Status',
  acoes: 'Ações',
};

const COLUMN_TOOLTIPS: Record<ContratosColumnKey, string> = {
  cliente: 'Cliente vinculado ao contrato.',
  valor: 'Valor recorrente do contrato.',
  dia_vencimento: 'Dia base do vencimento mensal.',
  data_inicio: 'Data inicial do contrato.',
  proximo_faturamento: 'Próxima previsão de faturamento.',
  status: 'Situação atual do contrato.',
  acoes: 'Ações rápidas disponíveis.',
};

const TOGGLEABLE_COLUMNS: ContratosColumnKey[] = [
  'cliente',
  'valor',
  'dia_vencimento',
  'data_inicio',
  'proximo_faturamento',
  'status',
  'acoes',
];

function defaultColumns(): Record<ContratosColumnKey, boolean> {
  return {
    cliente: true,
    valor: true,
    dia_vencimento: true,
    data_inicio: true,
    proximo_faturamento: true,
    status: true,
    acoes: true,
  };
}

function dataDentroDoIntervalo(valor: string | null, inicio: string, fim: string) {
  if (!valor) return false;
  const data = new Date(`${valor}T00:00:00`);
  if (Number.isNaN(data.getTime())) return false;
  const inicioDate = inicio ? new Date(`${inicio}T00:00:00`) : null;
  const fimDate = fim ? new Date(`${fim}T23:59:59.999`) : null;
  if (inicioDate && data < inicioDate) return false;
  if (fimDate && data > fimDate) return false;
  return true;
}

export default function NegociosContratosContent() {
  const router = useRouter();
  const { companyId } = useCompany();
  const [contratos, setContratos] = useState<ContratoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTermAplicado, setSearchTermAplicado] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedStatusAplicado, setSelectedStatusAplicado] = useState<string[]>([]);
  const [dataInicioFiltro, setDataInicioFiltro] = useState('');
  const [dataFimFiltro, setDataFimFiltro] = useState('');
  const [dataInicioFiltroAplicado, setDataInicioFiltroAplicado] = useState('');
  const [dataFimFiltroAplicado, setDataFimFiltroAplicado] = useState('');
  const [openBuscasAvancadas, setOpenBuscasAvancadas] = useState(false);
  const [sortColumn, setSortColumn] = useState<ContratosSortColumn>(null);
  const [sortDirection, setSortDirection] = useState<ContratosSortDirection>(null);
  const [visibleColumns, setVisibleColumns] = useState<Record<ContratosColumnKey, boolean>>(defaultColumns());

  useEffect(() => {
    const carregar = async () => {
      if (!companyId) {
        setContratos([]);
        setErro('Empresa não identificada.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setErro(null);

      const [contratosRes, clientesRes] = await Promise.all([
        supabase
          .from('erp_contratos')
          .select('id, id_cliente, valor_recorrente, dia_vencimento, data_inicio, proximo_faturamento, status')
          .eq('id_empresa', companyId)
          .order('data_inicio', { ascending: false }),
        supabase
          .from('erp_contatos')
          .select('id, nome_razao_social, nome_fantasia')
          .eq('id_empresa', companyId),
      ]);

      if (contratosRes.error || clientesRes.error) {
        setContratos([]);
        setErro(contratosRes.error?.message || clientesRes.error?.message || 'Não foi possível carregar os contratos.');
        setLoading(false);
        return;
      }

      const clientesPorId = new Map(
        ((clientesRes.data || []) as Array<{ id: string; nome_razao_social?: string | null; nome_fantasia?: string | null }>).map((cliente) => [
          cliente.id,
          String(cliente.nome_razao_social || cliente.nome_fantasia || 'Sem cliente'),
        ])
      );

      const normalizados = ((contratosRes.data || []) as Array<Record<string, unknown>>).map((item) => {
        const idCliente = String(item.id_cliente || '');
        return {
          id: String(item.id || ''),
          cliente_nome: idCliente ? clientesPorId.get(idCliente) || 'Sem cliente' : 'Sem cliente',
          valor_recorrente: Number(item.valor_recorrente || 0),
          dia_vencimento: Number(item.dia_vencimento || 0),
          data_inicio: String(item.data_inicio || ''),
          proximo_faturamento: item.proximo_faturamento ? String(item.proximo_faturamento) : null,
          status: item.status === 'cancelado' ? 'cancelado' : 'ativo',
        } satisfies ContratoListItem;
      });

      setContratos(normalizados);
      setLoading(false);
    };

    void carregar();
  }, [companyId]);

  const handleSort = (column: ContratosSortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc'));
      if (sortDirection === 'desc') {
        setSortColumn(null);
      }
      return;
    }
    setSortColumn(column);
    setSortDirection('asc');
  };

  const contratosFiltrados = useMemo(() => {
    const termo = searchTermAplicado.trim().toLowerCase();
    const filtered = contratos.filter((contrato) => {
      const matchesSearch =
        !termo ||
        [contrato.cliente_nome, contrato.status, String(contrato.dia_vencimento)]
          .join(' ')
          .toLowerCase()
          .includes(termo);

      const matchesStatus =
        selectedStatusAplicado.length === 0 || selectedStatusAplicado.includes(contrato.status);

      const matchesData =
        (!dataInicioFiltroAplicado && !dataFimFiltroAplicado) ||
        dataDentroDoIntervalo(contrato.data_inicio, dataInicioFiltroAplicado, dataFimFiltroAplicado);

      return matchesSearch && matchesStatus && matchesData;
    });

    if (!sortColumn || !sortDirection) return filtered;

    return [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'cliente_nome':
          comparison = a.cliente_nome.localeCompare(b.cliente_nome);
          break;
        case 'valor_recorrente':
          comparison = a.valor_recorrente - b.valor_recorrente;
          break;
        case 'dia_vencimento':
          comparison = a.dia_vencimento - b.dia_vencimento;
          break;
        case 'data_inicio':
          comparison = new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime();
          break;
        case 'proximo_faturamento':
          comparison = new Date(a.proximo_faturamento || 0).getTime() - new Date(b.proximo_faturamento || 0).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [
    contratos,
    dataFimFiltroAplicado,
    dataInicioFiltroAplicado,
    searchTermAplicado,
    selectedStatusAplicado,
    sortColumn,
    sortDirection,
  ]);

  const aplicarFiltros = () => {
    setSearchTermAplicado(searchTerm);
    setSelectedStatusAplicado(selectedStatus);
    setDataInicioFiltroAplicado(dataInicioFiltro);
    setDataFimFiltroAplicado(dataFimFiltro);
  };

  const limparFiltros = () => {
    setSearchTerm('');
    setSearchTermAplicado('');
    setSelectedStatus([]);
    setSelectedStatusAplicado([]);
    setDataInicioFiltro('');
    setDataFimFiltro('');
    setDataInicioFiltroAplicado('');
    setDataFimFiltroAplicado('');
    setOpenBuscasAvancadas(false);
  };

  return (
    <div className="pt-0 pb-6 space-y-6">
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 dark:border-[#262626] dark:bg-black">
        <div className="space-y-2.5">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex flex-col gap-2">
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Filter size={14} />
                  <span>Data</span>
                </div>
                <DateRangePicker
                  dataInicio={dataInicioFiltro}
                  dataFim={dataFimFiltro}
                  onChange={(inicio, fim) => {
                    setDataInicioFiltro(inicio);
                    setDataFimFiltro(fim);
                  }}
                  className="w-[230px]"
                  buttonClassName="min-w-[230px] !rounded-xl !border-blue-200 dark:!border-blue-500/35"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Filter size={14} />
                  <span>Status</span>
                </div>
                <MultiSelectDropdown
                  options={STATUS_OPTIONS}
                  selectedValues={selectedStatus}
                  onChange={setSelectedStatus}
                  placeholder="Status"
                  buttonClassName="h-10 min-w-[240px] !rounded-xl !border-blue-200 dark:!border-blue-500/35 !bg-white dark:!bg-neutral-900 hover:!border-blue-400 dark:hover:!border-blue-400/50 focus:!ring-blue-200 dark:focus:!ring-blue-500/30 !text-slate-700 dark:!text-slate-100"
                  menuClassName="!rounded-2xl !border-slate-200 dark:!border-neutral-700 !bg-white dark:!bg-neutral-900"
                  menuContentClassName="max-h-[320px]"
                />
              </div>

              <ColumnVisibilityDropdown
                options={TOGGLEABLE_COLUMNS.map((columnKey) => ({
                  key: columnKey,
                  label: COLUMN_LABELS[columnKey],
                  tooltip: COLUMN_TOOLTIPS[columnKey],
                }))}
                values={visibleColumns}
                onToggle={(columnKey, checked) =>
                  setVisibleColumns((prev) => ({
                    ...prev,
                    [columnKey as ContratosColumnKey]: checked,
                  }))
                }
              />

              <button
                type="button"
                onClick={() => setOpenBuscasAvancadas((prev) => !prev)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
              >
                Filtros Avançados
                <ChevronDown size={16} className={`transition-transform ${openBuscasAvancadas ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          <div
            className={`grid overflow-hidden transition-all duration-300 ease-out ${
              openBuscasAvancadas ? 'mt-0 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className={`min-h-0 transform transition-all duration-300 ease-out ${openBuscasAvancadas ? 'translate-y-0' : '-translate-y-1'}`}>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-950/40">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-300">
                  Filtros avançados
                </div>
                <div className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                  Combine Data, Status, Colunas e Busca para localizar contratos específicos.
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar por cliente, status ou dia de vencimento..."
              className="flex-1"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  aplicarFiltros();
                }
              }}
            />
            <button
              type="button"
              onClick={aplicarFiltros}
              className="h-10 shrink-0 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Buscar
            </button>
            <button
              type="button"
              onClick={limparFiltros}
              className="h-10 shrink-0 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-neutral-700 dark:text-slate-200 dark:hover:bg-neutral-800"
            >
              Limpar filtros
            </button>
          </div>
        </div>
      </div>

      {erro ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
          {erro}
        </div>
      ) : (
        <NegociosContratosTable
          contratos={contratosFiltrados}
          loading={loading}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          onEditar={(id) => router.push(`/erp/negocios/contratos/${id}/editar`)}
          visibleColumns={visibleColumns}
        />
      )}
    </div>
  );
}
