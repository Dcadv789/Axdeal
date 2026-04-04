'use client';

import { useCallback, useEffect, useState } from 'react';
import { DollarSign, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

type TipoDocumento = 'venda' | 'os';

interface AcoesFinanceirasDocumentoProps {
  documentoId: string;
  tipo: TipoDocumento;
  idEmpresa: string | null;
  /** Modo compacto: apenas o botão, sem box/label. Usado na barra de ações. */
  compact?: boolean;
}

export default function AcoesFinanceirasDocumento({ documentoId, tipo, idEmpresa, compact }: AcoesFinanceirasDocumentoProps) {
  const [hasParcelasGeradas, setHasParcelasGeradas] = useState<boolean | null>(null);
  const [loadingParcelas, setLoadingParcelas] = useState(true);
  const [loadingLancar, setLoadingLancar] = useState(false);
  const [loadingEstornar, setLoadingEstornar] = useState(false);

  const verificarParcelas = useCallback(async () => {
    if (!documentoId || !idEmpresa) {
      setHasParcelasGeradas(false);
      setLoadingParcelas(false);
      return;
    }

    setLoadingParcelas(true);
    try {
      const column = tipo === 'venda' ? 'id_pedido_venda' : 'id_os';
      const { data, error } = await supabase
        .from('erp_parcelas')
        .select('id')
        .eq(column, documentoId)
        .eq('id_empresa', idEmpresa)
        .limit(1);

      if (error) {
        console.error('[AcoesFinanceiras] Erro ao verificar parcelas:', error);
        setHasParcelasGeradas(false);
        return;
      }

      setHasParcelasGeradas(Boolean(data && data.length > 0));
    } catch (err) {
      console.error('[AcoesFinanceiras] Erro ao verificar parcelas:', err);
      setHasParcelasGeradas(false);
    } finally {
      setLoadingParcelas(false);
    }
  }, [documentoId, idEmpresa, tipo]);

  useEffect(() => {
    void verificarParcelas();
  }, [verificarParcelas]);

  const handleLancarContas = async () => {
    if (!documentoId || !idEmpresa) return;

    setLoadingLancar(true);
    try {
      const pTipo = tipo === 'venda' ? 'VENDA' : 'OS';
      const { error } = await supabase.rpc('erp_rpc_gerenciar_financeiro_origem', {
        p_tipo: pTipo,
        p_id: documentoId,
        p_operacao: 'LANCAR',
      });

      if (error) throw error;

      toast.success('Financeiro lançado com sucesso!');
      setHasParcelasGeradas(true);
      await verificarParcelas();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Erro ao lançar contas a receber.';
      console.error('[AcoesFinanceiras] Erro ao lançar contas:', err);
      toast.error(msg);
    } finally {
      setLoadingLancar(false);
    }
  };

  const handleEstornarContas = async () => {
    if (!documentoId || !idEmpresa) return;

    const msg =
      tipo === 'venda'
        ? 'Tem certeza que deseja estornar as contas a receber deste pedido? Esta ação não pode ser desfeita.'
        : 'Tem certeza que deseja estornar as contas a receber desta ordem de serviço? Esta ação não pode ser desfeita.';

    if (!window.confirm(msg)) return;

    setLoadingEstornar(true);
    try {
      const pTipo = tipo === 'venda' ? 'VENDA' : 'OS';
      const { error } = await supabase.rpc('erp_rpc_gerenciar_financeiro_origem', {
        p_tipo: pTipo,
        p_id: documentoId,
        p_operacao: 'ESTORNAR',
      });

      if (error) throw error;

      toast.warning('Financeiro estornado!');
      setHasParcelasGeradas(false);
      await verificarParcelas();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Erro ao estornar contas.';
      console.error('[AcoesFinanceiras] Erro ao estornar contas:', err);
      toast.error(msg);
    } finally {
      setLoadingEstornar(false);
    }
  };

  const botaoLancar = (
    <button
      type="button"
      onClick={handleLancarContas}
      disabled={loadingLancar}
      className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-60 dark:bg-green-600 dark:hover:bg-green-700"
    >
      {loadingLancar ? <Loader2 size={18} className="animate-spin" /> : <DollarSign size={18} />}
      Lançar Contas
    </button>
  );

  const botaoEstornar = (
    <button
      type="button"
      onClick={handleEstornarContas}
      disabled={loadingEstornar}
      className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-60 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50"
    >
      {loadingEstornar ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />}
      Estornar Contas
    </button>
  );

  if (loadingParcelas) {
    return compact ? (
      <div className="flex items-center gap-2">
        <Loader2 size={18} className="animate-spin text-slate-500" />
      </div>
    ) : (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/70">
        <Loader2 size={18} className="animate-spin text-slate-500" />
        <span className="text-sm text-slate-500 dark:text-slate-400">Verificando contas financeiras...</span>
      </div>
    );
  }

  if (compact) {
    return !hasParcelasGeradas ? botaoLancar : botaoEstornar;
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-900/70">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        <DollarSign size={16} className="text-slate-400 dark:text-slate-500" />
        Ações financeiras
      </div>
      <div className="flex flex-wrap gap-2">
        {!hasParcelasGeradas ? botaoLancar : botaoEstornar}
      </div>
      {hasParcelasGeradas && (
        <span className="text-xs text-slate-500 dark:text-slate-400">Contas a receber já foram geradas.</span>
      )}
    </div>
  );
}
