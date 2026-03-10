BEGIN;

ALTER TABLE IF EXISTS public.crm_quiz ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crm_questoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crm_opcoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crm_pipeline_etapas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public quiz select active (anon+auth)" ON public.crm_quiz;
CREATE POLICY "Public quiz select active (anon+auth)"
ON public.crm_quiz FOR SELECT
TO anon, authenticated
USING (ativo = true);

DROP POLICY IF EXISTS "Public questoes select active quiz (anon+auth)" ON public.crm_questoes;
CREATE POLICY "Public questoes select active quiz (anon+auth)"
ON public.crm_questoes FOR SELECT
TO anon, authenticated
USING (
  id_quiz IN (
    SELECT q.id
    FROM public.crm_quiz q
    WHERE q.ativo = true
  )
);

DROP POLICY IF EXISTS "Public opcoes select active quiz (anon+auth)" ON public.crm_opcoes;
CREATE POLICY "Public opcoes select active quiz (anon+auth)"
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

DROP POLICY IF EXISTS "Public etapas select active quiz pipeline (anon+auth)" ON public.crm_pipeline_etapas;
CREATE POLICY "Public etapas select active quiz pipeline (anon+auth)"
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

GRANT SELECT ON public.crm_quiz TO anon, authenticated;
GRANT SELECT ON public.crm_questoes TO anon, authenticated;
GRANT SELECT ON public.crm_opcoes TO anon, authenticated;
GRANT SELECT ON public.crm_pipeline_etapas TO anon, authenticated;
GRANT INSERT, UPDATE ON public.crm_leads TO anon, authenticated;
GRANT INSERT ON public.crm_pipeline_leads TO anon, authenticated;
GRANT INSERT, DELETE ON public.crm_quiz_respostas TO anon, authenticated;

COMMIT;
