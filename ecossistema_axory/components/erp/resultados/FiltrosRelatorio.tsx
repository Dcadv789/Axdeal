'use client';

import { Download } from 'lucide-react';
import DateRangePicker from '@/components/erp/Negocios/propostas/components/DateRangePicker';
import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';

interface FiltrosRelatorioProps {
  dataInicio: string;
  dataFim: string;
  onDateRangeChange: (inicio: string, fim: string) => void;
  showClientFilter?: boolean;
  showStatusFilter?: boolean;
  clientValue?: string;
  onClientChange?: (value: string) => void;
  clientOptions?: Array<{ value: string; label: string }>;
  clientPlaceholder?: string;
  statusValue?: string;
  onStatusChange?: (value: string) => void;
  statusOptions?: Array<{ value: string; label: string }>;
  statusPlaceholder?: string;
  onExportCsv?: () => void;
}

export default function FiltrosRelatorio({
  dataInicio,
  dataFim,
  onDateRangeChange,
  showClientFilter = true,
  showStatusFilter = true,
  clientValue = '',
  onClientChange,
  clientOptions = [],
  clientPlaceholder = 'Filtrar por cliente/empresa',
  statusValue = '',
  onStatusChange,
  statusOptions = [],
  statusPlaceholder = 'Filtrar por status',
  onExportCsv,
}: FiltrosRelatorioProps) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 dark:border-[#262626] dark:bg-neutral-950">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="w-full xl:w-[320px]">
          <DateRangePicker
            dataInicio={dataInicio}
            dataFim={dataFim}
            onChange={onDateRangeChange}
            buttonClassName="!h-10"
          />
        </div>

        {showClientFilter ? (
          <div className="w-full xl:w-[300px]">
            <SingleSelectDropdown
              options={[{ value: '', label: 'Todos os clientes/empresas' }, ...clientOptions]}
              value={clientValue}
              onChange={(value) => onClientChange?.(value)}
              placeholder={clientPlaceholder}
              buttonClassName="!h-10 !rounded-xl !border-[#BFDBFE]"
            />
          </div>
        ) : null}

        {showStatusFilter ? (
          <div className="w-full xl:w-[240px]">
            <SingleSelectDropdown
              options={[{ value: '', label: 'Todos os status' }, ...statusOptions]}
              value={statusValue}
              onChange={(value) => onStatusChange?.(value)}
              placeholder={statusPlaceholder}
              buttonClassName="!h-10 !rounded-xl !border-[#BFDBFE]"
            />
          </div>
        ) : null}

        <div className="xl:ml-auto">
          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#BFDBFE] bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-500/35 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
          >
            <Download size={16} />
            Exportar CSV
          </button>
        </div>
      </div>
    </div>
  );
}
