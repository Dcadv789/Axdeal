'use client';

import TopBar from '@/components/ui/TopBar';
import ErpFinanceiroHubContent from '@/components/erp/Financeiro/ErpFinanceiroHubContent';

export default function ConciliacaoBancariaModulePage() {
  const breadcrumbs = [
    { label: 'Início', href: '/erp/dashboard' },
    { label: 'ERP', href: '/erp/dashboard' },
    { label: 'Financeiro', href: '/erp/financeiro' },
    { label: 'Conciliação Bancária', href: '/erp/financeiro/conciliacao-bancaria' },
  ];

  return (
    <>
      <TopBar breadcrumbs={breadcrumbs} />
      <main className="flex flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-neutral-900/70">
        <ErpFinanceiroHubContent activeMenu="conciliacao_bancaria" />
      </main>
    </>
  );
}
