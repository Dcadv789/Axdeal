-- Nomes customizados para cada rota do quiz (ex: "PF", "PJ")
-- Mapeia rota-id -> nome (ex: {"rota-0": "PF", "rota-1": "PJ"})
ALTER TABLE crm_quiz ADD COLUMN IF NOT EXISTS rotas_nomes JSONB DEFAULT '{}';

COMMENT ON COLUMN crm_quiz.rotas_nomes IS 'Nomes customizados das rotas do quiz';
