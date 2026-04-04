'use client';

import TopBar from '@/components/ui/TopBar';
import ErpFinanceiroHubContent from '@/components/erp/Financeiro/ErpFinanceiroHubContent';
import ConciliacaoPdvPage from '@/components/erp/Financeiro/conciliacao_pdv/ConciliacaoPdvPage';

export default function ConciliacaoPdvModulePage() {
  const breadcrumbs = [
    { label: 'Inicio', href: '/erp/dashboard' },
    { label: 'ERP', href: '/erp/dashboard' },
    { label: 'Financeiro', href: '/erp/financeiro' },
    { label: 'Conferencia do PDV', href: '/erp/financeiro/conciliacao-pdv' },
  ];

  return (
    <>
      <TopBar breadcrumbs={breadcrumbs} />
      <main className="flex flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-neutral-900/70">
        <ErpFinanceiroHubContent activeMenu="conciliacao_pdv">
          <ConciliacaoPdvPage />
        </ErpFinanceiroHubContent>
      </main>
    </>
  );
}
