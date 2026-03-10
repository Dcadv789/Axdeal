export interface Notificacao {
  numero: number;
  offset: number;
  unit: 'dias' | 'meses';
  direction: 'antes' | 'vencimento' | 'depois';
  channels: string[];
  subject: string;
  message: string;
}

export interface ReguaCobranca {
  id: string;
  id_empresa: string;
  nome: string;
  descricao: string | null;
  padrao: boolean;
  etapas: Notificacao[];
  ativa: boolean;
  criado_em: string;
  atualizado_em: string;
}

export type ModoEdicao = 'lista' | 'criar' | 'editar';

export interface ReguaFormData {
  nome: string;
  descricao: string;
  padrao: boolean;
}





