-- Tamanho da logo no quiz (1 = menor, 10 = maior)
ALTER TABLE crm_quiz
  ADD COLUMN IF NOT EXISTS tamanho_logo INTEGER DEFAULT 5 CHECK (tamanho_logo >= 1 AND tamanho_logo <= 10);

COMMENT ON COLUMN crm_quiz.tamanho_logo IS 'Tamanho da logo: 1 (menor) a 10 (maior)';
