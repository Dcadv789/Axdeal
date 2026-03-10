import { X, User, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface AddUserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddUserDrawer({ isOpen, onClose }: AddUserDrawerProps) {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cargo: 'vendedor',
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Novo usuário:', formData);
    onClose();
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      cargo: 'vendedor',
    });
  };

  if (!isOpen) return null;

  const content = (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-[9998] animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 h-full w-full md:w-[600px] bg-white dark:bg-neutral-900 shadow-2xl z-[9999] flex flex-col animate-slide-in-right overflow-x-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5E7EB] dark:border-[#262626]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <User size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Adicionar Usuário
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Cadastre um novo usuário na sua empresa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Preencha as informações abaixo para adicionar um novo usuário à sua equipe
              </p>
            </div>

            <div className="space-y-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => handleChange('nome', e.target.value)}
                  placeholder="Ex: João Silva"
                  className="px-4 py-3 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="Ex: joao@empresa.com"
                  className="px-4 py-3 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={formData.telefone}
                  onChange={(e) => handleChange('telefone', e.target.value)}
                  placeholder="Ex: (11) 98765-4321"
                  className="px-4 py-3 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Cargo <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    value={formData.cargo}
                    onChange={(e) => handleChange('cargo', e.target.value)}
                    className="w-full px-4 py-3 pr-10 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm transition-all appearance-none cursor-pointer"
                  >
                    <option value="vendedor">Vendedor - Acesso Limitado</option>
                    <option value="administrador">Administrador - Acesso Total</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formData.cargo === 'administrador'
                    ? 'Administradores têm acesso total a todas as funcionalidades'
                    : 'Vendedores têm acesso limitado a funcionalidades de vendas'}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-[#E5E7EB] dark:border-[#262626] p-6 bg-gray-50 dark:bg-neutral-900">
            <div className="flex flex-col-reverse md:flex-row gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 md:flex-initial px-6 py-3 border border-[#E5E7EB] dark:border-[#262626] rounded-lg text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-900 font-medium text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 md:flex-initial px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all"
              >
                Adicionar Usuário
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );

  return createPortal(content, document.body);
}
