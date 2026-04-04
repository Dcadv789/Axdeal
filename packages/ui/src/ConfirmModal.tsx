import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Confirmar ação',
  message = 'Tem certeza que deseja continuar?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
}: ConfirmModalProps) {
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const scrollYRef = useRef(0);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollYRef.current = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';

      setShouldRender(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsAnimating(true));
      });
      return;
    }

    setIsAnimating(false);
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    if (scrollYRef.current > 0) {
      window.scrollTo(0, scrollYRef.current);
    }

    const timer = setTimeout(() => setShouldRender(false), 150);
    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!mounted || !shouldRender) return null;

  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-[2147483000] bg-black/80 transition-opacity duration-150 ease-out ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onCancel}
      />

      <div
        className={`fixed inset-0 z-[2147483001] flex items-center justify-center p-4 transition-opacity duration-150 ease-out ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="w-full max-w-md rounded-xl border border-[#E5E7EB] bg-white shadow-2xl dark:border-[#262626] dark:bg-neutral-900">
          <div className="p-6">
            <div className="mb-4 flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <AlertTriangle size={24} className="text-blue-600 dark:text-blue-400" />
              </div>

              <div className="flex-1">
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
              </div>

              <button
                onClick={onCancel}
                className="p-1 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#262626] dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
