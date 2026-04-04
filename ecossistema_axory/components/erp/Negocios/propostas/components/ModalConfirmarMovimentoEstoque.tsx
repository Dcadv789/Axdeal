'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, PackagePlus, RotateCcw, X } from 'lucide-react';

interface ModalConfirmarMovimentoEstoqueProps {
  isOpen: boolean;
  operacao: 'LANCAR' | 'ESTORNAR';
  documentoLabel: 'Pedido de Venda' | 'Ordem de Serviço';
  codigoDocumento?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export default function ModalConfirmarMovimentoEstoque({
  isOpen,
  operacao,
  documentoLabel,
  codigoDocumento,
  loading = false,
  onClose,
  onConfirm,
}: ModalConfirmarMovimentoEstoqueProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const isEstorno = operacao === 'ESTORNAR';
  const titulo = isEstorno ? 'Confirmar estorno de estoque' : 'Confirmar lançamento de estoque';
  const acaoLabel = isEstorno ? 'Estornar Estoque' : 'Lançar Estoque';

  return createPortal(
    <div className="fixed inset-0 z-[2147483002] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/70" onClick={onClose} aria-label="Fechar" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-2xl dark:border-[#262626] dark:bg-black">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${
                isEstorno
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              }`}
            >
              {isEstorno ? <AlertTriangle size={18} /> : <PackagePlus size={18} />}
            </span>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{titulo}</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {documentoLabel}
                {codigoDocumento ? ` ${codigoDocumento}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-neutral-800"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-sm text-slate-700 dark:text-slate-300">
          {isEstorno
            ? 'Deseja estornar a movimentação de estoque deste documento?'
            : 'Deseja lançar a movimentação de estoque deste documento?'}
        </p>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="flex-1 rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-[#262626] dark:text-slate-300 dark:hover:bg-neutral-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void onConfirm()}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-60 ${
              isEstorno ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isEstorno ? <RotateCcw size={15} /> : <PackagePlus size={15} />}
            {loading ? 'Processando...' : acaoLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
