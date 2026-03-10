'use client';

import DynamicSidebar, { ModulePermissions } from '@/components/ui/navigation/sidebar';
import TopBar from '@/components/ui/TopBar';
import PageContainer from '@/components/ui/PageContainer';

const DEFAULT_PERMISSIONS: ModulePermissions = {
  erp: true,
  crm: true,
};

export default function LeadsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full h-screen bg-gray-100 dark:bg-black overflow-hidden">
      <DynamicSidebar activePage={''} onNavigate={() => {}} permissions={DEFAULT_PERMISSIONS} />
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <TopBar
          breadcrumbs={[
            { label: 'Início', href: '/erp/dashboard' },
            { label: 'CRM', href: '/crm/dashboard' },
            { label: 'Leads', href: '/crm/leads' },
            { label: 'Detalhes' },
          ]}
        />
        <main className="flex-1 overflow-y-auto">
          <PageContainer>{children}</PageContainer>
        </main>
      </div>
    </div>
  );
}
