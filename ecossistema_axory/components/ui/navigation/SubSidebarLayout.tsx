'use client';

import type { LucideIcon } from 'lucide-react';
import { PanelLeftClose } from 'lucide-react';

export interface SubSidebarNavItem<T extends string = string> {
  id: T;
  label: string;
  description?: string;
  icon: LucideIcon;
}

interface SubSidebarLayoutProps<T extends string = string> {
  isMobile: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  items: SubSidebarNavItem<T>[];
  activeId: T;
  onSelect: (id: T) => void;
  sidebarTitle: string;
  children: React.ReactNode;
  collapsedWidthPx?: number;
  expandedWidthPx?: number;
  showContentHeader?: boolean;
  headerRight?: React.ReactNode;
  layoutBackgroundClassName?: string;
  contentHeaderClassName?: string;
  sidebarBackgroundClassName?: string;
  showItemDividers?: boolean;
  scrollContentWithHeader?: boolean;
}

export default function SubSidebarLayout<T extends string = string>({
  isMobile,
  isCollapsed,
  onToggleCollapse,
  items,
  activeId,
  onSelect,
  sidebarTitle,
  children,
  collapsedWidthPx = 80,
  expandedWidthPx = 284,
  showContentHeader = true,
  headerRight,
  layoutBackgroundClassName = 'bg-white dark:bg-black',
  contentHeaderClassName = 'border border-slate-200 bg-gray-100 dark:border-neutral-800 dark:bg-neutral-900',
  sidebarBackgroundClassName = 'border-r border-[#E5E7EB] bg-gray-100 dark:border-[#262626] dark:bg-neutral-900/70',
  showItemDividers = true,
  scrollContentWithHeader = false,
}: SubSidebarLayoutProps<T>) {
  const activeItem = items.find((item) => item.id === activeId) || items[0];
  const ActiveIcon = activeItem?.icon;

  return (
    <div className={`w-full h-[calc(100vh-68px)] min-h-[calc(100vh-68px)] overflow-hidden ${layoutBackgroundClassName}`}>
      <div
        className="grid w-full h-full min-h-0 grid-cols-1 transition-[grid-template-columns] duration-300 ease-out"
        style={{
          gridTemplateColumns: isMobile
            ? '1fr'
            : isCollapsed
              ? `${collapsedWidthPx}px minmax(0,1fr)`
              : `${expandedWidthPx}px minmax(0,1fr)`,
        }}
      >
        {!isMobile && (
          <aside className={`h-full ${sidebarBackgroundClassName}`}>
            <div className="sticky top-0 px-3 py-4">
              <div className={`mb-4 flex ${isCollapsed ? 'items-center justify-center' : 'items-end justify-between'}`}>
                {!isCollapsed && (
                  <h2 className="truncate pr-2 text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                    {sidebarTitle}
                  </h2>
                )}
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors duration-200 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-300 dark:hover:bg-neutral-800"
                  title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
                  aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
                >
                  <PanelLeftClose size={20} className={isCollapsed ? 'rotate-180' : ''} />
                </button>
              </div>

              <nav className="mt-0 space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={showItemDividers ? 'border-b border-b-slate-100 last:border-b-0 dark:border-b-neutral-800' : ''}
                    >
                      <button
                        type="button"
                        onClick={() => onSelect(item.id)}
                        title={isCollapsed ? item.label : undefined}
                        className={`relative w-full overflow-hidden rounded-lg px-3 py-2.5 text-left font-medium transition-colors duration-200 ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-700 hover:bg-gray-200 dark:text-slate-300 dark:hover:bg-white/10'
                        }`}
                      >
                        <div className="relative flex h-6 items-center justify-start">
                          <Icon
                            size={22}
                            className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}
                          />
                          <span
                            className={`pointer-events-none absolute left-8 top-1/2 block -translate-y-1/2 overflow-hidden whitespace-nowrap text-xs transition-[max-width,opacity] duration-200 ease-out ${
                              isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[150px] opacity-100'
                            }`}
                          >
                            {item.label}
                          </span>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </nav>
            </div>
          </aside>
        )}

        <section
          className={`flex min-w-0 min-h-0 flex-col px-[30px] pt-4 pb-6 ${
            scrollContentWithHeader ? 'overflow-y-auto' : 'overflow-hidden'
          }`}
        >
          {isMobile && (
            <div className="mb-4 grid grid-cols-2 gap-2">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = activeId === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect(item.id)}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                      isActive
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500/70 dark:bg-blue-950/40 dark:text-blue-300'
                        : 'border-slate-200 bg-white text-slate-600 dark:border-neutral-800 dark:bg-neutral-950 dark:text-slate-300'
                    }`}
                  >
                    <Icon size={14} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}

          {showContentHeader && activeItem && ActiveIcon && (
            <div className={`mb-4 rounded-2xl px-4 py-4 ${contentHeaderClassName}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    <ActiveIcon size={18} />
                  </span>
                  <div className="min-w-0">
                    <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">{activeItem.label}</h1>
                    {activeItem.description ? (
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{activeItem.description}</p>
                    ) : null}
                  </div>
                </div>
                {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
              </div>
            </div>
          )}

          <div className={scrollContentWithHeader ? 'min-h-0 pb-4' : 'min-h-0 flex-1 overflow-hidden pb-4'}>
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
