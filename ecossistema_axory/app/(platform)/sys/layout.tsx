'use client';

import { useRouter } from 'next/navigation';
import DynamicSidebar, { ModulePermissions } from '@/components/ui/navigation/sidebar';
import MobileHeader from '@/components/ui/Mobile/MobileHeader';
import MobileBottomNav from '@/components/ui/Mobile/MobileBottomNav';
import { useIsMobile } from '@/hooks/useIsMobile';
import { PageType, ConfigTab } from '@/types';

const DEFAULT_PERMISSIONS: ModulePermissions = {
  erp: true,
  crm: true,
};

const ERP_PATHS: Record<string, string> = {
  dashboard: '/erp/dashboard',
  negocios: '/erp/negocios/propostas',
  financeiro: '/erp/financeiro',
  resultados: '/erp/resultados',
  clientes: '/erp/cadastros/contatos',
  configuracoes: '/sys/configuracao',
  suporte: '/erp/suporte',
};

export default function SysLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isMobile = useIsMobile();

  const handleNavigate = (page: PageType) => {
    const path = ERP_PATHS[page];
    if (path) router.push(path);
  };

  const handleNavigateWithTab = (page: PageType, tab?: ConfigTab) => {
    const path = page === 'configuracoes' ? `/sys/configuracao${tab ? `?tab=${tab}` : ''}` : ERP_PATHS[page];
    if (path) router.push(path);
  };

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-gray-100 dark:bg-black overflow-hidden">
        <MobileHeader onNavigate={handleNavigate} onNavigateWithTab={handleNavigateWithTab} />
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">{children}</div>
        <MobileBottomNav activePage="dashboard" onNavigate={handleNavigate} />
      </div>
    );
  }

  return (
    <div className="flex w-full h-screen bg-gray-100 dark:bg-black overflow-hidden">
      <DynamicSidebar activePage={''} onNavigate={() => {}} permissions={DEFAULT_PERMISSIONS} />
      <div className="flex-1 flex flex-col overflow-hidden relative z-10 min-w-0">{children}</div>
    </div>
  );
}
