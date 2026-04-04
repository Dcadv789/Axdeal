import { Filter, List, LayoutList } from 'lucide-react';
import MultiSelectDropdown from './MultiSelectDropdown';
import DateRangePicker from './DateRangePicker';

/** Valores = DB (MAIÚSCULO_UNDERLINE). Labels = exibição UI. */
export const STATUS_PROPOSTAS = [
  { value: '', label: 'Todos os status' },
  { value: 'RASCUNHO', label: 'Rascunho' },
  { value: 'AGUARDANDO_ENVIO', label: 'Aguardando Envio' },
  { value: 'ENVIADA', label: 'Enviada' },
  { value: 'VISUALIZADA', label: 'Visualizada' },
  { value: 'EM_NEGOCIACAO', label: 'Em Negociação' },
  { value: 'APROVADA', label: 'Aprovada' },
  { value: 'RECUSADA', label: 'Recusada' },
  { value: 'EXPIRADA', label: 'Expirada' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

/** Valores = DB (MAIÚSCULO_UNDERLINE). Labels = exibição UI. */
export const STATUS_PEDIDOS_VENDA = [
  { value: '', label: 'Todos os status' },
  { value: 'RASCUNHO', label: 'Rascunho' },
  { value: 'EM_ABERTO', label: 'Em Aberto' },
  { value: 'EM_ANDAMENTO', label: 'Em Andamento' },
  { value: 'ATENDIDO', label: 'Atendido' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

/** Valores = DB (MAIÚSCULO_UNDERLINE). Labels = exibição UI. */
export const STATUS_ORDENS_SERVICO = [
  { value: '', label: 'Todos os status' },
  { value: 'EM_ABERTO', label: 'Em Aberto' },
  { value: 'EM_ANDAMENTO', label: 'Em Andamento' },
  { value: 'AGUARDANDO_PECA', label: 'Aguardando Peça' },
  { value: 'AGUARDANDO_RETIRADA', label: 'Aguardando Retirada' },
  { value: 'CONCLUIDO', label: 'Concluído' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

interface FilterBarProps {
  onStatusChange: (status: string[]) => void;
  onViewChange: (view: 'list' | 'kanban') => void;
  onDateRangeChange: (inicio: string, fim: string) => void;
  selectedStatus: string[];
  currentView: 'list' | 'kanban';
  dataInicio: string;
  dataFim: string;
  statusOptions?: { value: string; label: string }[];
}

export default function FilterBar({
  onStatusChange,
  onViewChange,
  onDateRangeChange,
  selectedStatus,
  currentView,
  dataInicio,
  dataFim,
  statusOptions = STATUS_PROPOSTAS,
}: FilterBarProps) {
  const statuses = statusOptions;

  return (
    <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
      <div className="flex items-center gap-3 flex-1 flex-wrap">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Filter size={18} />
          <span className="text-sm font-medium">Filtrar:</span>
        </div>

        <div className="flex gap-3 flex-wrap">
          <DateRangePicker dataInicio={dataInicio} dataFim={dataFim} onChange={onDateRangeChange} />

          <MultiSelectDropdown
            options={statuses}
            selectedValues={selectedStatus}
            onChange={onStatusChange}
            placeholder="Status"
            buttonClassName="h-10 min-w-[250px] !rounded-xl !border-blue-200 dark:!border-blue-500/35 !bg-white dark:!bg-neutral-900 hover:!border-blue-400 dark:hover:!border-blue-400/50 focus:!ring-blue-200 dark:focus:!ring-blue-500/30 !text-slate-700 dark:!text-slate-100"
            menuClassName="!rounded-2xl !border-slate-200 dark:!border-neutral-700 !bg-white dark:!bg-neutral-900"
            menuContentClassName="max-h-[420px]"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 border-l border-gray-300 dark:border-gray-600 pl-4">
        <span className="text-sm text-gray-600 dark:text-gray-400">Visualização:</span>
        <button
          onClick={() => onViewChange('list')}
          className={`p-2 rounded-lg transition-colors ${
            currentView === 'list'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800'
          }`}
          title="Visualização em tabela"
        >
          <List size={18} />
        </button>
        <button
          onClick={() => onViewChange('kanban')}
          className={`p-2 rounded-lg transition-colors ${
            currentView === 'kanban'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800'
          }`}
          title="Visualização em kanban"
        >
          <LayoutList size={18} />
        </button>
      </div>
    </div>
  );
}
