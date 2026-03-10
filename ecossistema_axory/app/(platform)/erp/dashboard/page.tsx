'use client';

import { Home } from 'lucide-react';
import TopBar from '@/components/ui/TopBar';
import PageContainer from '@/components/ui/PageContainer';
import PageTitle from '@/components/ui/PageTitle';
import DashboardContent from '@/components/erp/DashboardContent';
import PeriodFilter from '@/components/ui/PeriodFilter';

export default function ErpDashboardPage() {
  return (
    <>
      <TopBar breadcrumbs={[{ label: 'Início', href: '/erp/dashboard' }, { label: 'ERP', href: '/erp/dashboard' }]} />
      <main className="flex-1 overflow-y-auto flex justify-center">
        <PageContainer>
          <div className="py-6 space-y-6">
            <PageTitle icon={<Home size={28} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />} title="Início" rightContent={<PeriodFilter />} />
            <DashboardContent />
          </div>
        </PageContainer>
      </main>
    </>
  );
}
