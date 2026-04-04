'use client';

import { useState } from 'react';
import { Plug } from 'lucide-react';
import Link from 'next/link';
import ConfigSectionLayout from '../shared/ConfigSectionLayout';

export type IntegracoesTab = 'crm';

const INTEGRACOES_TABS = [
  { id: 'crm' as const, label: 'Configurações CRM' },
];

export default function IntegracoesContent() {
  const [activeTab, setActiveTab] = useState<IntegracoesTab>('crm');

  return (
    <ConfigSectionLayout
      icon={Plug}
      title="Integrações"
      description="Conecte e configure módulos externos e automações."
      tabs={INTEGRACOES_TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      showHeader={false}
    >
      {activeTab === 'crm' && (
        <div className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 dark:border-neutral-800 dark:bg-neutral-900/70">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Configurações do CRM
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Estratégias de leads, automações e configurações do módulo CRM.
            </p>
            <Link
              href="/crm/configuracoes"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Plug className="h-4 w-4" />
              Abrir Configurações CRM
            </Link>
          </div>
        </div>
      )}
    </ConfigSectionLayout>
  );
}
