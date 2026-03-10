/*
  Unificação de leads do quiz na tabela crm_leads

  - crm_leads vira a fonte única de leads.
  - Leads do quiz usam origem = 'Quiz' e id_quiz preenchido.
  - Tabelas relacionais passam a referenciar crm_leads(id).
*/

BEGIN;

-- 1) Estrutura em crm_leads para origem quiz
ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS id_quiz UUID REFERENCES public.crm_quiz(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_leads_quiz ON public.crm_leads(id_quiz);

-- 2) Backfill opcional de crm_leads_quiz -> crm_leads (mantendo o mesmo id)
INSERT INTO public.crm_leads (
  id,
  id_empresa,
  id_quiz,
  nome,
  email,
  whatsapp,
  telefone,
  score_qualificacao,
  origem,
  status_conversao,
  dados_extras,
  criado_em,
  atualizado_em
)
SELECT
  lq.id,
  q.id_empresa,
  lq.id_quiz,
  COALESCE(NULLIF(TRIM(lq.nome), ''), 'Novo Lead'),
  lq.email,
  lq.whatsapp,
  NULL,
  COALESCE(lq.score_total, 0),
  'Quiz',
  'novo',
  jsonb_build_object('migrado_de', 'crm_leads_quiz'),
  COALESCE(lq.criado_em, now()),
  COALESCE(lq.criado_em, now())
FROM public.crm_leads_quiz lq
JOIN public.crm_quiz q ON q.id = lq.id_quiz
ON CONFLICT (id) DO NOTHING;

-- 3) FKs de id_lead passam a apontar para crm_leads
DO $$
DECLARE
  _constraint_name text;
BEGIN
  -- crm_quiz_respostas.id_lead
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'crm_quiz_respostas'
      AND column_name = 'id_lead'
  ) THEN
    FOR _constraint_name IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
      WHERE n.nspname = 'public'
        AND t.relname = 'crm_quiz_respostas'
        AND c.contype = 'f'
        AND a.attname = 'id_lead'
    LOOP
      EXECUTE format('ALTER TABLE public.crm_quiz_respostas DROP CONSTRAINT IF EXISTS %I', _constraint_name);
    END LOOP;

    ALTER TABLE public.crm_quiz_respostas
      ADD CONSTRAINT crm_quiz_respostas_id_lead_fkey
      FOREIGN KEY (id_lead) REFERENCES public.crm_leads(id) ON DELETE CASCADE;
  END IF;

  -- crm_pipeline_leads.id_lead
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'crm_pipeline_leads'
      AND column_name = 'id_lead'
  ) THEN
    FOR _constraint_name IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
      WHERE n.nspname = 'public'
        AND t.relname = 'crm_pipeline_leads'
        AND c.contype = 'f'
        AND a.attname = 'id_lead'
    LOOP
      EXECUTE format('ALTER TABLE public.crm_pipeline_leads DROP CONSTRAINT IF EXISTS %I', _constraint_name);
    END LOOP;

    ALTER TABLE public.crm_pipeline_leads
      ADD CONSTRAINT crm_pipeline_leads_id_lead_fkey
      FOREIGN KEY (id_lead) REFERENCES public.crm_leads(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4) RLS em crm_leads para captura pública do quiz
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Empresa gerencia crm_leads" ON public.crm_leads;
CREATE POLICY "Empresa gerencia crm_leads"
ON public.crm_leads FOR ALL
TO authenticated
USING (
  id_empresa IN (
    SELECT m.id_empresa
    FROM public.sis_membros_equipe m
    WHERE m.id_usuario = auth.uid()
  )
)
WITH CHECK (
  id_empresa IN (
    SELECT m.id_empresa
    FROM public.sis_membros_equipe m
    WHERE m.id_usuario = auth.uid()
  )
);

DROP POLICY IF EXISTS "Public insert lead quiz em crm_leads" ON public.crm_leads;
CREATE POLICY "Public insert lead quiz em crm_leads"
ON public.crm_leads FOR INSERT
TO anon, authenticated
WITH CHECK (
  origem = 'Quiz'
  AND id_quiz IS NOT NULL
  AND id_quiz IN (SELECT q.id FROM public.crm_quiz q WHERE q.ativo = true)
  AND id_empresa = (
    SELECT q.id_empresa
    FROM public.crm_quiz q
    WHERE q.id = crm_leads.id_quiz
  )
);

DROP POLICY IF EXISTS "Public update lead quiz em crm_leads" ON public.crm_leads;
CREATE POLICY "Public update lead quiz em crm_leads"
ON public.crm_leads FOR UPDATE
TO anon, authenticated
USING (
  origem = 'Quiz'
  AND id_quiz IN (SELECT q.id FROM public.crm_quiz q WHERE q.ativo = true)
)
WITH CHECK (
  origem = 'Quiz'
  AND id_quiz IN (SELECT q.id FROM public.crm_quiz q WHERE q.ativo = true)
  AND id_empresa = (
    SELECT q.id_empresa
    FROM public.crm_quiz q
    WHERE q.id = crm_leads.id_quiz
  )
);

-- 5) Ajuste de policies que dependem de id_lead de quiz
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'crm_quiz_respostas'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Public insert respostas quiz (anon+auth)" ON public.crm_quiz_respostas';
    EXECUTE 'DROP POLICY IF EXISTS "Public delete respostas quiz (anon+auth)" ON public.crm_quiz_respostas';

    EXECUTE '
      CREATE POLICY "Public insert respostas quiz (anon+auth)"
      ON public.crm_quiz_respostas FOR INSERT
      TO anon, authenticated
      WITH CHECK (
        id_lead IN (
          SELECT l.id
          FROM public.crm_leads l
          JOIN public.crm_quiz q ON q.id = l.id_quiz
          WHERE l.origem = ''Quiz''
            AND q.ativo = true
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
          FROM public.crm_leads l
          JOIN public.crm_quiz q ON q.id = l.id_quiz
          WHERE l.origem = ''Quiz''
            AND q.ativo = true
        )
      )
    ';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'crm_pipeline_leads'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Public insert pipeline_leads quiz (anon+auth)" ON public.crm_pipeline_leads';

    EXECUTE '
      CREATE POLICY "Public insert pipeline_leads quiz (anon+auth)"
      ON public.crm_pipeline_leads FOR INSERT
      TO anon, authenticated
      WITH CHECK (
        id_lead IN (
          SELECT l.id
          FROM public.crm_leads l
          JOIN public.crm_quiz q ON q.id = l.id_quiz
          WHERE l.origem = ''Quiz''
            AND q.ativo = true
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

COMMIT;

