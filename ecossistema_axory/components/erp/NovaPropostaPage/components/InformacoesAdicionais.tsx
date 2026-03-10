import { useRef, useEffect } from 'react';
import type { PropostaFormData } from '../types';

interface InformacoesAdicionaisProps {
  formData: PropostaFormData;
  setFormData: (data: PropostaFormData) => void;
  isViewMode: boolean;
}

export default function InformacoesAdicionais({
  formData,
  setFormData,
  isViewMode
}: InformacoesAdicionaisProps) {
  const observacoesRef = useRef<HTMLTextAreaElement>(null);
  const observacoesInternasRef = useRef<HTMLTextAreaElement>(null);

  // Função para ajustar altura do textarea automaticamente
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  // Ajustar altura ao carregar e quando o valor mudar
  useEffect(() => {
    if (observacoesRef.current) {
      adjustTextareaHeight(observacoesRef.current);
    }
  }, [formData.observacoes]);

  useEffect(() => {
    if (observacoesInternasRef.current) {
      adjustTextareaHeight(observacoesInternasRef.current);
    }
  }, [formData.observacoesInternas]);

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-[#E5E7EB] dark:border-[#262626] p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Informações Adicionais
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Adicione observações e notas sobre a proposta
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Observações */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Observações
          </label>
          <textarea
            ref={observacoesRef}
            value={formData.observacoes}
            onChange={(e) => {
              setFormData({ ...formData, observacoes: e.target.value });
              adjustTextareaHeight(e.target);
            }}
            disabled={isViewMode}
            placeholder="Observações visíveis ao cliente..."
            rows={3}
            className="w-full px-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed resize-y overflow-auto"
            style={{ minHeight: '80px' }}
          />
        </div>

        {/* Observações Internas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Observações Internas
          </label>
          <textarea
            ref={observacoesInternasRef}
            value={formData.observacoesInternas}
            onChange={(e) => {
              setFormData({ ...formData, observacoesInternas: e.target.value });
              adjustTextareaHeight(e.target);
            }}
            disabled={isViewMode}
            placeholder="Observações internas (não visíveis ao cliente)..."
            rows={3}
            className="w-full px-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed resize-y overflow-auto"
            style={{ minHeight: '80px' }}
          />
        </div>
      </div>
    </div>
  );
}

