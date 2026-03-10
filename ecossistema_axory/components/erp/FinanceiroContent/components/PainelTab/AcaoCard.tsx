import { MessageCircle, CheckCircle2, MoreHorizontal } from 'lucide-react';
import type { AcaoItem, FeedTab } from '../../types';

interface AcaoCardProps {
  acao: AcaoItem;
  feedTab: FeedTab;
  onWhatsApp: (acao: AcaoItem) => void;
  onMarcarPago: (id: string) => void;
  onAcaoMenu: (id: string) => void;
}

export default function AcaoCard({
  acao,
  feedTab,
  onWhatsApp,
  onMarcarPago,
  onAcaoMenu,
}: AcaoCardProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-[#E5E7EB] dark:border-[#262626] hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {acao.cliente}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {acao.parcela}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {formatCurrency(acao.valor)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Venc.: {acao.vencimento}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-3">
        {feedTab !== 'feitos' && (
          <>
            <button
              onClick={() => onWhatsApp(acao)}
              className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
              title="Enviar WhatsApp"
            >
              <MessageCircle size={16} />
            </button>
            <button
              onClick={() => onMarcarPago(acao.id)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Marcar como pago"
            >
              <CheckCircle2 size={16} />
            </button>
          </>
        )}
        <button
          onClick={() => onAcaoMenu(acao.id)}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}
