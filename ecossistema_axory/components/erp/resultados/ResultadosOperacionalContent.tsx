'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ClipboardCheck, FileClock, FolderKanban, PieChart } from 'lucide-react';
import { Cell, Legend, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { ResultadosOperacionalTabId } from './types';
import { KpiCard, TabBar, formatCurrency, formatDate } from './shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TAB_OPTIONS: Array<{ id: ResultadosOperacionalTabId; label: string }> = [
  { id: 'ordens_servico', label: 'Ordens de Servico' },
  { id: 'contratos', label: 'Contratos' },
];

interface OrdemServicoResumo {
  andamento: number;
  concluidas: number;
  atrasadas: number;
}

interface ContratoResumo {
  id: string;
  descricao: string | null;
  status: string | null;
  proximo_faturamento: string | null;
  data_fim: string | null;
  valor_recorrente: number | null;
}

const STATUS_CHART_COLORS = ['#2563EB', '#10B981', '#EF4444'];

export default function ResultadosOperacionalContent() {
  const { idEmpresa } = useAuth();
  const [activeTab, setActiveTab] = useState<ResultadosOperacionalTabId>('ordens_servico');
  const [loading, setLoading] = useState(true);
  const [ordensResumo, setOrdensResumo] = useState<OrdemServicoResumo>({ andamento: 0, concluidas: 0, atrasadas: 0 });
  const [contratos, setContratos] = useState<ContratoResumo[]>([]);

  useEffect(() => {
    const carregar = async () => {
      if (!idEmpresa) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const hoje = new Date().toISOString().slice(0, 10);

      const [osRes, contratosRes] = await Promise.all([
        supabase.from('erp_os').select('status,data_fim').eq('id_empresa', idEmpresa),
        supabase.from('erp_contratos').select('id,descricao,status,proximo_faturamento,data_fim,valor_recorrente').eq('id_empresa', idEmpresa),
      ]);

      const ordens = ((osRes.data || []) as Array<{ status?: string | null; data_fim?: string | null }>).reduce(
        (acc, item) => {
          const status = String(item.status || '').toUpperCase();
          const dataFim = String(item.data_fim || '').slice(0, 10);
          if (status === 'EM_ANDAMENTO') acc.andamento += 1;
          if (status === 'CONCLUIDO') acc.concluidas += 1;
          if (status !== 'CONCLUIDO' && Boolean(dataFim) && dataFim < hoje) acc.atrasadas += 1;
          return acc;
        },
        { andamento: 0, concluidas: 0, atrasadas: 0 }
      );

      setOrdensResumo(ordens);
      setContratos((contratosRes.data || []) as ContratoResumo[]);
      setLoading(false);
    };

    void carregar();
  }, [idEmpresa]);

  const alertasContrato = useMemo(() => {
    const hoje = new Date();
    return contratos
      .map((item) => {
        if (!item.data_fim) return null;
        const dataFim = new Date(item.data_fim);
        if (Number.isNaN(dataFim.getTime())) return null;
        const diffDias = Math.ceil((dataFim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        let criticidade: '30 dias' | '60 dias' | '90 dias' | null = null;
        if (diffDias <= 30) criticidade = '30 dias';
        else if (diffDias <= 60) criticidade = '60 dias';
        else if (diffDias <= 90) criticidade = '90 dias';
        if (!criticidade) return null;
        return { ...item, diffDias, criticidade };
      })
      .filter(Boolean) as Array<ContratoResumo & { diffDias: number; criticidade: '30 dias' | '60 dias' | '90 dias' }>;
  }, [contratos]);

  const ordensChartData = useMemo(
    () => [
      { name: 'Em andamento', value: ordensResumo.andamento },
      { name: 'Concluidas', value: ordensResumo.concluidas },
      { name: 'Atrasadas', value: ordensResumo.atrasadas },
    ],
    [ordensResumo]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <TabBar activeTab={activeTab} onChange={setActiveTab} tabs={TAB_OPTIONS} />

      {activeTab === 'ordens_servico' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <KpiCard label="OS em andamento" value={String(ordensResumo.andamento)} helper="Ordens com status EM_ANDAMENTO" loading={loading} icon={FileClock} />
            <KpiCard label="OS concluidas" value={String(ordensResumo.concluidas)} helper="Ordens finalizadas no operacional" loading={loading} icon={ClipboardCheck} />
            <KpiCard label="OS atrasadas" value={String(ordensResumo.atrasadas)} helper="Ordens com data fim ja vencida" loading={loading} icon={AlertTriangle} />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>Status das ordens de servico</CardTitle>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Distribuicao entre ordens em andamento, concluidas e atrasadas.
                </p>
              </div>
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                <PieChart size={20} />
              </span>
            </CardHeader>
            <CardContent className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={ordensChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={78}
                    outerRadius={118}
                    paddingAngle={4}
                  >
                    {ordensChartData.map((item, index) => (
                      <Cell key={item.name} fill={STATUS_CHART_COLORS[index % STATUS_CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value} OS`} />
                  <Legend verticalAlign="bottom" iconType="circle" />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === 'contratos' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <KpiCard
              label="Contratos ativos"
              value={String(contratos.filter((item) => String(item.status || '').toLowerCase() === 'ativo').length)}
              helper="Contratos atualmente ativos"
              loading={loading}
              icon={FolderKanban}
            />
            <KpiCard
              label="Alertas de vencimento"
              value={String(alertasContrato.length)}
              helper="Contratos dentro da janela de 30, 60 ou 90 dias"
              loading={loading}
              icon={AlertTriangle}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Alertas de vencimento por criticidade</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 dark:bg-neutral-900">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Contrato</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Proximo faturamento</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Data fim</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Criticidade</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Valor recorrente</th>
                  </tr>
                </thead>
                <tbody>
                  {alertasContrato.map((item) => {
                    const alertaClass =
                      item.criticidade === '30 dias'
                        ? 'bg-rose-50/70 dark:bg-rose-900/10'
                        : item.criticidade === '60 dias'
                          ? 'bg-amber-50/70 dark:bg-amber-900/10'
                          : 'bg-blue-50/70 dark:bg-blue-900/10';
                    return (
                      <tr key={item.id} className={`border-t border-[#E5E7EB] dark:border-[#262626] ${alertaClass}`}>
                        <td className="px-5 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{item.descricao || item.id}</td>
                        <td className="px-5 py-3 text-sm text-slate-700 dark:text-slate-200">{item.status || '-'}</td>
                        <td className="px-5 py-3 text-sm text-slate-700 dark:text-slate-200">{formatDate(item.proximo_faturamento)}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{formatDate(item.data_fim)}</td>
                        <td className="px-5 py-3 text-sm">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            item.criticidade === '30 dias'
                              ? 'bg-rose-100 text-rose-700'
                              : item.criticidade === '60 dias'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                          }`}>
                            {item.criticidade}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(Number(item.valor_recorrente || 0))}</td>
                      </tr>
                    );
                  })}
                  {!loading && alertasContrato.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        Nenhum contrato com vencimento dentro das janelas de 30, 60 ou 90 dias.
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
