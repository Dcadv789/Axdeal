import { Filter, List, LayoutList } from 'lucide-react';
import MultiSelectDropdown from './MultiSelectDropdown';

interface FilterBarProps {
  onStatusChange: (status: string[]) => void;
  onTypeChange: (type: string[]) => void;
  onViewChange: (view: 'list' | 'kanban') => void;
  selectedStatus: string[];
  selectedType: string[];
  currentView: 'list' | 'kanban';
}

export default function FilterBar({
  onStatusChange,
  onTypeChange,
  onViewChange,
  selectedStatus,
  selectedType,
  currentView
}: FilterBarProps) {
  const statuses = [
    { value: '', label: 'Todos os Status' },
    { value: 'rascunho', label: 'Rascunho' },
    { value: 'aguardando_envio', label: 'Aguardando Envio' },
    { value: 'enviada', label: 'Enviada' },
    { value: 'em_negociacao', label: 'Em Negociação' },
    { value: 'aprovada', label: 'Aprovada' },
    { value: 'recusada', label: 'Recusada' },
    { value: 'expirada', label: 'Expirada' },
    { value: 'confirmada', label: 'Confirmada' },
    { value: 'em_execucao', label: 'Em Execução' },
    { value: 'concluida', label: 'Concluída' },
    { value: 'cancelada', label: 'Cancelada' }
  ];

  const types = [
    { value: '', label: 'Todos os Tipos' },
    { value: 'unico', label: 'Único' },
    { value: 'recorrente', label: 'Recorrente' }
  ];

  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Filter size={18} />
          <span className="text-sm font-medium">Filtrar:</span>
        </div>

        <div className="flex gap-3 flex-wrap">
          <MultiSelectDropdown
            options={statuses}
            selectedValues={selectedStatus}
            onChange={onStatusChange}
            placeholder="Status"
          />

          <MultiSelectDropdown
            options={types}
            selectedValues={selectedType}
            onChange={onTypeChange}
            placeholder="Tipo"
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
