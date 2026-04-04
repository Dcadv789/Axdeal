'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

interface DocumentoParaExcluir {
  id: string;
  codigo: string;
  tipo: 'proposta' | 'venda' | 'os';
}

interface ModalConfirmarExclusaoProps {
  isOpen: boolean;
  documento: DocumentoParaExcluir | null;
  onClose: () => void;
  onConfirmar: () => Promise<void>;
}

const TIPO_LABEL: Record<string, string> = {
  proposta: 'proposta',
  venda: 'pedido de venda',
  os: 'ordem de serviço',
};

const HOLD_DURATION_MS = 3000;

export default function ModalConfirmarExclusao({
  isOpen,
  documento,
  onClose,
  onConfirmar,
}: ModalConfirmarExclusaoProps) {
  const [excluindo, setExcluindo] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [visible, setVisible] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const scrollYRef = useRef(0);
  const holdStartRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTriggeredRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (isOpen) {
      setShouldRender(true);
      timeoutId = setTimeout(() => setVisible(true), 16);
    } else {
      setVisible(false);
      timeoutId = setTimeout(() => setShouldRender(false), 260);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!shouldRender) {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      if (scrollYRef.current > 0) {
        window.scrollTo(0, scrollYRef.current);
      }
      return;
    }

    scrollYRef.current = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollYRef.current}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }, [shouldRender]);

  const cancelarHold = () => {
    if (holdIntervalRef.current !== null) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    holdStartRef.current = null;
    holdTriggeredRef.current = false;
    setHoldProgress(0);
  };

  useEffect(() => {
    if (!isOpen) {
      cancelarHold();
      setExcluindo(false);
    }

    return () => cancelarHold();
  }, [isOpen]);

  const handleExcluir = async () => {
    if (excluindo) return;
    setExcluindo(true);
    setHoldProgress(100);

    try {
      await onConfirmar();
      onClose();
    } finally {
      setExcluindo(false);
      cancelarHold();
    }
  };

  const iniciarHold = () => {
    if (excluindo || holdIntervalRef.current !== null) return;

    holdTriggeredRef.current = false;
    holdStartRef.current = Date.now();
    setHoldProgress(0);

    holdIntervalRef.current = setInterval(() => {
      if (holdStartRef.current === null) return;

      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min((elapsed / HOLD_DURATION_MS) * 100, 100);
      setHoldProgress(progress);

      if (progress >= 100) {
        if (holdIntervalRef.current !== null) {
          clearInterval(holdIntervalRef.current);
          holdIntervalRef.current = null;
        }
        holdStartRef.current = null;

        if (!holdTriggeredRef.current) {
          holdTriggeredRef.current = true;
          void handleExcluir();
        }
      }
    }, 16);
  };

  if (!mounted || !shouldRender) return null;

  const tipoLabel = documento ? TIPO_LABEL[documento.tipo] || 'documento' : 'documento';

  return createPortal(
    <>
      <div
        className={`fixed inset-0 bg-black/80 transition-opacity duration-[260ms] ease-out ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ zIndex: 2147483000 }}
        onClick={excluindo ? undefined : onClose}
      />
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: 2147483001 }}
      >
        <div
          className={`w-full max-w-md rounded-xl border border-red-200 bg-white shadow-2xl transition-all duration-[260ms] ease-out dark:border-red-900/50 dark:bg-neutral-900 ${
            visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-95 opacity-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle size={24} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Confirmar exclusão
                </h3>
                {documento && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {tipoLabel.charAt(0).toUpperCase() + tipoLabel.slice(1)} <strong>{documento.codigo}</strong>
                  </p>
                )}
              </div>
            </div>

            <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
              Esta ação é irreversível. Segure o botão de exclusão por 3 segundos para confirmar. Soltar antes cancela a ação.
            </p>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onPointerDown={iniciarHold}
                onPointerUp={cancelarHold}
                onPointerLeave={cancelarHold}
                onPointerCancel={cancelarHold}
                disabled={excluindo}
                className="relative overflow-hidden rounded-lg border border-red-300 bg-red-100 px-4 py-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-80 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/50"
              >
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 z-0 rounded-md bg-red-600 dark:bg-red-500"
                  style={{ width: `${holdProgress}%` }}
                />
                <span className="relative z-10">
                  {excluindo ? 'Excluindo...' : 'Segurar para excluir'}
                </span>
              </button>

              <button
                type="button"
                onClick={onClose}
                disabled={excluindo}
                className="rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-neutral-600 dark:text-gray-300 dark:hover:bg-neutral-800"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
