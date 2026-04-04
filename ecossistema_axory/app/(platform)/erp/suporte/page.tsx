'use client';

import { HelpCircle } from 'lucide-react';
import TopBar from '@/components/ui/TopBar';
import PageContainer from '@/components/ui/PageContainer';
import PageTitle from '@/components/ui/PageTitle';
import SupportContent from '@/components/erp/suporte/SupportContent';

export default function ErpSuportePage() {
  return (
    <>
      <TopBar
        breadcrumbs={[
          { label: 'Início', href: '/erp/dashboard' },
          { label: 'ERP', href: '/erp/dashboard' },
          { label: 'Central de Suporte', href: '/erp/suporte' },
        ]}
      />
      <main className="flex-1 overflow-y-auto flex justify-center">
        <PageContainer>
          <div className="py-6 space-y-6">
            <PageTitle icon={<HelpCircle size={28} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />} title="Central de Suporte" />
            <SupportContent />
          </div>
        </PageContainer>
      </main>
    </>
  );
}
