export interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: string | number }>;
}

export interface Proposta {
  id: number;
  numero: string;
  titulo: string;
  cliente: string;
  status: 'rascunho' | 'aguardando_envio' | 'enviada' | 'visualizada' | 'aprovada' | 'recusada' | 'expirada';
  tipo?: 'unico' | 'recorrente';
  valorTotal?: number;
  dataEnvio?: string;
}

export type PropostaStatus = Proposta['status'];

export interface PageConfig {
  title: string;
  breadcrumbs: { label: string; href?: string }[];
}

export type PageType = 'negocios' | 'dashboard' | 'financeiro' | 'clientes' | 'configuracoes' | 'suporte';

export type ConfigTab = 'empresa' | 'usuarios' | 'perfil' | 'servicos' | 'parametros' | 'regua_cobranca' | 'configuracoes_proposta';
