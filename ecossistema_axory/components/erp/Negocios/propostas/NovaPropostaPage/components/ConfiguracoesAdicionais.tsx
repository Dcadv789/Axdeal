import { Info, Settings2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ConfiguracoesAdicionaisProps {
  isViewMode: boolean;
  propostaId?: string | null;
  idEmpresa: string | null;
  configuracaoBlocosInicial?: { [key: string]: boolean } | null;
  onConfiguracaoBlocosChange?: (configuracao: { [key: string]: boolean }) => void;
}

type BlocosTemplate = Record<string, any>;

function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
}

function formatarPadrao(valor: string): string {
  return valor
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((palavra) => palavra.charAt(0).toUpperCase() + palavra.slice(1))
    .join(' ');
}

const nomesEspeciais: Record<string, string> = {
  apresentacao: 'Apresenta\u00e7\u00e3o',
  'aceite proposta': 'Aceite Proposta',
  'aceite da proposta': 'Aceite Proposta',
  'condicoes gerais': 'Condi\u00e7\u00f5es Comerciais',
  'condicoes comerciais': 'Condi\u00e7\u00f5es Comerciais',
  observacoes: 'Observa\u00e7\u00f5es',
  'condicoes pagamento': 'Condi\u00e7\u00f5es de Pagamento',
  'condicoes de pagamento': 'Condi\u00e7\u00f5es de Pagamento',
  'cronograma execucao': 'Cronograma de Execu\u00e7\u00e3o',
  'cronograma de execucao': 'Cronograma de Execu\u00e7\u00e3o',
  'proximos passos': 'Pr\u00f3ximos Passos',
};

const descricoesEspeciais: Record<string, string> = {
  apresentacao: 'Texto de abertura da proposta, usado para contextualizar a oferta para o cliente.',
  'aceite proposta': '\u00c1rea para formalizar o aceite comercial da proposta.',
  'aceite da proposta': '\u00c1rea para formalizar o aceite comercial da proposta.',
  'condicoes gerais': 'Resumo das regras comerciais, escopo e observa\u00e7\u00f5es gerais da proposta.',
  observacoes: 'Espa\u00e7o para registrar observa\u00e7\u00f5es importantes que devem aparecer no documento.',
  'condicoes comerciais': 'Detalha prazos, pagamentos e crit\u00e9rios comerciais aplicados \u00e0 proposta.',
  'condicoes de pagamento': 'Detalha prazos, pagamentos e crit\u00e9rios comerciais aplicados \u00e0 proposta.',
  'cronograma de execucao': 'Mostra as etapas e o prazo previsto para execu\u00e7\u00e3o do trabalho.',
  'proximos passos': 'Indica as pr\u00f3ximas a\u00e7\u00f5es ap\u00f3s o envio ou aprova\u00e7\u00e3o da proposta.',
};

function TooltipInfo({ nomeBloco, descricao }: { nomeBloco: string; descricao: string }) {
  return (
    <div className="group relative inline-flex shrink-0">
      <button
        type="button"
        aria-label={`Ver informa\u00e7\u00f5es sobre ${nomeBloco}`}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:text-slate-500 dark:hover:bg-neutral-800 dark:hover:text-slate-300"
      >
        <Info size={13} />
      </button>

      <div className="pointer-events-none invisible absolute left-1/2 top-full z-30 mt-2 w-80 -translate-x-1/2 translate-y-1 opacity-0 transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
        <div className="relative rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
          <div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-slate-200 bg-white dark:border-neutral-700 dark:bg-neutral-900" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700 dark:text-blue-300">
            O que este componente faz
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{descricao}</p>
        </div>
      </div>
    </div>
  );
}

function CardComponente({
  keyBloco,
  indice,
  nomeBloco,
  ativo,
  isViewMode,
  onToggle,
  descricao,
}: {
  keyBloco: string;
  indice: number;
  nomeBloco: string;
  ativo: boolean;
  isViewMode: boolean;
  onToggle: (key: string) => void;
  descricao: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-900/70">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex flex-1 items-center gap-2">
          <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 px-2 text-[11px] font-bold text-white dark:bg-slate-100 dark:text-slate-900">
            {indice}
          </span>
          <span className="inline-flex min-w-0 max-w-[240px] items-center overflow-hidden rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            <span className="block truncate">{nomeBloco}</span>
          </span>
          <TooltipInfo nomeBloco={nomeBloco} descricao={descricao} />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              ativo
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                : 'bg-slate-200 text-slate-700 dark:bg-neutral-800 dark:text-slate-300'
            }`}
          >
            {ativo ? 'Ativo' : 'Inativo'}
          </span>
          <button
            type="button"
            onClick={() => onToggle(keyBloco)}
            disabled={isViewMode}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              ativo ? 'bg-blue-600 dark:bg-blue-500' : 'bg-slate-300 dark:bg-neutral-700'
            } ${isViewMode ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                ativo ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConfiguracoesAdicionais({
  isViewMode,
  idEmpresa,
  configuracaoBlocosInicial,
  onConfiguracaoBlocosChange,
}: ConfiguracoesAdicionaisProps) {
  const [blocosTemplate, setBlocosTemplate] = useState<BlocosTemplate | null>(null);
  const [configuracaoBlocos, setConfiguracaoBlocos] = useState<Record<string, boolean>>({});
  const [carregando, setCarregando] = useState(true);
  const [templatePronto, setTemplatePronto] = useState(false);

  useEffect(() => {
    const fetchBlocosTemplate = async () => {
      if (!idEmpresa) {
        setBlocosTemplate({});
        setCarregando(false);
        return;
      }

      try {
        setTemplatePronto(false);
        const { data, error } = await supabase
          .from('erp_configuracoes_proposta')
          .select('blocos')
          .eq('id_empresa', idEmpresa)
          .maybeSingle();

        if (error) throw error;

        if (data?.blocos) {
          if (typeof data.blocos === 'object' && !Array.isArray(data.blocos)) {
            setBlocosTemplate(data.blocos as BlocosTemplate);
          } else if (Array.isArray(data.blocos)) {
            const obj: BlocosTemplate = {};
            data.blocos.forEach((bloco: any, index: number) => {
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
        setTemplatePronto(true);
      }
    };

    void fetchBlocosTemplate();
  }, [idEmpresa]);

  useEffect(() => {
    if (configuracaoBlocosInicial && Object.keys(configuracaoBlocosInicial).length > 0) {
      setConfiguracaoBlocos(configuracaoBlocosInicial);
      return;
    }

    if (!blocosTemplate) return;

    const configPadrao: Record<string, boolean> = {};
    Object.keys(blocosTemplate).forEach((key) => {
      const bloco = blocosTemplate[key];

      if (typeof bloco === 'object' && bloco !== null && !Array.isArray(bloco)) {
        if (bloco.ativo !== undefined) {
          configPadrao[key] = bloco.ativo === true;
        } else if (bloco.default !== undefined) {
          configPadrao[key] = bloco.default === true;
        } else {
          configPadrao[key] = false;
        }
      } else if (typeof bloco === 'boolean') {
        configPadrao[key] = bloco;
      } else {
        configPadrao[key] = false;
      }
    });

    setConfiguracaoBlocos(configPadrao);
  }, [configuracaoBlocosInicial, blocosTemplate]);

  const toggleBloco = useCallback(
    (blocoKey: string) => {
      if (isViewMode) return;

      setConfiguracaoBlocos((prev) => {
        const novo = {
          ...prev,
          [blocoKey]: !prev[blocoKey],
        };

        onConfiguracaoBlocosChange?.(novo);
        return novo;
      });
    },
    [isViewMode, onConfiguracaoBlocosChange]
  );

  const formatarNomeBloco = useCallback(
    (key: string): string => {
      const resolver = (valor: string) => {
        const chaveNormalizada = normalizarTexto(valor);

        if (chaveNormalizada.includes('condicoes gerais') || chaveNormalizada.includes('condicoes comerciais')) {
          return 'Condi\u00e7\u00f5es Comerciais';
        }

        if (chaveNormalizada.includes('condicoes pagamento') || chaveNormalizada.includes('condicoes de pagamento')) {
          return 'Condi\u00e7\u00f5es de Pagamento';
        }

        if (chaveNormalizada.includes('cronograma execucao') || chaveNormalizada.includes('cronograma de execucao')) {
          return 'Cronograma de Execu\u00e7\u00e3o';
        }

        return nomesEspeciais[chaveNormalizada] ?? formatarPadrao(valor);
      };

      const bloco = blocosTemplate?.[key];
      if (typeof bloco === 'object' && bloco !== null && !Array.isArray(bloco)) {
        const nomeBloco = (bloco.nome || bloco.name || bloco.label || key).toString().trim();
        return resolver(nomeBloco);
      }

      return resolver(key);
    },
    [blocosTemplate]
  );

  const getDescricaoBloco = useCallback(
    (key: string): string => {
      const chave = normalizarTexto(key);
      if (descricoesEspeciais[chave]) return descricoesEspeciais[chave];

      const bloco = blocosTemplate?.[key];
      if (typeof bloco === 'object' && bloco !== null && !Array.isArray(bloco)) {
        return bloco.descricao || bloco.description || 'Bloco exibido na proposta final.';
      }

      return 'Bloco exibido na proposta final.';
    },
    [blocosTemplate]
  );

  const blocosKeys = useMemo(() => (blocosTemplate ? Object.keys(blocosTemplate) : []), [blocosTemplate]);
  const totalAtivos = useMemo(
    () => blocosKeys.filter((key) => configuracaoBlocos[key]).length,
    [blocosKeys, configuracaoBlocos]
  );
  const blocosEmColunas = useMemo(() => {
    const metade = Math.ceil(blocosKeys.length / 2);
    return [blocosKeys.slice(0, metade), blocosKeys.slice(metade)];
  }, [blocosKeys]);

  if (carregando || !templatePronto) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-black">
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-black">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-10 w-10 min-w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            <Settings2 size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Componentes da Proposta</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Defina a ordem e a visibilidade dos blocos que aparecem no documento final.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 dark:border-blue-500/20 dark:bg-blue-900/10 lg:text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Resumo</p>
          <p className="mt-1 text-sm text-blue-900 dark:text-blue-100">
            {totalAtivos} de {blocosKeys.length} componentes ativos.
          </p>
        </div>
      </div>

      {blocosKeys.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-neutral-700">
          <p className="text-sm text-slate-600 dark:text-slate-300">Nenhum componente configurado.</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Cadastre os componentes em Configura\u00e7\u00f5es de Proposta.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2">
          {blocosEmColunas.map((coluna, colunaIndex) => (
            <div key={`coluna-${colunaIndex}`} className="space-y-3 self-start">
              {coluna.map((key) => (
                <CardComponente
                  key={key}
                  keyBloco={key}
                  indice={blocosKeys.indexOf(key) + 1}
                  nomeBloco={formatarNomeBloco(key)}
                  ativo={Boolean(configuracaoBlocos[key])}
                  isViewMode={isViewMode}
                  onToggle={toggleBloco}
                  descricao={getDescricaoBloco(key)}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
