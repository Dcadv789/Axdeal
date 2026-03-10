import { Plus, ArrowLeft, Save, Link } from 'lucide-react';
import { ReactNode } from 'react';

interface HeaderProps {
  title: string;
  onNovaProposta?: () => void;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  novaPropostaActions?: {
    onVoltar: () => void;
    onSalvarRascunho: () => void;
    onFinalizarGerarLink: () => void;
  };
  rightContent?: ReactNode;
}

export default function Header({ title, onNovaProposta, primaryAction, novaPropostaActions, rightContent }: HeaderProps) {
  return (
    <div className="bg-white dark:bg-black border-b border-[#E5E7EB] dark:border-[#262626] px-4 md:px-8 lg:px-12 py-5">
      <div className="w-full flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {title.includes(',') ? (
            <>
              {title.split(',')[0]}, <strong>{title.split(',')[1].trim()}</strong>
            </>
          ) : (
            title
          )}
        </h1>

        {rightContent && <div className="flex items-center">{rightContent}</div>}

        {onNovaProposta && (
          <button
            onClick={onNovaProposta}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all shadow-sm hover:shadow-md"
          >
            <Plus size={19} />
            Nova Proposta
          </button>
        )}

        {primaryAction && (
          <button
            onClick={primaryAction.onClick}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all shadow-sm hover:shadow-md"
          >
            <Plus size={19} />
            {primaryAction.label}
          </button>
        )}

        {novaPropostaActions && (
          <div className="flex items-center gap-3">
            <button
              onClick={novaPropostaActions.onVoltar}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-[#E5E7EB] dark:border-[#262626] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg font-medium text-sm transition-colors"
            >
              <ArrowLeft size={18} />
              Voltar
            </button>
            <button
              onClick={novaPropostaActions.onSalvarRascunho}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 dark:bg-gray-600 hover:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
            >
              <Save size={18} />
              Salvar Rascunho
            </button>
            <button
              onClick={novaPropostaActions.onFinalizarGerarLink}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all shadow-sm hover:shadow-md"
            >
              <Link size={18} />
              Finalizar e Gerar Link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
