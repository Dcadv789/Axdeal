export interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: string | number }>;
}

/** Status = valor do DB (MAIÚSCULO_UNDERLINE) */
export type PropostaStatusDb =
  | 'RASCUNHO'
  | 'AGUARDANDO_ENVIO'
  | 'ENVIADA'
  | 'VISUALIZADA'
  | 'EM_NEGOCIACAO'
  | 'APROVADA'
  | 'RECUSADA'
  | 'EXPIRADA'
  | 'CANCELADA';

export interface Proposta {
  id: number;
  numero: string;
  titulo: string;
  cliente: string;
  status: PropostaStatusDb | string;
  tipo?: 'unico' | 'recorrente';
  valorTotal?: number;
  dataEnvio?: string;
}


export interface PageConfig {
  title: string;
  breadcrumbs: { label: string; href?: string }[];
}

export type PageType = 'negocios' | 'dashboard' | 'financeiro' | 'resultados' | 'clientes' | 'configuracoes' | 'suporte';

export type ConfigTab = 'empresa' | 'usuarios' | 'perfil';
