'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, FileText, MoreVertical, Pencil } from 'lucide-react';

export interface ContratoListItem {
  id: string;
  cliente_nome: string;
  valor_recorrente: number;
  dia_vencimento: number;
  data_inicio: string;
  proximo_faturamento: string | null;
  status: 'ativo' | 'cancelado';
  id_cliente?: string | null;
}

export type ContratosSortColumn =
  | 'cliente_nome'
  | 'valor_recorrente'
  | 'dia_vencimento'
  | 'data_inicio'
  | 'proximo_faturamento'
  | 'status'
  | null;

export type ContratosSortDirection = 'asc' | 'desc' | null;

export type ContratosColumnKey =
  | 'cliente'
  | 'valor'
  | 'dia_vencimento'
  | 'data_inicio'
  | 'proximo_faturamento'
  | 'status'
  | 'acoes';

interface NegociosContratosTableProps {
  contratos: ContratoListItem[];
  loading?: boolean;
  sortColumn: ContratosSortColumn;
  sortDirection: ContratosSortDirection;
  onSort: (column: ContratosSortColumn) => void;
  onEditar: (id: string) => void;
  onVerCliente?: (clienteId: string) => void;
  visibleColumns: Record<ContratosColumnKey, boolean>;
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor || 0));
}

function formatarData(valor: string | null) {
  if (!valor) return '-';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '-';
  return data.toLocaleDateString('pt-BR');
}

export default function NegociosContratosTable({
  contratos,
  loading = false,
  sortColumn,
  sortDirection,
  onSort,
  onEditar,
  onVerCliente,
  visibleColumns,
}: NegociosContratosTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const menuRef = useRef<HTMLDivElement | null>(null);

  const allSelected = contratos.length > 0 && selectedIds.length === contratos.length;
  const hasPartialSelection = selectedIds.length > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = hasPartialSelection;
    }
  }, [hasPartialSelection]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => contratos.some((contrato) => contrato.id === id)));
  }, [contratos]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (openMenu && buttonRefs.current[openMenu]?.contains(target)) return;
      setOpenMenu(null);
    };

    if (openMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenu]);

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : contratos.map((contrato) => contrato.id));
  };

  const toggleOne = (contratoId: string) => {
    setSelectedIds((prev) =>
      prev.includes(contratoId) ? prev.filter((id) => id !== contratoId) : [...prev, contratoId]
    );
  };

  const handleMenuClick = (contratoId: string) => {
    if (openMenu === contratoId) {
      setOpenMenu(null);
      return;
    }

    const button = buttonRefs.current[contratoId];
    if (!button) return;

    const rect = button.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
    setOpenMenu(contratoId);
  };

  const getSortIcon = (column: ContratosSortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown size={14} className="opacity-0 transition-opacity group-hover:opacity-60" />;
    }

    if (sortDirection === 'desc') {
      return <ArrowDown size={14} className="text-white" />;
    }

    return <ArrowUp size={14} className="text-white" />;
  };

  const SortableHeader = ({
    column,
    children,
    className = '',
  }: {
    column: ContratosSortColumn;
    children: React.ReactNode;
    className?: string;
  }) => (
    <th className={`py-2 text-left ${className}`}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="group relative w-full pr-5 text-left text-xs font-bold uppercase tracking-wider text-white transition-colors hover:text-blue-100"
      >
        <span>{children}</span>
        <span className="absolute right-0 top-1/2 -translate-y-1/2">{getSortIcon(column)}</span>
      </button>
    </th>
  );

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-[#E5E7EB] bg-white dark:border-[#262626] dark:bg-black">
      <table className="w-full table-fixed min-w-[980px]">
        <thead className="bg-blue-600 dark:bg-blue-700">
          <tr>
            <th className="w-12 px-4 py-2 text-left border-b border-blue-500/30 dark:border-blue-400/30">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="Selecionar todos os contratos"
                className="h-4 w-4 rounded border-white/35 bg-transparent accent-blue-500 focus:ring-2 focus:ring-white/40"
              />
            </th>
            {visibleColumns.cliente && (
              <SortableHeader column="cliente_nome" className="px-5">
                Cliente
              </SortableHeader>
            )}
            {visibleColumns.valor && (
              <SortableHeader column="valor_recorrente" className="w-[160px] whitespace-nowrap px-5">
                Valor
              </SortableHeader>
            )}
            {visibleColumns.dia_vencimento && (
              <SortableHeader column="dia_vencimento" className="w-[130px] whitespace-nowrap px-5">
                Dia venc.
              </SortableHeader>
            )}
            {visibleColumns.data_inicio && (
              <SortableHeader column="data_inicio" className="w-[140px] whitespace-nowrap px-5">
                Início
              </SortableHeader>
            )}
            {visibleColumns.proximo_faturamento && (
              <SortableHeader column="proximo_faturamento" className="w-[180px] whitespace-nowrap px-5">
                Próx. faturamento
              </SortableHeader>
            )}
            {visibleColumns.status && (
              <SortableHeader column="status" className="w-[150px] whitespace-nowrap px-5">
                Status
              </SortableHeader>
            )}
            {visibleColumns.acoes && (
              <th className="w-[88px] px-5 py-2 text-center border-b border-blue-500/30 dark:border-blue-400/30">
                <span className="block text-center leading-tight text-xs font-bold text-white uppercase tracking-wider">
                  Ações
                </span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-black divide-y divide-[#E5E7EB] dark:divide-[#262626]">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <tr key={`skeleton-${index}`} className="animate-pulse">
                <td className="w-12 px-4 py-3">
                  <div className="h-4 w-4 rounded bg-slate-200 dark:bg-neutral-700" />
                </td>
                {visibleColumns.cliente && (
                  <td className="min-w-0 px-5 py-3">
                    <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-neutral-700" />
                  </td>
                )}
                {visibleColumns.valor && (
                  <td className="w-[160px] whitespace-nowrap px-5 py-3">
                    <div className="h-4 w-24 rounded bg-slate-200 dark:bg-neutral-700" />
                  </td>
                )}
                {visibleColumns.dia_vencimento && (
                  <td className="w-[130px] whitespace-nowrap px-5 py-3">
                    <div className="h-4 w-16 rounded bg-slate-200 dark:bg-neutral-700" />
                  </td>
                )}
                {visibleColumns.data_inicio && (
                  <td className="w-[140px] whitespace-nowrap px-5 py-3">
                    <div className="h-4 w-20 rounded bg-slate-200 dark:bg-neutral-700" />
                  </td>
                )}
                {visibleColumns.proximo_faturamento && (
                  <td className="w-[180px] whitespace-nowrap px-5 py-3">
                    <div className="h-4 w-24 rounded bg-slate-200 dark:bg-neutral-700" />
                  </td>
                )}
                {visibleColumns.status && (
                  <td className="w-[150px] whitespace-nowrap px-5 py-3">
                    <div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-neutral-700" />
                  </td>
                )}
                {visibleColumns.acoes && (
                  <td className="w-[88px] px-5 py-3">
                    <div className="mx-auto h-8 w-8 rounded-lg bg-slate-200 dark:bg-neutral-700" />
                  </td>
                )}
              </tr>
            ))
          ) : contratos.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                Não há contratos a exibir.
              </td>
            </tr>
          ) : (
            contratos.map((contrato) => (
              <tr key={contrato.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                <td className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(contrato.id)}
                    onChange={() => toggleOne(contrato.id)}
                    aria-label={`Selecionar contrato de ${contrato.cliente_nome}`}
                    className="h-4 w-4 rounded border-gray-300/70 accent-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-neutral-600/70 dark:bg-neutral-900"
                  />
                </td>
                {visibleColumns.cliente && (
                  <td className="min-w-0 px-5 py-3">
                    <button onClick={() => onEditar(contrato.id)} className="block w-full min-w-0 cursor-pointer text-left">
                      <div className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {contrato.cliente_nome || 'Sem cliente'}
                      </div>
                    </button>
                  </td>
                )}
                {visibleColumns.valor && (
                  <td className="w-[160px] whitespace-nowrap px-5 py-3">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {formatarMoeda(contrato.valor_recorrente)}
                    </span>
                  </td>
                )}
                {visibleColumns.dia_vencimento && (
                  <td className="w-[130px] whitespace-nowrap px-5 py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Dia {contrato.dia_vencimento}</span>
                  </td>
                )}
                {visibleColumns.data_inicio && (
                  <td className="w-[140px] whitespace-nowrap px-5 py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{formatarData(contrato.data_inicio)}</span>
                  </td>
                )}
                {visibleColumns.proximo_faturamento && (
                  <td className="w-[180px] whitespace-nowrap px-5 py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{formatarData(contrato.proximo_faturamento)}</span>
                  </td>
                )}
                {visibleColumns.status && (
                  <td className="w-[150px] whitespace-nowrap px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        contrato.status === 'ativo'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-neutral-800 dark:text-slate-300'
                      }`}
                    >
                      {contrato.status === 'ativo' ? 'Ativo' : 'Cancelado'}
                    </span>
                  </td>
                )}
                {visibleColumns.acoes && (
                  <td className="w-[88px] px-5 py-3">
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        ref={(el) => {
                          buttonRefs.current[contrato.id] = el;
                        }}
                        onClick={() => handleMenuClick(contrato.id)}
                        title="Mais opções"
                        aria-label="Mais opções"
                        className={`group rounded-lg p-2 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                          openMenu === contrato.id
                            ? 'bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-500/20 dark:text-blue-300'
                            : 'text-slate-700 hover:bg-slate-200 dark:text-neutral-300 dark:hover:bg-neutral-700'
                        }`}
                      >
                        <MoreVertical
                          size={18}
                          className={`transition-colors duration-200 ${
                            openMenu === contrato.id
                              ? 'text-blue-700 dark:text-blue-300'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {openMenu !== null && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${menuPosition.top}px`,
            right: `${menuPosition.right}px`,
            zIndex: 9999,
          }}
          className="w-48 rounded-lg border border-gray-200 bg-gray-50 shadow-xl dark:border-gray-700 dark:bg-neutral-800"
        >
          {onVerCliente && openMenu && contratos.find((c) => c.id === openMenu)?.id_cliente && (
            <button
              type="button"
              onClick={() => {
                const clienteId = contratos.find((c) => c.id === openMenu)?.id_cliente;
                if (clienteId) onVerCliente(clienteId);
                setOpenMenu(null);
              }}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-neutral-700 rounded-t-lg"
            >
              <Eye size={15} className="text-blue-500 dark:text-blue-400 flex-shrink-0" />
              Ver Cliente
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.open(`/pdf/contrato/${openMenu}`, '_blank', 'noopener,noreferrer');
              }
              setOpenMenu(null);
            }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-neutral-700"
          >
            <FileText size={15} />
            Gerar PDF
          </button>
          <button
            type="button"
            onClick={() => {
              onEditar(openMenu);
              setOpenMenu(null);
            }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-neutral-700"
          >
            <Pencil size={15} />
            Editar contrato
          </button>
        </div>
      )}
    </div>
  );
}
