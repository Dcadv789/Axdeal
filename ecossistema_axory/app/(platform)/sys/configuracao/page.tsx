'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import TopBar from '@/components/ui/TopBar';
import PageContainer from '@/components/ui/PageContainer';
import ConfiguracoesContent from '@/components/sys/configuracao/ConfiguracoesContent';
import { ConfigTab } from '@/types';

const TAB_LABELS: Record<ConfigTab, string> = {
  empresa: 'Empresa',
  usuarios: 'Usuários',
  perfil: 'Meu Perfil',
};

const VALID_TABS: ConfigTab[] = ['empresa', 'usuarios', 'perfil'];

export default function SysConfiguracaoPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab: ConfigTab =
    tabParam && VALID_TABS.includes(tabParam as ConfigTab) ? (tabParam as ConfigTab) : 'empresa';
  const [activeTab, setActiveTab] = useState<ConfigTab>(initialTab);

  useEffect(() => {
    if (tabParam && VALID_TABS.includes(tabParam as ConfigTab)) {
      setActiveTab(tabParam as ConfigTab);
    }
  }, [tabParam]);

  const breadcrumbs = [
    { label: 'Início', href: '/erp/dashboard' },
    { label: 'Sistema', href: '/sys/configuracao' },
    { label: 'Configurações', href: '/sys/configuracao' },
    { label: TAB_LABELS[activeTab] },
  ];

  return (
    <>
      <TopBar breadcrumbs={breadcrumbs} />
      <main className="flex flex-1 justify-center overflow-y-auto">
        <PageContainer>
          <ConfiguracoesContent activeTab={activeTab} onTabChange={setActiveTab} />
        </PageContainer>
      </main>
    </>
  );
}
