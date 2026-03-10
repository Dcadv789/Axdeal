'use client';

import { useState, useEffect } from 'react';
import { PanelLeftClose } from 'lucide-react';
import { LOGO_URLS } from '@/config/logos';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface SidebarLogoProps {
  isCollapsed: boolean;
  isDark: boolean;
  onToggleCollapse?: () => void;
}

export default function SidebarLogo({ isCollapsed, isDark, onToggleCollapse }: SidebarLogoProps) {
  const { user } = useAuth();
  const [nomeCompleto, setNomeCompleto] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const fetchNomeCompleto = async () => {
      const { data } = await supabase
        .from('sis_membros_equipe')
        .select('nome_completo')
        .eq('id_usuario', user.id)
        .maybeSingle();

      if (data?.nome_completo) {
        setNomeCompleto(data.nome_completo);
      }
    };

    fetchNomeCompleto();
  }, [user?.id]);

  const userName = nomeCompleto || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';

  return (
    <div
      className={`h-[68px] min-h-[68px] flex-shrink-0 ${
        isCollapsed ? 'px-3 justify-center' : 'px-4'
      } border-b border-[#E5E7EB] dark:border-[#262626] flex items-center gap-3`}
    >
      <img
        src={LOGO_URLS.sidebarSymbol}
        alt="Axory"
        className={`flex-shrink-0 object-contain rounded-xl transition-all duration-300 ${
          isCollapsed ? 'h-12 w-12' : 'h-12 w-12'
        }`}
      />
      {!isCollapsed && (
        <div className="flex flex-col items-start min-w-0 flex-1">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
            Bem-vindo à Axory!
          </p>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate w-full">
            {userName}
          </p>
        </div>
      )}
      {!isCollapsed && onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
          title="Recolher menu"
        >
          <PanelLeftClose size={18} className="text-gray-500 dark:text-gray-400" />
        </button>
      )}
    </div>
  );
}
