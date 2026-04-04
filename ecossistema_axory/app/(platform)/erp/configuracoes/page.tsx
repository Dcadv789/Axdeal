'use client';

import { Suspense, useEffect, useState } from 'react';
import TopBar from '@/components/ui/TopBar';
import ErpConfiguracoesHubContent from '@/components/erp/Configuracoes/ErpConfiguracoesHubContent';

export default function ErpConfiguracoesPage() {
  const collapseStorageKey = 'erp.configuracoes.subsidebar.collapsed';
  const [isSubSidebarCollapsed, setIsSubSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const readFromStorage = () => {
      const raw = window.localStorage.getItem(collapseStorageKey);
      setIsSubSidebarCollapsed(raw === '1');
    };

    const onToggle = (event: Event) => {
      const customEvent = event as CustomEvent<{ collapsed?: boolean }>;
      if (typeof customEvent.detail?.collapsed === 'boolean') {
        setIsSubSidebarCollapsed(customEvent.detail.collapsed);
      } else {
        readFromStorage();
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === collapseStorageKey) {
        setIsSubSidebarCollapsed(event.newValue === '1');
      }
    };

    readFromStorage();
    window.addEventListener('erp-config-subsidebar-toggle', onToggle as EventListener);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('erp-config-subsidebar-toggle', onToggle as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const breadcrumbs = [
    { label: 'Início', href: '/erp/dashboard' },
    { label: 'ERP', href: '/erp/dashboard' },
    { label: 'Configurações ERP', href: '/erp/configuracoes' },
  ];

  const createButtonRailDesktopPx = isSubSidebarCollapsed ? 70 : 256;

  return (
    <>
      <TopBar
        breadcrumbs={breadcrumbs}
        breadcrumbOffsetDesktopPx={0}
        useCreateButtonRail
        createButtonRailDesktopPx={createButtonRailDesktopPx}
        createButtonCollapsed={isSubSidebarCollapsed}
      />
      <main className="flex-1 overflow-y-auto">
        <Suspense fallback={<div className="px-4 py-6 text-sm text-gray-500 md:px-8 lg:px-12">Carregando...</div>}>
          <ErpConfiguracoesHubContent />
        </Suspense>
      </main>
    </>
  );
}
