import { Filter } from 'lucide-react';
import MultiSelectDropdown from '../PropostasContent/MultiSelectDropdown';

interface FilterBarProps {
  onStatusChange: (status: string[]) => void;
  selectedStatus: string[];
  onTipoPessoaChange: (tipo: string[]) => void;
  selectedTipoPessoa: string[];
}

export default function FilterBar({ onStatusChange, selectedStatus, onTipoPessoaChange, selectedTipoPessoa }: FilterBarProps) {
  const statuses = [
    { value: '', label: 'Todos os Status' },
    { value: 'ativo', label: 'Ativo' },
    { value: 'inativo', label: 'Inativo' }
  ];

  const tiposPessoa = [
    { value: '', label: 'Todos os Tipos' },
    { value: 'pf', label: 'Cliente PF' },
    { value: 'pj', label: 'Cliente PJ' }
  ];

  return (
    <div className="flex items-center gap-4 mb-4">
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
            options={tiposPessoa}
            selectedValues={selectedTipoPessoa}
            onChange={onTipoPessoaChange}
            placeholder="Tipo de Cliente"
          />
        </div>
      </div>
    </div>
  );
}
