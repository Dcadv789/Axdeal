'use client';

import { useState } from 'react';
import { Plus, ArrowLeft, Save, Link } from 'lucide-react';
import TopBar from '@/components/ui/TopBar';
import PageContainer from '@/components/ui/PageContainer';
import PageTitle from '@/components/ui/PageTitle';
import PropostasContent, { type NegociosTab } from '@/components/erp/PropostasContent';
import NovaPropostaPage from '@/components/erp/NovaPropostaPage';
import { ConfirmModal } from '@axdeal/ui';

const TAB_LABELS: Record<NegociosTab, string> = {
  propostas: 'Propostas',
  vendas: 'Vendas',
};

export default function ErpNegociosPage() {
  const [isNovaProposta, setIsNovaProposta] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [activeTab, setActiveTab] = useState<NegociosTab>('propostas');

  const pageConfig = isNovaProposta
    ? {
        title: 'Nova Proposta',
        breadcrumbs: [
          { label: 'Início', href: '/erp/dashboard' },
          { label: 'ERP', href: '/erp/dashboard' },
          { label: 'Negócios', href: '/erp/negocios' },
          { label: 'Nova Proposta' },
        ],
      }
    : {
        title: 'Negócios',
        breadcrumbs: [
          { label: 'Início', href: '/erp/dashboard' },
          { label: 'ERP', href: '/erp/dashboard' },
          { label: 'Negócios', href: '/erp/negocios' },
          { label: TAB_LABELS[activeTab] },
        ],
      };

  const handleBreadcrumbClick = (label: string) => {
    if (isNovaProposta && label === 'Negócios') {
      setShowConfirmModal(true);
      return false;
    }
  };

  const handleConfirmLeave = () => {
    setShowConfirmModal(false);
    setIsNovaProposta(false);
  };

  const rightContent = !isNovaProposta ? (
    <button
      onClick={() => setIsNovaProposta(true)}
      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all shadow-sm hover:shadow-md"
    >
      <Plus size={19} />
      Nova Proposta
    </button>
  ) : (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setShowConfirmModal(true)}
        className="flex items-center gap-2 px-4 py-2.5 border-2 border-[#E5E7EB] dark:border-[#262626] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg font-medium text-sm transition-colors"
      >
        <ArrowLeft size={18} />
        Voltar
      </button>
      <button
        onClick={() => console.log('Salvando rascunho...')}
        className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 dark:bg-gray-600 hover:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
      >
        <Save size={18} />
        Salvar Rascunho
      </button>
      <button
        onClick={() => console.log('Finalizando...')}
        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all shadow-sm hover:shadow-md"
      >
        <Link size={18} />
        Finalizar e Gerar Link
      </button>
    </div>
  );

  return (
    <>
      <TopBar breadcrumbs={pageConfig.breadcrumbs} onBreadcrumbClick={handleBreadcrumbClick} />
      <main className="flex-1 overflow-y-auto flex justify-center">
        <PageContainer>
          {isNovaProposta ? (
            <div className="py-6 space-y-6">
              <PageTitle
                icon={<Plus size={28} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />}
                title={pageConfig.title}
                rightContent={rightContent}
              />
              <NovaPropostaPage onBack={() => setShowConfirmModal(true)} />
            </div>
          ) : (
            <PropostasContent
              activeTab={activeTab}
              onTabChange={setActiveTab}
              rightContent={rightContent}
            />
          )}
        </PageContainer>
      </main>

      <ConfirmModal
        isOpen={showConfirmModal}
        onConfirm={handleConfirmLeave}
        onCancel={() => setShowConfirmModal(false)}
        title="Descartar alterações?"
        message="Você tem alterações não salvas. Deseja continuar?"
        confirmText="Sim, sair"
        cancelText="Continuar editando"
      />
    </>
  );
}
