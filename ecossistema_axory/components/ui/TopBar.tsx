'use client';

import type { CSSProperties } from 'react';
import BreadcrumbBar from '@/components/ui/BreadcrumbBar';
import TopBarProfile from '@/components/ui/TopBarProfile';
import TopBarCreateButton from '@/components/ui/TopBarCreateButton';

interface TopBarProps {
  breadcrumbs: { label: string; href?: string }[];
  onBreadcrumbClick?: (label: string, href: string | undefined, index: number) => boolean | void;
  /** Deslocamento horizontal aplicado apenas em desktop para alinhar breadcrumb ao conteúdo */
  breadcrumbOffsetDesktopPx?: number;
  /** Quando true, o botão Novo ocupa um trilho à esquerda, alinhado com a subsidebar */
  useCreateButtonRail?: boolean;
  /** Largura do trilho do botão Novo em desktop */
  createButtonRailDesktopPx?: number;
  /** Estado de colapso visual do botão Novo no trilho */
  createButtonCollapsed?: boolean;
}

export default function TopBar({
  breadcrumbs,
  onBreadcrumbClick,
  breadcrumbOffsetDesktopPx = 0,
  useCreateButtonRail = false,
  createButtonRailDesktopPx = 0,
  createButtonCollapsed = false,
}: TopBarProps) {
  const breadcrumbStyle = {
    ['--topbar-breadcrumb-offset' as string]: `${Math.max(0, breadcrumbOffsetDesktopPx)}px`,
  } as CSSProperties;
  const railStyle = {
    ['--topbar-create-rail-width' as string]: `${Math.max(0, createButtonRailDesktopPx)}px`,
  } as CSSProperties;

  const topBarPaddingClass = useCreateButtonRail
    ? 'px-4 md:px-8 lg:pl-4 lg:pr-12'
    : 'px-4 md:px-8 lg:px-12';

  return (
    <div className={`sticky top-0 z-20 bg-white dark:bg-black border-b border-[#E5E7EB] dark:border-[#262626] h-[68px] min-h-[68px] flex-shrink-0 flex items-center justify-between gap-4 ${topBarPaddingClass}`}>
      <div className="min-w-0 flex flex-1 items-center gap-4">
        {useCreateButtonRail && (
          <div
            className="hidden lg:flex shrink-0 transition-[width] duration-300 ease-out"
            style={{ ...railStyle, width: 'var(--topbar-create-rail-width)' }}
          >
            <div className={createButtonCollapsed ? '-ml-[3px] w-[calc(100%-26px)]' : 'w-[calc(100%-32px)]'}>
              <TopBarCreateButton collapsed={createButtonCollapsed} fullWidth />
            </div>
          </div>
        )}
        <div
          className="min-w-0 transition-[margin] duration-300 ease-out lg:ml-[var(--topbar-breadcrumb-offset)]"
          style={breadcrumbStyle}
        >
          <BreadcrumbBar breadcrumbs={breadcrumbs} onBreadcrumbClick={onBreadcrumbClick} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        {!useCreateButtonRail && <TopBarCreateButton />}
        {useCreateButtonRail && <TopBarCreateButton className="lg:hidden" />}
        <TopBarProfile />
      </div>
    </div>
  );
}
