import { Plus, Search, Eye, Pencil } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import AddUserDrawer from './AddUserDrawer';

interface User {
  id: string;
  nome_completo: string;
  email: string;
  avatar_url?: string;
  cargo_nome?: string;
}

export default function UsuariosTab() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const { data: memberData } = await supabase
        .from('sis_membros_equipe')
        .select('id_empresa')
        .eq('id_usuario', user?.id)
        .maybeSingle();

      if (!memberData) {
        setUsers([]);
        return;
      }

      const { data, error } = await supabase
        .from('sis_membros_equipe')
        .select(`
          id,
          nome_completo,
          email,
          avatar_url,
          id_cargo,
          sis_cargos (
            nome
          )
        `)
        .eq('id_empresa', memberData.id_empresa)
        .eq('status', 'ATIVO')
        .order('nome_completo');

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      const formattedUsers = data?.map((user: any) => ({
        id: user.id,
        nome_completo: user.nome_completo,
        email: user.email || '',
        avatar_url: user.avatar_url,
        cargo_nome: user.sis_cargos?.nome || 'Sem cargo',
      })) || [];

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredUsers = users.filter(user =>
    user.nome_completo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            Gerenciar Usuários
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Controle o acesso e as permissões dos usuários
          </p>
        </div>
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
          <Plus size={16} />
          <span className="hidden md:inline">Adicionar Usuário</span>
          <span className="md:hidden">Adicionar</span>
        </button>
      </div>

      <AddUserDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      <div className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-950 border border-[#E5E7EB] dark:border-[#262626] rounded-lg">
        <Search size={18} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
        <input
          type="text"
          placeholder="Buscar por nome ou email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>

      <div className="border border-[#E5E7EB] dark:border-[#262626] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-[#E5E7EB] dark:border-[#262626]">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Cargo</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="border-b border-[#E5E7EB] dark:border-[#262626]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                          <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[#E5E7EB] dark:border-[#262626] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.nome_completo}
                            className="w-10 h-10 flex-shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {getInitials(user.nome_completo)}
                          </div>
                        )}
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.nome_completo}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300">
                        {user.cargo_nome}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors font-medium">
                          <Eye size={16} />
                          <span className="hidden md:inline">Visualizar</span>
                        </button>
                        <button className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors font-medium">
                          <Pencil size={16} />
                          <span className="hidden md:inline">Editar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum usuário encontrado</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
