import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface SortableHeaderProps {
  column: 'fatura' | 'parcela' | 'cliente' | 'venda' | 'vencimento' | 'valor' | 'status';
  children: React.ReactNode;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc' | null;
  onSort: (column: 'fatura' | 'parcela' | 'cliente' | 'venda' | 'vencimento' | 'valor' | 'status') => void;
}

export default function SortableHeader({ 
  column, 
  children, 
  sortColumn, 
  sortDirection, 
  onSort 
}: SortableHeaderProps) {
  const getSortIcon = () => {
    if (sortColumn !== column) {
      return <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />;
    }
    if (sortDirection === 'desc') {
      return <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />;
    }
    return <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" />;
  };

  return (
    <th className="px-6 py-3 text-left">
      <button
        onClick={() => onSort(column)}
        className="group flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      >
        {children}
        {getSortIcon()}
      </button>
    </th>
  );
}





