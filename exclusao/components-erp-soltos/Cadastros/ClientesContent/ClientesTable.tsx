import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  Mail,
  MoreVertical,
  Pencil,
  Phone,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import EmailDrawer from './EmailDrawer';
import { supabase } from '@/lib/supabase';

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

type SortColumn = 'nome' | 'cpf_cnpj' | 'email' | 'empresa' | 'status' | 'rating' | null;
type SortDirection = 'asc' | 'desc' | null;

interface ClientesTableProps {
  clientes: Cliente[];
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
  onEditarCliente: (id: string) => void;
  onVisualizarCliente: (id: string) => void;
}

interface MenuPosition {
  top: number;
  right: number;
}

export default function ClientesTable({
  clientes,
  sortColumn,
  sortDirection,
  onSort,
  onEditarCliente,
  onVisualizarCliente,
}: ClientesTableProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ top: 0, right: 0 });
  const [emailDrawerOpen, setEmailDrawerOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

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

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-60 transition-opacity" />;
    }
    if (sortDirection === 'desc') {
      return <ArrowDown size={14} className="text-white" />;
    }
    return <ArrowUp size={14} className="text-white" />;
  };

  const allSelected = clientes.length > 0 && selectedIds.length === clientes.length;
  const hasPartialSelection = selectedIds.length > 0 && !allSelected;

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => clientes.some((cliente) => cliente.id === id)));
  }, [clientes]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = hasPartialSelection;
    }
  }, [hasPartialSelection]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        const clickedButton = Object.values(buttonRefs.current).some(
          (button) => button && button.contains(event.target as Node)
        );
        if (!clickedButton) {
          setOpenMenu(null);
        }
      }
    };

    if (openMenu !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenu]);

  const handleMenuClick = (clienteId: string) => {
    const button = buttonRefs.current[clienteId];
    if (button) {
      const rect = button.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setOpenMenu(openMenu === clienteId ? null : clienteId);
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

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : clientes.map((cliente) => cliente.id));
  };

  const toggleOne = (clienteId: string) => {
    setSelectedIds((prev) =>
      prev.includes(clienteId) ? prev.filter((id) => id !== clienteId) : [...prev, clienteId]
    );
  };

  const SortableHeader = ({
    column,
    children,
    className = '',
  }: {
    column: SortColumn;
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

  if (clientes.length === 0) {
    return <div className="py-12 text-center text-gray-500 dark:text-gray-400">Nenhum cliente encontrado</div>;
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
            <SortableHeader column="nome" className="px-5">Nome</SortableHeader>
            <th className="w-[120px] px-5 py-2 text-left border-b border-blue-500/30 dark:border-blue-400/30">
              <span className="block text-left leading-tight text-xs font-bold text-white uppercase tracking-wider">Código</span>
            </th>
            <SortableHeader column="cpf_cnpj" className="w-[176px] whitespace-nowrap px-5">CPF/CNPJ</SortableHeader>
            <SortableHeader column="email" className="w-[280px] whitespace-nowrap px-5">E-mail</SortableHeader>
            <th className="w-[160px] px-5 py-2 text-left border-b border-blue-500/30 dark:border-blue-400/30">
              <span className="block text-left leading-tight text-xs font-bold text-white uppercase tracking-wider">Telefone</span>
            </th>
            <SortableHeader column="status" className="w-[140px] whitespace-nowrap px-5">Status</SortableHeader>
            <th className="w-[140px] px-5 py-2 text-center border-b border-blue-500/30 dark:border-blue-400/30">
              <span className="block text-center leading-tight text-xs font-bold text-white uppercase tracking-wider">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-neutral-900 divide-y divide-[#E5E7EB] dark:divide-[#262626]">
          {clientes.map((cliente) => (
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
              <td className="min-w-0 px-5 py-3">
                <button
                  onClick={() => onVisualizarCliente(cliente.id)}
                  className="block w-full min-w-0 text-left"
                >
                  <div className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {cliente.empresa || cliente.nome}
                  </div>
                  <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {cliente.empresa ? cliente.nome : `${cliente.tipo_pessoa} • ${cliente.rating === 'verde' ? 'Bom' : cliente.rating === 'amarelo' ? 'Moderado' : 'Alto Risco'}`}
                  </div>
                </button>
              </td>
              <td className="w-[120px] whitespace-nowrap px-5 py-3">
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-neutral-800 dark:text-slate-300">
                  {cliente.codigo_cliente || '-'}
                </span>
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
              if (openMenu) {
                const cliente = clientes.find((c) => c.id === openMenu);
                if (cliente) {
                  setSelectedCliente(cliente);
                  setEmailDrawerOpen(true);
                }
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
        </div>
      )}

      {showSuccessAlert && (
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
    </div>
  );
}
