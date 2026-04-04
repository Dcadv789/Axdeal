'use client';

export type ResultadosMenuId = 'financeiro' | 'comercial' | 'operacional' | 'projetos' | 'departamentos' | 'auditoria';

export type ResultadosFinanceiroTabId = 'visao_geral' | 'fluxo_caixa' | 'a_receber' | 'saldos';
export type ResultadosComercialTabId = 'funil_vendas' | 'faturamento' | 'performance';
export type ResultadosOperacionalTabId = 'ordens_servico' | 'contratos';
export type ResultadosProjetosTabId = 'rentabilidade' | 'departamentos';
export type ResultadosDepartamentosTabId = 'visao_geral' | 'orcamento_vs_realizado' | 'headcount';
export type ResultadosAuditoriaTabId = 'linha_tempo_fin' | 'logs_sistema';

export interface ResultadoKpiCard {
  id: string;
  label: string;
  value: string;
  helper: string;
}
