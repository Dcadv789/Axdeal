'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Users } from 'lucide-react';
import TopBar from '@/components/ui/TopBar';
import PageContainer from '@/components/ui/PageContainer';
import PageTitle from '@/components/ui/PageTitle';
import CadastrosContent from '@/components/erp/Cadastros/CadastrosContent';
import NovoContatoPage from '@/components/erp/Cadastros/contatos/NovoContatoPage';
import { CADASTROS_TAB_LABELS, CADASTROS_TAB_ROUTES, type CadastrosTab } from '@/components/erp/Cadastros/shared/navigation';

type ContatoMode = 'create' | 'edit' | 'view';

interface ConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
}

function ConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText,
  cancelText,
}: ConfirmModalProps) {
  const [mounted, setMounted] = useState(false);
  const scrollYRef = useRef(0);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      if (scrollYRef.current > 0) {
        window.scrollTo(0, scrollYRef.current);
      }
      return;
    }

    scrollYRef.current = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollYRef.current}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/80" style={{ zIndex: 2147483000 }} onClick={onCancel} />
      <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 2147483001 }}>
        <div className="w-full max-w-md rounded-xl border border-[#E5E7EB] bg-white shadow-2xl dark:border-[#262626] dark:bg-neutral-900">
          <div className="p-6">
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#262626] dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

function normalizarDestino(destino: string): string {
  if (!destino) return '';
  try {
    const url = new URL(destino, window.location.origin);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return destino;
  }
}

function getTabFromPathname(pathname: string | null): CadastrosTab {
  if (!pathname || pathname === '/erp/cadastros') return 'contatos';
  if (pathname === '/erp/cadastros/clientes' || pathname.startsWith('/erp/cadastros/clientes/')) return 'contatos';

  const entry = (Object.entries(CADASTROS_TAB_ROUTES) as Array<[CadastrosTab, string]>).find(([, route]) => {
    return pathname === route || pathname.startsWith(`${route}/`);
  });

  return entry?.[0] ?? 'contatos';
}

export default function ErpCadastrosPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<CadastrosTab>(() => getTabFromPathname(pathname));
  const [isNovoContato, setIsNovoContato] = useState(false);
  const [contatoMode, setContatoMode] = useState<ContatoMode>('create');
  const [contatoId, setContatoId] = useState<string | null>(null);
  const [returnToViewMode, setReturnToViewMode] = useState(false);
  const [contatoSaving, setContatoSaving] = useState(false);
  const [contatosRefreshTrigger, setContatosRefreshTrigger] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [destinoPendente, setDestinoPendente] = useState<string | null>(null);
  const previousGuardRef = useRef<((nextPath: string) => boolean) | undefined>(undefined);
  const isEditandoContato = isNovoContato;
  const isContatoReadOnly = contatoMode === 'view';
  const shouldGuardContatoNavigation = isNovoContato && contatoMode !== 'view';
  const currentTabHref = CADASTROS_TAB_ROUTES[activeTab];

  const getContatoPageTitle = () => {
    if (contatoMode === 'edit') return 'Editar Contato';
    if (contatoMode === 'view') return 'Detalhes do Contato';
    return 'Novo Contato';
  };

  const abrirConfirmacaoSaida = (destino?: string) => {
    setDestinoPendente(destino ? normalizarDestino(destino) : null);
    setShowConfirmModal(true);
  };

  const pageConfig = isEditandoContato
    ? {
        title: getContatoPageTitle(),
        breadcrumbs: [
          { label: 'Início', href: '/erp/dashboard' },
          { label: 'ERP', href: '/erp/dashboard' },
          { label: 'Cadastros', href: currentTabHref },
          { label: 'Contatos', href: CADASTROS_TAB_ROUTES.contatos },
          { label: getContatoPageTitle() },
        ],
      }
    : {
        title: `Cadastros > ${CADASTROS_TAB_LABELS[activeTab]}`,
        breadcrumbs: [
          { label: 'Início', href: '/erp/dashboard' },
          { label: 'ERP', href: '/erp/dashboard' },
          { label: 'Cadastros', href: currentTabHref },
          { label: CADASTROS_TAB_LABELS[activeTab] },
        ],
      };

  useEffect(() => {
    setActiveTab(getTabFromPathname(pathname));
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!shouldGuardContatoNavigation) {
      if ((window as Window & { __AXORY_NAV_GUARD__?: (nextPath: string) => boolean }).__AXORY_NAV_GUARD__ !== previousGuardRef.current) {
        (window as Window & { __AXORY_NAV_GUARD__?: (nextPath: string) => boolean }).__AXORY_NAV_GUARD__ =
          previousGuardRef.current;
      }
      return;
    }

    previousGuardRef.current = (window as Window & { __AXORY_NAV_GUARD__?: (nextPath: string) => boolean }).__AXORY_NAV_GUARD__;
    (window as Window & { __AXORY_NAV_GUARD__?: (nextPath: string) => boolean }).__AXORY_NAV_GUARD__ = (nextPath: string) => {
      const destino = normalizarDestino(nextPath);
      const atual = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (!destino || destino === atual) return true;
      abrirConfirmacaoSaida(destino);
      return false;
    };

    return () => {
      (window as Window & { __AXORY_NAV_GUARD__?: (nextPath: string) => boolean }).__AXORY_NAV_GUARD__ = previousGuardRef.current;
    };
  }, [shouldGuardContatoNavigation]);

  useEffect(() => {
    if (!shouldGuardContatoNavigation) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [shouldGuardContatoNavigation]);

  const handleBreadcrumbClick = (_label: string, href?: string) => {
    if (!shouldGuardContatoNavigation || !href) return;
    abrirConfirmacaoSaida(href);
    return false;
  };

  const handleConfirmLeave = () => {
    const destino = destinoPendente;
    setShowConfirmModal(false);
    setDestinoPendente(null);
    setIsNovoContato(false);
    setContatoMode('create');
    setContatoId(null);
    setReturnToViewMode(false);

    if (destino && destino !== pathname) {
      router.push(destino);
    }
  };

  const handleBackFromNovoContato = () => {
    setIsNovoContato(false);
    setContatoMode('create');
    setContatoId(null);
    setReturnToViewMode(false);
    setContatosRefreshTrigger((prev) => prev + 1);
  };

  const handleStartEditingContato = () => {
    setContatoMode('edit');
    setReturnToViewMode(true);
  };

  const handleCancelContatoAction = () => {
    if (contatoMode === 'create') {
      abrirConfirmacaoSaida(CADASTROS_TAB_ROUTES.contatos);
      return;
    }

    if (returnToViewMode && contatoId) {
      setContatoMode('view');
      return;
    }

    abrirConfirmacaoSaida(CADASTROS_TAB_ROUTES.contatos);
  };

  const handleContatoSaveSuccess = () => {
    if (returnToViewMode && contatoId) {
      setContatoMode('view');
      setContatosRefreshTrigger((prev) => prev + 1);
      return;
    }

    handleBackFromNovoContato();
  };

  const handleTabChange = (tab: CadastrosTab) => {
    setActiveTab(tab);
    const destino = CADASTROS_TAB_ROUTES[tab];
    if (destino !== pathname) {
      router.push(destino);
    }
  };

  const rightContent = !isEditandoContato && activeTab === 'contatos'
    ? (
      <button
        onClick={() => {
          setContatoMode('create');
          setContatoId(null);
          setReturnToViewMode(false);
          setIsNovoContato(true);
        }}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-700 hover:shadow-md shadow-sm"
      >
        <Plus size={19} />
        Novo Contato
      </button>
    )
    : isEditandoContato
      ? (
        <div className="flex items-center gap-2">
          {isContatoReadOnly ? (
            <>
              <button
                onClick={handleBackFromNovoContato}
                className="flex items-center gap-2 rounded-lg border-2 border-[#E5E7EB] px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#262626] dark:text-gray-300 dark:hover:bg-gray-900"
              >
                <ArrowLeft size={18} />
                Voltar
              </button>
              <button
                onClick={handleStartEditingContato}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Editar dados
              </button>
            </>
          ) : (
            <>
              <button
                type="submit"
                form="cliente-details-form"
                disabled={contatoSaving}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {contatoSaving ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                onClick={handleCancelContatoAction}
                className="flex items-center gap-2 rounded-lg border-2 border-[#E5E7EB] px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#262626] dark:text-gray-300 dark:hover:bg-gray-900"
              >
                <ArrowLeft size={18} />
                Cancelar
              </button>
            </>
          )}
        </div>
      )
      : undefined;

  return (
    <>
      <TopBar breadcrumbs={pageConfig.breadcrumbs} onBreadcrumbClick={handleBreadcrumbClick} />
      <main className="flex flex-1 justify-center overflow-y-auto">
        <PageContainer>
          {isEditandoContato ? (
            <div className="space-y-4 pt-4 md:pt-5">
              <PageTitle
                icon={<Users size={28} className="flex-shrink-0 text-blue-600 dark:text-blue-400" />}
                title={pageConfig.title}
                rightContent={rightContent}
              />
              <NovoContatoPage
                onBack={handleBackFromNovoContato}
                onSaveSuccess={handleContatoSaveSuccess}
                onSavingChange={setContatoSaving}
                mode={contatoMode}
                clienteId={contatoId}
              />
            </div>
          ) : (
            <CadastrosContent
              activeTab={activeTab}
              onTabChange={handleTabChange}
              rightContent={rightContent}
              onEditarContato={(id) => {
                setContatoMode('edit');
                setContatoId(id);
                setReturnToViewMode(false);
                setIsNovoContato(true);
              }}
              onVisualizarContato={(id) => {
                setContatoMode('view');
                setContatoId(id);
                setReturnToViewMode(false);
                setIsNovoContato(true);
              }}
              refreshTrigger={contatosRefreshTrigger}
            />
          )}
        </PageContainer>
      </main>

      <ConfirmModal
        isOpen={showConfirmModal}
        onConfirm={handleConfirmLeave}
        onCancel={() => {
          setShowConfirmModal(false);
          setDestinoPendente(null);
        }}
        title="Descartar alterações?"
        message="Você tem alterações não salvas. Deseja continuar?"
        confirmText="Sim, sair"
        cancelText="Continuar editando"
      />
    </>
  );
}
