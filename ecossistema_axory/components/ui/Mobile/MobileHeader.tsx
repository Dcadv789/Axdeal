'use client';

import { useState } from 'react';
import { Settings, Moon, Sun, Building2, Users, User } from 'lucide-react';
import { LOGO_URLS } from '@/config/logos';
import { COMPANY_INFO } from '@/config/company';
import { useTheme } from '@/contexts/ThemeContext';
import { PageType, ConfigTab } from '@/types';
import MobileBottomSheet from './MobileBottomSheet';

interface MobileHeaderProps {
  onNavigate: (page: PageType) => void;
  onNavigateWithTab: (page: PageType, tab?: ConfigTab) => void;
}

export default function MobileHeader({ onNavigate, onNavigateWithTab }: MobileHeaderProps) {
  void onNavigate;
  const { isDark, toggleTheme } = useTheme();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);

  return (
    <>
      <div className="border-b border-[#E5E7EB] bg-white px-4 py-3 dark:border-[#262626] dark:bg-black">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsProfileMenuOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-xs font-semibold text-white transition-shadow hover:shadow-lg"
          >
            {COMPANY_INFO.userInitials}
          </button>

          <div className="flex flex-1 justify-center">
            <img src={isDark ? LOGO_URLS.dark : LOGO_URLS.light} alt="Logo" className="h-8 w-auto" />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsMenuOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>

      <MobileBottomSheet isOpen={isProfileMenuOpen} onClose={() => setIsProfileMenuOpen(false)} title="Perfil">
        <div className="divide-y divide-[#E5E7EB] overflow-hidden rounded-lg border border-[#E5E7EB] dark:divide-[#262626] dark:border-[#262626]">
          <button
            onClick={() => {
              onNavigateWithTab('configuracoes', 'perfil');
              setIsProfileMenuOpen(false);
            }}
            className="w-full px-4 py-3 text-left font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
          >
            Meu Perfil
          </button>
          <button className="w-full px-4 py-3 text-left font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20">
            Sair
          </button>
        </div>
      </MobileBottomSheet>

      <MobileBottomSheet isOpen={isSettingsMenuOpen} onClose={() => setIsSettingsMenuOpen(false)} title="Configurações">
        <div className="divide-y divide-[#E5E7EB] overflow-hidden rounded-lg border border-[#E5E7EB] dark:divide-[#262626] dark:border-[#262626]">
          <button
            onClick={() => {
              onNavigateWithTab('configuracoes', 'empresa');
              setIsSettingsMenuOpen(false);
            }}
            className="flex w-full items-center gap-3 px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
          >
            <Building2 size={20} className="text-gray-600 dark:text-gray-400" />
            Empresa
          </button>
          <button
            onClick={() => {
              onNavigateWithTab('configuracoes', 'usuarios');
              setIsSettingsMenuOpen(false);
            }}
            className="flex w-full items-center gap-3 px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
          >
            <Users size={20} className="text-gray-600 dark:text-gray-400" />
            Usuários
          </button>
          <button
            onClick={() => {
              onNavigateWithTab('configuracoes', 'perfil');
              setIsSettingsMenuOpen(false);
            }}
            className="flex w-full items-center gap-3 px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
          >
            <User size={20} className="text-gray-600 dark:text-gray-400" />
            Meu Perfil
          </button>
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
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
