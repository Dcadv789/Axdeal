'use client';

import { useState } from 'react';
import TopBar from '@/components/ui/TopBar';
import PageContainer from '@/components/ui/PageContainer';
import FinanceiroContent from '@/components/erp/FinanceiroContent';
import type { MainTab } from '@/components/erp/FinanceiroContent/types';

const TAB_LABELS: Record<MainTab, string> = {
  painel: 'Painel',
  performance: 'Performance',
  contas_receber: 'Contas a Receber',
};

export default function ErpFinanceiroPage() {
  const [activeTab, setActiveTab] = useState<MainTab>('painel');

  const breadcrumbs = [
    { label: 'Início', href: '/erp/dashboard' },
    { label: 'ERP', href: '/erp/dashboard' },
    { label: 'Financeiro', href: '/erp/financeiro' },
    { label: TAB_LABELS[activeTab] },
  ];

  return (
    <>
      <TopBar breadcrumbs={breadcrumbs} />
      <main className="flex-1 overflow-y-auto flex justify-center">
        <PageContainer>
          <FinanceiroContent activeTab={activeTab} onTabChange={setActiveTab} />
        </PageContainer>
      </main>
    </>
  );
}
