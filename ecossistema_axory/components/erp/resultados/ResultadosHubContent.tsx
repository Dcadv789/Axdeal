'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Briefcase, Building2, ClipboardCheck, DollarSign, ShieldCheck } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import SubSidebarLayout, { type SubSidebarNavItem } from '@/components/ui/navigation/SubSidebarLayout';
import ResultadosFinanceirosContent from './ResultadosFinanceirosContent';
import ResultadosComercialContent from './ResultadosComercialContent';
import ResultadosOperacionalContent from './ResultadosOperacionalContent';
import ResultadosProjetosContent from './ResultadosProjetosContent';
import ResultadosDepartamentosContent from './ResultadosDepartamentosContent';
import ResultadosAuditoriaContent from './ResultadosAuditoriaContent';
import { PlaceholderPanel } from './shared';
import type { ResultadosMenuId } from './types';

interface ResultadosHubContentProps {
  activeMenu: ResultadosMenuId;
  children?: ReactNode;
}

const MENU_TO_ROUTE: Record<ResultadosMenuId, string> = {
  financeiro: '/erp/resultados',
  comercial: '/erp/resultados/comercial',
  operacional: '/erp/resultados/operacional',
  projetos: '/erp/resultados/projetos',
  departamentos: '/erp/resultados/departamentos',
  auditoria: '/erp/resultados/auditoria',
};

export default function ResultadosHubContent({ activeMenu, children }: ResultadosHubContentProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isSubSidebarCollapsed, setIsSubSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('erp.resultados.subsidebar.collapsed') === '1';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('erp.resultados.subsidebar.collapsed', isSubSidebarCollapsed ? '1' : '0');
  }, [isSubSidebarCollapsed]);

  const items = useMemo<SubSidebarNavItem<ResultadosMenuId>[]>(
    () => [
      { id: 'financeiro', label: 'Financeiro', description: 'Indicadores de caixa e cobranca', icon: DollarSign },
      { id: 'comercial', label: 'Comercial', description: 'Performance de vendas e conversao', icon: Briefcase },
      { id: 'operacional', label: 'Operacional', description: 'Eficiencia e produtividade operacional', icon: ClipboardCheck },
      { id: 'projetos', label: 'Projetos', description: 'Resultados por carteira e execucao', icon: BarChart3 },
      { id: 'departamentos', label: 'Departamentos', description: 'Custos, headcount e orcamento por area', icon: Building2 },
      { id: 'auditoria', label: 'Auditoria', description: 'Rastreabilidade e governanca', icon: ShieldCheck },
    ],
    []
  );

  const content = (() => {
    if (children) return children;
    if (activeMenu === 'financeiro') return <ResultadosFinanceirosContent />;
    if (activeMenu === 'comercial') return <ResultadosComercialContent />;
    if (activeMenu === 'operacional') return <ResultadosOperacionalContent />;
    if (activeMenu === 'projetos') return <ResultadosProjetosContent />;
    if (activeMenu === 'departamentos') return <ResultadosDepartamentosContent />;
    if (activeMenu === 'auditoria') return <ResultadosAuditoriaContent />;
    return (
      <PlaceholderPanel
        eyebrow={items.find((item) => item.id === activeMenu)?.label || 'Resultados'}
        title="Modulo em construcao"
        description="Esta area sera detalhada na proxima etapa do modulo de resultados."
      />
    );
  })();

  return (
    <SubSidebarLayout<ResultadosMenuId>
      isMobile={isMobile}
      isCollapsed={isSubSidebarCollapsed}
      onToggleCollapse={() => setIsSubSidebarCollapsed((prev) => !prev)}
      items={items}
      activeId={activeMenu}
      onSelect={(menu) => router.push(MENU_TO_ROUTE[menu])}
      sidebarTitle="Resultados"
      collapsedWidthPx={70}
      expandedWidthPx={256}
      showContentHeader
      layoutBackgroundClassName="bg-[#F8FAFC] dark:bg-neutral-900/70"
      sidebarBackgroundClassName="border-r border-[#E5E7EB] bg-[#F8FAFC] dark:border-[#262626] dark:bg-neutral-900/70"
      contentHeaderClassName="border border-[#E5E7EB] bg-white dark:border-[#262626] dark:bg-neutral-950"
      scrollContentWithHeader
    >
      {content}
    </SubSidebarLayout>
  );
}
