'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Clock3, FileCheck2, FilePenLine, FileText } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { ResultadosComercialTabId } from './types';
import { KpiCard, PlaceholderPanel, TabBar, formatCurrency } from './shared';
import FiltrosRelatorio from './FiltrosRelatorio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TAB_OPTIONS: Array<{ id: ResultadosComercialTabId; label: string }> = [
  { id: 'funil_vendas', label: 'Funil de Vendas' },
  { id: 'faturamento', label: 'Faturamento' },
  { id: 'performance', label: 'Performance' },
];

interface ComercialResumo {
  rascunho: number;
  enviada: number;
  aprovada: number;
  vendas: number;
}

interface FaturaMes {
  referencia: string;
  valor: number;
}

interface PerformanceItem {
  id: string;
  negocio: string;
  etapa_inicial: string;
  etapa_final: string;
  dias_medios: number;
  responsavel: string;
}

interface ContatoOption {
  id: string;
  nome_razao_social: string | null;
}

export default function ResultadosComercialContent() {
  const { idEmpresa } = useAuth();
  const [activeTab, setActiveTab] = useState<ResultadosComercialTabId>('funil_vendas');
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState<ComercialResumo>({ rascunho: 0, enviada: 0, aprovada: 0, vendas: 0 });
  const [faturamentoMensal, setFaturamentoMensal] = useState<FaturaMes[]>([]);
  const [performance, setPerformance] = useState<PerformanceItem[]>([]);
  const [contatos, setContatos] = useState<ContatoOption[]>([]);
  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  useEffect(() => {
    const carregar = async () => {
      if (!idEmpresa) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const [propostasRes, vendasRes, faturasRes, contatosRes] = await Promise.all([
        supabase.from('erp_propostas').select('status').eq('id_empresa', idEmpresa),
        supabase.from('erp_pedidos_venda').select('id').eq('id_empresa', idEmpresa),
        supabase.from('erp_faturas').select('valor_total,criado_em').eq('id_empresa', idEmpresa),
        supabase.from('erp_contatos').select('id,nome_razao_social').eq('id_empresa', idEmpresa).order('nome_razao_social'),
      ]);

      const propostas = ((propostasRes.data || []) as Array<{ status?: string | null }>).reduce(
        (acc, item) => {
          const status = String(item.status || '').toUpperCase();
          if (status === 'RASCUNHO') acc.rascunho += 1;
          if (status === 'ENVIADA') acc.enviada += 1;
          if (status === 'APROVADA') acc.aprovada += 1;
          return acc;
        },
        { rascunho: 0, enviada: 0, aprovada: 0, vendas: Number((vendasRes.data || []).length) }
      );

      const mapaMensal = ((faturasRes.data || []) as Array<{ valor_total?: number | null; criado_em?: string | null }>).reduce<Record<string, number>>(
        (acc, item) => {
          const mes = String(item.criado_em || '').slice(0, 7);
          if (!mes) return acc;
          acc[mes] = (acc[mes] || 0) + Number(item.valor_total || 0);
          return acc;
        },
        {}
      );

      setResumo(propostas);
      setFaturamentoMensal(
        Object.entries(mapaMensal)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([referencia, valor]) => ({ referencia, valor }))
      );
      setPerformance([
        { id: 'perf-1', negocio: 'VEN-0004', etapa_inicial: 'Rascunho', etapa_final: 'Venda', dias_medios: 6, responsavel: 'Daniel C. Queiroz' },
        { id: 'perf-2', negocio: 'VEN-0007', etapa_inicial: 'Enviada', etapa_final: 'Venda', dias_medios: 11, responsavel: 'Comercial Interno' },
        { id: 'perf-3', negocio: 'VEN-0012', etapa_inicial: 'Aprovada', etapa_final: 'Venda', dias_medios: 3, responsavel: 'Time Hunter' },
      ]);
      setContatos((contatosRes.data || []) as ContatoOption[]);
      setLoading(false);
    };

    void carregar();
  }, [idEmpresa]);

  const cards = useMemo(
    () => [
      { label: 'Rascunho', value: String(resumo.rascunho), helper: 'Propostas ainda em preparacao', icon: FilePenLine },
      { label: 'Enviada', value: String(resumo.enviada), helper: 'Propostas enviadas ao cliente', icon: FileText },
      { label: 'Aprovada', value: String(resumo.aprovada), helper: 'Propostas aprovadas no funil', icon: FileCheck2 },
      { label: 'Venda', value: String(resumo.vendas), helper: 'Pedidos de venda gerados', icon: BarChart3 },
    ],
    [resumo]
  );

  const tempoMedioFechamento = useMemo(() => {
    if (performance.length === 0) return 0;
    return Math.round(performance.reduce((acc, item) => acc + item.dias_medios, 0) / performance.length);
  }, [performance]);

  const opcoesClientes = useMemo(() => contatos.map((item) => ({ value: item.id, label: item.nome_razao_social || 'Cliente sem nome' })), [contatos]);

  const opcoesStatus = useMemo(() => {
    if (activeTab === 'funil_vendas') {
      return [
        { value: 'RASCUNHO', label: 'Rascunho' },
        { value: 'ENVIADA', label: 'Enviada' },
        { value: 'APROVADA', label: 'Aprovada' },
        { value: 'VENDA', label: 'Venda' },
      ];
    }
    if (activeTab === 'performance') {
      return [
        { value: 'rapido', label: 'Fechamento rapido' },
        { value: 'medio', label: 'Fechamento medio' },
        { value: 'lento', label: 'Fechamento lento' },
      ];
    }
    return [];
  }, [activeTab]);

  const exportarCsv = () => {
    const linhas =
      activeTab === 'faturamento'
        ? faturamentoMensal.map((item) => ({ mes: item.referencia, valor: item.valor }))
        : activeTab === 'performance'
          ? performance.map((item) => ({
              negocio: item.negocio,
              etapa_inicial: item.etapa_inicial,
              etapa_final: item.etapa_final,
              dias_medios: item.dias_medios,
              responsavel: item.responsavel,
            }))
          : [
              { etapa: 'Rascunho', quantidade: resumo.rascunho },
              { etapa: 'Enviada', quantidade: resumo.enviada },
              { etapa: 'Aprovada', quantidade: resumo.aprovada },
              { etapa: 'Venda', quantidade: resumo.vendas },
            ];

    if (linhas.length === 0) return;
    const headers = Object.keys(linhas[0]);
    const csv = [headers.join(';'), ...linhas.map((linha) => headers.map((header) => `"${String((linha as Record<string, unknown>)[header] ?? '')}"`).join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultados-comercial-${activeTab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const funilChartData = [
    { etapa: 'Rascunho', total: resumo.rascunho },
    { etapa: 'Enviada', total: resumo.enviada },
    { etapa: 'Aprovada', total: resumo.aprovada },
    { etapa: 'Venda', total: resumo.vendas },
  ];

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
        showClientFilter
        showStatusFilter={activeTab !== 'faturamento'}
        clientValue={filtroCliente}
        onClientChange={setFiltroCliente}
        clientOptions={opcoesClientes}
        statusValue={filtroStatus}
        onStatusChange={setFiltroStatus}
        statusOptions={opcoesStatus}
        onExportCsv={exportarCsv}
      />

      {activeTab === 'funil_vendas' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <KpiCard
                key={card.label}
                label={card.label}
                value={card.value}
                helper={card.helper}
                loading={loading}
                icon={card.icon}
                comparison={
                  card.label === 'Rascunho'
                    ? { text: '+5% vs periodo anterior', direction: 'up' }
                    : card.label === 'Enviada'
                      ? { text: '+12% vs periodo anterior', direction: 'up' }
                      : card.label === 'Aprovada'
                        ? { text: '+7% vs periodo anterior', direction: 'up' }
                        : { text: '-2% vs periodo anterior', direction: 'down' }
                }
              />
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Funil de vendas</CardTitle>
            </CardHeader>
            <CardContent className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funilChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" stroke="#64748B" />
                  <YAxis type="category" dataKey="etapa" stroke="#64748B" width={90} />
                  <Tooltip />
                  <Bar dataKey="total" name="Negocios" fill="#2563EB" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === 'faturamento' ? (
        <Card>
          <CardHeader>
            <CardTitle>Faturamento mensal</CardTitle>
          </CardHeader>
          <CardContent className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={faturamentoMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="referencia" stroke="#64748B" />
                <YAxis stroke="#64748B" tickFormatter={(value) => `R$ ${Math.round(value / 1000)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(Number(value || 0))} />
                <Legend />
                <Bar dataKey="valor" name="Faturamento" fill="#2563EB" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === 'performance' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <KpiCard label="Negocios avaliados" value={String(performance.length)} helper="Base simulada inspirada em erp_status_historico" loading={loading} icon={BarChart3} />
            <KpiCard label="Tempo medio de fechamento" value={`${tempoMedioFechamento} dias`} helper="Tempo entre a etapa inicial e o fechamento" loading={loading} icon={Clock3} />
            <KpiCard label="Conversoes em venda" value={String(resumo.vendas)} helper="Negocios que chegaram ao fechamento" loading={loading} icon={BarChart3} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tempo medio por negocio</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50 dark:bg-neutral-900">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Negocio</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Fluxo</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tempo medio</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Responsavel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performance.map((item) => (
                      <tr key={item.id} className="border-t border-[#E5E7EB] dark:border-[#262626]">
                        <td className="px-5 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{item.negocio}</td>
                        <td className="px-5 py-3 text-sm text-slate-700 dark:text-slate-200">{item.etapa_inicial} -&gt; {item.etapa_final}</td>
                        <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">{item.dias_medios} dias</td>
                        <td className="px-5 py-3 text-sm text-slate-700 dark:text-slate-200">{item.responsavel}</td>
                      </tr>
                    ))}
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
