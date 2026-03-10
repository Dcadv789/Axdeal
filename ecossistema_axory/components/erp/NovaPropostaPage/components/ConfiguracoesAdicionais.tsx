import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface ConfiguracoesAdicionaisProps {
  isViewMode: boolean;
  propostaId?: string | null;
  idEmpresa: string | null;
  configuracaoBlocosInicial?: { [key: string]: boolean } | null;
  onConfiguracaoBlocosChange?: (configuracao: { [key: string]: boolean }) => void;
}

export default function ConfiguracoesAdicionais({
  isViewMode,
  propostaId,
  idEmpresa,
  configuracaoBlocosInicial,
  onConfiguracaoBlocosChange
}: ConfiguracoesAdicionaisProps) {
  const { user } = useAuth();
  const [blocosTemplate, setBlocosTemplate] = useState<{ [key: string]: any } | null>(null);
  const [configuracaoBlocos, setConfiguracaoBlocos] = useState<{ [key: string]: boolean }>({});
  const [carregando, setCarregando] = useState(true);

  // Buscar template de blocos da proposal_settings (apenas leitura)
  useEffect(() => {
    const fetchBlocosTemplate = async () => {
      if (!idEmpresa) return;

      try {
        const { data, error } = await supabase
          .from('erp_configuracoes_proposta')
          .select('blocos')
          .eq('id_empresa', idEmpresa)
          .maybeSingle();

        if (error) throw error;

        if (data && data.blocos) {
          // Se blocos é um objeto JSON, usar diretamente
          // Cada chave do objeto vira um toggle individual
          if (typeof data.blocos === 'object' && !Array.isArray(data.blocos)) {
            setBlocosTemplate(data.blocos);
          } else if (Array.isArray(data.blocos)) {
            // Se for array, converter para objeto onde cada item vira uma chave
            const obj: { [key: string]: any } = {};
            data.blocos.forEach((bloco: any, index: number) => {
              // Se o bloco tem id ou nome, usar como chave
              const key = bloco.id || bloco.nome || bloco.key || `bloco_${index}`;
              obj[key] = bloco;
            });
            setBlocosTemplate(obj);
          } else {
            setBlocosTemplate({});
          }
        } else {
          setBlocosTemplate({});
        }
      } catch (error) {
        console.error('Erro ao carregar template de blocos:', error);
        setBlocosTemplate({});
      } finally {
        setCarregando(false);
      }
    };

    fetchBlocosTemplate();
  }, [idEmpresa]);

  // Carregar configuração de blocos da proposta (se estiver editando/visualizando)
  useEffect(() => {
    if (configuracaoBlocosInicial && Object.keys(configuracaoBlocosInicial).length > 0) {
      // Se há configuração salva da proposta, usar ela
      setConfiguracaoBlocos(configuracaoBlocosInicial);
    } else if (blocosTemplate) {
      // Se não há configuração salva, usar valores padrão do template baseado no campo "ativo"
      const configPadrao: { [key: string]: boolean } = {};
      Object.keys(blocosTemplate).forEach((key) => {
        const bloco = blocosTemplate[key];
        
        if (typeof bloco === 'object' && bloco !== null && !Array.isArray(bloco)) {
          // Se o bloco é um objeto, verificar o campo "ativo"
          if (bloco.ativo !== undefined) {
            // Se tem campo "ativo", usar o valor (true ou false)
            configPadrao[key] = bloco.ativo === true;
          } else if (bloco.default !== undefined) {
            // Se não tem "ativo", tentar usar "default"
            configPadrao[key] = bloco.default === true;
          } else {
            // Se não tem nenhum dos dois, usar false como padrão
            configPadrao[key] = false;
          }
        } else if (typeof bloco === 'boolean') {
          // Se o valor do bloco é diretamente um boolean, usar ele
          configPadrao[key] = bloco;
        } else {
          // Qualquer outro caso, usar false como padrão
          configPadrao[key] = false;
        }
      });
      setConfiguracaoBlocos(configPadrao);
    }
  }, [configuracaoBlocosInicial, blocosTemplate]);

  // Toggle de ativar/desativar bloco
  const toggleBloco = useCallback((blocoKey: string) => {
    if (isViewMode) return;

    setConfiguracaoBlocos((prev) => {
      const novo = {
        ...prev,
        [blocoKey]: !prev[blocoKey]
      };
      
      // Notificar componente pai sobre a mudança
      if (onConfiguracaoBlocosChange) {
        onConfiguracaoBlocosChange(novo);
      }
      
      return novo;
    });
  }, [isViewMode, onConfiguracaoBlocosChange]);

  // Função para obter nome legível do bloco
  const getNomeBloco = (key: string): string => {
    if (!blocosTemplate || blocosTemplate[key] === undefined) {
      // Se não há template, converter key para nome legível
      return key
        .split('_')
        .map((palavra) => palavra.charAt(0).toUpperCase() + palavra.slice(1))
        .join(' ');
    }

    const bloco = blocosTemplate[key];
    
    // Se o valor do bloco é um objeto, tentar pegar o nome
    if (typeof bloco === 'object' && bloco !== null && !Array.isArray(bloco)) {
      return bloco.nome || bloco.name || bloco.label || key;
    }
    
    // Se o valor é boolean ou string, usar a chave convertida
    return key
      .split('_')
      .map((palavra) => palavra.charAt(0).toUpperCase() + palavra.slice(1))
      .join(' ');
  };

  if (carregando) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-[#E5E7EB] dark:border-[#262626] p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const blocosKeys = blocosTemplate ? Object.keys(blocosTemplate) : [];

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-[#E5E7EB] dark:border-[#262626] p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Componentes da Proposta
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Ative ou desative os componentes que serão exibidos na proposta
        </p>
      </div>

      <div className="space-y-4">
        {blocosKeys.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="text-sm">Nenhum componente configurado ainda.</p>
            <p className="text-xs mt-2">Configure os componentes na página de Configurações.</p>
          </div>
        ) : (
          blocosKeys.map((key) => (
            <div
              key={key}
              className="flex items-center justify-between p-4 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-gray-50 dark:bg-neutral-800"
            >
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {getNomeBloco(key)}
                </h3>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={configuracaoBlocos[key] || false}
                  onChange={() => toggleBloco(key)}
                  disabled={isViewMode}
                  className="sr-only peer"
                />
                <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                  configuracaoBlocos[key] 
                    ? 'bg-blue-600 dark:bg-blue-500' 
                    : 'bg-gray-300 dark:bg-gray-600'
                } ${isViewMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
                    configuracaoBlocos[key] ? 'translate-x-5' : 'translate-x-0'
                  }`}></div>
                </div>
              </label>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
