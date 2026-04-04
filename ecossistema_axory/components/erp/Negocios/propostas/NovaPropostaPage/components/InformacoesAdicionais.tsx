import { BarChart3, CircleDollarSign, Wallet } from 'lucide-react';
import { useMemo, useRef } from 'react';
import type { PropostaFormData, PropostaImpostos, PropostaItem } from '../types';
import { formatarMoeda } from '../utils/formatters';

interface InformacoesAdicionaisProps {
  formData: PropostaFormData;
  setFormData: (data: PropostaFormData) => void;
  items: PropostaItem[];
  impostos: PropostaImpostos;
  valorTotalDocumento: number;
  valorAcrescimo: string;
  valorFrete: string;
  valorDesconto: string;
  isViewMode: boolean;
  isVenda?: boolean;
  tipoDocumento?: 'proposta' | 'venda' | 'os';
}

function parseMoedaBrasileira(valor: string) {
  return Number(valor.replace(/\./g, '').replace(',', '.') || 0);
}

function parsePercentual(valor: string) {
  const numero = parseFloat((valor || '').replace(',', '.'));
  return Number.isFinite(numero) ? numero : 0;
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <div className="rounded-lg border border-blue-500/30 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-blue-400/30 dark:bg-neutral-900 dark:text-gray-100">
        {value}
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  description,
  tone = 'blue',
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  tone?: 'blue' | 'emerald' | 'amber';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
      : tone === 'amber'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
        : 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300';

  return (
    <div className="mb-6 flex items-start gap-3">
      <div className={`inline-flex h-10 w-10 min-w-10 items-center justify-center rounded-xl ${toneClass}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>
      </div>
    </div>
  );
}

export default function InformacoesAdicionais({
  formData,
  setFormData,
  items,
  impostos,
  valorTotalDocumento,
  valorAcrescimo,
  valorFrete,
  valorDesconto,
  isViewMode,
}: InformacoesAdicionaisProps) {
  const custoExtraInputRef = useRef<HTMLInputElement>(null);

  const receitaServicos = useMemo(
    () =>
      (items || [])
        .filter((item) => item.tipo === 'servico')
        .reduce((total, item) => total + Number(item.valorTotal || 0), 0),
    [items]
  );

  const receitaProdutos = useMemo(
    () =>
      (items || [])
        .filter((item) => item.tipo === 'produto')
        .reduce((total, item) => total + Number(item.valorTotal || 0), 0),
    [items]
  );

  const custoServicos = useMemo(
    () =>
      (items || [])
        .filter((item) => item.tipo === 'servico')
        .reduce((total, item) => total + Number(item.custoAquisicao || 0) * Number(item.quantidade || 0), 0),
    [items]
  );

  const custoProdutos = useMemo(
    () =>
      (items || [])
        .filter((item) => item.tipo === 'produto')
        .reduce((total, item) => total + Number(item.custoAquisicao || 0) * Number(item.quantidade || 0), 0),
    [items]
  );

  const receitaTotalItens = receitaServicos + receitaProdutos;
  const acrescimo = parseMoedaBrasileira(valorAcrescimo || '');
  const frete = parseMoedaBrasileira(valorFrete || '');
  const desconto = parseMoedaBrasileira(valorDesconto || '');
  const acrescimoFreteOutros = acrescimo + frete;
  const custoExtra = parseMoedaBrasileira(formData.custoExtraOS || '');
  const custoItens = custoServicos + custoProdutos;
  const custoTotal = custoItens + custoExtra;

  const percentualIss = parsePercentual(impostos.percentualIss);
  const percentualIcms = parsePercentual(impostos.percentualIcms);
  const percentualPis = parsePercentual(impostos.percentualPis);
  const percentualCofins = parsePercentual(impostos.percentualCofins);
  const percentualIr = parsePercentual(impostos.percentualIrpjCsllRetido);

  const valorIss = (valorTotalDocumento * percentualIss) / 100;
  const valorIcms = (valorTotalDocumento * percentualIcms) / 100;
  const valorPis = (valorTotalDocumento * percentualPis) / 100;
  const valorCofins = (valorTotalDocumento * percentualCofins) / 100;
  const valorIr = (valorTotalDocumento * percentualIr) / 100;
  const valorImpostosTotal = valorIss + valorIcms + valorPis + valorCofins - valorIr;
  const lucroBrutoPrevisto = valorTotalDocumento - custoTotal;
  const lucroAposImpostosPrevisto = lucroBrutoPrevisto - valorImpostosTotal;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-black">
          <SectionHeader
            icon={<CircleDollarSign size={18} />}
            title="Receita"
            description="Composição comercial e total previsto do documento."
            tone="emerald"
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <InfoField label="Receita com Serviços" value={formatarMoeda(receitaServicos)} />
            <InfoField label="Receita com Produtos" value={formatarMoeda(receitaProdutos)} />
            <InfoField label="Receita total dos Itens" value={formatarMoeda(receitaTotalItens)} />
            <InfoField label="Acréscimo / Frete / Outros" value={formatarMoeda(acrescimoFreteOutros)} />
            <InfoField label="Desconto" value={formatarMoeda(desconto)} />
            <div className="min-w-0">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Receita Total Geral</label>
              <div className="rounded-lg border border-emerald-300/70 px-3 py-2.5 text-sm font-semibold text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300">
                {formatarMoeda(valorTotalDocumento)}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-black">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="inline-flex h-10 w-10 min-w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                <Wallet size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Custos</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Custos previstos com base nos itens e no ajuste manual.
                </p>
              </div>
            </div>
            <button
              type="button"
              title="Use este campo para registrar custos extras previstos para fins de relatórios."
              onClick={() => {
                custoExtraInputRef.current?.focus();
                custoExtraInputRef.current?.select();
              }}
              className="inline-flex items-center rounded-lg border border-blue-500/30 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
            >
              + Adicionar custo extra
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <InfoField label="Custo dos Serviços" value={formatarMoeda(custoServicos)} />
            <InfoField label="Custo dos Produtos" value={formatarMoeda(custoProdutos)} />
            <InfoField label="Custo total dos Itens" value={formatarMoeda(custoItens)} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Custo Extra</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-amber-600 dark:text-amber-300">
                  R$
                </span>
                <input
                  ref={custoExtraInputRef}
                  type="text"
                  value={formData.custoExtraOS}
                  disabled={isViewMode}
                  onChange={(event) => {
                    const valor = event.target.value.replace(/\D/g, '');
                    const valorNum = parseInt(valor || '0', 10) / 100;
                    setFormData({
                      ...formData,
                      custoExtraOS: valor
                        ? valorNum.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : '',
                    });
                  }}
                  placeholder="0,00 digite aqui eventual custo extra com a OS"
                  className="w-full rounded-lg border !border-amber-600 bg-white py-2.5 pl-10 pr-3 text-sm font-medium text-amber-600 focus:!border-amber-600 focus:ring-2 focus:ring-amber-400/20 disabled:cursor-not-allowed disabled:bg-gray-50 dark:!border-amber-300 dark:bg-neutral-900 dark:text-amber-300 dark:disabled:bg-neutral-800"
                />
              </div>
            </div>

            <div className="min-w-0">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Custo Total Geral</label>
              <div className="rounded-lg border border-rose-300/70 px-3 py-2.5 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:text-rose-300">
                {formatarMoeda(custoTotal)}
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-black">
        <SectionHeader
          icon={<BarChart3 size={18} />}
          title="Resultado"
          description="Visão consolidada de impostos e lucro previsto."
          tone="blue"
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="min-w-0">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Total de Impostos</label>
            <div className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-300">
              {formatarMoeda(valorImpostosTotal)}
            </div>
          </div>

          <div className="min-w-0">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Lucro Bruto Previsto</label>
            <div className="rounded-lg border border-blue-300 px-3 py-2.5 text-sm font-semibold text-blue-700 dark:border-blue-500/40 dark:text-blue-300">
              {formatarMoeda(lucroBrutoPrevisto)}
            </div>
          </div>

          <div className="min-w-0">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Lucro Após Impostos</label>
            <div className="rounded-lg border border-emerald-300 px-3 py-2.5 text-sm font-semibold text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-300">
              {formatarMoeda(lucroAposImpostosPrevisto)}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
