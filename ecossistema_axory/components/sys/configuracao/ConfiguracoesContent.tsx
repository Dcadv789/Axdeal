'use client';

import { Settings2 } from 'lucide-react';
import { Card } from '@axdeal/ui';
import EmpresaTab from './EmpresaTab';
import UsuariosTab from './UsuariosTab';
import MeuPerfilTab from './MeuPerfilTab';
import { ConfigTab } from '@/types';
import { useIsMobile } from '@/hooks/useIsMobile';

const TABS: { id: ConfigTab; label: string }[] = [
  { id: 'empresa', label: 'Empresa' },
  { id: 'usuarios', label: 'Usuários' },
  { id: 'perfil', label: 'Meu Perfil' },
];

interface ConfiguracoesContentProps {
  activeTab: ConfigTab;
  onTabChange: (tab: ConfigTab) => void;
}

export default function ConfiguracoesContent({ activeTab, onTabChange }: ConfiguracoesContentProps) {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-6 py-6">
      <div className="flex items-center gap-2">
        <Settings2 size={28} className="flex-shrink-0 text-blue-600 dark:text-blue-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configurações</h1>
      </div>

      {!isMobile && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex gap-6 overflow-x-auto">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`relative whitespace-nowrap pb-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  {tab.label}
                  {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      <Card>
        {activeTab === 'empresa' && <EmpresaTab />}
        {activeTab === 'usuarios' && <UsuariosTab />}
        {activeTab === 'perfil' && <MeuPerfilTab />}
      </Card>
    </div>
  );
}
