import { ListTodo, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card } from '@axdeal/ui';
import AcaoCard from './AcaoCard';
import type { AcaoItem, FeedTab } from '../../types';

interface AcoesDoDiaProps {
  acoes: AcaoItem[];
  feedTabAtiva: FeedTab;
  setFeedTabAtiva: (tab: FeedTab) => void;
  onWhatsApp: (acao: AcaoItem) => void;
  onMarcarPago: (id: string) => void;
  onAcaoMenu: (id: string) => void;
}

export default function AcoesDoDia({
  acoes,
  feedTabAtiva,
  setFeedTabAtiva,
  onWhatsApp,
  onMarcarPago,
  onAcaoMenu,
}: AcoesDoDiaProps) {
  return (
    <Card>
      <div className="space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-[#E5E7EB] dark:border-[#262626]">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <ListTodo size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Ações do Dia
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Gerencie suas tarefas financeiras diárias
            </p>
          </div>
        </div>

        <div className="flex gap-2 border-b border-[#E5E7EB] dark:border-[#262626]">
          <button
            onClick={() => setFeedTabAtiva('fazer')}
            className={`relative px-4 py-2.5 text-sm font-medium transition-all ${
              feedTabAtiva === 'fazer'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <ListTodo size={16} />
              A Fazer
            </div>
            {feedTabAtiva === 'fazer' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
            )}
          </button>
          <button
            onClick={() => setFeedTabAtiva('pendencias')}
            className={`relative px-4 py-2.5 text-sm font-medium transition-all ${
              feedTabAtiva === 'pendencias'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              Pendências
            </div>
            {feedTabAtiva === 'pendencias' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
            )}
          </button>
          <button
            onClick={() => setFeedTabAtiva('feitos')}
            className={`relative px-4 py-2.5 text-sm font-medium transition-all ${
              feedTabAtiva === 'feitos'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              Feitos
            </div>
            {feedTabAtiva === 'feitos' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
            )}
          </button>
        </div>

        <div className="space-y-3">
          {acoes.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-green-600 dark:text-green-400" />
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Parabéns!
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Você já fez tudo o que precisava hoje
              </p>
            </div>
          ) : (
            acoes.map((acao) => (
              <AcaoCard
                key={acao.id}
                acao={acao}
                feedTab={feedTabAtiva}
                onWhatsApp={onWhatsApp}
                onMarcarPago={onMarcarPago}
                onAcaoMenu={onAcaoMenu}
              />
            ))
          )}
        </div>
      </div>
    </Card>
  );
}





