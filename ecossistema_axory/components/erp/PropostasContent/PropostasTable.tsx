import { getStatusBadge } from '@/utils/statusBadge';
import { MoreVertical, Share2, Mail, Link2, Pencil, CheckCircle, Trash2, Copy, ArrowUpDown, ArrowUp, ArrowDown, Info } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface Proposta {
  id: string;
  codigo: string;
  cliente_nome: string;
  status: string;
  valor_total_final: number;
  data_emissao: string;
  introducao?: string;
}

type SortColumn = 'codigo' | 'cliente_nome' | 'status' | 'valor_total_final' | 'data' | null;
type SortDirection = 'asc' | 'desc' | null;

interface PropostasTableProps {
  propostas: Proposta[];
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
  isVendas?: boolean;
  onVisualizarProposta?: (id: string) => void;
  onEditarProposta?: (id: string) => void;
  onAprovarProposta?: (id: string) => void;
}

interface MenuPosition {
  top: number;
  right: number;
}

export default function PropostasTable({ propostas, sortColumn, sortDirection, onSort, isVendas = false, onVisualizarProposta, onEditarProposta, onAprovarProposta }: PropostasTableProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ top: 0, right: 0 });
  
  // Verificar se o tooltip foi dispensado anteriormente
  const getInitialTooltipState = () => {
    const dismissed = localStorage.getItem('sortTooltipDismissed');
    return dismissed !== 'true';
  };
  
  const [showSortTooltip, setShowSortTooltip] = useState(getInitialTooltipState);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const menuRef = useRef<HTMLDivElement | null>(null);

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />;
    }
    if (sortDirection === 'desc') {
      return <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />;
    }
    return <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" />;
  };

  const SortableHeader = ({ column, children }: { column: SortColumn; children: React.ReactNode }) => (
    <th className="px-6 py-4 text-left border-b-2 border-gray-200 dark:border-gray-700">
      <button
        onClick={() => onSort(column)}
        className="group flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      >
        {children}
        {getSortIcon(column)}
      </button>
    </th>
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        const isButtonClick = Object.values(buttonRefs.current).some(
          (button) => button && button.contains(event.target as Node)
        );
        if (!isButtonClick) {
          setOpenMenu(null);
        }
      }
    };

    if (openMenu !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenu]);

  const handleMenuClick = (propostaId: string) => {
    const button = buttonRefs.current[propostaId];
    if (button) {
      const rect = button.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
    setOpenMenu(openMenu === propostaId ? null : propostaId);
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '—';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date?: string) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const handleCopyLink = (propostaId: string) => {
    const tipo = isVendas ? 'venda' : 'proposta';
    const link = `${window.location.origin}/${tipo}/${propostaId}`;
    navigator.clipboard.writeText(link);
    console.log('Link copiado:', link);
    setOpenMenu(null);
  };

  if (propostas.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        {isVendas ? 'Nenhuma venda encontrada' : 'Nenhuma proposta encontrada'}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-[#E5E7EB] dark:border-[#262626]">
      {showSortTooltip && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-800 px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Clique nos cabeçalhos das colunas para ordenar os dados
            </p>
          </div>
          <button
            onClick={() => {
              setShowSortTooltip(false);
              localStorage.setItem('sortTooltipDismissed', 'true');
            }}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-xs font-medium flex-shrink-0"
          >
            Dispensar
          </button>
        </div>
      )}
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-neutral-900">
          <tr>
            <SortableHeader column="codigo">{isVendas ? 'Número da Venda' : 'Número'}</SortableHeader>
            <SortableHeader column="cliente_nome">Cliente</SortableHeader>
            <SortableHeader column="status">Status</SortableHeader>
            <SortableHeader column="valor_total_final">Valor Total</SortableHeader>
            <SortableHeader column="data">{isVendas ? 'Data da Venda' : 'Data de Envio'}</SortableHeader>
            <th className="px-6 py-4 text-left border-b-2 border-gray-200 dark:border-gray-700">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-neutral-900 divide-y divide-[#E5E7EB] dark:divide-[#262626]">
          {propostas.map((proposta) => (
            <tr key={proposta.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
              <td className="px-6 py-3">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{proposta.codigo}</span>
              </td>
              <td className="px-6 py-3">
                <button
                  onClick={() => onVisualizarProposta && onVisualizarProposta(proposta.id)}
                  className="text-left hover:underline cursor-pointer"
                >
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{proposta.cliente_nome}</div>
                  {proposta.introducao && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{proposta.introducao}</div>
                  )}
                </button>
              </td>
              <td className="px-6 py-3">
                {getStatusBadge(proposta.status)}
              </td>
              <td className="px-6 py-3">
                <span className="text-sm text-gray-900 dark:text-gray-100">{formatCurrency(proposta.valor_total_final)}</span>
              </td>
              <td className="px-6 py-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">{formatDate(proposta.data_emissao)}</span>
              </td>
              <td className="px-6 py-3">
                <button
                  ref={(el) => { buttonRefs.current[proposta.id] = el; }}
                  onClick={() => handleMenuClick(proposta.id)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <MoreVertical size={18} className="text-gray-600 dark:text-gray-400" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {openMenu !== null && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${menuPosition.top}px`,
            right: `${menuPosition.right}px`,
            zIndex: 9999
          }}
          className="w-56 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl"
        >
          <button
            onClick={() => {
              if (openMenu && onVisualizarProposta) {
                onVisualizarProposta(openMenu);
              }
              setOpenMenu(null);
            }}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors whitespace-nowrap rounded-t-lg"
          >
            <Link2 size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span>Visualizar</span>
          </button>
          <button
            onClick={() => {
              if (openMenu && onEditarProposta) {
                onEditarProposta(openMenu);
              }
              setOpenMenu(null);
            }}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors whitespace-nowrap border-t border-gray-200 dark:border-gray-700"
          >
            <Pencil size={16} className="text-gray-600 dark:text-gray-400 flex-shrink-0" />
            <span>Editar</span>
          </button>
          {!isVendas && (
            <button
              onClick={() => {
                if (openMenu && onAprovarProposta) {
                  onAprovarProposta(openMenu);
                }
                setOpenMenu(null);
              }}
              className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors border-t border-gray-200 dark:border-gray-700 whitespace-nowrap"
            >
              <CheckCircle size={16} className="text-green-600 dark:text-green-400 flex-shrink-0" />
              <span>Aprovar Manualmente</span>
            </button>
          )}
          <button
            onClick={() => {
              console.log('Enviar via WhatsApp');
              setOpenMenu(null);
            }}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors border-t border-gray-200 dark:border-gray-700 whitespace-nowrap"
          >
            <Share2 size={16} className="text-green-600 dark:text-green-400 flex-shrink-0" />
            <span>Enviar via WhatsApp</span>
          </button>
          <button
            onClick={() => {
              console.log('Enviar via E-mail');
              setOpenMenu(null);
            }}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors border-t border-gray-200 dark:border-gray-700 whitespace-nowrap"
          >
            <Mail size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span>Enviar via E-mail</span>
          </button>
          <button
            onClick={() => handleCopyLink(openMenu)}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors border-t border-gray-200 dark:border-gray-700 whitespace-nowrap"
          >
            <Copy size={16} className="text-gray-600 dark:text-gray-400 flex-shrink-0" />
            <span>Copiar Link</span>
          </button>
          <button
            onClick={() => {
              console.log(`Excluir ${isVendas ? 'venda' : 'proposta'}:`, openMenu);
              setOpenMenu(null);
            }}
            className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-3 transition-colors border-t border-gray-200 dark:border-gray-700 whitespace-nowrap rounded-b-lg"
          >
            <Trash2 size={16} className="text-red-600 dark:text-red-400 flex-shrink-0" />
            <span>Excluir</span>
          </button>
        </div>
      )}
    </div>
  );
}
