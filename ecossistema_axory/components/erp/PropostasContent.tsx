import { useState, useMemo, useEffect } from 'react';
import { Briefcase } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@axdeal/ui';
import SearchBar from './PropostasContent/SearchBar';
import FilterBar from './PropostasContent/FilterBar';
import PropostasTable from './PropostasContent/PropostasTable';
import KanbanView from './PropostasContent/KanbanView';

export type NegociosTab = 'propostas' | 'vendas';

interface Proposta {
  id: string;
  codigo: string;
  cliente_nome: string;
  status: string;
  valor_total_final: number;
  data_emissao: string;
  introducao?: string;
}

interface Venda {
  id: string;
  codigo: string;
  cliente_nome: string;
  status: string;
  valor_total_final: number;
  data_venda: string;
  observacoes_impressas?: string;
}

type SortColumn = 'codigo' | 'cliente_nome' | 'status' | 'valor_total_final' | 'data' | null;
type SortDirection = 'asc' | 'desc' | null;

interface PropostasContentProps {
  activeTab?: NegociosTab;
  onTabChange?: (tab: NegociosTab) => void;
  rightContent?: React.ReactNode;
}

export default function PropostasContent({ activeTab: activeTabProp, onTabChange, rightContent }: PropostasContentProps = {}) {
  const { user } = useAuth();
  const [activeTabInternal, setActiveTabInternal] = useState<NegociosTab>('propostas');
  const activeTab = activeTabProp ?? activeTabInternal;

  const handleTabChange = (tab: NegociosTab) => {
    setActiveTabInternal(tab);
    onTabChange?.(tab);
  };

  useEffect(() => {
    if (activeTabProp !== undefined) {
      setActiveTabInternal(activeTabProp);
    }
  }, [activeTabProp]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<'list' | 'kanban'>('list');
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPropostas = async () => {
    if (!user) return;

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

      const { data: propostasData, error: propostasError } = await supabase
        .from('erp_propostas')
        .select(`
          id,
          codigo,
          status,
          valor_total_final,
          data_emissao,
          introducao,
          erp_clientes!inner(nome_razao_social)
        `)
        .eq('id_empresa', membroData.id_empresa)
        .order('criado_em', { ascending: false });

      if (propostasError) {
        console.error('Erro ao buscar propostas:', propostasError);
        return;
      }

      const propostasFormatadas: Proposta[] = (propostasData || []).map((p: any) => ({
        id: p.id,
        codigo: p.codigo,
        cliente_nome: p.erp_clientes.nome_razao_social,
        status: p.status,
        valor_total_final: p.valor_total_final,
        data_emissao: p.data_emissao,
        introducao: p.introducao
      }));

      setPropostas(propostasFormatadas);
    } catch (error) {
      console.error('Erro ao buscar propostas:', error);
    }
  };

  const fetchVendas = async () => {
    if (!user) return;

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

      const { data: vendasData, error: vendasError } = await supabase
        .from('erp_vendas')
        .select(`
          id,
          codigo,
          status,
          valor_total_final,
          data_venda,
          observacoes_impressas,
          erp_clientes!inner(nome_razao_social)
        `)
        .eq('id_empresa', membroData.id_empresa)
        .order('criado_em', { ascending: false });

      if (vendasError) {
        console.error('Erro ao buscar vendas:', vendasError);
        return;
      }

      const vendasFormatadas: Venda[] = (vendasData || []).map((v: any) => ({
        id: v.id,
        codigo: v.codigo,
        cliente_nome: v.erp_clientes.nome_razao_social,
        status: v.status,
        valor_total_final: v.valor_total_final,
        data_venda: v.data_venda,
        observacoes_impressas: v.observacoes_impressas
      }));

      setVendas(vendasFormatadas);
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchPropostas(), fetchVendas()]);
      setLoading(false);
    };

    fetchData();
  }, [user]);

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

  const filteredPropostas = useMemo(
    () => {
      const filtered = propostas.filter(
        (proposta) => {
          const matchesSearch =
            proposta.introducao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            proposta.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            proposta.codigo.toLowerCase().includes(searchTerm.toLowerCase());

          const matchesStatus = selectedStatus.length === 0 || selectedStatus.includes(proposta.status.toLowerCase());

          return matchesSearch && matchesStatus;
        }
      );

      if (currentView === 'list' && sortColumn && sortDirection) {
        return [...filtered].sort((a, b) => {
          let comparison = 0;

          switch (sortColumn) {
            case 'codigo':
              comparison = a.codigo.localeCompare(b.codigo);
              break;
            case 'cliente_nome':
              comparison = a.cliente_nome.localeCompare(b.cliente_nome);
              break;
            case 'status':
              comparison = a.status.localeCompare(b.status);
              break;
            case 'valor_total_final':
              comparison = (a.valor_total_final || 0) - (b.valor_total_final || 0);
              break;
            case 'data':
              const dateA = new Date(a.data_emissao).getTime();
              const dateB = new Date(b.data_emissao).getTime();
              comparison = dateA - dateB;
              break;
          }

          return sortDirection === 'asc' ? comparison : -comparison;
        });
      }

      return filtered;
    },
    [propostas, searchTerm, selectedStatus, currentView, sortColumn, sortDirection]
  );

  const filteredVendas = useMemo(
    () => {
      const filtered = vendas.filter(
        (venda) => {
          const matchesSearch =
            venda.observacoes_impressas?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            venda.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            venda.codigo.toLowerCase().includes(searchTerm.toLowerCase());

          const matchesStatus = selectedStatus.length === 0 || selectedStatus.includes(venda.status.toLowerCase());

          return matchesSearch && matchesStatus;
        }
      );

      if (sortColumn && sortDirection) {
        return [...filtered].sort((a, b) => {
          let comparison = 0;

          switch (sortColumn) {
            case 'codigo':
              comparison = a.codigo.localeCompare(b.codigo);
              break;
            case 'cliente_nome':
              comparison = a.cliente_nome.localeCompare(b.cliente_nome);
              break;
            case 'status':
              comparison = a.status.localeCompare(b.status);
              break;
            case 'valor_total_final':
              comparison = (a.valor_total_final || 0) - (b.valor_total_final || 0);
              break;
            case 'data':
              const dateA = new Date(a.data_venda).getTime();
              const dateB = new Date(b.data_venda).getTime();
              comparison = dateA - dateB;
              break;
          }

          return sortDirection === 'asc' ? comparison : -comparison;
        });
      }

      return filtered;
    },
    [vendas, searchTerm, selectedStatus, sortColumn, sortDirection]
  );

  return (
    <div className="py-6 space-y-6">
      {/* Título + Tabs em container único para centralizar o botão verticalmente entre eles */}
      <div className="relative space-y-6">
        <div className="flex items-center gap-2">
          <Briefcase size={28} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Negócios</h1>
        </div>
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-6 -mb-px">
            <button
              onClick={() => handleTabChange('propostas')}
              className={`relative pb-3 text-sm font-medium transition-colors ${
              activeTab === 'propostas'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
            >
              Propostas
              {activeTab === 'propostas' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
            <button
              onClick={() => handleTabChange('vendas')}
              className={`relative pb-3 text-sm font-medium transition-colors ${
              activeTab === 'vendas'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
            >
              Vendas
              {activeTab === 'vendas' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
          </nav>
        </div>
        {rightContent && (
          <div className="absolute right-0 top-[10%] -translate-y-1/2">{rightContent}</div>
        )}
      </div>

      <Card>
        <div className="mb-6 space-y-4">
          <FilterBar
            onStatusChange={setSelectedStatus}
            onTypeChange={setSelectedType}
            onViewChange={setCurrentView}
            selectedStatus={selectedStatus}
            selectedType={selectedType}
            currentView={currentView}
          />
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por cliente ou nome da proposta..."
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Carregando...
          </div>
        ) : (
          <>
            {activeTab === 'propostas' && currentView === 'list' && (
              <PropostasTable
                propostas={filteredPropostas}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
            )}
            {activeTab === 'propostas' && currentView === 'kanban' && <KanbanView propostas={filteredPropostas} />}

            {activeTab === 'vendas' && (
              <PropostasTable
                propostas={filteredVendas.map(v => ({
                  id: v.id,
                  codigo: v.codigo,
                  cliente_nome: v.cliente_nome,
                  status: v.status,
                  valor_total_final: v.valor_total_final,
                  data_emissao: v.data_venda,
                  introducao: v.observacoes_impressas
                }))}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                isVendas
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
}
