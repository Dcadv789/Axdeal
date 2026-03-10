import { Proposta } from '../types';

export const MOCK_PROPOSTAS: Proposta[] = [
  { id: 1, numero: 'P001', titulo: 'Proposta de Consultoria', cliente: 'João Silva', status: 'enviada', tipo: 'unico', valorTotal: 5000, dataEnvio: '2024-12-05' },
  { id: 2, numero: 'P002', titulo: 'Sistema de Gestão Empresarial', cliente: 'Maria Santos', status: 'aprovada', tipo: 'recorrente', valorTotal: 25000, dataEnvio: '2024-12-01' },
  { id: 3, numero: 'P003', titulo: 'Treinamento Corporativo', cliente: 'Carlos Costa', status: 'rascunho', tipo: 'unico', valorTotal: 8500, dataEnvio: '2024-12-08' },
  { id: 4, numero: 'P004', titulo: 'Auditoria Financeira', cliente: 'Ana Oliveira', status: 'recusada', tipo: 'recorrente', valorTotal: 12000, dataEnvio: '2024-11-28' },
  { id: 5, numero: 'P005', titulo: 'Consultoria em TI', cliente: 'Pedro Almeida', status: 'visualizada', tipo: 'unico', valorTotal: 7500, dataEnvio: '2024-12-10' },
  { id: 6, numero: 'P006', titulo: 'Manutenção Mensal', cliente: 'Empresa XYZ', status: 'aguardando_envio', tipo: 'recorrente', valorTotal: 3000, dataEnvio: '2024-12-03' },
  { id: 7, numero: 'P007', titulo: 'Proposta de Marketing Digital', cliente: 'Tech Solutions', status: 'expirada', tipo: 'unico', valorTotal: 15000, dataEnvio: '2024-11-15' },
];

export const STATUS_STYLES: Record<string, string> = {
  rascunho: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  aguardando_envio: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  enviada: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  visualizada: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
  em_negociacao: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  aprovada: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  recusada: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  expirada: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400',
};

export const STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  aguardando_envio: 'Aguardando Envio',
  enviada: 'Enviada',
  visualizada: 'Visualizada',
  em_negociacao: 'Em Negociação',
  aprovada: 'Aprovada',
  recusada: 'Recusada',
  expirada: 'Expirada',
};
