'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Clock3, FileJson2, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { ResultadosAuditoriaTabId } from './types';
import { KpiCard, TabBar, formatCurrency, formatDate } from './shared';

const TAB_OPTIONS: Array<{ id: ResultadosAuditoriaTabId; label: string }> = [
  { id: 'linha_tempo_fin', label: 'Linha do Tempo Financeira' },
  { id: 'logs_sistema', label: 'Logs do Sistema' },
];

interface HistoricoAuditoriaItem {
  id: string;
  id_referencia?: string | null;
  id_usuario?: string | null;
  data_evento?: string | null;
  tipo_evento?: string | null;
  status_anterior?: string | null;
  status_novo?: string | null;
  valor_movimentado?: number | null;
  observacao?: string | null;
}

interface MembroEquipe {
  id_usuario: string;
  nome_completo: string | null;
}

type LogSistema = Record<string, unknown>;

function formatStatusChange(anterior?: string | null, novo?: string | null): string {
  if (anterior && novo) return `${anterior} -> ${novo}`;
  if (novo) return `Status atual: ${novo}`;
  if (anterior) return `Antes: ${anterior}`;
  return '-';
}

function pickJsonCandidate(log: LogSistema, candidates: string[]): unknown {
  for (const key of candidates) {
    const value = log[key];
    if (value !== undefined && value !== null) return value;
  }
  return null;
}

function formatJsonPreview(value: unknown): string {
  if (value === null || value === undefined) return '-';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function resolveLogDate(log: LogSistema): string | null {
  const raw = log.data_registro ?? log.criado_em ?? log.created_at ?? log.data_evento ?? null;
  return raw ? String(raw) : null;
}

function resolveLogTitle(log: LogSistema): string {
  return String(log.acao ?? log.tipo_evento ?? log.evento ?? log.modulo ?? 'Log do sistema');
}

function resolveLogEntity(log: LogSistema): string {
  return String(log.entidade ?? log.tabela ?? log.contexto ?? log.modulo ?? '-');
}

export default function ResultadosAuditoriaContent() {
  const { idEmpresa } = useAuth();
  const [activeTab, setActiveTab] = useState<ResultadosAuditoriaTabId>('linha_tempo_fin');
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<HistoricoAuditoriaItem[]>([]);
  const [logs, setLogs] = useState<LogSistema[]>([]);
  const [nomesUsuarios, setNomesUsuarios] = useState<Map<string, string>>(new Map());
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    const carregar = async () => {
      if (!idEmpresa) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const [timelineRes, logsRes, membrosRes] = await Promise.all([
        supabase
          .from('erp_financeiro_historico')
          .select('*')
          .eq('id_empresa', idEmpresa)
          .order('data_evento', { ascending: false })
          .limit(40),
        supabase
          .from('sis_logs_sistema')
          .select('*')
          .eq('id_empresa', idEmpresa)
          .order('data_registro', { ascending: false })
          .limit(30),
        supabase.from('sis_membros_equipe').select('id_usuario,nome_completo').eq('id_empresa', idEmpresa),
      ]);

      setTimeline((timelineRes.data || []) as HistoricoAuditoriaItem[]);
      setLogs((logsRes.data || []) as LogSistema[]);
      setNomesUsuarios(
        new Map(
          (((membrosRes.data || []) as MembroEquipe[]) || []).map((item) => [item.id_usuario, item.nome_completo || 'Usuario sem nome'])
        )
      );
      setLoading(false);
    };

    void carregar();
  }, [idEmpresa]);

  const indicadores = useMemo(() => {
    const baixas = timeline.filter((item) => String(item.tipo_evento || '').toUpperCase().includes('BAIXA')).length;
    const estornos = timeline.filter((item) => String(item.tipo_evento || '').toUpperCase().includes('ESTORNO')).length;
    return { baixas, estornos };
  }, [timeline]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <TabBar activeTab={activeTab} onChange={setActiveTab} tabs={TAB_OPTIONS} />

      {activeTab === 'linha_tempo_fin' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <KpiCard label="Baixas via RPC" value={String(indicadores.baixas)} helper="Eventos de baixa registrados na trilha financeira" loading={loading} icon={Clock3} />
            <KpiCard label="Estornos via RPC" value={String(indicadores.estornos)} helper="Eventos de estorno registrados na trilha financeira" loading={loading} icon={ShieldAlert} />
          </div>

          <div className="space-y-3">
            {timeline.map((item) => {
              const estorno = String(item.tipo_evento || '').toUpperCase().includes('ESTORNO');
              return (
                <div key={item.id} className="relative rounded-2xl border border-[#E5E7EB] bg-white p-5 pl-8 dark:border-[#262626] dark:bg-neutral-950">
                  <span className="absolute left-4 top-0 h-full w-px bg-slate-200 dark:bg-neutral-800" />
                  <span className={`absolute left-[10px] top-7 inline-flex h-3.5 w-3.5 rounded-full border-2 border-white ${estorno ? 'bg-rose-600' : 'bg-emerald-600'} dark:border-neutral-950`} />

                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${estorno ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {estorno ? 'Estorno de Parcela via RPC' : 'Baixa de Parcela via RPC'}
                        </span>
                        <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Parcela {item.id_referencia || '-'}</span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{formatStatusChange(item.status_anterior, item.status_novo)}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.observacao || 'Sem observacao informada.'}</p>
                    </div>

                    <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[520px]">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Data</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{formatDate(item.data_evento)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Usuario</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {item.id_usuario ? nomesUsuarios.get(item.id_usuario) || item.id_usuario : 'Nao identificado'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Valor</p>
                        <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{formatCurrency(Math.abs(Number(item.valor_movimentado || 0)))}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {!loading && timeline.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-12 text-center text-sm text-slate-500 dark:border-neutral-700 dark:bg-neutral-900/40 dark:text-slate-400">
                Nenhum evento financeiro foi encontrado para compor a linha do tempo.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {activeTab === 'logs_sistema' ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#E5E7EB] bg-white dark:border-[#262626] dark:bg-neutral-950">
            <div className="border-b border-[#E5E7EB] px-5 py-4 dark:border-[#262626]">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Tabela robusta de logs do sistema</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 dark:bg-neutral-900">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Data</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Evento</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Entidade</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((item, index) => {
                    const logId = String(item.id ?? `log-${index}`);
                    const expanded = expandedLogId === logId;
                    const before = pickJsonCandidate(item, ['snapshot_antes', 'antes', 'dados_antes', 'payload_antes', 'old_data', 'before']);
                    const after = pickJsonCandidate(item, ['snapshot_depois', 'depois', 'dados_depois', 'payload_depois', 'new_data', 'after']);

                    return (
                      <Fragment key={logId}>
                        <tr className="border-t border-[#E5E7EB] dark:border-[#262626]">
                          <td className="px-5 py-3 text-sm text-slate-700 dark:text-slate-200">{formatDate(resolveLogDate(item))}</td>
                          <td className="px-5 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{resolveLogTitle(item)}</td>
                          <td className="px-5 py-3 text-sm text-slate-700 dark:text-slate-200">{resolveLogEntity(item)}</td>
                          <td className="px-5 py-3">
                            <button
                              type="button"
                              onClick={() => setExpandedLogId((prev) => (prev === logId ? null : logId))}
                              className="inline-flex items-center gap-2 rounded-xl border border-[#BFDBFE] bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-500/35 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
                            >
                              <FileJson2 size={16} />
                              {expanded ? 'Ocultar snapshots' : 'Ver snapshots'}
                              <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                            </button>
                          </td>
                        </tr>
                        {expanded ? (
                          <tr className="border-t border-[#E5E7EB] bg-slate-50/60 dark:border-[#262626] dark:bg-neutral-900/60">
                            <td colSpan={4} className="px-5 py-5">
                              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 dark:border-[#262626] dark:bg-neutral-950">
                                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Antes</p>
                                  <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{formatJsonPreview(before)}</pre>
                                </div>
                                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 dark:border-[#262626] dark:bg-neutral-950">
                                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Depois</p>
                                  <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{formatJsonPreview(after)}</pre>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}

                  {!loading && logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        Nenhum log do sistema foi encontrado para a empresa.
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
