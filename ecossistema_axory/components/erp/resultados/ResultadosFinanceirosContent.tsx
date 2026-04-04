'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowDownUp, BarChart3, Landmark, WalletCards } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { ResultadoKpiCard, ResultadosFinanceiroTabId } from './types';
import { KpiCard, PlaceholderPanel, TabBar, formatCurrency, formatDate } from './shared';
import FiltrosRelatorio from './FiltrosRelatorio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TAB_OPTIONS: Array<{ id: ResultadosFinanceiroTabId; label: string }> = [
  { id: 'visao_geral', label: 'Visao Geral' },
  { id: 'fluxo_caixa', label: 'Fluxo de Caixa' },
  { id: 'a_receber', label: 'A Receber' },
  { id: 'saldos', label: 'Saldos' },
];

const dataFluxoMock = [
  { mes: 'Nov', entradas: 48000, saidas: 31000 },
  { mes: 'Dez', entradas: 51000, saidas: 34000 },
  { mes: 'Jan', entradas: 46500, saidas: 35500 },
  { mes: 'Fev', entradas: 59000, saidas: 38200 },
  { mes: 'Mar', entradas: 62500, saidas: 40150 },
  { mes: 'Abr', entradas: 64800, saidas: 39500 },
];

interface KpiState {
  saldoTotalContas: number;
  totalReceber: number;
  faturamentoMes: number;
  inadimplencia: number;
}

interface ExtratoResumo {
  id: string;
  descricao: string | null;
  valor_total: number;
  data_pagamento: string;
  tipo_movimentacao: 'entrada' | 'saida';
}

interface ParcelaReceber {
  id: string;
  id_contato?: string | null;
  descricao_parcela: string | null;
  lancamento: string | null;
  data_vencimento: string;
  status: string | null;
  valor_original: number | null;
  saldo_devedor: number | null;
}

interface ContatoOption {
  id: string;
  nome_razao_social: string | null;
}

function monthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

export default function ResultadosFinanceirosContent() {
  const { idEmpresa } = useAuth();
  const [activeTab, setActiveTab] = useState<ResultadosFinanceiroTabId>('visao_geral');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [kpis, setKpis] = useState<KpiState>({
    saldoTotalContas: 0,
    totalReceber: 0,
    faturamentoMes: 0,
    inadimplencia: 0,
  });
  const [extrato, setExtrato] = useState<ExtratoResumo[]>([]);
  const [parcelasReceber, setParcelasReceber] = useState<ParcelaReceber[]>([]);
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
      setErro(null);

      const hoje = new Date().toISOString().slice(0, 10);
      const { from, to } = monthRange();

      const [contasRes, receberRes, inadimplenciaRes, faturasRes, extratoRes, contatosRes] = await Promise.all([
        supabase.from('erp_contas_bancarias').select('saldo_inicial').eq('id_empresa', idEmpresa),
        supabase
          .from('erp_parcelas')
          .select('id,id_contato,descricao_parcela,lancamento,data_vencimento,status,valor_original,saldo_devedor')
          .eq('id_empresa', idEmpresa)
          .eq('status', 'EM_ABERTO'),
        supabase
          .from('erp_parcelas')
          .select('saldo_devedor,valor_original,data_vencimento,status')
          .eq('id_empresa', idEmpresa)
          .in('status', ['EM_ABERTO', 'VENCIDO']),
        supabase.from('erp_faturas').select('valor_total,criado_em').eq('id_empresa', idEmpresa).gte('criado_em', from).lte('criado_em', to),
        supabase
          .from('erp_extrato')
          .select('id,descricao,valor_total,data_pagamento,tipo_movimentacao')
          .eq('id_empresa', idEmpresa)
          .order('data_pagamento', { ascending: false })
          .limit(20),
        supabase.from('erp_contatos').select('id,nome_razao_social').eq('id_empresa', idEmpresa).order('nome_razao_social'),
      ]);

      const erros = [contasRes.error, receberRes.error, inadimplenciaRes.error, extratoRes.error].filter(Boolean);
      if (erros.length > 0) {
        setErro(erros[0]?.message || 'Nao foi possivel carregar os indicadores financeiros.');
      }

      const saldoTotalContas = ((contasRes.data || []) as Array<{ saldo_inicial?: number | null }>).reduce(
        (acc, item) => acc + Number(item.saldo_inicial || 0),
        0
      );

      const receberAbertas = (receberRes.data || []) as ParcelaReceber[];
      const totalReceber = receberAbertas.reduce((acc, item) => acc + Number(item.saldo_devedor ?? item.valor_original ?? 0), 0);

      const inadimplencia = ((inadimplenciaRes.data || []) as Array<{
        saldo_devedor?: number | null;
        valor_original?: number | null;
        data_vencimento?: string | null;
        status?: string | null;
      }>).reduce((acc, item) => {
        const status = String(item.status || '').toUpperCase();
        const vencimento = String(item.data_vencimento || '').slice(0, 10);
        const vencido = status === 'VENCIDO' || (status === 'EM_ABERTO' && Boolean(vencimento) && vencimento < hoje);
        if (!vencido) return acc;
        return acc + Number(item.saldo_devedor ?? item.valor_original ?? 0);
      }, 0);

      const faturamentoMes = faturasRes.error
        ? 0
        : ((faturasRes.data || []) as Array<{ valor_total?: number | null }>).reduce((acc, item) => acc + Number(item.valor_total || 0), 0);

      setKpis({ saldoTotalContas, totalReceber, faturamentoMes, inadimplencia });
      setExtrato((extratoRes.data || []) as ExtratoResumo[]);
      setParcelasReceber(receberAbertas);
      setContatos((contatosRes.data || []) as ContatoOption[]);
      setLoading(false);
    };

    void carregar();
  }, [idEmpresa]);

  const cards = useMemo<ResultadoKpiCard[]>(
    () => [
      { id: 'saldo_total_contas', label: 'Saldo Total nas Contas', value: formatCurrency(kpis.saldoTotalContas), helper: 'Baseado nas contas bancarias cadastradas' },
      { id: 'total_receber', label: 'Total a Receber', value: formatCurrency(kpis.totalReceber), helper: "Parcelas com status 'EM_ABERTO'" },
      { id: 'faturamento_mes', label: 'Faturamento do Mes', value: formatCurrency(kpis.faturamentoMes), helper: 'Soma das faturas emitidas no mes atual' },
      { id: 'inadimplencia', label: 'Inadimplencia', value: formatCurrency(kpis.inadimplencia), helper: 'Parcelas vencidas e ainda nao liquidadas' },
    ],
    [kpis]
  );

  const extratoResumo = useMemo(() => {
    const entradas = extrato.filter((item) => item.tipo_movimentacao === 'entrada').reduce((acc, item) => acc + Number(item.valor_total || 0), 0);
    const saidasAbs = extrato.filter((item) => item.tipo_movimentacao === 'saida').reduce((acc, item) => acc + Math.abs(Number(item.valor_total || 0)), 0);
    return { entradas, saidasAbs };
  }, [extrato]);

  const parcelasFiltradas = useMemo(() => {
    return parcelasReceber.filter((item) => {
      const vencimento = String(item.data_vencimento || '').slice(0, 10);
      if (filtroCliente && item.id_contato !== filtroCliente) return false;
      if (filtroStatus && String(item.status || '').toUpperCase() !== filtroStatus) return false;
      if (filtroInicio && vencimento < filtroInicio) return false;
      if (filtroFim && vencimento > filtroFim) return false;
      return true;
    });
  }, [parcelasReceber, filtroCliente, filtroFim, filtroInicio, filtroStatus]);

  const opcoesClientes = useMemo(() => contatos.map((item) => ({ value: item.id, label: item.nome_razao_social || 'Cliente sem nome' })), [contatos]);

  const opcoesStatus = useMemo(() => {
    if (activeTab === 'a_receber') {
      return [
        { value: 'EM_ABERTO', label: 'Em Aberto' },
        { value: 'VENCIDO', label: 'Vencido' },
        { value: 'PAGO', label: 'Pago' },
      ];
    }
    if (activeTab === 'visao_geral') {
      return [
        { value: 'EM_ABERTO', label: 'Em Aberto' },
        { value: 'VENCIDO', label: 'Vencido' },
      ];
    }
    return [];
  }, [activeTab]);

  const exportarCsv = () => {
    const linhas =
      activeTab === 'a_receber'
        ? parcelasFiltradas.map((item) => ({
            vencimento: item.data_vencimento,
            lancamento: item.lancamento || '',
            parcela: item.descricao_parcela || '',
            status: item.status || '',
            saldo: Number(item.saldo_devedor ?? item.valor_original ?? 0),
          }))
        : dataFluxoMock.map((item) => ({
            mes: item.mes,
            entradas: item.entradas,
            saidas: item.saidas,
          }));

    if (linhas.length === 0) return;
    const headers = Object.keys(linhas[0]);
    const csv = [headers.join(';'), ...linhas.map((linha) => headers.map((header) => `"${String((linha as Record<string, unknown>)[header] ?? '')}"`).join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultados-financeiro-${activeTab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hoje = new Date().toISOString().slice(0, 10);

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
        showStatusFilter={activeTab !== 'fluxo_caixa' && activeTab !== 'saldos'}
        clientValue={filtroCliente}
        onClientChange={setFiltroCliente}
        clientOptions={opcoesClientes}
        statusValue={filtroStatus}
        onStatusChange={setFiltroStatus}
        statusOptions={opcoesStatus}
        onExportCsv={exportarCsv}
      />

      {erro ? (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{erro}</span>
        </div>
      ) : null}

      {activeTab === 'visao_geral' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[Landmark, WalletCards, BarChart3, ArrowDownUp].map((Icon, index) => (
              <KpiCard
                key={cards[index].id}
                label={cards[index].label}
                value={cards[index].value}
                helper={cards[index].helper}
                loading={loading}
                icon={Icon}
                comparison={
                  index === 0
                    ? { text: '+8% vs mes passado', direction: 'up' }
                    : index === 1
                      ? { text: '+15% vs periodo anterior', direction: 'up' }
                      : index === 2
                        ? { text: '+11% vs mes passado', direction: 'up' }
                        : { text: '-4% vs mes passado', direction: 'down' }
                }
              />
            ))}
          </div>
          <PlaceholderPanel
            eyebrow="Receitas vs Despesas"
            title="Comparativo estrategico"
            description="Esta visao resume os principais indicadores financeiros e sua comparacao com o periodo anterior."
          />
        </div>
      ) : null}

      {activeTab === 'fluxo_caixa' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <KpiCard label="Entradas reais" value={formatCurrency(extratoResumo.entradas)} helper="Baseado no extrato financeiro" loading={loading} icon={WalletCards} />
            <KpiCard label="Saidas reais" value={formatCurrency(extratoResumo.saidasAbs)} helper="Baseado no extrato financeiro" loading={loading} icon={ArrowDownUp} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Entradas vs Saidas nos ultimos 6 meses</CardTitle>
            </CardHeader>
            <CardContent className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dataFluxoMock}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="mes" stroke="#64748B" />
                  <YAxis stroke="#64748B" tickFormatter={(value) => `R$ ${Math.round(value / 1000)}k`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value || 0))} />
                  <Legend />
                  <Area type="monotone" dataKey="entradas" name="Entradas" stroke="#16A34A" fill="#BBF7D0" fillOpacity={0.65} />
                  <Area type="monotone" dataKey="saidas" name="Saidas" stroke="#DC2626" fill="#FECACA" fillOpacity={0.65} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Movimentacoes reais do extrato</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50 dark:bg-neutral-900">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Data</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Descricao</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tipo</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extrato.map((item) => (
                      <tr key={item.id} className="border-t border-[#E5E7EB] dark:border-[#262626]">
                        <td className="px-5 py-3 text-sm text-slate-700 dark:text-slate-200">{formatDate(item.data_pagamento)}</td>
                        <td className="px-5 py-3 text-sm text-slate-700 dark:text-slate-200">{item.descricao || '-'}</td>
                        <td className="px-5 py-3 text-sm text-slate-700 dark:text-slate-200">{item.tipo_movimentacao === 'entrada' ? 'Entrada' : 'Saida'}</td>
                        <td className={`px-5 py-3 text-right text-sm font-semibold ${item.tipo_movimentacao === 'entrada' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                          {formatCurrency(Math.abs(Number(item.valor_total || 0)))}
                        </td>
                      </tr>
                    ))}
                    {!loading && extrato.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                          Nenhuma movimentacao encontrada no extrato.
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

      {activeTab === 'a_receber' ? (
        <Card>
          <CardHeader>
            <CardTitle>Parcelas em aberto</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 dark:bg-neutral-900">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Vencimento</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Lancamento</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Parcela</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {parcelasFiltradas.map((item) => {
                    const vencimento = String(item.data_vencimento || '').slice(0, 10);
                    const atrasada = Boolean(vencimento) && vencimento < hoje;
                    return (
                      <tr key={item.id} className={`border-t dark:border-[#262626] ${atrasada ? 'bg-rose-50/70 dark:bg-rose-950/10' : 'border-[#E5E7EB]'}`}>
                        <td className={`px-5 py-3 text-sm ${atrasada ? 'font-semibold text-rose-700 dark:text-rose-300' : 'text-slate-700 dark:text-slate-200'}`}>{formatDate(item.data_vencimento)}</td>
                        <td className="px-5 py-3 text-sm text-slate-700 dark:text-slate-200">{item.lancamento || '-'}</td>
                        <td className="px-5 py-3 text-sm text-slate-700 dark:text-slate-200">{item.descricao_parcela || '-'}</td>
                        <td className="px-5 py-3 text-sm text-slate-700 dark:text-slate-200">{atrasada ? 'Em atraso' : item.status || 'EM_ABERTO'}</td>
                        <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(Number(item.saldo_devedor ?? item.valor_original ?? 0))}</td>
                      </tr>
                    );
                  })}
                  {!loading && parcelasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        Nenhuma parcela encontrada para o filtro informado.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === 'saldos' ? (
        <PlaceholderPanel
          eyebrow="Saldos"
          title="Consolidacao de saldos"
          description="Esta aba sera usada para distribuir os saldos por conta bancaria, centro de custo e outras visoes financeiras."
        />
      ) : null}
    </div>
  );
}
