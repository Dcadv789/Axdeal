import { Settings2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Card } from '@axdeal/ui';
import EmpresaTab from './ConfiguracoesContent/EmpresaTab';
import UsuariosTab from './ConfiguracoesContent/UsuariosTab';
import MeuPerfilTab from './ConfiguracoesContent/MeuPerfilTab';
import ServicosProdutosTab from './ConfiguracoesContent/ServicosProdutosTab';
import ParametrosVendasTab from './ConfiguracoesContent/ParametrosVendasTab/index';
import ReguaCobrancaTab from './ConfiguracoesContent/ReguaCobrancaTab';
import ConfiguracoesPropostaTab from './ConfiguracoesContent/ConfiguracoesPropostaTab';
import CondicoesPagamentoContent from './CondicoesPagamentoContent';
import { ConfigTab } from '@/types';
import { useIsMobile } from '@/hooks/useIsMobile';

const TABS: { id: ConfigTab; label: string }[] = [
  { id: 'empresa', label: 'Empresa' },
  { id: 'usuarios', label: 'Usuários' },
  { id: 'perfil', label: 'Meu Perfil' },
  { id: 'servicos', label: 'Serviços e Produtos' },
  { id: 'parametros', label: 'Parâmetros de Vendas' },
  { id: 'regua_cobranca', label: 'Régua de Cobrança' },
  { id: 'configuracoes_proposta', label: 'Configurações de Proposta' },
];

interface ConfiguracoesContentProps {
  activeTab: ConfigTab;
  onTabChange: (tab: ConfigTab) => void;
}

export default function ConfiguracoesContent({ activeTab, onTabChange }: ConfiguracoesContentProps) {
  const isMobile = useIsMobile();
  const [showCondicoesPagamento, setShowCondicoesPagamento] = useState(false);

  useEffect(() => {
    setShowCondicoesPagamento(false);
  }, [activeTab]);

  return (
    <div className="py-6 space-y-6">
      {/* Título da página - direto no conteúdo, sem container */}
      <div className="flex items-center gap-2">
        <Settings2 size={28} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configurações</h1>
      </div>

      {/* Tabs - linha cinza em toda largura, azul só na aba ativa */}
      {!isMobile && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-6 -mb-px overflow-x-auto">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`relative pb-3 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      <Card>
        {activeTab === 'empresa' && <EmpresaTab />}
        {activeTab === 'usuarios' && <UsuariosTab />}
        {activeTab === 'perfil' && <MeuPerfilTab />}
        {activeTab === 'servicos' && <ServicosProdutosTab />}
        {activeTab === 'parametros' && !showCondicoesPagamento && (
          <ParametrosVendasTab onNavigateToCondicoes={() => setShowCondicoesPagamento(true)} />
        )}
        {activeTab === 'parametros' && showCondicoesPagamento && (
          <CondicoesPagamentoContent onBack={() => setShowCondicoesPagamento(false)} />
        )}
        {activeTab === 'regua_cobranca' && <ReguaCobrancaTab />}
        {activeTab === 'configuracoes_proposta' && <ConfiguracoesPropostaTab />}
      </Card>
    </div>
  );
}
