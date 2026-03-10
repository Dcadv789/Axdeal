import { STATUS_STYLES, STATUS_LABELS } from '../config/propostas';

export function getStatusBadge(status: string) {
  const normalizedStatus = status.toLowerCase();
  const styleClass = STATUS_STYLES[normalizedStatus] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
  const label = STATUS_LABELS[normalizedStatus] || 'Desconhecido';

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styleClass}`}>
      {label}
    </span>
  );
}
