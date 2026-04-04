import { Search } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@axdeal/ui';
import FilterBar from './ClientesContent/FilterBar';
import ClientesTable from './ClientesContent/ClientesTable';

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

interface ClientesContentProps {
  onEditarCliente: (id: string) => void;
  onVisualizarCliente: (id: string) => void;
  refreshTrigger?: number;
}

let clientesCache: {
  hydrated: boolean;
  clientes: Cliente[];
} = {
  hydrated: false,
  clientes: [],
};

function ClientesTableSkeleton() {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-[#E5E7EB] dark:border-[#262626]">
      <table className="w-full table-fixed">
        <thead className="bg-blue-600 dark:bg-blue-700">
          <tr>
            {['', 'Nome', 'Número', 'CPF/CNPJ', 'E-mail', 'Telefone', 'Status', 'Ações'].map((label, index) => (
              <th
                key={`${label}-${index}`}
                className="border-b border-blue-500/30 px-5 py-2 text-left text-xs font-bold uppercase tracking-wider text-white dark:border-blue-400/30"
              >
                {label || <div className="h-4 w-4 rounded bg-white/25" />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E7EB] bg-white dark:divide-[#262626] dark:bg-neutral-900">
          {Array.from({ length: 6 }).map((_, idx) => (
            <tr key={`cliente-skeleton-${idx}`}>
              <td className="px-4 py-3">
                <div className="h-4 w-4 animate-pulse rounded bg-slate-200 dark:bg-neutral-700" />
              </td>
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
                <div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-neutral-700" />
              </td>
              <td className="px-5 py-3">
                <div className="h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-neutral-700" />
              </td>
              <td className="px-5 py-3">
                <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-neutral-700" />
              </td>
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
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ClientesContent({ onEditarCliente, onVisualizarCliente, refreshTrigger = 0 }: ClientesContentProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string[]>(['ativo']);
  const [selectedTipoPessoa, setSelectedTipoPessoa] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [clientes, setClientes] = useState<Cliente[]>(() => clientesCache.clientes);
  const [loading, setLoading] = useState(() => !clientesCache.hydrated);

  const fetchClientes = async () => {
    if (!user) return;

    if (!clientesCache.hydrated) {
      setLoading(true);
    }

    try {
      const { data: membroData, error: membroError } = await supabase
        .from('sis_membros_equipe')
        .select('id_empresa')
        .eq('id_usuario', user.id)
        .maybeSingle();

      if (membroError || !membroData) {
        console.error('Erro ao buscar empresa do usuário:', membroError);
        setLoading(false);
        return;
      }

      const { data: clientesData, error: clientesError } = await supabase
        .from('erp_contatos')
        .select('*')
        .eq('id_empresa', membroData.id_empresa)
        .order('criado_em', { ascending: false });

      if (clientesError) {
        console.error('Erro ao buscar clientes:', clientesError);
        setLoading(false);
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
          tipo_pessoa: cliente.tipo_pessoa as 'PF' | 'PJ'
        };
      });

      setClientes(clientesFormatados);
      clientesCache.clientes = clientesFormatados;
      clientesCache.hydrated = true;
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, [user, refreshTrigger]);

  const handleSort = (column: SortColumn) => {
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

  const filteredClientes = useMemo(() => {
    const filtered = clientes.filter((cliente) => {
      const searchLower = searchTerm.toLowerCase();
      const searchOnlyNumbers = searchTerm.replace(/\D/g, '');
      const cpfCnpjOnlyNumbers = cliente.cpf_cnpj.replace(/\D/g, '');

      const matchesSearch = searchTerm === '' ||
        cliente.nome.toLowerCase().includes(searchLower) ||
        cliente.codigo_cliente.includes(searchOnlyNumbers) ||
        cliente.email.toLowerCase().includes(searchLower) ||
        cliente.telefone.toLowerCase().includes(searchLower) ||
        (cliente.empresa?.toLowerCase().includes(searchLower) || false) ||
        cliente.cpf_cnpj.toLowerCase().includes(searchLower) ||
        (searchOnlyNumbers && cpfCnpjOnlyNumbers.includes(searchOnlyNumbers));

      const matchesStatus = selectedStatus.length === 0 || selectedStatus.includes(cliente.status);

      const matchesTipoPessoa = selectedTipoPessoa.length === 0 || selectedTipoPessoa.includes(cliente.tipo_pessoa);

      return matchesSearch && matchesStatus && matchesTipoPessoa;
    });

    if (sortColumn && sortDirection) {
      return [...filtered].sort((a, b) => {
        let comparison = 0;

        switch (sortColumn) {
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
            const empresaA = a.empresa || '';
            const empresaB = b.empresa || '';
            comparison = empresaA.localeCompare(empresaB);
            break;
          case 'status':
            comparison = a.status.localeCompare(b.status);
            break;
          case 'rating':
            const ratingOrder = { verde: 1, amarelo: 2, vermelho: 3 };
            comparison = ratingOrder[a.rating] - ratingOrder[b.rating];
            break;
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [clientes, searchTerm, selectedStatus, selectedTipoPessoa, sortColumn, sortDirection]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="space-y-6">
          <FilterBar
            onStatusChange={setSelectedStatus}
            selectedStatus={selectedStatus}
            onTipoPessoaChange={setSelectedTipoPessoa}
            selectedTipoPessoa={selectedTipoPessoa}
          />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome, CPF/CNPJ, email, telefone ou empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-[#E5E7EB] dark:border-[#262626] rounded-lg focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm"
            />
          </div>
        </div>

        <div className="mt-6">
          {loading && !clientesCache.hydrated ? (
            <ClientesTableSkeleton />
          ) : (
            <ClientesTable
              clientes={filteredClientes}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              onEditarCliente={onEditarCliente}
              onVisualizarCliente={onVisualizarCliente}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
