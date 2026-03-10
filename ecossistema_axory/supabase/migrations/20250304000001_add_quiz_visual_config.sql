-- Adicionar configurações visuais ao quiz (cores e logo)
ALTER TABLE crm_quiz
  ADD COLUMN IF NOT EXISTS cor_primaria TEXT DEFAULT '#0047FF',
  ADD COLUMN IF NOT EXISTS url_logo TEXT;

COMMENT ON COLUMN crm_quiz.cor_primaria IS 'Cor primária do quiz (hex)';
COMMENT ON COLUMN crm_quiz.url_logo IS 'URL da logo exibida no quiz';
