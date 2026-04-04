'use client';

import TopBar from '@/components/ui/TopBar';
import ResultadosHubContent from '@/components/erp/resultados/ResultadosHubContent';

export default function ErpResultadosFinanceiroPage() {
  const breadcrumbs = [
    { label: 'Inicio', href: '/erp/dashboard' },
    { label: 'ERP', href: '/erp/dashboard' },
    { label: 'Resultados' },
  ];

  return (
    <>
      <TopBar breadcrumbs={breadcrumbs} />
      <main className="flex flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-neutral-900/70">
        <ResultadosHubContent activeMenu="financeiro" />
      </main>
    </>
  );
}
