'use client';

import { Card } from '@axdeal/ui';
import type { LucideIcon } from 'lucide-react';

export interface ConfigTabItem {
  id: string;
  label: string;
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-neutral-800 dark:hover:text-slate-100'
      }`}
    >
      <span>{label}</span>
    </button>
  );
}

interface ConfigSectionLayoutProps {
  icon: LucideIcon;
  title: string;
  description: string;
  tabs: ConfigTabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: React.ReactNode;
  /** Quando true, omite o Card branco e exibe o conteudo direto no fundo da pagina */
  wrapInCard?: boolean;
  /** Quando false, oculta o cabecalho interno (icone, titulo e descricao). */
  showHeader?: boolean;
}

export default function ConfigSectionLayout({
  icon: Icon,
  title,
  description,
  tabs,
  activeTab,
  onTabChange,
  children,
  wrapInCard = true,
  showHeader = true,
}: ConfigSectionLayoutProps) {
  return (
    <div className="space-y-3">
      {showHeader && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95">
          <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                <Icon className="h-8 w-8" />
              </div>
              <div className="min-w-0 space-y-2">
                <h2 className="truncate text-2xl font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-gray-100 px-2 py-2 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              active={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
              label={tab.label}
            />
          ))}
        </div>
      </div>

      {wrapInCard ? <Card>{children}</Card> : <div>{children}</div>}
    </div>
  );
}
