'use client';

import { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import TopBar from '@/components/ui/TopBar';
import PageContainer from '@/components/ui/PageContainer';
import PageTitle from '@/components/ui/PageTitle';
import ClientesContent from '@/components/erp/ClientesContent';
import NovoClientePage from '@/components/erp/NovoClientePage';

export default function ErpClientesPage() {
  const [isNovoCliente, setIsNovoCliente] = useState(false);
  const [clienteMode, setClienteMode] = useState<'create' | 'edit' | 'view'>('create');
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clientesRefreshTrigger, setClientesRefreshTrigger] = useState(0);

  const getClientePageTitle = () => {
    if (clienteMode === 'edit') return 'Editar Cliente';
    if (clienteMode === 'view') return 'Detalhes do Cliente';
    return 'Novo Cliente';
  };

  const pageConfig = isNovoCliente
    ? {
        title: getClientePageTitle(),
        breadcrumbs: [
          { label: 'Início', href: '/erp/dashboard' },
          { label: 'ERP', href: '/erp/dashboard' },
          { label: 'Clientes', href: '/erp/clientes' },
          { label: getClientePageTitle() },
        ],
      }
    : {
        title: 'Clientes',
        breadcrumbs: [
          { label: 'Início', href: '/erp/dashboard' },
          { label: 'ERP', href: '/erp/dashboard' },
          { label: 'Clientes', href: '/erp/clientes' },
        ],
      };

  const handleBackFromNovoCliente = () => {
    setIsNovoCliente(false);
    setClienteMode('create');
    setClienteId(null);
    setClientesRefreshTrigger((p) => p + 1);
  };

  const handleBreadcrumbClick = (label: string) => {
    if (isNovoCliente && label === 'Clientes') {
      handleBackFromNovoCliente();
      return false;
    }
  };

  const rightContent = !isNovoCliente ? (
    <button
      onClick={() => setIsNovoCliente(true)}
      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all shadow-sm hover:shadow-md"
    >
      <Plus size={19} />
      Novo Cliente
    </button>
  ) : undefined;

  return (
    <>
      <TopBar breadcrumbs={pageConfig.breadcrumbs} onBreadcrumbClick={handleBreadcrumbClick} />
      <main className="flex-1 overflow-y-auto flex justify-center">
        <PageContainer>
          <div className="py-6 space-y-6">
            <PageTitle
              icon={<Users size={28} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />}
              title={pageConfig.title}
              rightContent={rightContent}
            />
            {isNovoCliente ? (
              <NovoClientePage
                onBack={handleBackFromNovoCliente}
                mode={clienteMode}
                clienteId={clienteId}
              />
            ) : (
              <ClientesContent
                onEditarCliente={(id) => {
                  setClienteMode('edit');
                  setClienteId(id);
                  setIsNovoCliente(true);
                }}
                onVisualizarCliente={(id) => {
                  setClienteMode('view');
                  setClienteId(id);
                  setIsNovoCliente(true);
                }}
                refreshTrigger={clientesRefreshTrigger}
              />
            )}
          </div>
        </PageContainer>
      </main>
    </>
  );
}
