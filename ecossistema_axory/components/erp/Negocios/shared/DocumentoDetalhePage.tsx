'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TopBar from '@/components/ui/TopBar';
import PageContainer from '@/components/ui/PageContainer';
import { useIsMobile } from '@/hooks/useIsMobile';
import SubSidebarLayout from '@/components/ui/navigation/SubSidebarLayout';
import NovaPropostaPage from './NovaPropostaPage';
import { NEGOCIOS_SUBSIDEBAR_ITEMS, getNegociosRouteByMenuId, type NegociosSidebarMenuId } from './navigation';
import { invalidateNegociosCache } from '@/components/erp/Negocios/propostas/PropostasContent';

type DocumentoTipo = 'proposta' | 'venda' | 'os';

const BREADCRUMB_LABEL: Record<DocumentoTipo, string> = {
  proposta: 'Propostas',
  venda: 'Pedidos de Venda',
  os: 'Ordens de Servico',
};

const VOLTAR_HREF: Record<DocumentoTipo, string> = {
  proposta: '/erp/negocios/propostas',
  venda: '/erp/negocios/pedidos_venda',
  os: '/erp/negocios/ordens_servico',
};

interface DocumentoDetalhePageProps {
  mode: 'edit' | 'view' | 'copy';
  tipo?: DocumentoTipo;
}

export default function DocumentoDetalhePage({ mode, tipo = 'proposta' }: DocumentoDetalhePageProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const params = useParams<{ id: string }>();
  const documentoId = params?.id ?? null;
  const collapseStorageKey = 'erp.negocios.subsidebar.collapsed';
  const [isSubSidebarCollapsed, setIsSubSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(collapseStorageKey) === '1';
  });

  const breadcrumbLabel = BREADCRUMB_LABEL[tipo];
  const voltarHref = VOLTAR_HREF[tipo];

  const breadcrumbs = useMemo(
    () => [
      { label: 'Inicio', href: '/erp/dashboard' },
      { label: 'ERP', href: '/erp/dashboard' },
      { label: 'Negocios', href: '/erp/negocios/propostas' },
      { label: breadcrumbLabel, href: voltarHref },
    ],
    [breadcrumbLabel, voltarHref]
  );

  const menuAtivo: NegociosSidebarMenuId =
    tipo === 'proposta' ? 'propostas' : tipo === 'venda' ? 'pedidos_venda' : 'ordens_servico';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(collapseStorageKey, isSubSidebarCollapsed ? '1' : '0');
  }, [isSubSidebarCollapsed]);

  const handleVoltar = () => {
    invalidateNegociosCache();
    router.push(voltarHref);
  };

  const renderConteudo = () => {
    if (!documentoId) {
      return (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {tipo === 'proposta'
            ? 'Proposta nao encontrada.'
            : tipo === 'venda'
              ? 'Pedido de venda nao encontrado.'
              : 'Ordem de servico nao encontrada.'}
        </div>
      );
    }

    if (tipo === 'venda') {
      return <NovaPropostaPage onBack={handleVoltar} mode={mode} vendaId={documentoId} tipo="venda" />;
    }

    if (tipo === 'os') {
      return <NovaPropostaPage onBack={handleVoltar} mode={mode} osId={documentoId} tipo="os" />;
    }

    return <NovaPropostaPage onBack={handleVoltar} mode={mode} propostaId={documentoId} tipo="proposta" />;
  };

  return (
    <>
      <TopBar
        breadcrumbs={breadcrumbs}
        breadcrumbOffsetDesktopPx={0}
        useCreateButtonRail
        createButtonRailDesktopPx={isSubSidebarCollapsed ? 70 : 256}
        createButtonCollapsed={isSubSidebarCollapsed}
      />
      <main className="flex flex-1 overflow-hidden bg-[#F8FAFC] dark:bg-neutral-900/70">
        <SubSidebarLayout<NegociosSidebarMenuId>
          isMobile={isMobile}
          isCollapsed={isSubSidebarCollapsed}
          onToggleCollapse={() => setIsSubSidebarCollapsed((prev) => !prev)}
          items={NEGOCIOS_SUBSIDEBAR_ITEMS}
          activeId={menuAtivo}
          onSelect={(id) => router.push(getNegociosRouteByMenuId(id))}
          sidebarTitle="Negocios"
          collapsedWidthPx={70}
          expandedWidthPx={256}
          showContentHeader={false}
          showItemDividers={false}
          layoutBackgroundClassName="bg-[#F8FAFC] dark:bg-neutral-900/70"
          sidebarBackgroundClassName="border-r border-[#E5E7EB] bg-[#F8FAFC] dark:border-[#262626] dark:bg-neutral-900/70"
        >
          <PageContainer className="flex h-full flex-1 min-h-0 flex-col overflow-hidden !px-0">
            {renderConteudo()}
          </PageContainer>
        </SubSidebarLayout>
      </main>
    </>
  );
}
