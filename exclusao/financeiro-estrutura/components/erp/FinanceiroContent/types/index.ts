export type MainTab = 'extrato' | 'contas_receber' | 'contas_pagar';
export type FeedTab = 'fazer' | 'pendencias' | 'feitos';
export type PeriodoFiltro = 'ultimos_7' | 'ultimos_15' | 'ultimos_30' | 'ultimos_60' | 'ultimos_90';

export interface ParcelaComDados {
  id: string;
  id_pedido_venda?: string | null;
  id_proposta?: string | null;
  id_os?: string | null;
  id_contrato?: string | null;
  id_despesa?: string | null;
  numero_parcela: number;
  valor_original: number;
  valor_pago: number | null;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  observacoes: string | null;
  nome_cliente?: string;
  nome_venda?: string;
}

export interface AcaoItem {
  id: string;
  tipo: 'cobranca' | 'pagamento' | 'followup';
  cliente: string;
  valor: number;
  vencimento: string;
  parcela: string;
  mensagem: string;
  destino: string;
  _isHoje?: boolean;
  notificacaoFilaId?: string;
  idParcela?: string;
  idRegua?: string;
  etapaIndex?: number;
}

export interface AgendaItem {
  dia: number;
  mes: number;
  valor: number;
}

export interface MenuPosition {
  top: number;
  right: number;
}





