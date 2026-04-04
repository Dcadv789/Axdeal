'use client';

import { Workflow } from 'lucide-react';
import ParametrosVendasTab from './ConfiguracoesContent/ParametrosVendasTab';
import CamposCustomizadosTab from './ConfiguracoesContent/CamposCustomizadosTab';
import ReguaCobrancaTab from './ConfiguracoesContent/ReguaCobrancaTab';
import ConfiguracoesPropostaTab from './ConfiguracoesContent/ConfiguracoesPropostaTab';
import CondicoesPagamentoContent from './CondicoesPagamentoContent';
import ConfigSectionLayout from './ConfigSectionLayout';

export type OperacaoTab =
  | 'parametros-vendas'
  | 'vendas'
  | 'campos-customizados'
  | 'condicoes-pagamento'
  | 'regua-cobranca'
  | 'configuracoes-proposta';

const OPERACAO_TABS = [
  { id: 'parametros-vendas' as const, label: 'Parâmetros Gerais' },
  { id: 'vendas' as const, label: 'Vendas' },
  { id: 'campos-customizados' as const, label: 'Campos Customizados' },
  { id: 'condicoes-pagamento' as const, label: 'Condições de Pagamento' },
  { id: 'regua-cobranca' as const, label: 'Régua de Cobrança' },
  { id: 'configuracoes-proposta' as const, label: 'Configurações de Proposta' },
];

interface OperacaoContentProps {
  activeTab: OperacaoTab;
  onTabChange: (tab: OperacaoTab) => void;
}

export default function OperacaoContent({ activeTab, onTabChange }: OperacaoContentProps) {
  return (
    <ConfigSectionLayout
      icon={Workflow}
      title="Operação"
      description="Parâmetros gerais, vendas, campos customizados, condições de pagamento, régua de cobrança e configurações de proposta."
      tabs={OPERACAO_TABS}
      activeTab={activeTab}
      onTabChange={(id) => onTabChange(id as OperacaoTab)}
      wrapInCard={false}
      showHeader={false}
    >
      <div className={activeTab !== 'parametros-vendas' ? 'hidden' : undefined}>
        <ParametrosVendasTab aba="parametros-gerais" />
      </div>

      <div className={activeTab !== 'vendas' ? 'hidden' : undefined}>
        <ParametrosVendasTab aba="vendas" />
      </div>

      <div className={activeTab !== 'campos-customizados' ? 'hidden' : undefined}>
        <CamposCustomizadosTab />
      </div>

      <div className={activeTab !== 'condicoes-pagamento' ? 'hidden' : undefined}>
        <CondicoesPagamentoContent />
      </div>

      <div className={activeTab !== 'regua-cobranca' ? 'hidden' : undefined}>
        <ReguaCobrancaTab />
      </div>

      <div className={activeTab !== 'configuracoes-proposta' ? 'hidden' : undefined}>
        <ConfiguracoesPropostaTab />
      </div>
    </ConfigSectionLayout>
  );
}
