'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import LeadDetailsView from '@/components/crm/LeadDetailsView';
import { buscarLeadRelatorioPorId, type LeadRelatorioRow } from '@/components/crm/leadDetailsData';
import { useAuth } from '@/contexts/AuthContext';

export default function LeadDetalhePage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const leadId = params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lead, setLead] = useState<LeadRelatorioRow | null>(null);

  const carregarLead = useCallback(async () => {
    if (!leadId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await buscarLeadRelatorioPorId(leadId);
      if (!data) {
        setError('Lead não encontrado.');
        setLead(null);
        return;
      }
      setLead(data);
    } catch (err) {
      console.error('Erro ao carregar detalhes do lead:', err);
      setError('Não foi possível carregar os detalhes do lead.');
      setLead(null);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    void carregarLead();
  }, [carregarLead]);

  return (
    <div className="py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => router.push('/crm/leads?view=kanban')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
        >
          <ArrowLeft size={15} />
          Voltar para o Kanban
        </button>
        <button
          onClick={() => void carregarLead()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800"
        >
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>

      {loading && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 animate-pulse">
          <div className="xl:col-span-3 rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 h-80" />
          <div className="xl:col-span-5 rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 h-80" />
          <div className="xl:col-span-4 rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 h-80" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {!loading && lead && (
        <LeadDetailsView
          lead={lead}
          userId={user?.id || null}
          autorPadrao={(user?.user_metadata as { full_name?: string } | undefined)?.full_name || user?.email || null}
          layout="page"
        />
      )}
    </div>
  );
}
