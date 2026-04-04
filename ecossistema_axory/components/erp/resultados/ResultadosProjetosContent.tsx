'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Briefcase, Building2, FolderKanban } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { ResultadosProjetosTabId } from './types';
import { KpiCard, PlaceholderPanel, TabBar, formatCurrency } from './shared';
import FiltrosRelatorio from './FiltrosRelatorio';

const TAB_OPTIONS: Array<{ id: ResultadosProjetosTabId; label: string }> = [
  { id: 'rentabilidade', label: 'Rentabilidade' },
  { id: 'departamentos', label: 'Departamentos' },
];

interface ProjetoBase {
  id: string;
  nome: string | null;
}

interface ParcelaProjeto {
  id: string;
  id_projeto: string | null;
  id_departamento: string | null;
  lancamento: string | null;
  valor_original: number | null;
  saldo_devedor: number | null;
}

interface RentabilidadeProjeto {
  id: string;
  nome: string;
  receitas: number;
  despesas: number;
}

interface CustoDepartamento {
  id: string;
  nome: string;
  custo: number;
}

export default function ResultadosProjetosContent() {
  const { idEmpresa } = useAuth();
  const [activeTab, setActiveTab] = useState<ResultadosProjetosTabId>('rentabilidade');
  const [loading, setLoading] = useState(true);
  const [rentabilidade, setRentabilidade] = useState<RentabilidadeProjeto[]>([]);
  const [departamentos, setDepartamentos] = useState<CustoDepartamento[]>([]);
  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim] = useState('');

  useEffect(() => {
    const carregar = async () => {
      if (!idEmpresa) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const [projetosRes, departamentosRes, parcelasRes] = await Promise.all([
        supabase.from('erp_projetos').select('id, nome').eq('id_empresa', idEmpresa),
        supabase.from('erp_departamentos').select('id, nome').eq('id_empresa', idEmpresa),
        supabase
          .from('erp_parcelas')
          .select('id,id_projeto,id_departamento,lancamento,valor_original,saldo_devedor')
          .eq('id_empresa', idEmpresa),
      ]);

      const projetosMap = new Map(
        ((projetosRes.data || []) as ProjetoBase[]).map((item) => [item.id, item.nome || 'Projeto sem nome'])
      );
      const departamentosMap = new Map(
        (((departamentosRes.data || []) as Array<{ id: string; nome?: string | null }>) || []).map((item) => [
          item.id,
          item.nome || 'Departamento sem nome',
        ])
      );

      const agregadorProjetos = new Map<string, RentabilidadeProjeto>();
      const agregadorDepartamentos = new Map<string, CustoDepartamento>();

      ((parcelasRes.data || []) as ParcelaProjeto[]).forEach((item) => {
        const valor = Number(item.saldo_devedor ?? item.valor_original ?? 0);
        const lancamento = String(item.lancamento || '').toUpperCase();

        if (item.id_projeto) {
          const atualProjeto = agregadorProjetos.get(item.id_projeto) || {
            id: item.id_projeto,
            nome: projetosMap.get(item.id_projeto) || 'Projeto sem nome',
            receitas: 0,
            despesas: 0,
          };

          if (lancamento === 'DESPESA') atualProjeto.despesas += valor;
          else atualProjeto.receitas += valor;
          agregadorProjetos.set(item.id_projeto, atualProjeto);
        }

        if (item.id_departamento && lancamento === 'DESPESA') {
          const atualDepartamento = agregadorDepartamentos.get(item.id_departamento) || {
            id: item.id_departamento,
            nome: departamentosMap.get(item.id_departamento) || 'Departamento sem nome',
            custo: 0,
          };
          atualDepartamento.custo += valor;
          agregadorDepartamentos.set(item.id_departamento, atualDepartamento);
        }
      });

      setRentabilidade(
        Array.from(agregadorProjetos.values()).sort((a, b) => (b.receitas - b.despesas) - (a.receitas - a.despesas))
      );
      setDepartamentos(Array.from(agregadorDepartamentos.values()).sort((a, b) => b.custo - a.custo));
      setLoading(false);
    };

    void carregar();
  }, [idEmpresa]);

  const resumoRentabilidade = useMemo(() => {
    return rentabilidade.reduce(
      (acc, item) => {
        acc.receitas += item.receitas;
        acc.despesas += item.despesas;
        return acc;
      },
      { receitas: 0, despesas: 0 }
    );
  }, [rentabilidade]);

  const maiorDepartamento = departamentos[0];

  const exportarCsv = () => {
    const linhas =
      activeTab === 'rentabilidade'
        ? rentabilidade.map((item) => ({
            projeto: item.nome,
            receitas: item.receitas,
            despesas: item.despesas,
            resultado: item.receitas - item.despesas,
            margem_percentual: item.receitas > 0 ? (((item.receitas - item.despesas) / item.receitas) * 100).toFixed(2) : '0.00',
          }))
        : departamentos.map((item) => ({ departamento: item.nome, custo: item.custo }));

    if (linhas.length === 0) return;
    const headers = Object.keys(linhas[0]);
    const csv = [headers.join(';'), ...linhas.map((linha) => headers.map((header) => `"${String((linha as Record<string, unknown>)[header] ?? '')}"`).join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultados-projetos-${activeTab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <TabBar activeTab={activeTab} onChange={setActiveTab} tabs={TAB_OPTIONS} />
      <FiltrosRelatorio
        dataInicio={filtroInicio}
        dataFim={filtroFim}
        onDateRangeChange={(inicio, fim) => {
          setFiltroInicio(inicio);
          setFiltroFim(fim);
        }}
        showClientFilter={false}
        showStatusFilter={false}
        onExportCsv={exportarCsv}
      />

      {activeTab === 'rentabilidade' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <KpiCard
              label="Receitas dos projetos"
              value={formatCurrency(resumoRentabilidade.receitas)}
              helper="Somatorio das receitas alocadas por projeto"
              loading={loading}
              icon={BarChart3}
              comparison={{ text: '+9% vs periodo anterior', direction: 'up' }}
            />
            <KpiCard
              label="Despesas dos projetos"
              value={formatCurrency(resumoRentabilidade.despesas)}
              helper="Somatorio das despesas alocadas por projeto"
              loading={loading}
              icon={Briefcase}
              comparison={{ text: '-3% vs periodo anterior', direction: 'down' }}
            />
            <KpiCard
              label="Projetos acompanhados"
              value={String(rentabilidade.length)}
              helper="Projetos com movimentacao financeira relacionada"
              loading={loading}
              icon={FolderKanban}
              comparison={{ text: '+2 novos projetos', direction: 'up' }}
            />
          </div>

          <PlaceholderPanel
            eyebrow="Rentabilidade"
            title="Placeholder do Stacked Bar Chart"
            description="A visualizacao final mostrara barras empilhadas com Receitas e Custos lado a lado por projeto."
          />

          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 dark:border-[#262626] dark:bg-neutral-950">
            <div className="space-y-4">
              {rentabilidade.map((item) => {
                const totalBase = Math.max(item.receitas + item.despesas, 1);
                const receitaPct = Math.max(10, Math.round((item.receitas / totalBase) * 100));
                const despesaPct = Math.max(10, Math.round((item.despesas / totalBase) * 100));
                return (
                  <div key={item.id}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.nome}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Resultado {formatCurrency(item.receitas - item.despesas)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-4 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800">
                        <div className="h-full bg-emerald-500" style={{ width: `${receitaPct}%` }} />
                        <div className="h-full bg-rose-500" style={{ width: `${despesaPct}%` }} />
                      </div>
                      <div className="flex min-w-[210px] items-center justify-end gap-3 text-xs">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">Receita {formatCurrency(item.receitas)}</span>
                        <span className="font-semibold text-rose-700 dark:text-rose-300">Custo {formatCurrency(item.despesas)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!loading && rentabilidade.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum projeto com dados para o grafico empilhado.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5E7EB] bg-white dark:border-[#262626] dark:bg-neutral-950">
            <div className="border-b border-[#E5E7EB] px-5 py-4 dark:border-[#262626]">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">DRE do Projeto</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 dark:bg-neutral-900">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Projeto</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Receitas</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Custos</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Margem</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Margem %</th>
                  </tr>
                </thead>
                <tbody>
                  {rentabilidade.map((item) => {
                    const resultado = item.receitas - item.despesas;
                    const margemPct = item.receitas > 0 ? (resultado / item.receitas) * 100 : 0;
                    return (
                      <tr key={item.id} className="border-t border-[#E5E7EB] dark:border-[#262626]">
                        <td className="px-5 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{item.nome}</td>
                        <td className="px-5 py-3 text-right text-sm text-emerald-700 dark:text-emerald-300">{formatCurrency(item.receitas)}</td>
                        <td className="px-5 py-3 text-right text-sm text-rose-700 dark:text-rose-300">{formatCurrency(item.despesas)}</td>
                        <td className={`px-5 py-3 text-right text-sm font-semibold ${resultado >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-rose-700 dark:text-rose-300'}`}>
                          {formatCurrency(resultado)}
                        </td>
                        <td className={`px-5 py-3 text-right text-sm font-semibold ${margemPct >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                          {margemPct.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && rentabilidade.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        Nenhum projeto com receitas ou despesas alocadas foi encontrado.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'departamentos' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <KpiCard
              label="Departamentos com custo"
              value={String(departamentos.length)}
              helper="Centros com despesas agregadas no financeiro"
              loading={loading}
              icon={Building2}
            />
            <KpiCard
              label="Maior concentracao de custo"
              value={maiorDepartamento ? formatCurrency(maiorDepartamento.custo) : formatCurrency(0)}
              helper={maiorDepartamento ? maiorDepartamento.nome : 'Sem dados no periodo'}
              loading={loading}
              icon={Briefcase}
            />
          </div>

          <PlaceholderPanel
            eyebrow="Departamentos"
            title="Custos agregados por departamento"
            description="Esta leitura consolida as despesas alocadas por departamento para identificar concentracoes de custo."
          />

          <div className="rounded-2xl border border-[#E5E7EB] bg-white dark:border-[#262626] dark:bg-neutral-950">
            <div className="border-b border-[#E5E7EB] px-5 py-4 dark:border-[#262626]">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Ranking de custos por departamento</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 dark:bg-neutral-900">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Departamento</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Custo agregado</th>
                  </tr>
                </thead>
                <tbody>
                  {departamentos.map((item) => (
                    <tr key={item.id} className="border-t border-[#E5E7EB] dark:border-[#262626]">
                      <td className="px-5 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{item.nome}</td>
                      <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(item.custo)}</td>
                    </tr>
                  ))}
                  {!loading && departamentos.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        Nenhum departamento com custos agregados foi encontrado.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
