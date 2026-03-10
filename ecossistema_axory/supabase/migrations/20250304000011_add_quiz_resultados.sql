-- Score máximo do quiz para escalar a pontuação (0-1000). Se null, usa 1000.
ALTER TABLE crm_quiz ADD COLUMN IF NOT EXISTS score_max INTEGER DEFAULT 1000;
COMMENT ON COLUMN crm_quiz.score_max IS 'Pontuação máxima do quiz para escalar o score exibido (0-1000).';

-- Tabela de resultados por nível de pontuação
-- Níveis: 1=0-300, 2=301-600, 3=601-850, 4=851-1000
CREATE TABLE IF NOT EXISTS crm_quiz_resultados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_quiz UUID NOT NULL REFERENCES crm_quiz(id) ON DELETE CASCADE,
  nivel INTEGER NOT NULL CHECK (nivel IN (1, 2, 3, 4)),
  titulo TEXT,
  texto TEXT,
  botao_texto TEXT,
  botao_url TEXT,
  UNIQUE(id_quiz, nivel)
);

CREATE INDEX IF NOT EXISTS idx_crm_quiz_resultados_quiz ON crm_quiz_resultados(id_quiz);

COMMENT ON TABLE crm_quiz_resultados IS 'Textos e botões por nível de pontuação: 1=0-300, 2=301-600, 3=601-850, 4=851-1000';

-- RLS
ALTER TABLE crm_quiz_resultados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresa vê resultados dos seus quizzes"
ON crm_quiz_resultados FOR ALL
TO authenticated
USING (
  id_quiz IN (
    SELECT id FROM crm_quiz
    WHERE id_empresa IN (
      SELECT id_empresa FROM sis_membros_equipe WHERE id_usuario = auth.uid()
    )
  )
)
WITH CHECK (
  id_quiz IN (
    SELECT id FROM crm_quiz
    WHERE id_empresa IN (
      SELECT id_empresa FROM sis_membros_equipe WHERE id_usuario = auth.uid()
    )
  )
);

-- Leitura pública para quiz ativo
CREATE POLICY "Resultados visíveis para quiz ativo"
ON crm_quiz_resultados FOR SELECT
TO anon
USING (
  id_quiz IN (SELECT id FROM crm_quiz WHERE ativo = true)
);
