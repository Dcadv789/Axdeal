'use client';

import { PanelLeftClose } from 'lucide-react';
import { LOGO_URLS } from '@/config/logos';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarLogoProps {
  isCollapsed: boolean;
  isDark: boolean;
  onToggleCollapse?: () => void;
}

export default function SidebarLogo({ isCollapsed, isDark, onToggleCollapse }: SidebarLogoProps) {
  const { user, memberName } = useAuth();
  const userName = memberName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';

  return (
    <div
      className={
        'h-[68px] min-h-[68px] flex-shrink-0 px-4 justify-start border-b border-[#E5E7EB] dark:border-[#262626] flex items-center gap-3'
      }
    >
      <img
        src={LOGO_URLS.sidebarSymbol}
        alt="Axory"
        className={`flex-shrink-0 object-contain rounded-xl transition-all duration-300 ${
          isCollapsed ? 'h-9 w-9' : 'h-9 w-9'
        }`}
      />

      <div
        className={`flex flex-col items-start min-w-0 flex-1 overflow-hidden transition-[max-width,opacity] duration-200 ${
          isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[220px] opacity-100'
        }`}
      >
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight whitespace-nowrap">
          Bem-vindo à Axory!
        </p>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate w-full">
          {userName}
        </p>
      </div>

      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
          title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          <PanelLeftClose size={20} className="text-gray-500 dark:text-gray-400" />
        </button>
      )}
    </div>
  );
}
