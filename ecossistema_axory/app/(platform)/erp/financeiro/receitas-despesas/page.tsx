'use client';

import TopBar from '@/components/ui/TopBar';
import PageContainer from '@/components/ui/PageContainer';
import FinanceiroReceitasDespesasContent from '@/components/erp/Financeiro/receitas_despesas/FinanceiroReceitasDespesasContent';

export default function ErpFinanceiroReceitasDespesasPage() {
  const breadcrumbs = [
    { label: 'Inicio', href: '/erp/dashboard' },
    { label: 'ERP', href: '/erp/dashboard' },
    { label: 'Financeiro', href: '/erp/financeiro' },
    { label: 'Receitas e Despesas', href: '/erp/financeiro/receitas-despesas' },
  ];

  return (
    <>
      <TopBar breadcrumbs={breadcrumbs} />
      <main className="flex-1 overflow-y-auto flex justify-center">
        <PageContainer>
          <FinanceiroReceitasDespesasContent />
        </PageContainer>
      </main>
    </>
  );
}
