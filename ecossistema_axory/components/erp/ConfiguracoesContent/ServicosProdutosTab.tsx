import { Plus, Edit, Search, Trash2, Package, Briefcase, Grid3x3, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import AddServiceDrawer from './AddServiceDrawer';

interface ServiceItem {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  type: 'Serviço' | 'Produto';
  status: 'ativo' | 'inativo';
}

type SortColumn = 'code' | 'name' | 'type' | 'price' | 'status' | null;
type SortDirection = 'asc' | 'desc' | null;

export default function ServicosProdutosTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('todos');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchServices();
    }
  }, [user]);

  const fetchServices = async () => {
    try {
      setLoading(true);

      console.log('User ID:', user?.id);

      const { data: memberData, error: memberError } = await supabase
        .from('sis_membros_equipe')
        .select('id_empresa')
        .eq('id_usuario', user?.id)
        .maybeSingle();

      console.log('Member data:', memberData, 'Error:', memberError);

      if (!memberData) {
        console.log('No member data found');
        setServices([]);
        setLoading(false);
        return;
      }

      console.log('Fetching items for empresa:', memberData.id_empresa);

      const { data, error } = await supabase
        .from('erp_catalogo')
        .select('id, codigo, nome, descricao_padrao, preco_venda, tipo, ativo')
        .eq('id_empresa', memberData.id_empresa)
        .order('criado_em', { ascending: false });

      console.log('Catalogo items:', data, 'Error:', error);

      if (error) {
        console.error('Error fetching services:', error);
        setServices([]);
        setLoading(false);
        return;
      }

      const formattedServices: ServiceItem[] = data?.map((item: any) => ({
        id: item.id,
        code: item.codigo || '',
        name: item.nome,
        description: item.descricao_padrao || '',
        price: parseFloat(item.preco_venda) || 0,
        type: item.tipo === 'SERVICO' ? 'Serviço' : 'Produto',
        status: item.ativo ? 'ativo' : 'inativo',
      })) || [];

      console.log('Formatted services:', formattedServices);
      setServices(formattedServices);
    } catch (error) {
      console.error('Error:', error);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    fetchServices();
  };

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

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />;
    }
    if (sortDirection === 'desc') {
      return <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />;
    }
    return <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" />;
  };

  const filteredServices = useMemo(() => {
    const filtered = services.filter((service) => {
      const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           service.code.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter = activeFilter === 'todos' ||
                           (activeFilter === 'servicos' && service.type === 'Serviço') ||
                           (activeFilter === 'produtos' && service.type === 'Produto');

      return matchesSearch && matchesFilter;
    });

    if (sortColumn && sortDirection) {
      return [...filtered].sort((a, b) => {
        let comparison = 0;

        switch (sortColumn) {
          case 'code':
            comparison = a.code.localeCompare(b.code);
            break;
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'type':
            comparison = a.type.localeCompare(b.type);
            break;
          case 'price':
            comparison = a.price - b.price;
            break;
          case 'status':
            comparison = a.status.localeCompare(b.status);
            break;
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [services, searchQuery, activeFilter, sortColumn, sortDirection]);

  const handleSelectAll = () => {
    if (selectedItems.length === filteredServices.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredServices.map(s => s.id));
    }
  };

  const handleSelectItem = (id: string) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(i => i !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleDeleteItems = async () => {
    if (selectedItems.length === 0 || !confirm(`Deseja realmente excluir ${selectedItems.length} item(ns)?`)) return;

    try {
      const { error } = await supabase
        .from('erp_catalogo')
        .delete()
        .in('id', selectedItems);

      if (error) throw error;

      setSelectedItems([]);
      fetchServices();
    } catch (error) {
      console.error('Error deleting items:', error);
      alert('Erro ao excluir itens. Tente novamente.');
    }
  };

  const handleToggleStatus = async (activate: boolean) => {
    if (selectedItems.length === 0) return;

    try {
      const { error } = await supabase
        .from('erp_catalogo')
        .update({ ativo: activate })
        .in('id', selectedItems);

      if (error) throw error;

      setSelectedItems([]);
      fetchServices();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erro ao atualizar status. Tente novamente.');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const SortableHeader = ({ column, children, className = '' }: { column: SortColumn; children: React.ReactNode; className?: string }) => (
    <th className={`px-4 py-3 text-left ${className}`}>
      <button
        onClick={() => handleSort(column)}
        className="group flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
      >
        {children}
        {getSortIcon(column)}
      </button>
    </th>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            Serviços e Produtos
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Gerencie todos os serviços e produtos do seu catálogo
          </p>
        </div>
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap shadow-sm"
        >
          <Plus size={18} />
          <span className="hidden md:inline">Adicionar Item</span>
          <span className="md:hidden">Adicionar</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Pesquisar por nome, código ou descrição..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
          {[
            { label: 'Todos', value: 'todos', icon: Grid3x3 },
            { label: 'Serviços', value: 'servicos', icon: Briefcase },
            { label: 'Produtos', value: 'produtos', icon: Package },
          ].map((filter) => {
            const Icon = filter.icon;
            return (
              <button
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap border-2 ${
                  activeFilter === filter.value
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 border-[#E5E7EB] dark:border-[#262626] hover:border-blue-300 dark:hover:border-blue-700'
                }`}
              >
                <Icon size={16} />
                <span>{filter.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedItems.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {selectedItems.length} {selectedItems.length === 1 ? 'item selecionado' : 'itens selecionados'}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggleStatus(true)}
              className="px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
              Ativar
            </button>
            <button
              onClick={() => handleToggleStatus(false)}
              className="px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
              Desativar
            </button>
            <button
              onClick={handleDeleteItems}
              className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors">
              Excluir
            </button>
          </div>
        </div>
      )}

      <div className="border border-[#E5E7EB] dark:border-[#262626] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-[#E5E7EB] dark:border-[#262626]">
              <tr>
                <th className="px-4 py-3 text-left w-12">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === filteredServices.length && filteredServices.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </th>
                <SortableHeader column="code" className="w-32">
                  Código
                </SortableHeader>
                <SortableHeader column="name">
                  Nome
                </SortableHeader>
                <SortableHeader column="type" className="w-36">
                  Tipo
                </SortableHeader>
                <SortableHeader column="price" className="w-40">
                  Valor Unit.
                </SortableHeader>
                <SortableHeader column="status" className="w-28">
                  Status
                </SortableHeader>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-24">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-neutral-900 divide-y divide-[#E5E7EB] dark:divide-[#262626]">
              {loading ? (
                <>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <tr key={i} className="border-b border-[#E5E7EB] dark:border-[#262626]">
                      <td className="px-4 py-4">
                        <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                          <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-6 w-14 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ) : filteredServices.length > 0 ? (
                filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(service.id)}
                        onChange={() => handleSelectItem(service.id)}
                        className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">
                        {service.code}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {service.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {service.description}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        service.type === 'Serviço'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      }`}>
                        {service.type === 'Serviço' ? (
                          <Briefcase size={12} />
                        ) : (
                          <Package size={12} />
                        )}
                        {service.type}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(service.price)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        service.status === 'ativo'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                      }`}>
                        {service.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors">
                          <Edit size={16} />
                        </button>
                        <button className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <Package size={24} className="text-gray-400 dark:text-gray-500" />
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Nenhum item encontrado
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Tente ajustar seus filtros ou adicione um novo item
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddServiceDrawer isOpen={isDrawerOpen} onClose={handleDrawerClose} />
    </div>
  );
}
