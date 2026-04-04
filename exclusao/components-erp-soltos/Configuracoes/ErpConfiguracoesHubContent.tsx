'use client';

import { useMemo, useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Banknote, Building2, Plug, Workflow } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import SubSidebarLayout, { type SubSidebarNavItem } from '@/components/ui/navigation/SubSidebarLayout';
import ContasBancariasContent from './ContasBancariasContent';
import EstruturaContent from './EstruturaContent';
import OperacaoContent, { type OperacaoTab } from './OperacaoContent';
import IntegracoesContent from './IntegracoesContent';

type AbaErp = 'contas_bancarias' | 'estrutura' | 'operacao' | 'integracoes';

export default function ErpConfiguracoesHubContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const [abaAtiva, setAbaAtiva] = useState<AbaErp>('contas_bancarias');
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

    if (aba === 'operacao') {
      setAbaAtiva('operacao');
      if (
        tab === 'regua-cobranca' ||
        tab === 'configuracoes-proposta' ||
        tab === 'condicoes-pagamento' ||
        tab === 'parametros-vendas' ||
        tab === 'campos-customizados' ||
        tab === 'vendas'
      ) {
        setOperacaoTab(tab);
      } else {
        setOperacaoTab('parametros-vendas');
      }
    } else if (aba === 'estrutura' || aba === 'integracoes' || aba === 'contas_bancarias') {
      setAbaAtiva(aba);
    }
  }, [searchParams]);

  const abas = useMemo<SubSidebarNavItem<AbaErp>[]>(
    () => [
      { id: 'contas_bancarias', label: 'Bancos e Contas', description: 'Contas bancárias e tesouraria', icon: Banknote },
      { id: 'estrutura', label: 'Estrutura Financeira', description: 'Categorias e organização', icon: Building2 },
      { id: 'operacao', label: 'Operações e Regras', description: 'Parâmetros de propostas e vendas', icon: Workflow },
      { id: 'integracoes', label: 'Conexões Externas', description: 'Integrações com outros sistemas', icon: Plug },
    ],
    []
  );

  const navegarParaAba = (aba: AbaErp) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('aba', aba);
    if (aba !== 'operacao') {
      params.delete('tab');
    } else if (!params.get('tab')) {
      params.set('tab', operacaoTab);
    }

    setAbaAtiva(aba);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const onOperacaoTabChange = (tab: OperacaoTab) => {
    setOperacaoTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('aba', 'operacao');
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <SubSidebarLayout<AbaErp>
      isMobile={isMobile}
      isCollapsed={isSubSidebarCollapsed}
      onToggleCollapse={() => setIsSubSidebarCollapsed((prev) => !prev)}
      items={abas}
      activeId={abaAtiva}
      onSelect={navegarParaAba}
      sidebarTitle="Configurações ERP"
      collapsedWidthPx={70}
      expandedWidthPx={256}
      showContentHeader
      layoutBackgroundClassName="bg-[#F8FAFC] dark:bg-neutral-900/70"
      sidebarBackgroundClassName="border-r border-[#E5E7EB] bg-[#F8FAFC] dark:border-[#262626] dark:bg-neutral-900/70"
      contentHeaderClassName="border border-[#E5E7EB] bg-white dark:border-[#262626] dark:bg-neutral-950"
    >
      <div className="erp-config-content min-w-0">
        {abaAtiva === 'contas_bancarias' && <ContasBancariasContent />}
        {abaAtiva === 'estrutura' && <EstruturaContent />}
        {abaAtiva === 'operacao' && <OperacaoContent activeTab={operacaoTab} onTabChange={onOperacaoTabChange} />}
        {abaAtiva === 'integracoes' && <IntegracoesContent />}
      </div>
    </SubSidebarLayout>
  );
}
