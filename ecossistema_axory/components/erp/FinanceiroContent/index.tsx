import { useState, useEffect } from 'react';
import { DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useParcelas } from './hooks/useParcelas';
import { useNotificacoes } from './hooks/useNotificacoes';
import PainelTab from './components/PainelTab';
import PerformanceTab from './components/PerformanceTab';
import ContasReceberTab from './components/ContasReceberTab';
import type { MainTab } from './types';

interface FinanceiroContentProps {
  activeTab?: MainTab;
  onTabChange?: (tab: MainTab) => void;
}

export default function FinanceiroContent({ activeTab = 'painel', onTabChange }: FinanceiroContentProps) {
  const { idEmpresa } = useAuth();
  const [mainTabAtiva, setMainTabAtiva] = useState<MainTab>(activeTab);

  // Sincronizar tab ativa com prop externa
  useEffect(() => {
    setMainTabAtiva(activeTab);
  }, [activeTab]);

  const handleTabChange = (tab: MainTab) => {
    setMainTabAtiva(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // Hooks de dados
  const { parcelas, carregando: carregandoParcelas, buscarParcelas } = useParcelas(
    idEmpresa,
    mainTabAtiva === 'painel' || mainTabAtiva === 'contas_receber'
  );

  const { acoesReais, buscarNotificacoesPendentes } = useNotificacoes(
    idEmpresa,
    mainTabAtiva === 'painel'
  );

  // Recarregar dados quando mudar de tab
  useEffect(() => {
    if (mainTabAtiva === 'painel' || mainTabAtiva === 'contas_receber') {
      buscarParcelas();
    }
    if (mainTabAtiva === 'painel') {
      buscarNotificacoesPendentes();
    }
  }, [mainTabAtiva, idEmpresa]);

  return (
    <div className="py-6 space-y-6">
      {/* Título da página - direto no conteúdo, sem container */}
      <div className="flex items-center gap-2">
        <DollarSign size={28} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Financeiro</h1>
      </div>

      {/* Tabs - linha cinza em toda largura, azul só na aba ativa */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6 -mb-px">
          <button
            onClick={() => handleTabChange('painel')}
            className={`relative pb-3 text-sm font-medium transition-colors ${
              mainTabAtiva === 'painel'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Painel
            {mainTabAtiva === 'painel' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
          <button
            onClick={() => handleTabChange('performance')}
            className={`relative pb-3 text-sm font-medium transition-colors ${
              mainTabAtiva === 'performance'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Performance
            {mainTabAtiva === 'performance' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
          <button
            onClick={() => handleTabChange('contas_receber')}
            className={`relative pb-3 text-sm font-medium transition-colors ${
              mainTabAtiva === 'contas_receber'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Contas a Receber
            {mainTabAtiva === 'contas_receber' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
        </nav>
      </div>

      {/* Conteúdo das Tabs */}
      {mainTabAtiva === 'painel' && (
        <PainelTab
          parcelas={parcelas}
          acoesReais={acoesReais}
          buscarNotificacoesPendentes={buscarNotificacoesPendentes}
        />
      )}

      {mainTabAtiva === 'performance' && <PerformanceTab />}

      {mainTabAtiva === 'contas_receber' && (
        <ContasReceberTab parcelas={parcelas} carregando={carregandoParcelas} />
      )}
    </div>
  );
}

