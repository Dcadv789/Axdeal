BEGIN;

-- =========================
-- Garantias de RLS habilitado
-- =========================
ALTER TABLE IF EXISTS public.crm_quiz ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crm_questoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crm_opcoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crm_quiz_resultados ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crm_pipeline_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crm_pipeline_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crm_quiz_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crm_leads ENABLE ROW LEVEL SECURITY;

-- =========================
-- Leitura pública do quiz (anon + authenticated)
-- =========================
DROP POLICY IF EXISTS "quiz_public_select_active_crm_quiz" ON public.crm_quiz;
CREATE POLICY "quiz_public_select_active_crm_quiz"
ON public.crm_quiz FOR SELECT
TO anon, authenticated
USING (ativo = true);

DROP POLICY IF EXISTS "quiz_public_select_questoes" ON public.crm_questoes;
CREATE POLICY "quiz_public_select_questoes"
ON public.crm_questoes FOR SELECT
TO anon, authenticated
USING (
  id_quiz IN (
    SELECT q.id
    FROM public.crm_quiz q
    WHERE q.ativo = true
  )
);

DROP POLICY IF EXISTS "quiz_public_select_opcoes" ON public.crm_opcoes;
CREATE POLICY "quiz_public_select_opcoes"
ON public.crm_opcoes FOR SELECT
TO anon, authenticated
USING (
  id_questao IN (
    SELECT qu.id
    FROM public.crm_questoes qu
    JOIN public.crm_quiz q ON q.id = qu.id_quiz
    WHERE q.ativo = true
  )
);

DROP POLICY IF EXISTS "quiz_public_select_resultados" ON public.crm_quiz_resultados;
CREATE POLICY "quiz_public_select_resultados"
ON public.crm_quiz_resultados FOR SELECT
TO anon, authenticated
USING (
  id_quiz IN (
    SELECT q.id
    FROM public.crm_quiz q
    WHERE q.ativo = true
  )
);

DROP POLICY IF EXISTS "quiz_public_select_pipeline_etapas" ON public.crm_pipeline_etapas;
CREATE POLICY "quiz_public_select_pipeline_etapas"
ON public.crm_pipeline_etapas FOR SELECT
TO anon, authenticated
USING (
  id_pipeline IN (
    SELECT DISTINCT q.id_pipeline
    FROM public.crm_quiz q
    WHERE q.ativo = true
      AND q.id_pipeline IS NOT NULL
  )
);

-- =========================
-- Captura pública de lead no quiz (anon + authenticated)
-- =========================
DROP POLICY IF EXISTS "quiz_public_insert_crm_leads" ON public.crm_leads;
CREATE POLICY "quiz_public_insert_crm_leads"
ON public.crm_leads FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "quiz_public_update_crm_leads" ON public.crm_leads;
CREATE POLICY "quiz_public_update_crm_leads"
ON public.crm_leads FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "quiz_public_insert_pipeline_leads" ON public.crm_pipeline_leads;
CREATE POLICY "quiz_public_insert_pipeline_leads"
ON public.crm_pipeline_leads FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "quiz_public_update_pipeline_leads" ON public.crm_pipeline_leads;
CREATE POLICY "quiz_public_update_pipeline_leads"
ON public.crm_pipeline_leads FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "quiz_public_insert_respostas" ON public.crm_quiz_respostas;
CREATE POLICY "quiz_public_insert_respostas"
ON public.crm_quiz_respostas FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "quiz_public_delete_respostas" ON public.crm_quiz_respostas;
CREATE POLICY "quiz_public_delete_respostas"
ON public.crm_quiz_respostas FOR DELETE
TO anon, authenticated
USING (true);

-- =========================
-- Grants explícitos para evitar bloqueio por permissão de tabela
-- =========================
GRANT SELECT ON public.crm_quiz TO anon, authenticated;
GRANT SELECT ON public.crm_questoes TO anon, authenticated;
GRANT SELECT ON public.crm_opcoes TO anon, authenticated;
GRANT SELECT ON public.crm_quiz_resultados TO anon, authenticated;
GRANT SELECT ON public.crm_pipeline_etapas TO anon, authenticated;

GRANT INSERT, UPDATE ON public.crm_leads TO anon, authenticated;
GRANT INSERT, UPDATE ON public.crm_pipeline_leads TO anon, authenticated;
GRANT INSERT, DELETE ON public.crm_quiz_respostas TO anon, authenticated;

COMMIT;
