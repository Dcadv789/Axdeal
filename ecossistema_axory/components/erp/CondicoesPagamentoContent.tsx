import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CreditCard, AlertCircle, Calendar, ArrowLeft } from 'lucide-react';
import { Card } from '@axdeal/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import AddCondicaoPagamentoDrawer from './CondicoesPagamentoContent/AddCondicaoPagamentoDrawer';

interface CondicaoPagamento {
  id: string;
  nome: string;
  regras: Array<{ dias: number; percentual: number }>;
  created_at: string;
}

interface CondicoesPagamentoContentProps {
  onBack?: () => void;
}

export default function CondicoesPagamentoContent({ onBack }: CondicoesPagamentoContentProps = {}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [condicoes, setCondicoes] = useState<CondicaoPagamento[]>([]);
  const [idEmpresa, setIdEmpresa] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCondicao, setEditingCondicao] = useState<CondicaoPagamento | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: memberData } = await supabase
        .from('sis_membros_equipe')
        .select('id_empresa')
        .eq('id_usuario', user?.id)
        .maybeSingle();

      if (!memberData) {
        setError('Empresa não encontrada.');
        return;
      }

      setIdEmpresa(memberData.id_empresa);

      const { data, error: fetchError } = await supabase
        .from('erp_condicoes_pagamento')
        .select('*')
        .eq('id_empresa', memberData.id_empresa)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setCondicoes(data || []);
    } catch (error: any) {
      console.error('Error loading conditions:', error);
      setError('Erro ao carregar condições de pagamento.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta condição de pagamento?')) return;

    try {
      setError(null);
      const { error: deleteError } = await supabase
        .from('erp_condicoes_pagamento')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setCondicoes(condicoes.filter(c => c.id !== id));
      setSuccess('Condição de pagamento excluída com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error deleting condition:', error);
      setError('Erro ao excluir condição de pagamento.');
    }
  };

  const handleEdit = (condicao: CondicaoPagamento) => {
    setEditingCondicao(condicao);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setEditingCondicao(null);
  };

  const handleSaveSuccess = () => {
    loadData();
    setSuccess('Condição de pagamento salva com sucesso!');
    setTimeout(() => setSuccess(null), 3000);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {onBack && (
          <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        )}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-10 w-36 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
        <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] dark:border-[#262626]">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-4 text-left border-b-2 border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Nome da Condição
                  </span>
                </th>
                <th className="px-6 py-4 text-left border-b-2 border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Parcelas
                  </span>
                </th>
                <th className="px-6 py-4 text-left border-b-2 border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Prazos
                  </span>
                </th>
                <th className="px-6 py-4 text-right border-b-2 border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Ações
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-950">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr
                  key={i}
                  className="border-b border-[#E5E7EB] dark:border-[#262626]"
                >
                  <td className="px-6 py-4">
                    <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1.5">
                      <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="h-6 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="h-6 w-14 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Voltar para Parâmetros de Vendas</span>
        </button>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <CreditCard size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Condições de Pagamento
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Cadastre regras de parcelamento para usar nas vendas
            </p>
          </div>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={18} />
          Nova Condição
        </button>
      </div>

      {condicoes.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard size={32} className="text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Nenhuma condição cadastrada
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Cadastre condições de pagamento para facilitar a criação de propostas e vendas
          </p>
          <button
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={18} />
            Cadastrar Primeira Condição
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] dark:border-[#262626]">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-4 text-left border-b-2 border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Nome da Condição
                  </span>
                </th>
                <th className="px-6 py-4 text-left border-b-2 border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Parcelas
                  </span>
                </th>
                <th className="px-6 py-4 text-left border-b-2 border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Prazos
                  </span>
                </th>
                <th className="px-6 py-4 text-right border-b-2 border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Ações
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-950">
              {condicoes.map((condicao, idx) => (
                <tr
                  key={condicao.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors ${
                    idx !== condicoes.length - 1 ? 'border-b border-[#E5E7EB] dark:border-[#262626]' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {condicao.nome}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-gray-400 dark:text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {condicao.regras.length} {condicao.regras.length === 1 ? 'parcela' : 'parcelas'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {condicao.regras.map((regra, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded"
                        >
                          {regra.dias === 0 ? 'À vista' : `${regra.dias}d`}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(condicao)}
                        className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(condicao.id)}
                        className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {drawerOpen && (
        <AddCondicaoPagamentoDrawer
          isOpen={drawerOpen}
          onClose={handleCloseDrawer}
          onSave={handleSaveSuccess}
          idEmpresa={idEmpresa}
          editingCondicao={editingCondicao}
        />
      )}
    </div>
  );
}
