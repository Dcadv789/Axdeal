'use client';

import { usePathname } from 'next/navigation';
import DynamicSidebar, { ModulePermissions } from '@/components/ui/navigation/sidebar';
import TopBar from '@/components/ui/TopBar';
import PageContainer from '@/components/ui/PageContainer';

const CRM_BREADCRUMBS: Record<string, { breadcrumbs: { label: string; href?: string }[] }> = {
  dashboard: {
    breadcrumbs: [{ label: 'Início', href: '/erp/dashboard' }, { label: 'CRM', href: '/crm/dashboard' }, { label: 'Dashboard' }],
  },
  leads: {
    breadcrumbs: [{ label: 'Início', href: '/erp/dashboard' }, { label: 'CRM', href: '/crm/dashboard' }, { label: 'Leads' }],
  },
  funnel: {
    breadcrumbs: [{ label: 'Início', href: '/erp/dashboard' }, { label: 'CRM', href: '/crm/dashboard' }, { label: 'Leads', href: '/crm/leads' }],
  },
  quiz: {
    breadcrumbs: [{ label: 'Início', href: '/erp/dashboard' }, { label: 'CRM', href: '/crm/dashboard' }, { label: 'Quiz Interativo', href: '/crm/quiz' }],
  },
  configuracoes: {
    breadcrumbs: [
      { label: 'Início', href: '/erp/dashboard' },
      { label: 'CRM', href: '/crm/dashboard' },
      { label: 'Configurações Estratégicas' },
    ],
  },
};

const DEFAULT_PERMISSIONS: ModulePermissions = {
  erp: true,
  crm: true,
};

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const parts = pathname?.replace(/^\/crm\/?/, '').split('/').filter(Boolean) || [];
  const segment = parts[0] || 'dashboard';
  const baseConfig = CRM_BREADCRUMBS[segment] ?? CRM_BREADCRUMBS.dashboard;
  const config =
    segment === 'quiz' && parts.length > 1
      ? {
          breadcrumbs: [
            ...baseConfig.breadcrumbs,
            ...(parts[2] === 'mapa'
              ? [
                  { label: 'Editar', href: `/crm/quiz/${parts[1]}` },
                  { label: 'Mapa do fluxo' },
                ]
              : parts[2] === 'design'
              ? [
                  { label: 'Editar', href: `/crm/quiz/${parts[1]}` },
                  { label: 'Design do funil' },
                ]
              : [{ label: 'Editar' }]),
          ],
        }
      : segment === 'configuracoes' && parts[1] === 'playbooks' && parts[2]
      ? {
          breadcrumbs: [
            ...CRM_BREADCRUMBS.configuracoes.breadcrumbs,
            { label: 'Playbooks', href: '/crm/configuracoes' },
            { label: 'Editar playbook' },
          ],
        }
      : baseConfig;

  return (
    <div className="flex w-full h-screen bg-gray-100 dark:bg-black overflow-hidden">
      <DynamicSidebar activePage={''} onNavigate={() => {}} permissions={DEFAULT_PERMISSIONS} />
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <TopBar breadcrumbs={config.breadcrumbs} />
        <main className="flex-1 overflow-y-auto">
          <PageContainer>{children}</PageContainer>
        </main>
      </div>
    </div>
  );
}
