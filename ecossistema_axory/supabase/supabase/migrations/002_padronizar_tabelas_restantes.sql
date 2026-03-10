-- =============================================================
-- MIGRAÇÃO: Tabelas restantes - prefixos sis_ e erp_
-- Execute após 001_padronizar_nomenclatura.sql
-- =============================================================

BEGIN;

-- ----- SISTEMA (sis_) -----
ALTER TABLE IF EXISTS documentacao_sistema   RENAME TO sis_documentacao_sistema;
ALTER TABLE IF EXISTS keep_alive             RENAME TO sis_keep_alive;
ALTER TABLE IF EXISTS logs_sistema           RENAME TO sis_logs_sistema;
ALTER TABLE IF EXISTS informacoes_aplicacao  RENAME TO sis_informacoes_aplicacao;

-- ----- ERP (erp_) -----
ALTER TABLE IF EXISTS tipos_blocos_sistema   RENAME TO erp_tipos_blocos_sistema;
ALTER TABLE IF EXISTS portal_settings       RENAME TO erp_portal_settings;
ALTER TABLE IF EXISTS reguas_cobranca        RENAME TO erp_reguas_cobranca;
ALTER TABLE IF EXISTS modelos_texto          RENAME TO erp_modelos_texto;
ALTER TABLE IF EXISTS historico_pagamento    RENAME TO erp_historico_pagamento;

COMMIT;
