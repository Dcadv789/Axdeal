'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useIsMobile } from '@/hooks/useIsMobile';
import SubSidebarLayout from '@/components/ui/navigation/SubSidebarLayout';
import ContasBancariasContent from './bancos_contas/ContasBancariasContent';
import EstruturaContent from './estrutura_financeira/EstruturaContent';
import OperacaoContent, { type OperacaoTab } from './operacoes_regras/OperacaoContent';
import IntegracoesContent from './conexoes_externas/IntegracoesContent';
import {
  CONFIGURACOES_MENU_ROUTES,
  CONFIGURACOES_SUBSIDEBAR_ITEMS,
  type ConfiguracoesSidebarMenuId,
} from './shared/navigation';

type AbaErp = ConfiguracoesSidebarMenuId;

export default function ErpConfiguracoesHubContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const [abaAtiva, setAbaAtiva] = useState<AbaErp>('bancos_contas');
  const [operacaoTab, setOperacaoTab] = useState<OperacaoTab>('parametros-vendas');
  const [isSubSidebarCollapsed, setIsSubSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('erp.configuracoes.subsidebar.collapsed') === '1';
  });
  const collapseStorageKey = 'erp.configuracoes.subsidebar.collapsed';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(collapseStorageKey, isSubSidebarCollapsed ? '1' : '0');
    window.dispatchEvent(
      new CustomEvent('erp-config-subsidebar-toggle', { detail: { collapsed: isSubSidebarCollapsed } })
    );
  }, [isSubSidebarCollapsed]);

  useEffect(() => {
    const aba = searchParams.get('aba');
    const tab = searchParams.get('tab');

    if (aba === 'operacoes_regras' || aba === 'operacao') {
      setAbaAtiva('operacoes_regras');
      if (
        tab === 'regua-cobranca' ||
        tab === 'configuracoes-proposta' ||
        tab === 'condicoes-pagamento' ||
        tab === 'taxas-cartao' ||
        tab === 'parametros-vendas' ||
        tab === 'campos-customizados' ||
        tab === 'vendas'
      ) {
        setOperacaoTab(tab);
      } else {
        setOperacaoTab('parametros-vendas');
      }
    } else if (
      aba === 'bancos_contas' ||
      aba === 'contas_bancarias' ||
      aba === 'estrutura_financeira' ||
      aba === 'estrutura' ||
      aba === 'conexoes_externas' ||
      aba === 'integracoes'
    ) {
      if (aba === 'contas_bancarias') {
        setAbaAtiva('bancos_contas');
      } else if (aba === 'estrutura') {
        setAbaAtiva('estrutura_financeira');
      } else if (aba === 'integracoes') {
        setAbaAtiva('conexoes_externas');
      } else {
        setAbaAtiva(aba);
      }
    }
  }, [searchParams]);

  const navegarParaAba = (aba: AbaErp) => {
    const rota = CONFIGURACOES_MENU_ROUTES[aba];
    const params = new URLSearchParams(searchParams.toString());
    params.set('aba', aba);
    if (aba !== 'operacoes_regras') {
      params.delete('tab');
    } else if (!params.get('tab')) {
      params.set('tab', operacaoTab);
    }

    setAbaAtiva(aba);
    router.replace(rota ? `${rota}${params.get('tab') ? `&tab=${params.get('tab')}` : ''}` : `${pathname}?${params.toString()}`);
  };

  const onOperacaoTabChange = (tab: OperacaoTab) => {
    setOperacaoTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('aba', 'operacoes_regras');
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <SubSidebarLayout<AbaErp>
      isMobile={isMobile}
      isCollapsed={isSubSidebarCollapsed}
      onToggleCollapse={() => setIsSubSidebarCollapsed((prev) => !prev)}
      items={CONFIGURACOES_SUBSIDEBAR_ITEMS}
      activeId={abaAtiva}
      onSelect={navegarParaAba}
      sidebarTitle="Configuracoes ERP"
      collapsedWidthPx={70}
      expandedWidthPx={256}
      showContentHeader
      scrollContentWithHeader
      layoutBackgroundClassName="bg-[#F8FAFC] dark:bg-neutral-900/70"
      sidebarBackgroundClassName="border-r border-[#E5E7EB] bg-[#F8FAFC] dark:border-[#262626] dark:bg-neutral-900/70"
      contentHeaderClassName="border border-[#E5E7EB] bg-white dark:border-[#262626] dark:bg-neutral-950"
    >
      <div className="erp-config-content flex min-h-full min-w-0 flex-col pb-4">
        {abaAtiva === 'bancos_contas' && <ContasBancariasContent />}
        {abaAtiva === 'estrutura_financeira' && <EstruturaContent key="estrutura_financeira" />}
        {abaAtiva === 'operacoes_regras' && (
          <OperacaoContent activeTab={operacaoTab} onTabChange={onOperacaoTabChange} />
        )}
        {abaAtiva === 'conexoes_externas' && <IntegracoesContent />}
      </div>
    </SubSidebarLayout>
  );
}
