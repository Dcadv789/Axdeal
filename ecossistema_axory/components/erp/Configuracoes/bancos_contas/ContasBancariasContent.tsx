'use client';

import { useState } from 'react';
import { Banknote } from 'lucide-react';
import ConfigSectionLayout from '../shared/ConfigSectionLayout';
import ErpContasBancariasContent from './ErpContasBancariasContent';

export type ContasBancariasTab = 'contas';

const CONTAS_TABS = [
  { id: 'contas' as const, label: 'Contas bancárias' },
];

export default function ContasBancariasContent() {
  const [activeTab, setActiveTab] = useState<ContasBancariasTab>('contas');

  return (
    <ConfigSectionLayout
      icon={Banknote}
      title="Contas Bancárias"
      description="Gerencie as contas bancárias e caixas da empresa."
      tabs={CONTAS_TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      showHeader={false}
      wrapInCard={false}
    >
      {activeTab === 'contas' && <ErpContasBancariasContent modoEmbed />}
    </ConfigSectionLayout>
  );
}
