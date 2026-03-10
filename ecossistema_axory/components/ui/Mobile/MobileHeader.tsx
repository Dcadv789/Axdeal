import { Settings, Moon, Sun, Building2, Users, User, Package, Settings2, Bell } from 'lucide-react';
import { LOGO_URLS } from '@/config/logos';
import { COMPANY_INFO } from '@/config/company';
import { useTheme } from '@/contexts/ThemeContext';
import { PageType, ConfigTab } from '@/types';
import MobileBottomSheet from './MobileBottomSheet';
import { useState } from 'react';

interface MobileHeaderProps {
  onNavigate: (page: PageType) => void;
  onNavigateWithTab: (page: PageType, tab?: ConfigTab) => void;
}

export default function MobileHeader({ onNavigate, onNavigateWithTab }: MobileHeaderProps) {
  const { isDark, toggleTheme } = useTheme();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);

  return (
    <>
      <div className="bg-white dark:bg-black border-b border-[#E5E7EB] dark:border-[#262626] px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsProfileMenuOpen(true)}
            className="w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold hover:shadow-lg transition-shadow"
          >
            {COMPANY_INFO.userInitials}
          </button>

          <div className="flex-1 flex justify-center">
            <img
              src={isDark ? LOGO_URLS.dark : LOGO_URLS.light}
              alt="Logo"
              className="h-8 w-auto"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsMenuOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>

      <MobileBottomSheet
        isOpen={isProfileMenuOpen}
        onClose={() => setIsProfileMenuOpen(false)}
        title="Perfil"
      >
        <div className="border border-[#E5E7EB] dark:border-[#262626] rounded-lg overflow-hidden divide-y divide-[#E5E7EB] dark:divide-[#262626]">
          <button
            onClick={() => {
              onNavigateWithTab('configuracoes', 'perfil');
              setIsProfileMenuOpen(false);
            }}
            className="w-full text-left px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors font-medium"
          >
            Meu Perfil
          </button>
          <button className="w-full text-left px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors font-medium">
            Sair
          </button>
        </div>
      </MobileBottomSheet>

      <MobileBottomSheet
        isOpen={isSettingsMenuOpen}
        onClose={() => setIsSettingsMenuOpen(false)}
        title="Configurações"
      >
        <div className="border border-[#E5E7EB] dark:border-[#262626] rounded-lg overflow-hidden divide-y divide-[#E5E7EB] dark:divide-[#262626]">
          <button
            onClick={() => {
              onNavigateWithTab('configuracoes', 'empresa');
              setIsSettingsMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors font-medium"
          >
            <Building2 size={20} className="text-gray-600 dark:text-gray-400" />
            Empresa
          </button>
          <button
            onClick={() => {
              onNavigateWithTab('configuracoes', 'usuarios');
              setIsSettingsMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors font-medium"
          >
            <Users size={20} className="text-gray-600 dark:text-gray-400" />
            Usuários
          </button>
          <button
            onClick={() => {
              onNavigateWithTab('configuracoes', 'perfil');
              setIsSettingsMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors font-medium"
          >
            <User size={20} className="text-gray-600 dark:text-gray-400" />
            Meu Perfil
          </button>
          <button
            onClick={() => {
              onNavigateWithTab('configuracoes', 'servicos');
              setIsSettingsMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors font-medium"
          >
            <Package size={20} className="text-gray-600 dark:text-gray-400" />
            Serviços e Produtos
          </button>
          <button
            onClick={() => {
              onNavigateWithTab('configuracoes', 'parametros');
              setIsSettingsMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors font-medium"
          >
            <Settings2 size={20} className="text-gray-600 dark:text-gray-400" />
            Parâmetros de Vendas
          </button>
          <button
            onClick={() => {
              onNavigateWithTab('configuracoes', 'regua_cobranca');
              setIsSettingsMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors font-medium"
          >
            <Bell size={20} className="text-gray-600 dark:text-gray-400" />
            Régua de Cobrança
          </button>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors font-medium"
          >
            {isDark ? (
              <Sun size={20} className="text-gray-600 dark:text-gray-400" />
            ) : (
              <Moon size={20} className="text-gray-600 dark:text-gray-400" />
            )}
            {isDark ? 'Modo Claro' : 'Modo Escuro'}
          </button>
        </div>
      </MobileBottomSheet>
    </>
  );
}
