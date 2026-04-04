'use client';

import { useRouter, usePathname } from 'next/navigation';
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
  configuracoes: '/erp/configuracoes',
  suporte: '/erp/suporte',
};

export default function ErpLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const handleNavigate = (page: PageType) => {
    const path = ERP_PATHS[page];
    if (path) router.push(path);
  };

  const handleNavigateWithTab = (page: PageType, tab?: ConfigTab) => {
    const path = page === 'configuracoes' ? `/sys/configuracao${tab ? `?tab=${tab}` : ''}` : ERP_PATHS[page];
    if (path) router.push(path);
  };

  const segment = pathname?.replace(/^\/erp\/?/, '').split('/')[0] || 'dashboard';
  const activePage = ((['dashboard', 'negocios', 'financeiro', 'resultados', 'clientes', 'cadastros'].includes(segment)
    ? (segment === 'cadastros' ? 'clientes' : segment)
    : 'dashboard')) as PageType;

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-gray-100 dark:bg-black overflow-hidden">
        <MobileHeader onNavigate={handleNavigate} onNavigateWithTab={handleNavigateWithTab} />
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
          {children}
        </div>
        <MobileBottomNav activePage={activePage} onNavigate={handleNavigate} />
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
