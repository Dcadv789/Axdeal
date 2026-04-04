'use client';

import { useState } from 'react';
import { Building2 } from 'lucide-react';
import ConfigSectionLayout from './ConfigSectionLayout';
import ErpCategoriasDreContent from './ErpCategoriasDreContent';

export type EstruturaTab = 'categorias-dre';

const ESTRUTURA_TABS = [
  { id: 'categorias-dre' as const, label: 'Categorias e DRE' },
];

export default function EstruturaContent() {
  const [activeTab, setActiveTab] = useState<EstruturaTab>('categorias-dre');

  return (
    <ConfigSectionLayout
      icon={Building2}
      title="Estrutura"
      description="Categorias hierárquicas e grupos para análise financeira (DRE)."
      tabs={ESTRUTURA_TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      showHeader={false}
    >
      {activeTab === 'categorias-dre' && <ErpCategoriasDreContent />}
    </ConfigSectionLayout>
  );
}
