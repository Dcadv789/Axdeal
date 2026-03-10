-- =============================================================
-- MIGRAÇÃO: Padronização de nomenclatura PT-BR com prefixos
-- sis_ = sistema/global
-- erp_ = financeiro/vendas
-- crm_ = marketing/leads
-- =============================================================

BEGIN;

-- ----- SISTEMA (sis_) -----
ALTER TABLE IF EXISTS empresas          RENAME TO sis_empresas;
ALTER TABLE IF EXISTS configuracoes     RENAME TO sis_configuracoes;
ALTER TABLE IF EXISTS cargos            RENAME TO sis_cargos;
ALTER TABLE IF EXISTS membros_equipe    RENAME TO sis_membros_equipe;
ALTER TABLE IF EXISTS fila_notificacoes RENAME TO sis_fila_notificacoes;
ALTER TABLE IF EXISTS notificacao_logs  RENAME TO sis_notificacao_logs;

-- ----- ERP (erp_) -----
ALTER TABLE IF EXISTS clientes            RENAME TO erp_clientes;
ALTER TABLE IF EXISTS catalogo_itens      RENAME TO erp_catalogo;
ALTER TABLE IF EXISTS condicoes_pagamento RENAME TO erp_condicoes_pagamento;
ALTER TABLE IF EXISTS propostas           RENAME TO erp_propostas;
ALTER TABLE IF EXISTS vendas              RENAME TO erp_vendas;
ALTER TABLE IF EXISTS faturas             RENAME TO erp_faturas;
ALTER TABLE IF EXISTS parcelas            RENAME TO erp_parcelas;
ALTER TABLE IF EXISTS termos_garantia     RENAME TO erp_termos_garantia;
ALTER TABLE IF EXISTS notas_rodape        RENAME TO erp_notas_rodape;
ALTER TABLE IF EXISTS vendedores          RENAME TO erp_vendedores;
ALTER TABLE IF EXISTS proposal_settings   RENAME TO erp_configuracoes_proposta;
ALTER TABLE IF EXISTS itens_movimentacao  RENAME TO erp_itens_movimentacao;

-- ----- CRM (crm_) -----
CREATE TABLE IF NOT EXISTS crm_leads (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  id_empresa      UUID NOT NULL REFERENCES sis_empresas(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  email           TEXT,
  whatsapp        TEXT,
  telefone        TEXT,
  score_qualificacao INTEGER DEFAULT 0,
  origem          TEXT DEFAULT 'manual',
  status_conversao TEXT DEFAULT 'novo',
  tags            TEXT[],
  dados_extras    JSONB DEFAULT '{}',
  observacoes     TEXT,
  criado_em       TIMESTAMPTZ DEFAULT now(),
  atualizado_em   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_leads_empresa ON crm_leads(id_empresa);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status  ON crm_leads(status_conversao);
CREATE INDEX IF NOT EXISTS idx_crm_leads_origem  ON crm_leads(origem);

COMMENT ON TABLE crm_leads IS 'Leads capturados pelo CRM (quiz, landing pages, importação)';

COMMIT;
