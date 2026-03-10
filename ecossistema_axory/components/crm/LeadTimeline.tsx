'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, MessageCircle, PhoneCall, StickyNote } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type TipoInteracao = 'Nota' | 'WhatsApp' | 'Ligação' | 'E-mail' | string;

interface CrmInteracaoRow {
  id: string;
  id_lead: string;
  tipo: TipoInteracao;
  descricao: string;
  status: string | null;
  id_usuario: string | null;
  autor_nome: string | null;
  criado_em: string | null;
}

interface LeadTimelineProps {
  leadId: string;
  userId: string | null;
  autorPadrao: string | null;
  refreshKey?: number;
}

function iconePorTipo(tipo: TipoInteracao) {
  if (tipo === 'WhatsApp') return MessageCircle;
  if (tipo === 'Ligação') return PhoneCall;
  if (tipo === 'E-mail') return Mail;
  return StickyNote;
}

function estiloIconePorTipo(tipo: TipoInteracao) {
  if (tipo === 'WhatsApp') {
    return 'border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/15 dark:text-green-300';
  }
  if (tipo === 'Ligação') {
    return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300';
  }
  if (tipo === 'E-mail') {
    return 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/15 dark:text-violet-300';
  }
  return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300';
}

function formatarDataHora(valor: string | null) {
  if (!valor) return '-';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '-';
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function LeadTimeline({ leadId, userId, autorPadrao, refreshKey = 0 }: LeadTimelineProps) {
  const [loading, setLoading] = useState(false);
  const [salvandoNota, setSalvandoNota] = useState(false);
  const [notaRapida, setNotaRapida] = useState('');
  const [interacoes, setInteracoes] = useState<CrmInteracaoRow[]>([]);

  const carregarInteracoes = useCallback(async () => {
    if (!leadId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('crm_interacoes')
        .select('id, id_lead, tipo, descricao, status, id_usuario, autor_nome, criado_em')
        .eq('id_lead', leadId)
        .order('criado_em', { ascending: false });
      if (error) throw error;
      setInteracoes((data || []) as CrmInteracaoRow[]);
    } catch (err) {
      console.error('Erro ao carregar interações do lead:', err);
      setInteracoes([]);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    void carregarInteracoes();
  }, [carregarInteracoes, refreshKey]);

  const salvarNotaRapida = useCallback(async () => {
    const descricao = notaRapida.trim();
    if (!descricao || !leadId) return;
    try {
      setSalvandoNota(true);
      const { error } = await supabase.from('crm_interacoes').insert({
        id_lead: leadId,
        tipo: 'Nota',
        descricao,
        status: 'Registrada',
        id_usuario: userId,
        autor_nome: autorPadrao,
      });
      if (error) throw error;
      setNotaRapida('');
      await carregarInteracoes();
    } catch (err) {
      console.error('Erro ao salvar nota rápida da timeline:', err);
    } finally {
      setSalvandoNota(false);
    }
  }, [notaRapida, leadId, userId, autorPadrao, carregarInteracoes]);

  const vazio = useMemo(() => !loading && interacoes.length === 0, [loading, interacoes.length]);
  const mostrarLinhaTimeline = loading || interacoes.length > 0;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/70 shadow-sm p-4 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Histórico de interações
      </p>

      <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3 space-y-2">
        <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          Nota rápida
        </label>
        <textarea
          value={notaRapida}
          onChange={(e) => setNotaRapida(e.target.value)}
          rows={3}
          placeholder="Digite uma nota sobre este lead..."
          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-500"
        />
        <div className="flex justify-end">
          <button
            onClick={() => void salvarNotaRapida()}
            disabled={salvandoNota || notaRapida.trim().length === 0}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {salvandoNota ? 'Salvando...' : 'Salvar nota'}
          </button>
        </div>
      </div>

      <div className="relative">
        {mostrarLinhaTimeline && (
          <div className="absolute left-[15px] top-0 bottom-0 w-px bg-slate-200 dark:bg-neutral-700" />
        )}
        <div className="space-y-3">
          {loading && (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={`timeline-skeleton-${idx}`} className="relative pl-10">
                <div className="absolute left-0 top-1 h-8 w-8 rounded-full bg-slate-200 dark:bg-neutral-700 animate-pulse" />
                <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3 space-y-2">
                  <div className="h-4 w-24 rounded bg-slate-200 dark:bg-neutral-700 animate-pulse" />
                  <div className="h-4 w-full rounded bg-slate-200 dark:bg-neutral-700 animate-pulse" />
                </div>
              </div>
            ))
          )}

          {vazio && (
            <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3 text-sm text-slate-500 dark:text-slate-400">
              Nenhuma interação registrada para este lead.
            </div>
          )}

          {!loading &&
            interacoes.map((item) => {
              const Icon = iconePorTipo(item.tipo);
              const autor = item.autor_nome || (item.id_usuario && item.id_usuario === userId ? 'Você' : 'Sistema');
              return (
                <div key={item.id} className="relative pl-10">
                  <div className={`absolute left-0 top-1 h-8 w-8 rounded-full border flex items-center justify-center ${estiloIconePorTipo(item.tipo)}`}>
                    <Icon size={14} />
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{item.tipo}</p>
                      {item.status ? (
                        <span className="inline-flex items-center rounded-md border border-slate-200 dark:border-neutral-700 px-2 py-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                          {item.status}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{item.descricao}</p>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{formatarDataHora(item.criado_em)}</span>
                      <span>{autor}</span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
