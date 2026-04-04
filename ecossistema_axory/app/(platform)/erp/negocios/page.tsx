'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, ClipboardList, FileText, Monitor, Plus, ReceiptText, ShoppingCart } from 'lucide-react';
import TopBar from '@/components/ui/TopBar';
import PageContainer from '@/components/ui/PageContainer';
import PropostasContent, { type NegociosTab } from '@/components/erp/Negocios/propostas/PropostasContent';
import NegociosContratosContent from '@/components/erp/Negocios/contratos/NegociosContratosContent';
import NegociosPdvContent from '@/components/erp/Negocios/pdv/NegociosPdvContent';
import NovaPropostaPage from '@/components/erp/Negocios/shared/NovaPropostaPage';
import { NEGOCIOS_SUBSIDEBAR_ITEMS, NEGOCIOS_TAB_LABELS, NEGOCIOS_TAB_ROUTES, type NegociosSidebarMenuId } from '@/components/erp/Negocios/shared/navigation';
import { useIsMobile } from '@/hooks/useIsMobile';
import SubSidebarLayout, { type SubSidebarNavItem } from '@/components/ui/navigation/SubSidebarLayout';

type CriacaoTipo = 'proposta' | 'venda' | 'os' | null;
type NegociosPageTab = NegociosTab | Extract<NegociosSidebarMenuId, 'contratos' | 'pdv'>;

const TAB_ROUTES = NEGOCIOS_TAB_ROUTES;
const TAB_LABELS = NEGOCIOS_TAB_LABELS;

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

function getTabFromPathname(pathname: string | null): NegociosPageTab {
  if (!pathname || pathname === '/erp/negocios') return 'propostas';

  const entry = (Object.entries(TAB_ROUTES) as Array<[NegociosPageTab, string]>).find(([, route]) => {
    return pathname === route || pathname.startsWith(`${route}/`);
  });

  return entry?.[0] ?? 'propostas';
}

export default function ErpNegociosPage() {
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [criacaoTipo, setCriacaoTipo] = useState<CriacaoTipo>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [activeTab, setActiveTab] = useState<NegociosPageTab>(() => getTabFromPathname(pathname));
  const [destinoPendente, setDestinoPendente] = useState<string | null>(null);
  const [isSubSidebarCollapsed, setIsSubSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('erp.negocios.subsidebar.collapsed') === '1';
  });
  const previousGuardRef = useRef<((nextPath: string) => boolean) | undefined>(undefined);
  const collapseStorageKey = 'erp.negocios.subsidebar.collapsed';
  const isCriando = criacaoTipo !== null;
  const tituloCriacao =
    criacaoTipo === 'venda' ? 'Nova Venda' : criacaoTipo === 'os' ? 'Nova Ordem de Servico' : 'Nova Proposta';
  const acaoCriacao =
    criacaoTipo === 'venda' ? 'Criar venda' : criacaoTipo === 'os' ? 'Criar ordem de servico' : 'Criar proposta';
  const currentTabHref = NEGOCIOS_TAB_ROUTES[activeTab];

  const subSidebarItems = useMemo<SubSidebarNavItem<NegociosPageTab>[]>(
    () => [
      {
        id: 'propostas',
        label: 'Propostas',
        description: 'Gestao de propostas comerciais',
        icon: FileText,
      },
      {
        id: 'pedidos_venda',
        label: 'Pedidos de Venda',
        description: 'Pedidos convertidos e acompanhamento',
        icon: ShoppingCart,
      },
      {
        id: 'ordens_servico',
        label: 'Ordens de Servico',
        description: 'Execucao e status de servicos',
        icon: ClipboardList,
      },
      {
        id: 'contratos',
        label: 'Contratos',
        description: 'Contratos recorrentes e faturamento',
        icon: ReceiptText,
      },
      {
        id: 'pdv',
        label: 'Frente de Caixa (PDV)',
        description: 'Abertura do caixa e histórico das últimas vendas',
        icon: Monitor,
      },
    ],
    []
  );

  useEffect(() => {
    setActiveTab(getTabFromPathname(pathname));
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(collapseStorageKey, isSubSidebarCollapsed ? '1' : '0');
  }, [isSubSidebarCollapsed]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!isCriando) {
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
      setDestinoPendente(destino);
      setShowConfirmModal(true);
      return false;
    };

    return () => {
      (window as Window & { __AXORY_NAV_GUARD__?: (nextPath: string) => boolean }).__AXORY_NAV_GUARD__ =
        previousGuardRef.current;
    };
  }, [isCriando]);

  useEffect(() => {
    if (!isCriando) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isCriando]);

  const abrirConfirmacaoSaida = (destino?: string) => {
    setDestinoPendente(destino ? normalizarDestino(destino) : null);
    setShowConfirmModal(true);
  };

  const handleBreadcrumbClick = (_label: string, href?: string) => {
    if (!isCriando || !href) return false;
    abrirConfirmacaoSaida(href);
    return false;
  };

  const handleConfirmLeave = () => {
    const destino = destinoPendente;
    setShowConfirmModal(false);
    setDestinoPendente(null);
    setCriacaoTipo(null);

    if (destino && destino !== pathname) {
      router.push(destino);
    }
  };

  const handleTabChange = (tab: NegociosPageTab) => {
    setActiveTab(tab);
    const destino = TAB_ROUTES[tab];
    if (destino !== pathname) {
      router.push(destino);
    }
  };

  const handleSavedSuccessExit = () => {
    setShowConfirmModal(false);
    setDestinoPendente(null);
    setCriacaoTipo(null);
    router.push(currentTabHref);
  };

  const rightContent =
    !isCriando ? (
      activeTab === 'pdv' ? (
        <Link
          href="/pdv"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md"
        >
          <Monitor size={18} />
          Abrir Frente de Caixa
        </Link>
      ) : activeTab === 'contratos' ? (
        <Link
          href="/erp/negocios/contratos/novo"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md"
        >
          <Plus size={19} />
          Novo Contrato
        </Link>
      ) : (
        <button
          onClick={() =>
            setCriacaoTipo(activeTab === 'pedidos_venda' ? 'venda' : activeTab === 'ordens_servico' ? 'os' : 'proposta')
          }
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md"
        >
          <Plus size={19} />
          {activeTab === 'pedidos_venda'
            ? 'Nova Venda'
            : activeTab === 'ordens_servico'
              ? 'Nova Ordem de Servico'
              : 'Nova Proposta'}
        </button>
      )
    ) : (
      <div className="flex items-center gap-3">
        <button
          onClick={() => abrirConfirmacaoSaida(currentTabHref)}
          className="flex items-center gap-2 rounded-lg border-2 border-[#E5E7EB] px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#262626] dark:text-gray-300 dark:hover:bg-gray-900"
        >
          <ArrowLeft size={18} />
          Cancelar
        </button>
        <button
          type="submit"
          form="form-nova-proposta"
          name="submitAction"
          value="rascunho"
          formNoValidate
          className="rounded-lg bg-gray-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-700"
        >
          Salvar rascunho
        </button>
        <button
          type="submit"
          form="form-nova-proposta"
          name="submitAction"
          value="criar"
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md"
        >
          {acaoCriacao}
        </button>
      </div>
    );

  const pageConfig = isCriando
    ? {
        title: tituloCriacao,
        breadcrumbs: [
          { label: 'Inicio', href: '/erp/dashboard' },
          { label: 'ERP', href: '/erp/dashboard' },
          { label: 'Negocios', href: currentTabHref },
          { label: tituloCriacao },
        ],
      }
    : {
        title: 'Negocios',
        breadcrumbs: [
          { label: 'Inicio', href: '/erp/dashboard' },
          { label: 'ERP', href: '/erp/dashboard' },
          { label: 'Negocios', href: currentTabHref },
          { label: TAB_LABELS[activeTab] },
        ],
      };

  const createButtonRailDesktopPx = isSubSidebarCollapsed ? 70 : 256;

  return (
    <>
      <TopBar
        breadcrumbs={pageConfig.breadcrumbs}
        onBreadcrumbClick={handleBreadcrumbClick}
        breadcrumbOffsetDesktopPx={0}
        useCreateButtonRail={!isCriando}
        createButtonRailDesktopPx={createButtonRailDesktopPx}
        createButtonCollapsed={isSubSidebarCollapsed}
      />
      <main className={`flex flex-1 overflow-hidden bg-[#F8FAFC] dark:bg-neutral-900/70 ${isCriando ? 'flex-col min-h-0' : ''}`}>
        {isCriando ? (
          <PageContainer className="flex h-full flex-1 min-h-0 flex-col overflow-hidden">
            <NovaPropostaPage
              onBack={() => abrirConfirmacaoSaida(currentTabHref)}
              onSavedSuccess={handleSavedSuccessExit}
              tipo={criacaoTipo === 'venda' ? 'venda' : criacaoTipo === 'os' ? 'os' : 'proposta'}
            />
          </PageContainer>
        ) : (
          <SubSidebarLayout<NegociosPageTab>
            isMobile={isMobile}
            isCollapsed={isSubSidebarCollapsed}
            onToggleCollapse={() => setIsSubSidebarCollapsed((prev) => !prev)}
            items={subSidebarItems}
            activeId={activeTab}
            onSelect={handleTabChange}
            sidebarTitle="Negocios"
            collapsedWidthPx={70}
            expandedWidthPx={256}
            showContentHeader
            showItemDividers={false}
            scrollContentWithHeader
            headerRight={rightContent}
            layoutBackgroundClassName="bg-[#F8FAFC] dark:bg-neutral-900/70"
            sidebarBackgroundClassName="border-r border-[#E5E7EB] bg-[#F8FAFC] dark:border-[#262626] dark:bg-neutral-900/70"
            contentHeaderClassName="border border-[#E5E7EB] bg-white dark:border-[#262626] dark:bg-neutral-950"
          >
            {activeTab === 'contratos' ? (
              <NegociosContratosContent />
            ) : activeTab === 'pdv' ? (
              <NegociosPdvContent />
            ) : (
              <PropostasContent activeTab={activeTab} hideInternalHeader />
            )}
          </SubSidebarLayout>
        )}
      </main>

      <ConfirmModal
        isOpen={showConfirmModal}
        onConfirm={handleConfirmLeave}
        onCancel={() => {
          setShowConfirmModal(false);
          setDestinoPendente(null);
        }}
        title="Descartar alteracoes?"
        message="Voce tem alteracoes nao salvas. Deseja continuar?"
        confirmText="Sim, sair"
        cancelText="Continuar editando"
      />
    </>
  );
}
