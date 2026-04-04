'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/useIsMobile';
import SubSidebarLayout, { type SubSidebarNavItem } from '@/components/ui/navigation/SubSidebarLayout';
import FinanceiroReceberContent from '@/components/erp/Financeiro/receber/FinanceiroReceberContent';
import FinanceiroPagarContent from '@/components/erp/Financeiro/pagar/FinanceiroPagarContent';
import FinanceiroExtratoContent from '@/components/erp/Financeiro/extrato/FinanceiroExtratoContent';
import ConciliacaoBancariaPage from '@/components/erp/Financeiro/conciliacao_bancaria/ConciliacaoBancariaPage';
import ConciliacaoPdvPage from '@/components/erp/Financeiro/conciliacao_pdv/ConciliacaoPdvPage';
import {
  FINANCEIRO_MENU_ROUTES,
  FINANCEIRO_SUBSIDEBAR_ITEMS,
  type FinanceiroSidebarMenuId,
} from '@/components/erp/Financeiro/shared/navigation';

export type FinanceiroMenuId = FinanceiroSidebarMenuId;

interface ErpFinanceiroHubContentProps {
  activeMenu: FinanceiroMenuId;
  children?: ReactNode;
  showContentHeader?: boolean;
}

const MENU_TO_ROUTE: Record<FinanceiroMenuId, string> = FINANCEIRO_MENU_ROUTES;

export default function ErpFinanceiroHubContent({
  activeMenu,
  children,
  showContentHeader = true,
}: ErpFinanceiroHubContentProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isSubSidebarCollapsed, setIsSubSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('erp.financeiro.subsidebar.collapsed') === '1';
  });
  const collapseStorageKey = 'erp.financeiro.subsidebar.collapsed';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(collapseStorageKey, isSubSidebarCollapsed ? '1' : '0');
  }, [isSubSidebarCollapsed]);

  const items = useMemo<SubSidebarNavItem<FinanceiroMenuId>[]>(
    () => FINANCEIRO_SUBSIDEBAR_ITEMS,
    []
  );

  const navegar = (menu: FinanceiroMenuId) => {
    const rota = MENU_TO_ROUTE[menu];
    if (rota) router.push(rota);
  };

  return (
    <SubSidebarLayout<FinanceiroMenuId>
      isMobile={isMobile}
      isCollapsed={isSubSidebarCollapsed}
      onToggleCollapse={() => setIsSubSidebarCollapsed((prev) => !prev)}
      items={items}
      activeId={activeMenu}
      onSelect={navegar}
      sidebarTitle="Financeiro"
      collapsedWidthPx={70}
      expandedWidthPx={256}
      showContentHeader={showContentHeader}
      layoutBackgroundClassName="bg-[#F8FAFC] dark:bg-neutral-900/70"
      sidebarBackgroundClassName="border-r border-[#E5E7EB] bg-[#F8FAFC] dark:border-[#262626] dark:bg-neutral-900/70"
      contentHeaderClassName="border border-[#E5E7EB] bg-white dark:border-[#262626] dark:bg-neutral-950"
      scrollContentWithHeader
      headerRight={
        activeMenu === 'pagar' || activeMenu === 'receber' ? (
          <Link
            href={`/erp/financeiro/lancamentos/novo?origem=${activeMenu}`}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            {activeMenu === 'pagar' ? 'Novo Pagamento' : 'Novo Recebimento'}
          </Link>
        ) : undefined
      }
    >
      {children ? (
        children
      ) : activeMenu === 'extrato' ? (
        <FinanceiroExtratoContent />
      ) : activeMenu === 'conciliacao_bancaria' ? (
        <ConciliacaoBancariaPage />
      ) : activeMenu === 'conciliacao_pdv' ? (
        <ConciliacaoPdvPage />
      ) : activeMenu === 'receber' ? (
        <FinanceiroReceberContent />
      ) : (
        <FinanceiroPagarContent />
      )}
    </SubSidebarLayout>
  );
}
