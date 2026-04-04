'use client';

import TopBar from '@/components/ui/TopBar';
import PageContainer from '@/components/ui/PageContainer';
import FinanceiroDespesasContent from '@/components/erp/Financeiro/despesas/FinanceiroDespesasContent';

export default function ErpFinanceiroDespesasPage() {
  const breadcrumbs = [
    { label: 'Inicio', href: '/erp/dashboard' },
    { label: 'ERP', href: '/erp/dashboard' },
    { label: 'Financeiro', href: '/erp/financeiro' },
    { label: 'Despesas', href: '/erp/financeiro/despesas' },
  ];

  return (
    <>
      <TopBar breadcrumbs={breadcrumbs} />
      <main className="flex-1 overflow-y-auto flex justify-center">
        <PageContainer>
          <FinanceiroDespesasContent />
        </PageContainer>
      </main>
    </>
  );
}
