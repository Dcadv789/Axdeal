'use client';

import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

export function formatDate(value?: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(parsed);
}

export function PlaceholderPanel({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 px-6 py-12 text-center dark:border-neutral-700 dark:bg-neutral-900/40">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{eyebrow}</p>
      <h3 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}

export function TabBar<T extends string>({
  activeTab,
  onChange,
  tabs,
}: {
  activeTab: T;
  onChange: (tab: T) => void;
  tabs: Array<{ id: T; label: string }>;
}) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-3 dark:border-[#262626] dark:bg-neutral-950">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-neutral-900 dark:text-slate-300 dark:hover:bg-neutral-800'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function KpiCard({
  label,
  value,
  helper,
  loading,
  icon: Icon,
  comparison,
}: {
  label: string;
  value: string;
  helper: string;
  loading: boolean;
  icon: LucideIcon;
  comparison?: {
    text: string;
    direction: 'up' | 'down';
  };
}) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm dark:border-[#262626] dark:bg-neutral-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
          {loading ? (
            <div className="mt-3 h-8 w-36 animate-pulse rounded-lg bg-slate-200 dark:bg-neutral-800" />
          ) : (
            <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
          )}
        </div>
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
          <Icon size={20} />
        </span>
      </div>
      {comparison ? (
        <div className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${comparison.direction === 'up' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'}`}>
          {comparison.direction === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span>{comparison.text}</span>
        </div>
      ) : null}
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{helper}</p>
    </div>
  );
}
