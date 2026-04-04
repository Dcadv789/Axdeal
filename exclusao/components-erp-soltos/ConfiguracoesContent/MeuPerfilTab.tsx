import { Lock, Mail, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function MeuPerfilTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    nomeCompleto: '',
    email: '',
    telefone: '',
    senhaAtual: '',
    novaSenha: '',
    confirmarNovaSenha: '',
  });

  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('sis_membros_equipe')
        .select('nome_completo, email, telefone_celular')
        .eq('id_usuario', user?.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setFormData(prev => ({
          ...prev,
          nomeCompleto: data.nome_completo || '',
          email: data.email || user?.email || '',
          telefone: data.telefone_celular || '',
        }));
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setMessage(null);
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const updates: any = {
        nome_completo: formData.nomeCompleto,
        telefone_celular: formData.telefone || null,
      };

      const { error: updateError } = await supabase
        .from('sis_membros_equipe')
        .update(updates)
        .eq('id_usuario', user?.id);

      if (updateError) throw updateError;

      if (formData.senhaAtual && formData.novaSenha) {
        if (formData.novaSenha !== formData.confirmarNovaSenha) {
          setMessage({ type: 'error', text: 'As senhas não coincidem' });
          return;
        }

        if (formData.novaSenha.length < 6) {
          setMessage({ type: 'error', text: 'A nova senha deve ter no mínimo 6 caracteres' });
          return;
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.novaSenha,
        });

        if (passwordError) throw passwordError;

        setFormData(prev => ({
          ...prev,
          senhaAtual: '',
          novaSenha: '',
          confirmarNovaSenha: '',
        }));
      }

      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });

      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao salvar perfil. Tente novamente.'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-7 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            <div className="h-3 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="h-4 w-36 bg-amber-200 dark:bg-amber-800/50 rounded mb-2 animate-pulse" />
          <div className="h-3 w-full bg-amber-200 dark:bg-amber-800/50 rounded animate-pulse" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>

        <div className="border-t border-[#E5E7EB] dark:border-[#262626] pt-6">
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
          <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>

        <div className="flex justify-end pt-4">
          <div className="h-10 w-36 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          Meu Perfil
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Gerencie suas informações pessoais e segurança da conta
        </p>
      </div>

      {message && (
        <div className={`border-l-4 p-4 rounded ${
          message.type === 'success'
            ? 'bg-green-50 dark:bg-green-950/20 border-green-500'
            : 'bg-red-50 dark:bg-red-950/20 border-red-500'
        }`}>
          <div className="flex items-center gap-3">
            {message.type === 'success' ? (
              <Check size={20} className="text-green-500 flex-shrink-0" />
            ) : (
              <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
            )}
            <p className={`text-sm ${
              message.type === 'success'
                ? 'text-green-700 dark:text-green-300'
                : 'text-red-700 dark:text-red-300'
            }`}>
              {message.text}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Nome Completo
            </label>
            <input
              type="text"
              value={formData.nomeCompleto}
              onChange={(e) => handleChange('nomeCompleto', e.target.value)}
              className="px-3 py-2.5 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Telefone
            </label>
            <input
              type="text"
              value={formData.telefone}
              onChange={(e) => handleChange('telefone', e.target.value)}
              placeholder="(00) 00000-0000"
              className="px-3 py-2.5 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
            E-mail de Acesso
          </label>
          <div className="relative">
            <input
              type="email"
              value={formData.email}
              disabled
              className="w-full px-3 py-2.5 pr-10 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 cursor-not-allowed outline-none text-sm"
            />
            <Mail size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            O e-mail não pode ser alterado. Entre em contato com o administrador se necessário
          </p>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Lock size={20} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
              Alteração de Senha
            </h3>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Para alterar sua senha, preencha todos os campos abaixo. Deixe em branco para manter a senha atual
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Senha Atual
          </label>
          <div className="relative">
            <input
              type={showSenhaAtual ? 'text' : 'password'}
              placeholder="Digite sua senha atual"
              value={formData.senhaAtual}
              onChange={(e) => handleChange('senhaAtual', e.target.value)}
              className="w-full px-3 py-2.5 pr-10 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
            <button
              type="button"
              onClick={() => setShowSenhaAtual(!showSenhaAtual)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {showSenhaAtual ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Nova Senha
          </label>
          <div className="relative">
            <input
              type={showNovaSenha ? 'text' : 'password'}
              placeholder="Digite a nova senha"
              value={formData.novaSenha}
              onChange={(e) => handleChange('novaSenha', e.target.value)}
              className="w-full px-3 py-2.5 pr-10 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
            <button
              type="button"
              onClick={() => setShowNovaSenha(!showNovaSenha)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {showNovaSenha ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Confirmar Nova Senha
          </label>
          <div className="relative">
            <input
              type={showConfirmarSenha ? 'text' : 'password'}
              placeholder="Confirme a nova senha"
              value={formData.confirmarNovaSenha}
              onChange={(e) => handleChange('confirmarNovaSenha', e.target.value)}
              className="w-full px-3 py-2.5 pr-10 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
            <button
              type="button"
              onClick={() => setShowConfirmarSenha(!showConfirmarSenha)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {showConfirmarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-[#E5E7EB] dark:border-[#262626] pt-6">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Sobre
          </h3>
          <div className="space-y-1">
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-gray-100">Versão:</span> 1.0.0
            </p>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-gray-100">Última atualização:</span> Dezembro 9, 2024
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-stretch md:justify-end pt-4">
        <button
          onClick={handleSaveProfile}
          disabled={saving}
          className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Salvando...</span>
            </>
          ) : (
            'Salvar Perfil'
          )}
        </button>
      </div>
    </div>
  );
}
