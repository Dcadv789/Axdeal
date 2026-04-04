'use client';

import { useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import TopBar from '@/components/ui/TopBar';
import ErpFinanceiroHubContent, { type FinanceiroMenuId } from '@/components/erp/Financeiro/ErpFinanceiroHubContent';
import FinanceiroLancamentoDetalhePage from '@/components/erp/Financeiro/lancamentos/FinanceiroLancamentoDetalhePage';

export default function FinanceiroLancamentoDetalheRoutePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const lancamentoId = params?.id || '';
  const origemParam = searchParams.get('origem');
  const origem: FinanceiroMenuId = origemParam === 'pagar' ? 'pagar' : 'receber';
  const isNovoLancamento = lancamentoId === 'novo';
  const labelTela = isNovoLancamento ? (origem === 'pagar' ? 'Novo Pagamento' : 'Novo Recebimento') : 'Detalhes do Lancamento';

  const breadcrumbs = useMemo(
    () => [
      { label: 'Inicio', href: '/erp/dashboard' },
      { label: 'ERP', href: '/erp/dashboard' },
      { label: 'Financeiro', href: '/erp/financeiro' },
      { label: origem === 'pagar' ? 'Contas a Pagar' : 'Contas a Receber', href: `/erp/financeiro/${origem}` },
      { label: labelTela },
    ],
    [labelTela, origem]
  );

  return (
    <>
      <TopBar breadcrumbs={breadcrumbs} />
      <main className="flex flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-neutral-900/70">
        <ErpFinanceiroHubContent activeMenu={origem} showContentHeader={false}>
          <FinanceiroLancamentoDetalhePage lancamentoId={lancamentoId} origem={origem} />
        </ErpFinanceiroHubContent>
      </main>
    </>
  );
}
