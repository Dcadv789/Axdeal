/**
 * AddPropostaDrawer - Versão Refatorada (SIMPLIFICADA)
 * 
 * NOTA: Este componente foi marcado para deprecação futura.
 * As propostas devem ser criadas através do NovaPropostaPage completo.
 * 
 * Este drawer é mantido por compatibilidade, mas com funcionalidade reduzida.
 */

import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface AddPropostaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddPropostaDrawer({ isOpen, onClose }: AddPropostaDrawerProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-gray-900 shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Nova Proposta (Quick Add)
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Este drawer foi simplificado.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                Para criar propostas completas, use o formulário principal.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Ir para Formulário Completo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}





