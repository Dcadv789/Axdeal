/*
  Fix RLS - Captura pública do quiz

  Problema:
  - Inserção em crm_leads_quiz falha para usuários com role authenticated
    ao testar o quiz público estando logado.

  Solução:
  - Permitir INSERT/UPDATE em crm_leads_quiz para anon e authenticated
    quando o quiz estiver ativo.
  - Permitir INSERT/DELETE em crm_quiz_respostas para anon e authenticated
    quando o lead pertencer a quiz ativo.
  - Permitir INSERT em crm_pipeline_leads para anon e authenticated
    quando o lead pertencer a quiz ativo e pipeline configurado no quiz.
*/

-- Garantir RLS habilitado
ALTER TABLE IF EXISTS public.crm_leads_quiz ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crm_quiz_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crm_pipeline_leads ENABLE ROW LEVEL SECURITY;

-- ============================================
-- crm_leads_quiz
-- ============================================

DROP POLICY IF EXISTS "Inserir lead do quiz" ON public.crm_leads_quiz;
DROP POLICY IF EXISTS "Public insert lead quiz (anon+auth)" ON public.crm_leads_quiz;
CREATE POLICY "Public insert lead quiz (anon+auth)"
ON public.crm_leads_quiz FOR INSERT
TO anon, authenticated
WITH CHECK (
  id_quiz IN (
    SELECT q.id
    FROM public.crm_quiz q
    WHERE q.ativo = true
  )
);

DROP POLICY IF EXISTS "Anon atualiza lead de quiz ativo" ON public.crm_leads_quiz;
DROP POLICY IF EXISTS "Public update lead quiz (anon+auth)" ON public.crm_leads_quiz;
CREATE POLICY "Public update lead quiz (anon+auth)"
ON public.crm_leads_quiz FOR UPDATE
TO anon, authenticated
USING (
  id_quiz IN (
    SELECT q.id
    FROM public.crm_quiz q
    WHERE q.ativo = true
  )
)
WITH CHECK (
  id_quiz IN (
    SELECT q.id
    FROM public.crm_quiz q
    WHERE q.ativo = true
  )
);

-- ============================================
-- crm_quiz_respostas
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'crm_quiz_respostas'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anon insere respostas granulares de quiz ativo" ON public.crm_quiz_respostas';
    EXECUTE 'DROP POLICY IF EXISTS "Anon remove respostas granulares de quiz ativo" ON public.crm_quiz_respostas';
    EXECUTE 'DROP POLICY IF EXISTS "Public insert respostas quiz (anon+auth)" ON public.crm_quiz_respostas';
    EXECUTE 'DROP POLICY IF EXISTS "Public delete respostas quiz (anon+auth)" ON public.crm_quiz_respostas';

    EXECUTE '
      CREATE POLICY "Public insert respostas quiz (anon+auth)"
      ON public.crm_quiz_respostas FOR INSERT
      TO anon, authenticated
      WITH CHECK (
        id_lead IN (
          SELECT l.id
          FROM public.crm_leads_quiz l
          JOIN public.crm_quiz q ON q.id = l.id_quiz
          WHERE q.ativo = true
        )
      )
    ';

    EXECUTE '
      CREATE POLICY "Public delete respostas quiz (anon+auth)"
      ON public.crm_quiz_respostas FOR DELETE
      TO anon, authenticated
      USING (
        id_lead IN (
          SELECT l.id
          FROM public.crm_leads_quiz l
          JOIN public.crm_quiz q ON q.id = l.id_quiz
          WHERE q.ativo = true
        )
      )
    ';
  END IF;
END $$;

-- ============================================
-- crm_pipeline_leads
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'crm_pipeline_leads'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anon insere crm_pipeline_leads em quiz ativo" ON public.crm_pipeline_leads';
    EXECUTE 'DROP POLICY IF EXISTS "Public insert pipeline_leads quiz (anon+auth)" ON public.crm_pipeline_leads';

    EXECUTE '
      CREATE POLICY "Public insert pipeline_leads quiz (anon+auth)"
      ON public.crm_pipeline_leads FOR INSERT
      TO anon, authenticated
      WITH CHECK (
        id_lead IN (
          SELECT l.id
          FROM public.crm_leads_quiz l
          JOIN public.crm_quiz q ON q.id = l.id_quiz
          WHERE q.ativo = true
            AND q.id_pipeline = crm_pipeline_leads.id_pipeline
        )
        AND (
          id_etapa IS NULL
          OR id_etapa IN (
            SELECT e.id
            FROM public.crm_pipeline_etapas e
            WHERE e.id_pipeline = crm_pipeline_leads.id_pipeline
          )
        )
      )
    ';
  END IF;
END $$;

