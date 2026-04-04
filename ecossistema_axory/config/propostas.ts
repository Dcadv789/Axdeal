import { Proposta } from '../types';

export const MOCK_PROPOSTAS: Proposta[] = [
  { id: 1, numero: 'P001', titulo: 'Proposta de Consultoria', cliente: 'João Silva', status: 'ENVIADA', tipo: 'unico', valorTotal: 5000, dataEnvio: '2024-12-05' },
  { id: 2, numero: 'P002', titulo: 'Sistema de Gestão Empresarial', cliente: 'Maria Santos', status: 'APROVADA', tipo: 'recorrente', valorTotal: 25000, dataEnvio: '2024-12-01' },
  { id: 3, numero: 'P003', titulo: 'Treinamento Corporativo', cliente: 'Carlos Costa', status: 'RASCUNHO', tipo: 'unico', valorTotal: 8500, dataEnvio: '2024-12-08' },
  { id: 4, numero: 'P004', titulo: 'Auditoria Financeira', cliente: 'Ana Oliveira', status: 'RECUSADA', tipo: 'recorrente', valorTotal: 12000, dataEnvio: '2024-11-28' },
  { id: 5, numero: 'P005', titulo: 'Consultoria em TI', cliente: 'Pedro Almeida', status: 'VISUALIZADA', tipo: 'unico', valorTotal: 7500, dataEnvio: '2024-12-10' },
  { id: 6, numero: 'P006', titulo: 'Manutenção Mensal', cliente: 'Empresa XYZ', status: 'AGUARDANDO_ENVIO', tipo: 'recorrente', valorTotal: 3000, dataEnvio: '2024-12-03' },
  { id: 7, numero: 'P007', titulo: 'Proposta de Marketing Digital', cliente: 'Tech Solutions', status: 'EXPIRADA', tipo: 'unico', valorTotal: 15000, dataEnvio: '2024-11-15' },
];

/** Normaliza status do banco para chave de lookup (MAIÃšSCULO_UNDERLINE) */
export function normalizarStatusParaLookup(valor: string): string {
  return (valor || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
}

// === PROPOSTAS (erp_propostas) - Valor DB -> Label UI ===
const PROPOSTAS_MAP: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  AGUARDANDO_ENVIO: 'Aguardando Envio',
  ENVIADA: 'Enviada',
  VISUALIZADA: 'Visualizada',
  EM_NEGOCIACAO: 'Em Negociação',
  APROVADA: 'Aprovada',
  RECUSADA: 'Recusada',
  EXPIRADA: 'Expirada',
  CANCELADA: 'Cancelada',
};

// === PEDIDOS DE VENDA (erp_pedidos_venda) - Valor DB -> Label UI ===
const PEDIDOS_VENDA_MAP: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  EM_ABERTO: 'Em Aberto',
  EM_ANDAMENTO: 'Em Andamento',
  ATENDIDO: 'Atendido',
  CANCELADO: 'Cancelado',
};

// === ORDEM DE SERVIÇO (erp_os) - Valor DB -> Label UI ===
const ORDEM_SERVICO_MAP: Record<string, string> = {
  EM_ABERTO: 'Em Aberto',
  EM_ANDAMENTO: 'Em Andamento',
  AGUARDANDO_PECA: 'Aguardando Peça',
  AGUARDANDO_RETIRADA: 'Aguardando Retirada',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

/** Labels para UI - aceita valor do DB (MAIÃšSCULO_UNDERLINE) e retorna texto amigável */
export const STATUS_LABELS: Record<string, string> = {
  ...PROPOSTAS_MAP,
  ...PEDIDOS_VENDA_MAP,
  ...ORDEM_SERVICO_MAP,
};

/** Estilos (classes CSS) para badges - chave = valor do DB (MAIÃšSCULO_UNDERLINE). Aceita também lowercase para compat. */
export const STATUS_STYLES: Record<string, string> = {
  // Propostas (manter como estava)
  RASCUNHO: 'bg-neutral-800 text-white ring-1 ring-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:ring-neutral-200',
  AGUARDANDO_ENVIO: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  ENVIADA: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  VISUALIZADA: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
  EM_NEGOCIACAO: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 ring-1 ring-violet-200 dark:ring-violet-800/60',
  APROVADA: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  RECUSADA: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  EXPIRADA: 'bg-orange-100 text-orange-800 ring-1 ring-orange-200 dark:bg-orange-900/40 dark:text-orange-200 dark:ring-orange-800/70',
  CANCELADA: 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400',
  // Pedidos de venda e Ordem de serviço (tom pastel, alinhado ao visual de propostas)
  EM_ABERTO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  EM_ANDAMENTO: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  ATENDIDO: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  CANCELADO: 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400',
  AGUARDANDO_PECA: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
  AGUARDANDO_RETIRADA: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
  CONCLUIDO: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

/** Para Kanban: aceita uppercase ou lowercase e retorna label */
export const PROPOSTA_STATUS_LABELS: Record<string, string> = { ...PROPOSTAS_MAP };
Object.keys(PROPOSTAS_MAP).forEach((k) => {
  PROPOSTA_STATUS_LABELS[k.toLowerCase()] = PROPOSTAS_MAP[k];
});

// Aliases lowercase para Kanban e componentes que normalizam para lowercase
[STATUS_STYLES, STATUS_LABELS].forEach((obj) => {
  Object.keys(obj)
    .filter((k) => k === k.toUpperCase())
    .forEach((k) => {
      obj[k.toLowerCase()] = obj[k];
    });
});

export { PROPOSTAS_MAP, PEDIDOS_VENDA_MAP, ORDEM_SERVICO_MAP };

/** OpçÃµes para select de status (value = DB, label = UI) - sem "Todos" */
export const STATUS_OPCOES_PROPOSTA: { value: string; label: string }[] = Object.entries(PROPOSTAS_MAP).map(
  ([value, label]) => ({ value, label })
);
export const STATUS_OPCOES_VENDA: { value: string; label: string }[] = Object.entries(PEDIDOS_VENDA_MAP).map(
  ([value, label]) => ({ value, label })
);
export const STATUS_OPCOES_OS: { value: string; label: string }[] = Object.entries(ORDEM_SERVICO_MAP).map(
  ([value, label]) => ({ value, label })
);

