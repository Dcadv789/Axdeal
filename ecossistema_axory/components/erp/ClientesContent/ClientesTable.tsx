import { MoreVertical, Mail, Phone, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Info } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import EmailDrawer from './EmailDrawer';
import { supabase } from '@/lib/supabase';

interface Cliente {
  id: string;
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

export default function ClientesTable({ clientes, sortColumn, sortDirection, onSort, onEditarCliente, onVisualizarCliente }: ClientesTableProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ top: 0, right: 0 });
  const [showSortTooltip, setShowSortTooltip] = useState(true);
  const [emailDrawerOpen, setEmailDrawerOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const menuRef = useRef<HTMLDivElement | null>(null);

  const formatCpfCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');

    if (numbers.length === 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (numbers.length === 14) {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }

    return value;
  };

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
        right: window.innerWidth - rect.right
      });
    }
    setOpenMenu(openMenu === clienteId ? null : clienteId);
  };

  const handleEmailSent = async (para: string, assunto: string, mensagem: string) => {
    if (!selectedCliente) return;

    try {
      const { error: insertError } = await supabase
        .from('sis_fila_notificacoes')
        .insert({
          cliente_nome: selectedCliente.nome,
          destino: para,
          assunto: assunto,
          mensagem_corpo: mensagem,
          canal: 'email',
          status: 'PENDENTE'
        });

      if (insertError) {
        console.error('Erro ao agendar e-mail:', insertError);
        alert('Erro ao agendar envio do e-mail: ' + insertError.message);
        return;
      }

      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 5000);
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
      alert('Erro ao processar envio do e-mail');
    }
  };

  if (clientes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        Nenhum cliente encontrado
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
            onClick={() => setShowSortTooltip(false)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-xs font-medium flex-shrink-0"
          >
            Dispensar
          </button>
        </div>
      )}
      <table className="w-full">
        <thead className="bg-gray-100 dark:bg-neutral-900">
          <tr>
            <SortableHeader column="nome">Nome</SortableHeader>
            <SortableHeader column="cpf_cnpj">CPF/CNPJ</SortableHeader>
            <SortableHeader column="email">E-mail</SortableHeader>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-200 dark:border-gray-700">
              Telefone
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-200 dark:border-gray-700">
              Tipo
            </th>
            <SortableHeader column="rating">Rating</SortableHeader>
            <SortableHeader column="status">Status</SortableHeader>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-200 dark:border-gray-700">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-neutral-900 divide-y divide-[#E5E7EB] dark:divide-[#262626]">
          {clientes.map((cliente) => (
            <tr key={cliente.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
              <td className="px-6 py-3">
                <div className="flex flex-col">
                  {cliente.empresa ? (
                    <>
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                        {cliente.empresa}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-500 truncate max-w-[200px]">
                        {cliente.nome}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                      {cliente.nome}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-6 py-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {formatCpfCnpj(cliente.cpf_cnpj)}
                </span>
              </td>
              <td className="px-6 py-3">
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <Mail size={13} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <span className="truncate max-w-[180px]">{cliente.email}</span>
                </div>
              </td>
              <td className="px-6 py-3">
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <Phone size={13} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <span>{cliente.telefone}</span>
                </div>
              </td>
              <td className="px-6 py-3">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {cliente.tipo_pessoa}
                </span>
              </td>
              <td className="px-6 py-3">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    cliente.rating === 'verde'
                      ? 'bg-green-500 dark:bg-green-400'
                      : cliente.rating === 'amarelo'
                      ? 'bg-yellow-500 dark:bg-yellow-400'
                      : 'bg-red-500 dark:bg-red-400'
                  }`} />
                  <span className={`text-xs font-medium ${
                    cliente.rating === 'verde'
                      ? 'text-green-700 dark:text-green-300'
                      : cliente.rating === 'amarelo'
                      ? 'text-yellow-700 dark:text-yellow-300'
                      : 'text-red-700 dark:text-red-300'
                  }`}>
                    {cliente.rating === 'verde' ? 'Bom' : cliente.rating === 'amarelo' ? 'Moderado' : 'Alto Risco'}
                  </span>
                </div>
              </td>
              <td className="px-6 py-3">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    cliente.status === 'ativo'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                  }`}
                >
                  {cliente.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td className="px-6 py-3">
                <button
                  ref={(el) => { buttonRefs.current[cliente.id] = el; }}
                  onClick={() => handleMenuClick(cliente.id)}
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
              if (openMenu) {
                onVisualizarCliente(openMenu);
              }
              setOpenMenu(null);
            }}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors whitespace-nowrap rounded-t-lg"
          >
            <Info size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span>Ver Detalhes</span>
          </button>
          <button
            onClick={() => {
              if (openMenu) {
                onEditarCliente(openMenu);
              }
              setOpenMenu(null);
            }}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors whitespace-nowrap border-t border-gray-200 dark:border-gray-700"
          >
            <Pencil size={16} className="text-gray-600 dark:text-gray-400 flex-shrink-0" />
            <span>Editar</span>
          </button>
          <button
            onClick={() => {
              if (openMenu) {
                const cliente = clientes.find(c => c.id === openMenu);
                if (cliente) {
                  setSelectedCliente(cliente);
                  setEmailDrawerOpen(true);
                }
              }
              setOpenMenu(null);
            }}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors border-t border-gray-200 dark:border-gray-700 whitespace-nowrap"
          >
            <Mail size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span>Enviar E-mail</span>
          </button>
          <button
            onClick={() => {
              console.log('Excluir cliente:', openMenu);
              setOpenMenu(null);
            }}
            className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-3 transition-colors border-t border-gray-200 dark:border-gray-700 whitespace-nowrap rounded-b-lg"
          >
            <Trash2 size={16} className="text-red-600 dark:text-red-400 flex-shrink-0" />
            <span>Excluir</span>
          </button>
        </div>
      )}

      {showSuccessAlert && (
        <div className="fixed top-4 right-4 z-[60] animate-in slide-in-from-top-2">
          <div className="bg-green-50 dark:bg-green-950/40 border-l-4 border-green-500 p-4 rounded-lg shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  E-mail agendado com sucesso!
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                  O envio ocorrerá em instantes.
                </p>
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
