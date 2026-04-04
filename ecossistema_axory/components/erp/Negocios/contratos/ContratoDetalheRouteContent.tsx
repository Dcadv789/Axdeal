'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/ui/TopBar';
import PageContainer from '@/components/ui/PageContainer';
import { useIsMobile } from '@/hooks/useIsMobile';
import SubSidebarLayout from '@/components/ui/navigation/SubSidebarLayout';
import ContratoDetalhePage from './ContratoDetalhePage';
import { NEGOCIOS_SUBSIDEBAR_ITEMS, getNegociosRouteByMenuId, type NegociosSidebarMenuId } from '../shared/navigation';

interface ContratoDetalheRouteContentProps {
  mode: 'new' | 'edit';
  contratoId?: string | null;
}

export default function ContratoDetalheRouteContent({
  mode,
  contratoId = null,
}: ContratoDetalheRouteContentProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const collapseStorageKey = 'erp.negocios.subsidebar.collapsed';
  const [isSubSidebarCollapsed, setIsSubSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(collapseStorageKey) === '1';
  });

  const breadcrumbs = useMemo(
    () => [
      { label: 'Inicio', href: '/erp/dashboard' },
      { label: 'ERP', href: '/erp/dashboard' },
      { label: 'Negocios', href: '/erp/negocios/contratos' },
      { label: 'Contratos', href: '/erp/negocios/contratos' },
      { label: mode === 'new' ? 'Novo Contrato' : 'Editar Contrato' },
    ],
    [mode]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(collapseStorageKey, isSubSidebarCollapsed ? '1' : '0');
  }, [isSubSidebarCollapsed]);

  return (
    <>
      <TopBar
        breadcrumbs={breadcrumbs}
        breadcrumbOffsetDesktopPx={0}
        useCreateButtonRail
        createButtonRailDesktopPx={isSubSidebarCollapsed ? 70 : 256}
        createButtonCollapsed={isSubSidebarCollapsed}
      />
      <main className="flex flex-1 overflow-hidden bg-[#F8FAFC] dark:bg-neutral-900/70">
        <SubSidebarLayout<NegociosSidebarMenuId>
          isMobile={isMobile}
          isCollapsed={isSubSidebarCollapsed}
          onToggleCollapse={() => setIsSubSidebarCollapsed((prev) => !prev)}
          items={NEGOCIOS_SUBSIDEBAR_ITEMS}
          activeId="contratos"
          onSelect={(id) => router.push(getNegociosRouteByMenuId(id))}
          sidebarTitle="Negocios"
          collapsedWidthPx={70}
          expandedWidthPx={256}
          showContentHeader={false}
          showItemDividers={false}
          layoutBackgroundClassName="bg-[#F8FAFC] dark:bg-neutral-900/70"
          sidebarBackgroundClassName="border-r border-[#E5E7EB] bg-[#F8FAFC] dark:border-[#262626] dark:bg-neutral-900/70"
        >
          <PageContainer className="flex h-full flex-1 min-h-0 flex-col overflow-hidden !px-0">
            <ContratoDetalhePage contratoId={contratoId} mode={mode} />
          </PageContainer>
        </SubSidebarLayout>
      </main>
    </>
  );
}
