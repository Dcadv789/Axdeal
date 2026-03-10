'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import TopBar from '@/components/ui/TopBar';
import PageContainer from '@/components/ui/PageContainer';
import ConfiguracoesContent from '@/components/erp/ConfiguracoesContent';
import { ConfigTab } from '@/types';

const TAB_LABELS: Record<ConfigTab, string> = {
  empresa: 'Empresa',
  usuarios: 'Usuários',
  perfil: 'Meu Perfil',
  servicos: 'Serviços e Produtos',
  parametros: 'Parâmetros de Vendas',
  regua_cobranca: 'Régua de Cobrança',
  configuracoes_proposta: 'Configurações de Proposta',
};

const VALID_TABS: ConfigTab[] = ['empresa', 'usuarios', 'perfil', 'servicos', 'parametros', 'regua_cobranca', 'configuracoes_proposta'];

export default function ErpConfiguracoesPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab: ConfigTab = tabParam && VALID_TABS.includes(tabParam as ConfigTab) ? (tabParam as ConfigTab) : 'empresa';
  const [activeTab, setActiveTab] = useState<ConfigTab>(initialTab);

  useEffect(() => {
    if (tabParam && VALID_TABS.includes(tabParam as ConfigTab)) {
      setActiveTab(tabParam as ConfigTab);
    }
  }, [tabParam]);

  const breadcrumbs = [
    { label: 'Início', href: '/erp/dashboard' },
    { label: 'ERP', href: '/erp/dashboard' },
    { label: 'Configurações', href: '/erp/configuracoes' },
    { label: TAB_LABELS[activeTab] },
  ];

  return (
    <>
      <TopBar breadcrumbs={breadcrumbs} />
      <main className="flex-1 overflow-y-auto flex justify-center">
        <PageContainer>
          <ConfiguracoesContent activeTab={activeTab} onTabChange={setActiveTab} />
        </PageContainer>
      </main>
    </>
  );
}
