import { Search } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@axdeal/ui';
import FilterBar from './ClientesContent/FilterBar';
import ClientesTable from './ClientesContent/ClientesTable';

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

interface ClientesContentProps {
  onEditarCliente: (id: string) => void;
  onVisualizarCliente: (id: string) => void;
  refreshTrigger?: number;
}

export default function ClientesContent({ onEditarCliente, onVisualizarCliente, refreshTrigger = 0 }: ClientesContentProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string[]>(['ativo']);
  const [selectedTipoPessoa, setSelectedTipoPessoa] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClientes = async () => {
    if (!user) return;

    setLoading(true);
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
        .from('erp_clientes')
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
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
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

  if (loading) {
    return (
      <div className="py-6 space-y-4">
        <Card>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-4">
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
          <ClientesTable
            clientes={filteredClientes}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            onEditarCliente={onEditarCliente}
            onVisualizarCliente={onVisualizarCliente}
          />
        </div>
      </Card>
    </div>
  );
}
