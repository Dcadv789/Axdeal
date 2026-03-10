/*
  # Motor de Quiz Interativo - CRM

  1. Tabelas
    - crm_quiz: Quizzes por empresa
    - crm_questoes: Perguntas do quiz (multipla_escolha, contato, resultado)
    - crm_opcoes: Opções de resposta com navegação em grafo
    - crm_leads_quiz: Leads capturados pelo quiz

  2. Navegação
    - id_proxima_questao em crm_opcoes permite fluxo em grafo
    - Se null, segue para próxima questão por ordem
*/

-- crm_quiz
CREATE TABLE IF NOT EXISTS crm_quiz (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empresa UUID NOT NULL REFERENCES sis_empresas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  slug TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(slug)
);

CREATE INDEX IF NOT EXISTS idx_crm_quiz_slug ON crm_quiz(slug);
CREATE INDEX IF NOT EXISTS idx_crm_quiz_empresa ON crm_quiz(id_empresa);

-- crm_questoes
CREATE TABLE IF NOT EXISTS crm_questoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_quiz UUID NOT NULL REFERENCES crm_quiz(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  subtitulo TEXT,
  tipo_questao TEXT NOT NULL CHECK (tipo_questao IN ('multipla_escolha', 'contato', 'resultado')),
  ordem INTEGER NOT NULL DEFAULT 0,
  is_inicial BOOLEAN DEFAULT false,
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_questoes_quiz ON crm_questoes(id_quiz);
CREATE INDEX IF NOT EXISTS idx_crm_questoes_ordem ON crm_questoes(id_quiz, ordem);

-- crm_opcoes
CREATE TABLE IF NOT EXISTS crm_opcoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_questao UUID NOT NULL REFERENCES crm_questoes(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  valor_score INTEGER DEFAULT 0,
  id_proxima_questao UUID REFERENCES crm_questoes(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_opcoes_questao ON crm_opcoes(id_questao);

-- crm_leads_quiz (leads capturados pelo quiz)
CREATE TABLE IF NOT EXISTS crm_leads_quiz (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_quiz UUID NOT NULL REFERENCES crm_quiz(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT,
  whatsapp TEXT,
  score_total INTEGER DEFAULT 0,
  respostas_log JSONB DEFAULT '[]',
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_leads_quiz_quiz ON crm_leads_quiz(id_quiz);
CREATE INDEX IF NOT EXISTS idx_crm_leads_quiz_criado ON crm_leads_quiz(criado_em);

-- RLS: Quiz público (leitura anônima por slug)
ALTER TABLE crm_quiz ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_questoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_opcoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads_quiz ENABLE ROW LEVEL SECURITY;

-- Quiz ativo por slug: leitura pública
CREATE POLICY "Quiz ativo visível por slug"
ON crm_quiz FOR SELECT
TO anon
USING (ativo = true);

-- Questões e opções: leitura pública quando quiz ativo
CREATE POLICY "Questões visíveis para quiz ativo"
ON crm_questoes FOR SELECT
TO anon
USING (
  id_quiz IN (SELECT id FROM crm_quiz WHERE ativo = true)
);

CREATE POLICY "Opções visíveis para quiz ativo"
ON crm_opcoes FOR SELECT
TO anon
USING (
  id_questao IN (
    SELECT id FROM crm_questoes
    WHERE id_quiz IN (SELECT id FROM crm_quiz WHERE ativo = true)
  )
);

-- Inserir leads: público (captura do quiz)
CREATE POLICY "Inserir lead do quiz"
ON crm_leads_quiz FOR INSERT
TO anon
WITH CHECK (
  id_quiz IN (SELECT id FROM crm_quiz WHERE ativo = true)
);

-- Autenticados da empresa podem ver/gerir quiz e leads
CREATE POLICY "Empresa vê seus quizzes"
ON crm_quiz FOR ALL
TO authenticated
USING (
  id_empresa IN (
    SELECT id_empresa FROM sis_membros_equipe WHERE id_usuario = auth.uid()
  )
)
WITH CHECK (
  id_empresa IN (
    SELECT id_empresa FROM sis_membros_equipe WHERE id_usuario = auth.uid()
  )
);

CREATE POLICY "Empresa vê questões dos seus quizzes"
ON crm_questoes FOR ALL
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

CREATE POLICY "Empresa vê opções dos seus quizzes"
ON crm_opcoes FOR ALL
TO authenticated
USING (
  id_questao IN (
    SELECT q.id FROM crm_questoes q
    JOIN crm_quiz z ON q.id_quiz = z.id
    WHERE z.id_empresa IN (
      SELECT id_empresa FROM sis_membros_equipe WHERE id_usuario = auth.uid()
    )
  )
)
WITH CHECK (
  id_questao IN (
    SELECT q.id FROM crm_questoes q
    JOIN crm_quiz z ON q.id_quiz = z.id
    WHERE z.id_empresa IN (
      SELECT id_empresa FROM sis_membros_equipe WHERE id_usuario = auth.uid()
    )
  )
);

CREATE POLICY "Empresa vê leads dos seus quizzes"
ON crm_leads_quiz FOR SELECT
TO authenticated
USING (
  id_quiz IN (
    SELECT id FROM crm_quiz
    WHERE id_empresa IN (
      SELECT id_empresa FROM sis_membros_equipe WHERE id_usuario = auth.uid()
    )
  )
);

COMMENT ON TABLE crm_quiz IS 'Quizzes interativos do CRM';
COMMENT ON TABLE crm_questoes IS 'Perguntas do quiz (multipla_escolha, contato, resultado)';
COMMENT ON TABLE crm_opcoes IS 'Opções de resposta com navegação em grafo';
COMMENT ON TABLE crm_leads_quiz IS 'Leads capturados pelo quiz interativo';
