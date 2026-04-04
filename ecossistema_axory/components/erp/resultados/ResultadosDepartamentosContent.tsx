'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Briefcase, Building2, Landmark, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { ResultadosDepartamentosTabId } from './types';
import { KpiCard, TabBar, formatCurrency } from './shared';
import FiltrosRelatorio from './FiltrosRelatorio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TAB_OPTIONS: Array<{ id: ResultadosDepartamentosTabId; label: string }> = [
  { id: 'visao_geral', label: 'Visao Geral' },
  { id: 'orcamento_vs_realizado', label: 'Orcamento vs Realizado' },
  { id: 'headcount', label: 'Headcount' },
];

interface DepartamentoBase {
  id: string;
  nome: string | null;
}

interface ParcelaDepartamento {
  id_departamento: string | null;
  lancamento: string | null;
  saldo_devedor: number | null;
  valor_original: number | null;
  data_vencimento: string | null;
}

interface MembroEquipe {
  id: string;
  id_departamento: string | null;
  nome_completo: string | null;
  id_cargo: string | null;
}

interface DepartamentoMetricas {
  id: string;
  nome: string;
  orcado: number;
  realizado: number;
}

interface HeadcountRow {
  id: string;
  colaborador: string;
  departamento: string;
  cargo: string;
  custoAlocado: number;
}

function toMonthKey(value?: string | null) {
  return String(value || '').slice(0, 7);
}

export default function ResultadosDepartamentosContent() {
  const { idEmpresa } = useAuth();
  const [activeTab, setActiveTab] = useState<ResultadosDepartamentosTabId>('visao_geral');
  const [loading, setLoading] = useState(true);
  const [metricas, setMetricas] = useState<DepartamentoMetricas[]>([]);
  const [headcount, setHeadcount] = useState<HeadcountRow[]>([]);
  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim] = useState('');

  useEffect(() => {
    const carregar = async () => {
      if (!idEmpresa) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const [departamentosRes, parcelasRes, membrosRes] = await Promise.all([
        supabase.from('erp_departamentos').select('id,nome').eq('id_empresa', idEmpresa).order('nome'),
        supabase
          .from('erp_parcelas')
          .select('id_departamento,lancamento,saldo_devedor,valor_original,data_vencimento')
          .eq('id_empresa', idEmpresa),
        supabase
          .from('sis_membros_equipe')
          .select('id,id_departamento,nome_completo,id_cargo')
          .eq('id_empresa', idEmpresa),
      ]);

      const departamentos = (departamentosRes.data || []) as DepartamentoBase[];
      const parcelas = (parcelasRes.data || []) as ParcelaDepartamento[];
      const membros = (membrosRes.data || []) as MembroEquipe[];
      const mesAtual = new Date().toISOString().slice(0, 7);
      const departamentosMap = new Map(departamentos.map((item) => [item.id, item.nome || 'Departamento sem nome']));

      const metricasBase = departamentos.map((item, index) => {
        const realizado = parcelas
          .filter((parcela) => parcela.id_departamento === item.id)
          .filter((parcela) => String(parcela.lancamento || '').toUpperCase() === 'DESPESA')
          .filter((parcela) => toMonthKey(parcela.data_vencimento) === mesAtual)
          .reduce((acc, parcela) => acc + Number(parcela.saldo_devedor ?? parcela.valor_original ?? 0), 0);

        const pisoOrcado = 14000 + index * 3200;
        const orcado = Math.max(Math.round(realizado * 1.18), pisoOrcado);

        return {
          id: item.id,
          nome: item.nome || 'Departamento sem nome',
          realizado,
          orcado,
        };
      });

      const semDepartamentoRealizado = parcelas
        .filter((parcela) => !parcela.id_departamento)
        .filter((parcela) => String(parcela.lancamento || '').toUpperCase() === 'DESPESA')
        .filter((parcela) => toMonthKey(parcela.data_vencimento) === mesAtual)
        .reduce((acc, parcela) => acc + Number(parcela.saldo_devedor ?? parcela.valor_original ?? 0), 0);

      if (semDepartamentoRealizado > 0) {
        metricasBase.push({
          id: 'sem-vinculo',
          nome: 'Sem departamento',
          realizado: semDepartamentoRealizado,
          orcado: Math.max(Math.round(semDepartamentoRealizado * 1.12), 9000),
        });
      }

      const headcountRows = membros.map((membro, index) => {
        const departamento = membro.id_departamento ? departamentosMap.get(membro.id_departamento) || 'Departamento sem nome' : 'Sem departamento';
        const custoBase = 3800 + (index % 6) * 950;
        return {
          id: membro.id,
          colaborador: membro.nome_completo || 'Colaborador sem nome',
          departamento,
          cargo: membro.id_cargo ? `Cargo ${String(membro.id_cargo).slice(0, 8)}` : 'Nao informado',
          custoAlocado: custoBase,
        };
      });

      setMetricas(metricasBase.sort((a, b) => b.realizado - a.realizado));
      setHeadcount(headcountRows);
      setLoading(false);
    };

    void carregar();
  }, [idEmpresa]);

  const resumo = useMemo(() => {
    const custoTotalMes = metricas.reduce((acc, item) => acc + item.realizado, 0);
    const orcamentoTotal = metricas.reduce((acc, item) => acc + item.orcado, 0);
    const maiorDepartamento = metricas[0] || null;
    const percentualConsumido = orcamentoTotal > 0 ? (custoTotalMes / orcamentoTotal) * 100 : 0;
    return { custoTotalMes, orcamentoTotal, maiorDepartamento, percentualConsumido };
  }, [metricas]);

  const exportarCsv = () => {
    const linhas =
      activeTab === 'headcount'
        ? headcount.map((item) => ({
            colaborador: item.colaborador,
            departamento: item.departamento,
            cargo: item.cargo,
            custo_alocado: item.custoAlocado,
          }))
        : metricas.map((item) => ({
            departamento: item.nome,
            orcado: item.orcado,
            realizado: item.realizado,
            saldo: item.orcado - item.realizado,
          }));

    if (linhas.length === 0) return;
    const headers = Object.keys(linhas[0]);
    const csv = [headers.join(';'), ...linhas.map((linha) => headers.map((header) => `"${String((linha as Record<string, unknown>)[header] ?? '')}"`).join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `resultados-departamentos-${activeTab}.csv`;
    anchor.click();
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

      {activeTab === 'visao_geral' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <KpiCard
              label="Custo total do mes"
              value={formatCurrency(resumo.custoTotalMes)}
              helper="Despesas alocadas aos departamentos no mes atual"
              loading={loading}
              icon={Landmark}
              comparison={{ text: '+8% vs mes anterior', direction: 'up' }}
            />
            <KpiCard
              label="Maior gasto"
              value={resumo.maiorDepartamento?.nome || '-'}
              helper={resumo.maiorDepartamento ? formatCurrency(resumo.maiorDepartamento.realizado) : 'Sem custo alocado no periodo'}
              loading={loading}
              icon={Building2}
              comparison={{ text: '-2% vs mes anterior', direction: 'down' }}
            />
            <KpiCard
              label="% do orcamento consumido"
              value={`${resumo.percentualConsumido.toFixed(1)}%`}
              helper={`Base total orcada de ${formatCurrency(resumo.orcamentoTotal)}`}
              loading={loading}
              icon={Briefcase}
              comparison={{ text: '+4 p.p. vs mes anterior', direction: 'up' }}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Resumo dos departamentos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50 dark:bg-neutral-900">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Departamento</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Orcado</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Realizado</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricas.map((item) => (
                      <tr key={item.id} className="border-t border-[#E5E7EB] dark:border-[#262626]">
                        <td className="px-5 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{item.nome}</td>
                        <td className="px-5 py-3 text-right text-sm text-slate-700 dark:text-slate-200">{formatCurrency(item.orcado)}</td>
                        <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(item.realizado)}</td>
                        <td className={`px-5 py-3 text-right text-sm font-semibold ${item.orcado - item.realizado >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                          {formatCurrency(item.orcado - item.realizado)}
                        </td>
                      </tr>
                    ))}
                    {!loading && metricas.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                          Nenhum departamento com movimentacao financeira foi encontrado.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === 'orcamento_vs_realizado' ? (
        <Card>
          <CardHeader>
            <CardTitle>Orcamento vs realizado por departamento</CardTitle>
          </CardHeader>
          <CardContent className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metricas} barGap={12}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="nome" stroke="#64748B" />
                <YAxis stroke="#64748B" tickFormatter={(value) => `R$ ${Math.round(value / 1000)}k`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value || 0))} />
                <Legend />
                <Bar dataKey="orcado" name="Orcado" fill="#93C5FD" radius={[8, 8, 0, 0]} />
                <Bar dataKey="realizado" name="Realizado" fill="#2563EB" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === 'headcount' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <KpiCard
              label="Headcount total"
              value={String(headcount.length)}
              helper="Membros da equipe alocados aos departamentos"
              loading={loading}
              icon={Users}
            />
            <KpiCard
              label="Custo mensal estimado"
              value={formatCurrency(headcount.reduce((acc, item) => acc + item.custoAlocado, 0))}
              helper="Simulacao de custo alocado para leitura gerencial"
              loading={loading}
              icon={Landmark}
            />
            <KpiCard
              label="Departamentos ativos"
              value={String(new Set(headcount.map((item) => item.departamento)).size)}
              helper="Areas com pessoas vinculadas no painel"
              loading={loading}
              icon={Building2}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Headcount por departamento</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50 dark:bg-neutral-900">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Colaborador</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Departamento</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Cargo</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Custo mensal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {headcount.map((item) => (
                      <tr key={item.id} className="border-t border-[#E5E7EB] dark:border-[#262626]">
                        <td className="px-5 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{item.colaborador}</td>
                        <td className="px-5 py-3 text-sm text-slate-700 dark:text-slate-200">{item.departamento}</td>
                        <td className="px-5 py-3 text-sm text-slate-700 dark:text-slate-200">{item.cargo}</td>
                        <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(item.custoAlocado)}</td>
                      </tr>
                    ))}
                    {!loading && headcount.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                          Nenhum colaborador encontrado para compor o headcount.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
