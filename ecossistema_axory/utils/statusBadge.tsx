import { STATUS_STYLES, STATUS_LABELS, normalizarStatusParaLookup } from '../config/propostas';

export function getStatusBadge(status: string) {
  const key = normalizarStatusParaLookup(status);
  const pastelOverrides: Record<string, string> = {
    RASCUNHO: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300',
    EM_ABERTO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    EM_ANDAMENTO: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    ATENDIDO: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    CANCELADO: 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400',
    AGUARDANDO_PECA: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
    AGUARDANDO_RETIRADA: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
    CONCLUIDO: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  };
  const styleClass =
    pastelOverrides[key] || STATUS_STYLES[key] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
  const label = STATUS_LABELS[key] || status || 'Desconhecido';

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${styleClass}`}>
      {label}
    </span>
  );
}
