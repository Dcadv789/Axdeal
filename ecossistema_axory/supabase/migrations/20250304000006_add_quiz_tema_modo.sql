-- Tema do funil: dark ou light
ALTER TABLE crm_quiz ADD COLUMN IF NOT EXISTS tema_modo TEXT DEFAULT 'light';

ALTER TABLE crm_quiz DROP CONSTRAINT IF EXISTS crm_quiz_tema_modo_check;
ALTER TABLE crm_quiz ADD CONSTRAINT crm_quiz_tema_modo_check
  CHECK (tema_modo IS NULL OR tema_modo IN ('light', 'dark'));

COMMENT ON COLUMN crm_quiz.tema_modo IS 'Tema do funil: light ou dark';
