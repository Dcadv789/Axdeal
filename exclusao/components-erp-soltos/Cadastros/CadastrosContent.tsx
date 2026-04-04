'use client';

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Briefcase,
  Copy,
  Eye,
  Filter,
  Mail,
  MoreVertical,
  Package,
  Pencil,
  Phone,
  Trash2,
  Wrench,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@axdeal/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import CatalogoDetailsDrawer from './CatalogoDetailsDrawer';
import CatalogoDuplicateModal from './CatalogoDuplicateModal';
import EmailDrawer from './ClientesContent/EmailDrawer';
import SearchBar from './Negocios/propostas/components/SearchBar';

export type CadastrosTab = 'clientes' | 'produtos' | 'servicos';

interface CatalogoCadastro {
  id: string;
  id_empresa?: string;
  codigo: string | null;
  nome: string;
  tipo: string | null;
  preco_venda: number | null;
  descricao_padrao: string | null;
  ativo: boolean;
}

type CatalogSortColumn = 'codigo' | 'nome' | 'preco_venda' | 'ativo' | null;
type ClienteSortColumn = 'codigo_cliente' | 'nome' | 'cpf_cnpj' | 'email' | 'empresa' | 'status' | 'rating' | null;
type SortDirection = 'asc' | 'desc' | null;

interface Cliente {
  id: string;
  codigo_cliente: string;
  nome: string;
  cpf_cnpj: string;
  email: string;
  telefone: string;
  empresa?: string;
  status: 'ativo' | 'inativo';
  rating: 'verde' | 'amarelo' | 'vermelho';
  tipo_pessoa: 'PF' | 'PJ';
}

interface CadastrosContentProps {
  activeTab: CadastrosTab;
  onTabChange: (tab: CadastrosTab) => void;
  rightContent?: React.ReactNode;
  onEditarCliente: (id: string) => void;
  onVisualizarCliente: (id: string) => void;
  refreshTrigger?: number;
}

interface MenuPosition {
  top: number;
  right: number;
}

interface CatalogoTableProps {
  items: CatalogoCadastro[];
  activeTab: Extract<CadastrosTab, 'produtos' | 'servicos'>;
  sortColumn: CatalogSortColumn;
  sortDirection: SortDirection;
  onSort: (column: CatalogSortColumn) => void;
  onVisualizar: (item: CatalogoCadastro) => void;
  onEditar: (item: CatalogoCadastro) => void;
  onDuplicar: (item: CatalogoCadastro) => void;
  onExcluir: (item: CatalogoCadastro) => void;
}

interface CadastrosTableProps {
  activeTab: CadastrosTab;
  catalogoItems: CatalogoCadastro[];
  clientes: Cliente[];
  loading?: boolean;
  catalogoSortColumn: CatalogSortColumn;
  clientesSortColumn: ClienteSortColumn;
  sortDirection: SortDirection;
  onSortCatalogo: (column: CatalogSortColumn) => void;
  onSortCliente: (column: ClienteSortColumn) => void;
  onVisualizarCatalogo: (item: CatalogoCadastro) => void;
  onEditarCatalogo: (item: CatalogoCadastro) => void;
  onDuplicarCatalogo: (item: CatalogoCadastro) => void;
  onExcluirCatalogo: (item: CatalogoCadastro) => void;
  onVisualizarCliente: (id: string) => void;
  onEditarCliente: (id: string) => void;
}

const TAB_TITLES: Record<CadastrosTab, string> = {
  clientes: 'Clientes',
  produtos: 'Produtos',
  servicos: 'Serviços',
};

let cadastrosCache: {
  hydrated: boolean;
  catalogo: CatalogoCadastro[];
  clientesHydrated: boolean;
  clientes: Cliente[];
} = {
  hydrated: false,
  catalogo: [],
  clientesHydrated: false,
  clientes: [],
};

function formatCurrency(value?: number) {
  if (!value) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function normalizarTipo(tipo: string | null | undefined): 'PRODUTO' | 'SERVICO' | '' {
  const valor = (tipo || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

  if (valor === 'PRODUTO') return 'PRODUTO';
  if (valor === 'SERVICO') return 'SERVICO';
  return '';
}

function getStatusBadge(ativo: boolean) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        ativo
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
          : 'bg-slate-700 text-white dark:bg-slate-600 dark:text-slate-50'
      }`}
    >
      {ativo ? 'Ativo' : 'Inativo'}
    </span>
  );
}

function FilterSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 min-w-[220px] rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-transparent focus:ring-2 focus:ring-blue-200 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-slate-100 dark:focus:ring-blue-500/30"
    >
      {children}
    </select>
  );
}

function CadastrosTable({
  activeTab,
  catalogoItems,
  clientes,
  loading = false,
  catalogoSortColumn,
  clientesSortColumn,
  sortDirection,
  onSortCatalogo,
  onSortCliente,
  onVisualizarCatalogo,
  onEditarCatalogo,
  onDuplicarCatalogo,
  onExcluirCatalogo,
  onVisualizarCliente,
  onEditarCliente,
}: CadastrosTableProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ top: 0, right: 0 });
  const [emailDrawerOpen, setEmailDrawerOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const isClientes = activeTab === 'clientes';
  const rows = isClientes ? clientes : catalogoItems;
  const allSelected = rows.length > 0 && selectedIds.length === rows.length;
  const hasPartialSelection = selectedIds.length > 0 && !allSelected;

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => rows.some((row) => row.id === id)));
  }, [rows]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = hasPartialSelection;
    }
  }, [hasPartialSelection]);

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

  const formatCpfCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length === 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (numbers.length === 14) {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return value;
  };

  const getSortIcon = (column: CatalogSortColumn | ClienteSortColumn) => {
    const currentColumn = isClientes ? clientesSortColumn : catalogoSortColumn;
    if (currentColumn !== column) {
      return <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-60 transition-opacity" />;
    }
    if (sortDirection === 'desc') {
      return <ArrowDown size={14} className="text-white" />;
    }
    return <ArrowUp size={14} className="text-white" />;
  };

  const handleMenuClick = (rowId: string) => {
    const button = buttonRefs.current[rowId];
    if (button) {
      const rect = button.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setOpenMenu(openMenu === rowId ? null : rowId);
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : rows.map((row) => row.id));
  };

  const toggleOne = (rowId: string) => {
    setSelectedIds((prev) => (prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]));
  };

  const handleEmailSent = async (para: string, assunto: string, mensagem: string) => {
    if (!selectedCliente) return;

    try {
      const { error: insertError } = await supabase.from('sis_fila_notificacoes').insert({
        cliente_nome: selectedCliente.nome,
        destino: para,
        assunto,
        mensagem_corpo: mensagem,
        canal: 'email',
        status: 'PENDENTE',
      });

      if (insertError) {
        alert(`Erro ao agendar envio do e-mail: ${insertError.message}`);
        return;
      }

      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 5000);
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
      alert('Erro ao processar envio do e-mail');
    }
  };

  const SortableHeader = ({
    column,
    children,
    className = '',
    onClick,
  }: {
    column: CatalogSortColumn | ClienteSortColumn;
    children: React.ReactNode;
    className?: string;
    onClick: () => void;
  }) => (
    <th className={`py-2 text-left border-b border-blue-500/30 dark:border-blue-400/30 ${className}`}>
      <button
        onClick={onClick}
        className="group relative w-full pr-5 text-left leading-tight text-xs font-bold text-white uppercase tracking-wider hover:text-blue-100 transition-colors"
      >
        <span>{children}</span>
        <span className="absolute right-0 top-1/2 -translate-y-1/2">{getSortIcon(column)}</span>
      </button>
    </th>
  );

  if (!loading && rows.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        {isClientes ? 'Nenhum cliente encontrado.' : `Nenhum ${activeTab === 'produtos' ? 'produto' : 'serviço'} encontrado.`}
      </div>
    );
  }

  return (
    <>
      <div className="w-full overflow-x-auto rounded-lg border border-[#E5E7EB] dark:border-[#262626]">
        <table className="w-full table-fixed">
          <thead className="bg-blue-600 dark:bg-blue-700">
            <tr>
              <th className="w-12 px-4 py-2 text-left border-b border-blue-500/30 dark:border-blue-400/30">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Selecionar todos"
                  className="h-4 w-4 rounded border-white/35 bg-transparent accent-blue-500 focus:ring-2 focus:ring-white/40"
                />
              </th>

              {isClientes ? (
                <>
                  <SortableHeader column="codigo_cliente" className="w-[108px] whitespace-nowrap px-5" onClick={() => onSortCliente('codigo_cliente')}>
                    Código
                  </SortableHeader>
                  <SortableHeader column="nome" className="px-5" onClick={() => onSortCliente('nome')}>
                    Nome
                  </SortableHeader>
                  <SortableHeader column="cpf_cnpj" className="w-[176px] whitespace-nowrap px-5" onClick={() => onSortCliente('cpf_cnpj')}>
                    CPF/CNPJ
                  </SortableHeader>
                  <SortableHeader column="email" className="w-[280px] whitespace-nowrap px-5" onClick={() => onSortCliente('email')}>
                    E-mail
                  </SortableHeader>
                  <th className="w-[160px] px-5 py-2 text-left border-b border-blue-500/30 dark:border-blue-400/30">
                    <span className="block text-left leading-tight text-xs font-bold text-white uppercase tracking-wider">Telefone</span>
                  </th>
                  <SortableHeader column="status" className="w-[140px] whitespace-nowrap px-5" onClick={() => onSortCliente('status')}>
                    Status
                  </SortableHeader>
                </>
              ) : (
                <>
                  <SortableHeader column="codigo" className="w-[132px] whitespace-nowrap px-5" onClick={() => onSortCatalogo('codigo')}>
                    Código
                  </SortableHeader>
                  <SortableHeader column="nome" className="px-5" onClick={() => onSortCatalogo('nome')}>
                    Nome
                  </SortableHeader>
                  <SortableHeader column="preco_venda" className="w-[168px] whitespace-nowrap px-5" onClick={() => onSortCatalogo('preco_venda')}>
                    Valor
                  </SortableHeader>
                  <SortableHeader column="ativo" className="w-[152px] whitespace-nowrap px-5" onClick={() => onSortCatalogo('ativo')}>
                    Status
                  </SortableHeader>
                </>
              )}

              <th className="w-[140px] px-5 py-2 text-center border-b border-blue-500/30 dark:border-blue-400/30">
                <span className="block text-center leading-tight text-xs font-bold text-white uppercase tracking-wider">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-neutral-900 divide-y divide-[#E5E7EB] dark:divide-[#262626]">
            {loading
              ? Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={`cadastro-skeleton-${idx}`}>
                    <td className="px-4 py-3">
                      <div className="h-4 w-4 animate-pulse rounded bg-slate-200 dark:bg-neutral-700" />
                    </td>
                    {isClientes && (
                      <td className="px-5 py-3">
                        <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-neutral-700" />
                      </td>
                    )}
                    <td className="px-5 py-3">
                      <div className="space-y-2">
                        <div className="h-4 w-36 animate-pulse rounded bg-slate-200 dark:bg-neutral-700" />
                        <div className="h-3 w-24 animate-pulse rounded bg-slate-100 dark:bg-neutral-800" />
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-neutral-700" />
                    </td>
                    <td className="px-5 py-3">
                      <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-neutral-700" />
                    </td>
                    {isClientes && (
                      <td className="px-5 py-3">
                        <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-neutral-700" />
                      </td>
                    )}
                    <td className="px-5 py-3">
                      <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-neutral-700" />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-center gap-2">
                        <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200 dark:bg-neutral-700" />
                        <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200 dark:bg-neutral-700" />
                        <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200 dark:bg-neutral-700" />
                      </div>
                    </td>
                  </tr>
                ))
              : isClientes
              ? clientes.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                    <td className="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(cliente.id)}
                        onChange={() => toggleOne(cliente.id)}
                        aria-label={`Selecionar ${cliente.nome}`}
                        className="h-4 w-4 rounded border-gray-300/70 accent-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-neutral-600/70 dark:bg-neutral-900"
                      />
                    </td>
                    <td className="w-[108px] whitespace-nowrap px-5 py-3">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{cliente.codigo_cliente || '-'}</span>
                    </td>
                    <td className="min-w-0 px-5 py-3">
                      <button onClick={() => onVisualizarCliente(cliente.id)} className="block w-full min-w-0 text-left">
                        <div className="truncate text-sm font-medium text-gray-900 dark:text-white">{cliente.empresa || cliente.nome}</div>
                        <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                          {cliente.empresa ? cliente.nome : `${cliente.tipo_pessoa} • ${cliente.rating === 'verde' ? 'Bom' : cliente.rating === 'amarelo' ? 'Moderado' : 'Alto Risco'}`}
                        </div>
                      </button>
                    </td>
                    <td className="w-[176px] whitespace-nowrap px-5 py-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{formatCpfCnpj(cliente.cpf_cnpj)}</span>
                    </td>
                    <td className="w-[280px] whitespace-nowrap px-5 py-3">
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <Mail size={13} className="flex-shrink-0 text-gray-400 dark:text-gray-500" />
                        <span className="truncate">{cliente.email || '-'}</span>
                      </div>
                    </td>
                    <td className="w-[160px] whitespace-nowrap px-5 py-3">
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <Phone size={13} className="flex-shrink-0 text-gray-400 dark:text-gray-500" />
                        <span>{cliente.telefone || '-'}</span>
                      </div>
                    </td>
                    <td className="w-[140px] whitespace-nowrap px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          cliente.status === 'ativo'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-slate-700 text-white dark:bg-slate-600 dark:text-slate-50'
                        }`}
                      >
                        {cliente.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="w-[140px] px-5 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          title="Visualizar"
                          aria-label="Visualizar"
                          onClick={() => onVisualizarCliente(cliente.id)}
                          className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                        >
                          <Eye size={17} />
                        </button>
                        <button
                          type="button"
                          title="Editar"
                          aria-label="Editar"
                          onClick={() => onEditarCliente(cliente.id)}
                          className="rounded-lg p-2 text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-neutral-800"
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          type="button"
                          ref={(el) => {
                            buttonRefs.current[cliente.id] = el;
                          }}
                          onClick={() => handleMenuClick(cliente.id)}
                          className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-neutral-800"
                        >
                          <MoreVertical size={18} className="text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              : catalogoItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                    <td className="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleOne(item.id)}
                        aria-label={`Selecionar ${item.nome}`}
                        className="h-4 w-4 rounded border-gray-300/70 accent-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-neutral-600/70 dark:bg-neutral-900"
                      />
                    </td>
                    <td className="w-[132px] whitespace-nowrap px-5 py-3">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.codigo || '-'}</span>
                    </td>
                    <td className="min-w-0 px-5 py-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
                          {activeTab === 'produtos' ? <Package size={16} /> : <Wrench size={16} />}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-gray-900 dark:text-white">{item.nome}</div>
                          {item.descricao_padrao && <div className="truncate text-xs text-gray-500 dark:text-gray-400">{item.descricao_padrao}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="w-[168px] whitespace-nowrap px-5 py-3">
                      <span className="text-sm text-gray-900 dark:text-gray-100">{formatCurrency(Number(item.preco_venda || 0))}</span>
                    </td>
                    <td className="w-[152px] whitespace-nowrap px-5 py-3">{getStatusBadge(item.ativo)}</td>
                    <td className="w-[140px] px-5 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          title="Visualizar"
                          aria-label="Visualizar"
                          onClick={() => {
                            onVisualizarCatalogo(item);
                            setOpenMenu(null);
                          }}
                          className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                        >
                          <Eye size={17} />
                        </button>
                        <button
                          type="button"
                          title="Editar"
                          aria-label="Editar"
                          onClick={() => {
                            onEditarCatalogo(item);
                            setOpenMenu(null);
                          }}
                          className="rounded-lg p-2 text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-neutral-800"
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          type="button"
                          ref={(el) => {
                            buttonRefs.current[item.id] = el;
                          }}
                          onClick={() => handleMenuClick(item.id)}
                          title="Mais opções"
                          aria-label="Mais opções"
                          className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-neutral-800"
                        >
                          <MoreVertical size={18} className="text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
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
              zIndex: 9999,
            }}
            className="w-56 rounded-lg border border-gray-200 bg-gray-50 shadow-xl dark:border-gray-700 dark:bg-neutral-800"
          >
            {isClientes ? (
              <>
                <button
                  onClick={() => {
                    const cliente = clientes.find((c) => c.id === openMenu);
                    if (cliente) {
                      setSelectedCliente(cliente);
                      setEmailDrawerOpen(true);
                    }
                    setOpenMenu(null);
                  }}
                  className="flex w-full items-center gap-3 whitespace-nowrap rounded-t-lg px-4 py-3 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-700"
                >
                  <Mail size={16} className="flex-shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>Enviar E-mail</span>
                </button>
                <button
                  onClick={() => {
                    console.log('Excluir cliente:', openMenu);
                    setOpenMenu(null);
                  }}
                  className="flex w-full items-center gap-3 whitespace-nowrap rounded-b-lg border-t border-gray-200 px-4 py-3 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-gray-700 dark:text-red-400 dark:hover:bg-red-950/20"
                >
                  <Trash2 size={16} className="flex-shrink-0 text-red-600 dark:text-red-400" />
                  <span>Excluir</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    const itemSelecionado = catalogoItems.find((itemAtual) => itemAtual.id === openMenu);
                    if (itemSelecionado) {
                      onDuplicarCatalogo(itemSelecionado);
                    }
                    setOpenMenu(null);
                  }}
                  className="flex w-full items-center gap-3 whitespace-nowrap rounded-t-lg px-4 py-3 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-700"
                >
                  <Copy size={16} className="flex-shrink-0 text-gray-600 dark:text-gray-400" />
                  <span>Duplicar</span>
                </button>
                <button
                  onClick={() => {
                    const itemSelecionado = catalogoItems.find((itemAtual) => itemAtual.id === openMenu);
                    if (itemSelecionado) {
                      onExcluirCatalogo(itemSelecionado);
                    }
                    setOpenMenu(null);
                  }}
                  className="flex w-full items-center gap-3 whitespace-nowrap rounded-b-lg border-t border-gray-200 px-4 py-3 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-gray-700 dark:text-red-400 dark:hover:bg-red-950/20"
                >
                  <Trash2 size={16} className="flex-shrink-0 text-red-600 dark:text-red-400" />
                  <span>Excluir</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {isClientes && showSuccessAlert && (
        <div className="fixed top-4 right-4 z-[60] animate-in slide-in-from-top-2">
          <div className="rounded-lg border-l-4 border-green-500 bg-green-50 p-4 shadow-lg dark:bg-green-950/40">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">E-mail agendado com sucesso!</p>
                <p className="mt-0.5 text-xs text-green-700 dark:text-green-300">O envio ocorrera em instantes.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isClientes && (
        <EmailDrawer
          isOpen={emailDrawerOpen}
          onClose={() => {
            setEmailDrawerOpen(false);
            setSelectedCliente(null);
          }}
          clienteEmail={selectedCliente?.email || ''}
          clienteNome={selectedCliente?.nome || ''}
          clienteId={selectedCliente?.id || ''}
          onEmailSent={handleEmailSent}
        />
      )}
    </>
  );
}

function CatalogoTable({
  items,
  activeTab,
  sortColumn,
  sortDirection,
  onSort,
  onVisualizar,
  onEditar,
  onDuplicar,
  onExcluir,
}: CatalogoTableProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ top: 0, right: 0 });
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const singular = activeTab === 'produtos' ? 'produto' : 'servico';
  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const hasPartialSelection = selectedIds.length > 0 && !allSelected;

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => items.some((item) => item.id === id)));
  }, [items]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = hasPartialSelection;
    }
  }, [hasPartialSelection]);

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

  const getSortIcon = (column: CatalogSortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-60 transition-opacity" />;
    }
    if (sortDirection === 'desc') {
      return <ArrowDown size={14} className="text-white" />;
    }
    return <ArrowUp size={14} className="text-white" />;
  };

  const handleMenuClick = (itemId: string) => {
    const button = buttonRefs.current[itemId];
    if (button) {
      const rect = button.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setOpenMenu(openMenu === itemId ? null : itemId);
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : items.map((item) => item.id));
  };

  const toggleOne = (itemId: string) => {
    setSelectedIds((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]));
  };

  const SortableHeader = ({
    column,
    children,
    className = '',
  }: {
    column: CatalogSortColumn;
    children: React.ReactNode;
    className?: string;
  }) => (
    <th className={`py-2 text-left border-b border-blue-500/30 dark:border-blue-400/30 ${className}`}>
      <button
        onClick={() => onSort(column)}
        className="group relative w-full pr-5 text-left leading-tight text-xs font-bold text-white uppercase tracking-wider hover:text-blue-100 transition-colors"
      >
        <span>{children}</span>
        <span className="absolute right-0 top-1/2 -translate-y-1/2">{getSortIcon(column)}</span>
      </button>
    </th>
  );

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        {`Nenhum ${singular} encontrado.`}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-[#E5E7EB] dark:border-[#262626]">
      <table className="w-full table-fixed">
        <thead className="bg-blue-600 dark:bg-blue-700">
          <tr>
            <th className="w-12 px-4 py-2 text-left border-b border-blue-500/30 dark:border-blue-400/30">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="Selecionar todos"
                className="h-4 w-4 rounded border-white/35 bg-transparent accent-blue-500 focus:ring-2 focus:ring-white/40"
              />
            </th>
            <SortableHeader column="codigo" className="w-[132px] whitespace-nowrap px-5">
              Codigo
            </SortableHeader>
            <SortableHeader column="nome" className="px-5">
              Nome
            </SortableHeader>
            <SortableHeader column="preco_venda" className="w-[168px] whitespace-nowrap px-5">
              Valor
            </SortableHeader>
            <SortableHeader column="ativo" className="w-[152px] whitespace-nowrap px-5">
              Status
            </SortableHeader>
            <th className="w-[140px] px-5 py-2 text-center border-b border-blue-500/30 dark:border-blue-400/30">
              <span className="block text-center leading-tight text-xs font-bold text-white uppercase tracking-wider">
                Acoes
              </span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-neutral-900 divide-y divide-[#E5E7EB] dark:divide-[#262626]">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
              <td className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={() => toggleOne(item.id)}
                  aria-label={`Selecionar ${item.nome}`}
                  className="h-4 w-4 rounded border-gray-300/70 accent-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-neutral-600/70 dark:bg-neutral-900"
                />
              </td>
              <td className="w-[132px] whitespace-nowrap px-5 py-3">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.codigo || '-'}</span>
              </td>
              <td className="min-w-0 px-5 py-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
                    {activeTab === 'produtos' ? <Package size={16} /> : <Wrench size={16} />}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-gray-900 dark:text-white">{item.nome}</div>
                    {item.descricao_padrao && (
                      <div className="truncate text-xs text-gray-500 dark:text-gray-400">{item.descricao_padrao}</div>
                    )}
                  </div>
                </div>
              </td>
              <td className="w-[168px] whitespace-nowrap px-5 py-3">
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {formatCurrency(Number(item.preco_venda || 0))}
                </span>
              </td>
              <td className="w-[152px] whitespace-nowrap px-5 py-3">{getStatusBadge(item.ativo)}</td>
              <td className="w-[140px] px-5 py-3">
                <div className="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    title="Visualizar"
                    aria-label="Visualizar"
                    onClick={() => {
                      onVisualizar(item);
                      setOpenMenu(null);
                    }}
                    className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                  >
                    <Eye size={17} />
                  </button>
                  <button
                    type="button"
                    title="Editar"
                    aria-label="Editar"
                    onClick={() => {
                      onEditar(item);
                      setOpenMenu(null);
                    }}
                    className="rounded-lg p-2 text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-neutral-800"
                  >
                    <Pencil size={17} />
                  </button>
                  <button
                    type="button"
                    ref={(el) => {
                      buttonRefs.current[item.id] = el;
                    }}
                    onClick={() => handleMenuClick(item.id)}
                    title="Mais opcoes"
                    aria-label="Mais opcoes"
                    className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-neutral-800"
                  >
                    <MoreVertical size={18} className="text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
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
            zIndex: 9999,
          }}
          className="w-56 rounded-lg border border-gray-200 bg-gray-50 shadow-xl dark:border-gray-700 dark:bg-neutral-800"
        >
          <button
            onClick={() => {
              const itemSelecionado = items.find((itemAtual) => itemAtual.id === openMenu);
              if (itemSelecionado) {
                onDuplicar(itemSelecionado);
              }
              setOpenMenu(null);
            }}
            className="flex w-full items-center gap-3 whitespace-nowrap rounded-t-lg px-4 py-3 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-700"
          >
            <Copy size={16} className="flex-shrink-0 text-gray-600 dark:text-gray-400" />
            <span>Duplicar</span>
          </button>
          <button
            onClick={() => {
              const itemSelecionado = items.find((itemAtual) => itemAtual.id === openMenu);
              if (itemSelecionado) {
                onExcluir(itemSelecionado);
              }
              setOpenMenu(null);
            }}
            className="flex w-full items-center gap-3 whitespace-nowrap rounded-b-lg border-t border-gray-200 px-4 py-3 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-gray-700 dark:text-red-400 dark:hover:bg-red-950/20"
          >
            <Trash2 size={16} className="flex-shrink-0 text-red-600 dark:text-red-400" />
            <span>Excluir</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function CadastrosContent({
  activeTab,
  onTabChange,
  rightContent,
  onEditarCliente,
  onVisualizarCliente,
  refreshTrigger = 0,
}: CadastrosContentProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [catalogoStatus, setCatalogoStatus] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  const [sortColumn, setSortColumn] = useState<CatalogSortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [catalogo, setCatalogo] = useState<CatalogoCadastro[]>(() => cadastrosCache.catalogo);
  const [loadingCatalogo, setLoadingCatalogo] = useState(() => !cadastrosCache.hydrated);
  const [clientes, setClientes] = useState<Cliente[]>(() => cadastrosCache.clientes);
  const [clientesStatus, setClientesStatus] = useState<'todos' | 'ativos' | 'inativos'>('ativos');
  const [clientesTipo, setClientesTipo] = useState<'todos' | 'PF' | 'PJ'>('todos');
  const [clientesSortColumn, setClientesSortColumn] = useState<ClienteSortColumn>(null);
  const [clientesSortDirection, setClientesSortDirection] = useState<SortDirection>(null);
  const [loadingClientes, setLoadingClientes] = useState(() => !cadastrosCache.clientesHydrated);
  const [catalogoDetalhe, setCatalogoDetalhe] = useState<CatalogoCadastro | null>(null);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit'>('view');
  const [idEmpresa, setIdEmpresa] = useState<string | null>(null);
  const [catalogoDuplicar, setCatalogoDuplicar] = useState<CatalogoCadastro | null>(null);
  const [codigoSugeridoDuplicacao, setCodigoSugeridoDuplicacao] = useState('');

  useEffect(() => {
    if (activeTab === 'clientes' || !user) return;

    const fetchCatalogo = async () => {
      if (!cadastrosCache.hydrated) {
        setLoadingCatalogo(true);
      }

      try {
        const { data: membroData, error: membroError } = await supabase
          .from('sis_membros_equipe')
          .select('id_empresa')
          .eq('id_usuario', user.id)
          .maybeSingle();

        if (membroError || !membroData) {
          console.error('Erro ao buscar empresa do usuario:', membroError);
          return;
        }
        setIdEmpresa(membroData.id_empresa);

        const { data, error } = await supabase
          .from('erp_catalogo')
          .select('id, id_empresa, codigo, nome, tipo, preco_venda, descricao_padrao, ativo')
          .eq('id_empresa', membroData.id_empresa)
          .order('criado_em', { ascending: false });

        if (error) {
          console.error('Erro ao buscar catalogo:', error);
          return;
        }

        const catalogoFormatado = (data || []) as CatalogoCadastro[];
        setCatalogo(catalogoFormatado);
        cadastrosCache.catalogo = catalogoFormatado;
        cadastrosCache.hydrated = true;
      } finally {
        setLoadingCatalogo(false);
      }
    };

    void fetchCatalogo();
  }, [activeTab, user]);

  useEffect(() => {
    if (!user) return;

    const fetchClientes = async () => {
      if (!cadastrosCache.clientesHydrated && activeTab === 'clientes') {
        setLoadingClientes(true);
      }

      try {
        const { data: membroData, error: membroError } = await supabase
          .from('sis_membros_equipe')
          .select('id_empresa')
          .eq('id_usuario', user.id)
          .maybeSingle();

        if (membroError || !membroData) {
          console.error('Erro ao buscar empresa do usuário:', membroError);
          return;
        }

        const { data: clientesData, error: clientesError } = await supabase
          .from('erp_contatos')
          .select('*')
          .eq('id_empresa', membroData.id_empresa)
          .order('criado_em', { ascending: false });

        if (clientesError) {
          console.error('Erro ao buscar clientes:', clientesError);
          return;
        }

        const clientesFormatados: Cliente[] = (clientesData || []).map((cliente) => {
          let rating: 'verde' | 'amarelo' | 'vermelho' = 'verde';
          if (cliente.classificacao_risco === 'ALTO_RISCO') {
            rating = 'vermelho';
          } else if (cliente.classificacao_risco === 'MODERADO') {
            rating = 'amarelo';
          }

          return {
            id: cliente.id,
            codigo_cliente: String(cliente.codigo_cliente || '').replace(/\D/g, ''),
            nome: cliente.nome_razao_social,
            cpf_cnpj: cliente.tipo_pessoa === 'PF' ? cliente.cpf || '' : cliente.cnpj || '',
            email: cliente.email_financeiro || '',
            telefone: cliente.whatsapp || cliente.telefone_fixo || '',
            empresa: cliente.nome_fantasia || undefined,
            status: cliente.status === 'ATIVO' ? 'ativo' : 'inativo',
            rating,
            tipo_pessoa: cliente.tipo_pessoa as 'PF' | 'PJ',
          };
        });

        setClientes(clientesFormatados);
        cadastrosCache.clientes = clientesFormatados;
        cadastrosCache.clientesHydrated = true;
      } finally {
        setLoadingClientes(false);
      }
    };

    void fetchClientes();
  }, [activeTab, refreshTrigger, user]);

  const atualizarCatalogoLocal = (updater: (atual: CatalogoCadastro[]) => CatalogoCadastro[]) => {
    setCatalogo((prev) => {
      const next = updater(prev);
      cadastrosCache.catalogo = next;
      cadastrosCache.hydrated = true;
      return next;
    });
  };

  const abrirVisualizacao = (item: CatalogoCadastro) => {
    setDrawerMode('view');
    setCatalogoDetalhe(item);
  };

  const abrirEdicao = (item: CatalogoCadastro) => {
    setDrawerMode('edit');
    setCatalogoDetalhe(item);
  };

  const buscarConfiguracaoCodigo = async (tipo: string | null | undefined, empresaDestino: string) => {
    const isProduto = normalizarTipo(tipo) === 'PRODUTO';
    const { data, error } = await supabase
      .from('sis_configuracoes')
      .select('prefixo_produto, prefixo_servico, proximo_numero_produto, proximo_numero_servico')
      .eq('id_empresa', empresaDestino)
      .maybeSingle();

    if (error || !data) {
      throw new Error('Nao foi possivel carregar a configuracao de codigo.');
    }

    const prefixo = isProduto ? data.prefixo_produto : data.prefixo_servico;
    const proximoNumero = isProduto ? data.proximo_numero_produto : data.proximo_numero_servico;
    const updateField = isProduto ? 'proximo_numero_produto' : 'proximo_numero_servico';
    const codigo = `${prefixo}-${String(proximoNumero).padStart(4, '0')}`;

    return {
      codigo,
      proximoNumero,
      updateField,
    };
  };

  const salvarCatalogo = async (payload: {
    id: string;
    codigo: string | null;
    nome: string;
    preco_venda: number | null;
    descricao_padrao: string | null;
    ativo: boolean;
  }) => {
    const empresaAtual =
      catalogo.find((item) => item.id === payload.id)?.id_empresa || catalogoDetalhe?.id_empresa || idEmpresa;

    if (payload.codigo) {
      const { data: codigoExistente, error: codigoError } = await supabase
        .from('erp_catalogo')
        .select('id')
        .eq('id_empresa', empresaAtual)
        .eq('codigo', payload.codigo)
        .neq('id', payload.id)
        .maybeSingle();

      if (codigoError) {
        throw new Error(codigoError.message || 'Nao foi possivel validar o codigo.');
      }

      if (codigoExistente) {
        throw new Error('Ja existe um item com esse codigo.');
      }
    }

    const { error } = await supabase
      .from('erp_catalogo')
      .update({
        codigo: payload.codigo,
        nome: payload.nome,
        preco_venda: payload.preco_venda,
        descricao_padrao: payload.descricao_padrao,
        ativo: payload.ativo,
      })
      .eq('id', payload.id);

    if (error) {
      throw new Error(error.message || 'Nao foi possivel salvar o item.');
    }

    atualizarCatalogoLocal((prev) =>
      prev.map((item) =>
        item.id === payload.id
          ? {
              ...item,
              codigo: payload.codigo,
              nome: payload.nome,
              preco_venda: payload.preco_venda,
              descricao_padrao: payload.descricao_padrao,
              ativo: payload.ativo,
            }
          : item
      )
    );

    setCatalogoDetalhe((prev) =>
      prev && prev.id === payload.id
        ? {
            ...prev,
            codigo: payload.codigo,
            nome: payload.nome,
            preco_venda: payload.preco_venda,
            descricao_padrao: payload.descricao_padrao,
            ativo: payload.ativo,
          }
        : prev
    );
  };

  const abrirDuplicacao = async (item: CatalogoCadastro) => {
    const empresaDestino = item.id_empresa || idEmpresa;
    if (!empresaDestino) return;

    try {
      const { codigo } = await buscarConfiguracaoCodigo(item.tipo, empresaDestino);
      setCodigoSugeridoDuplicacao(codigo);
      setCatalogoDuplicar(item);
    } catch (error) {
      console.error('Erro ao preparar duplicacao:', error);
    }
  };

  const confirmarDuplicacao = async (payload: {
    nome: string;
    codigo: string;
    preco_venda: number | null;
    descricao_padrao: string | null;
    ativo: boolean;
  }) => {
    if (!catalogoDuplicar) return;

    const empresaDestino = catalogoDuplicar.id_empresa || idEmpresa;
    if (!empresaDestino) {
      throw new Error('Empresa nao identificada.');
    }

    const { proximoNumero, updateField } = await buscarConfiguracaoCodigo(catalogoDuplicar.tipo, empresaDestino);

    const { data: codigoExistente, error: codigoError } = await supabase
      .from('erp_catalogo')
      .select('id')
      .eq('id_empresa', empresaDestino)
      .eq('codigo', payload.codigo)
      .maybeSingle();

    if (codigoError) {
      throw new Error(codigoError.message || 'Nao foi possivel validar o codigo.');
    }

    if (codigoExistente) {
      throw new Error('Ja existe um item com esse codigo.');
    }

    const { data, error } = await supabase
      .from('erp_catalogo')
      .insert({
        id_empresa: empresaDestino,
        tipo: catalogoDuplicar.tipo,
        nome: payload.nome,
        codigo: payload.codigo,
        preco_venda: payload.preco_venda,
        descricao_padrao: payload.descricao_padrao,
        ativo: payload.ativo,
      })
      .select('id, id_empresa, codigo, nome, tipo, preco_venda, descricao_padrao, ativo')
      .single();

    if (error) {
      throw new Error(error.message || 'Nao foi possivel duplicar o item.');
    }

    const { error: updateConfigError } = await supabase
      .from('sis_configuracoes')
      .update({ [updateField]: proximoNumero + 1 })
      .eq('id_empresa', empresaDestino);

    if (updateConfigError) {
      throw new Error(updateConfigError.message || 'Nao foi possivel atualizar a sequencia de codigo.');
    }

    const novoItem = data as CatalogoCadastro;
    atualizarCatalogoLocal((prev) => [novoItem, ...prev]);
    setCatalogoDuplicar(null);
    setCodigoSugeridoDuplicacao('');
  };

  const excluirCatalogo = async (item: CatalogoCadastro) => {
    if (typeof window !== 'undefined') {
      const confirmar = window.confirm(`Deseja excluir "${item.nome}"?`);
      if (!confirmar) return;
    }

    const { error } = await supabase.from('erp_catalogo').delete().eq('id', item.id);

    if (error) {
      console.error('Erro ao excluir item:', error);
      return;
    }

    atualizarCatalogoLocal((prev) => prev.filter((catalogoItem) => catalogoItem.id !== item.id));
    setCatalogoDetalhe((prev) => (prev?.id === item.id ? null : prev));
  };

  const handleSort = (column: CatalogSortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else if (sortDirection === 'asc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const handleClientesSort = (column: ClienteSortColumn) => {
    if (clientesSortColumn === column) {
      if (clientesSortDirection === 'desc') {
        setClientesSortDirection('asc');
      } else if (clientesSortDirection === 'asc') {
        setClientesSortColumn(null);
        setClientesSortDirection(null);
      }
    } else {
      setClientesSortColumn(column);
      setClientesSortDirection('desc');
    }
  };

  const filteredCatalogo = useMemo(() => {
    const termo = searchTerm.toLowerCase();
    const tipoAtual = activeTab === 'produtos' ? 'PRODUTO' : 'SERVICO';

    const filtered = catalogo.filter((item) => {
      const tipo = normalizarTipo(item.tipo);
      if (tipo !== tipoAtual) return false;

      const byStatus =
        catalogoStatus === 'todos' ||
        (catalogoStatus === 'ativos' && item.ativo) ||
        (catalogoStatus === 'inativos' && !item.ativo);

      const byBusca =
        (item.codigo || '').toLowerCase().includes(termo) ||
        (item.nome || '').toLowerCase().includes(termo) ||
        (item.descricao_padrao || '').toLowerCase().includes(termo);

      return byStatus && byBusca;
    });

    if (!sortColumn || !sortDirection) return filtered;

    return [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'codigo':
          comparison = (a.codigo || '').localeCompare(b.codigo || '');
          break;
        case 'nome':
          comparison = a.nome.localeCompare(b.nome);
          break;
        case 'preco_venda':
          comparison = Number(a.preco_venda || 0) - Number(b.preco_venda || 0);
          break;
        case 'ativo':
          comparison = Number(a.ativo) - Number(b.ativo);
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [activeTab, catalogo, catalogoStatus, searchTerm, sortColumn, sortDirection]);

  const filteredClientes = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();

    const filtered = clientes.filter((cliente) => {
      const searchOnlyNumbers = searchTerm.replace(/\D/g, '');
      const cpfCnpjOnlyNumbers = cliente.cpf_cnpj.replace(/\D/g, '');

      const bySearch =
        searchTerm === '' ||
        cliente.codigo_cliente.includes(searchOnlyNumbers) ||
        cliente.nome.toLowerCase().includes(searchLower) ||
        cliente.email.toLowerCase().includes(searchLower) ||
        cliente.telefone.toLowerCase().includes(searchLower) ||
        (cliente.empresa?.toLowerCase().includes(searchLower) || false) ||
        cliente.cpf_cnpj.toLowerCase().includes(searchLower) ||
        (searchOnlyNumbers && cpfCnpjOnlyNumbers.includes(searchOnlyNumbers));

      const byStatus =
        clientesStatus === 'todos' ||
        (clientesStatus === 'ativos' && cliente.status === 'ativo') ||
        (clientesStatus === 'inativos' && cliente.status === 'inativo');

      const byTipo = clientesTipo === 'todos' || cliente.tipo_pessoa === clientesTipo;

      return bySearch && byStatus && byTipo;
    });

    if (!clientesSortColumn || !clientesSortDirection) return filtered;

    return [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (clientesSortColumn) {
        case 'codigo_cliente':
          comparison = a.codigo_cliente.localeCompare(b.codigo_cliente);
          break;
        case 'nome':
          comparison = a.nome.localeCompare(b.nome);
          break;
        case 'cpf_cnpj':
          comparison = a.cpf_cnpj.localeCompare(b.cpf_cnpj);
          break;
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'empresa':
          comparison = (a.empresa || '').localeCompare(b.empresa || '');
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'rating': {
          const ratingOrder = { verde: 1, amarelo: 2, vermelho: 3 };
          comparison = ratingOrder[a.rating] - ratingOrder[b.rating];
          break;
        }
        default:
          comparison = 0;
      }

      return clientesSortDirection === 'asc' ? comparison : -comparison;
    });
  }, [clientes, clientesSortColumn, clientesSortDirection, clientesStatus, clientesTipo, searchTerm]);

  return (
    <div className="space-y-6 py-6">
      <div className="relative space-y-6">
        <div className="flex items-center gap-2">
          <Briefcase size={28} className="flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{`Cadastros > ${TAB_TITLES[activeTab]}`}</h1>
        </div>

        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex gap-6 overflow-x-auto">
            <button
              onClick={() => onTabChange('clientes')}
              className={`relative whitespace-nowrap pb-3 text-sm font-medium transition-colors ${
                activeTab === 'clientes'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Clientes
              {activeTab === 'clientes' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
            <button
              onClick={() => onTabChange('produtos')}
              className={`relative whitespace-nowrap pb-3 text-sm font-medium transition-colors ${
                activeTab === 'produtos'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Produtos
              {activeTab === 'produtos' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
            <button
              onClick={() => onTabChange('servicos')}
              className={`relative whitespace-nowrap pb-3 text-sm font-medium transition-colors ${
                activeTab === 'servicos'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Serviços
              {activeTab === 'servicos' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
          </nav>
        </div>

        {rightContent && <div className="absolute right-0 top-[10%] -translate-y-1/2">{rightContent}</div>}
      </div>

      <Card>
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex flex-1 items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Filter size={18} />
                <span className="text-sm font-medium">Filtrar:</span>
              </div>

              <div className="flex gap-3 flex-wrap">
                {activeTab === 'clientes' ? (
                  <>
                    <FilterSelect value={clientesStatus} onChange={(value) => setClientesStatus(value as 'todos' | 'ativos' | 'inativos')}>
                      <option value="todos">Todos os status</option>
                      <option value="ativos">Ativos</option>
                      <option value="inativos">Inativos</option>
                    </FilterSelect>
                    <FilterSelect value={clientesTipo} onChange={(value) => setClientesTipo(value as 'todos' | 'PF' | 'PJ')}>
                      <option value="todos">Todos os tipos</option>
                      <option value="PF">Cliente PF</option>
                      <option value="PJ">Cliente PJ</option>
                    </FilterSelect>
                  </>
                ) : (
                  <FilterSelect value={catalogoStatus} onChange={(value) => setCatalogoStatus(value as 'todos' | 'ativos' | 'inativos')}>
                    <option value="todos">Todos os status</option>
                    <option value="ativos">Ativos</option>
                    <option value="inativos">Inativos</option>
                  </FilterSelect>
                )}
              </div>
            </div>
          </div>

          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={
              activeTab === 'clientes'
                ? 'Buscar por número, nome, CPF/CNPJ, email, telefone ou empresa...'
                : `Buscar por codigo, nome ou descricao de ${activeTab === 'produtos' ? 'produtos' : 'serviços'}...`
            }
          />
        </div>

        <CadastrosTable
          activeTab={activeTab}
          catalogoItems={filteredCatalogo}
          clientes={filteredClientes}
          loading={activeTab === 'clientes' ? loadingClientes && !cadastrosCache.clientesHydrated : loadingCatalogo}
          catalogoSortColumn={sortColumn}
          clientesSortColumn={clientesSortColumn}
          sortDirection={activeTab === 'clientes' ? clientesSortDirection : sortDirection}
          onSortCatalogo={handleSort}
          onSortCliente={handleClientesSort}
          onVisualizarCatalogo={abrirVisualizacao}
          onEditarCatalogo={abrirEdicao}
          onDuplicarCatalogo={(item) => {
            void abrirDuplicacao(item);
          }}
          onExcluirCatalogo={(item) => {
            void excluirCatalogo(item);
          }}
          onVisualizarCliente={onVisualizarCliente}
          onEditarCliente={onEditarCliente}
        />
      </Card>

      {(activeTab === 'produtos' || activeTab === 'servicos') && (
        <CatalogoDetailsDrawer
          item={catalogoDetalhe}
          activeTab={activeTab}
          mode={drawerMode}
          onClose={() => setCatalogoDetalhe(null)}
          onSave={salvarCatalogo}
        />
      )}

      {(activeTab === 'produtos' || activeTab === 'servicos') && (
        <CatalogoDuplicateModal
          item={catalogoDuplicar}
          activeTab={activeTab}
          suggestedCode={codigoSugeridoDuplicacao}
          onClose={() => {
            setCatalogoDuplicar(null);
            setCodigoSugeridoDuplicacao('');
          }}
          onConfirm={confirmarDuplicacao}
        />
      )}
    </div>
  );
}
