import { Receipt } from 'lucide-react';
import type { PropostaImpostos } from '../types';
import { formatarMoeda } from '../utils/formatters';

interface ImpostosPropostaProps {
  impostos: PropostaImpostos;
  setImpostos: (impostos: PropostaImpostos) => void;
  valorBase: number;
  isViewMode: boolean;
  isVenda?: boolean;
  tipoDocumento?: 'proposta' | 'venda' | 'os';
}

const CAMPOS_IMPOSTOS: Array<{
  key: keyof PropostaImpostos;
  label: string;
  hint: string;
}> = [
  {
    key: 'percentualIss',
    label: 'ISS',
    hint: 'Serviços, geralmente 2% a 5%',
  },
  {
    key: 'percentualIcms',
    label: 'ICMS',
    hint: 'Produtos, varia por estado e NCM',
  },
  {
    key: 'percentualPis',
    label: 'PIS',
    hint: 'Geralmente 0,65% ou 1,65%',
  },
  {
    key: 'percentualCofins',
    label: 'COFINS',
    hint: 'Geralmente 3% ou 7,6%',
  },
  {
    key: 'percentualIrpjCsllRetido',
    label: 'IRPJ/CSLL retido',
    hint: 'Serviços acima de R$ 215 por nota',
  },
];

const parsePercentual = (valor: string): number => {
  const numero = parseFloat(valor.replace(',', '.'));
  return Number.isFinite(numero) ? numero : 0;
};

const calcularValorBrutoImposto = (valorBase: number, percentual: string): number => {
  const pct = parsePercentual(percentual);
  if (!Number.isFinite(pct) || pct <= 0) return 0;
  return Number(((valorBase * pct) / 100).toFixed(2));
};

export default function ImpostosProposta({
  impostos,
  setImpostos,
  valorBase,
  isViewMode,
  isVenda,
  tipoDocumento = 'proposta',
}: ImpostosPropostaProps) {
  const camposVisiveis = CAMPOS_IMPOSTOS.filter((campo) => {
    if (tipoDocumento === 'venda' && campo.key === 'percentualIss') return false;
    return true;
  });

  const percentualIss = tipoDocumento === 'venda' ? 0 : parsePercentual(impostos.percentualIss);
  const percentualIcms = parsePercentual(impostos.percentualIcms);
  const percentualPis = parsePercentual(impostos.percentualPis);
  const percentualCofins = parsePercentual(impostos.percentualCofins);
  const percentualIrpjCsllRetido = parsePercentual(impostos.percentualIrpjCsllRetido);

  const percentualSoma = percentualIss + percentualIcms + percentualPis + percentualCofins;
  const percentualRetencao = percentualIrpjCsllRetido;
  const percentualEfetivo = percentualSoma - percentualRetencao;

  const valorImpostosSomados = (valorBase * percentualSoma) / 100;
  const valorImpostosRetidos = (valorBase * percentualRetencao) / 100;
  const valorTotalImpostos = valorImpostosSomados - valorImpostosRetidos;
  const valorLiquido = valorBase + valorTotalImpostos;

  const atualizarImposto = (campo: keyof PropostaImpostos, valor: string) => {
    setImpostos({
      ...impostos,
      [campo]: valor,
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-black">
      <div className="mb-6 flex items-start gap-3">
        <div className="inline-flex h-10 w-10 min-w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
          <Receipt size={18} />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Impostos</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {tipoDocumento === 'os'
              ? 'Informe os percentuais para estimar a carga tributária desta ordem de serviço.'
              : isVenda
                ? 'Informe os percentuais para estimar a carga tributária desta venda.'
                : 'Informe os percentuais para estimar a carga tributária desta proposta.'}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
        >
          {camposVisiveis.map((campo) => (
            <div key={campo.key}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {campo.label}
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={impostos[campo.key]}
                  onChange={(e) => {
                    const valor = e.target.value.replace(/\D/g, '');
                    const valorNum = parseInt(valor || '0', 10) / 100;
                    const formatado = valor
                      ? valorNum.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : '';
                    atualizarImposto(campo.key, formatado);
                  }}
                  disabled={isViewMode}
                  placeholder="0,00"
                  className="w-full px-4 pr-9 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
                />
                {(impostos[campo.key] || '').trim() !== '' && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                    %
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{campo.hint}</p>
              <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-neutral-700 dark:bg-neutral-800/60">
                <span className="font-medium text-slate-600 dark:text-slate-300">Valor bruto: </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatarMoeda(calcularValorBrutoImposto(valorBase, impostos[campo.key]))}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Valor total de impostos
            </label>
            <input
              type="text"
              value={formatarMoeda(valorTotalImpostos)}
              readOnly
              className="w-full px-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 cursor-default"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Soma: {formatarMoeda(valorImpostosSomados)} | Retenção IRPJ/CSLL: {formatarMoeda(valorImpostosRetidos)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Valor líquido
            </label>
            <input
              type="text"
              value={formatarMoeda(valorLiquido)}
              readOnly
              className="w-full px-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 cursor-default"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Percentual efetivo: {percentualEfetivo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
