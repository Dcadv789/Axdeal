import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useState } from 'react';

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
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/60 z-[10000] transition-opacity duration-150 ease-out ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onCancel}
      />
      <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md mx-4 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl z-[10001] transition-all duration-150 ease-out ${
        isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}>
        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={24} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {message}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 border border-[#E5E7EB] dark:border-[#262626] rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium text-sm transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm transition-colors"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
