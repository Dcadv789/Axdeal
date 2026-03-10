-- Adiciona coluna rotulo em crm_opcoes (ex: "1", "2", "3" ou "A", "B", "C")
ALTER TABLE crm_opcoes ADD COLUMN IF NOT EXISTS rotulo TEXT;
