/*
  CRM Pipelines (Funil de Vendas)

  - crm_pipelines: pipelines da empresa
  - crm_pipeline_etapas: etapas de cada pipeline
  - crm_pipeline_leads: vinculo do lead de quiz com pipeline/etapa
  - crm_quiz.id_pipeline: configuracao de pipeline por quiz
*/

-- Pipeline principal
CREATE TABLE IF NOT EXISTS public.crm_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empresa UUID NOT NULL REFERENCES public.sis_empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_pipelines_empresa
  ON public.crm_pipelines(id_empresa);

-- Etapas do pipeline
CREATE TABLE IF NOT EXISTS public.crm_pipeline_etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_pipeline UUID NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INT4 NOT NULL,
  cor TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT crm_pipeline_etapas_ordem_unique UNIQUE (id_pipeline, ordem)
);

CREATE INDEX IF NOT EXISTS idx_crm_pipeline_etapas_pipeline
  ON public.crm_pipeline_etapas(id_pipeline);

-- Vinculo lead x pipeline/etapa
CREATE TABLE IF NOT EXISTS public.crm_pipeline_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_pipeline UUID NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  id_etapa UUID REFERENCES public.crm_pipeline_etapas(id) ON DELETE SET NULL,
  id_lead UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT crm_pipeline_leads_lead_unique UNIQUE (id_lead)
);

CREATE INDEX IF NOT EXISTS idx_crm_pipeline_leads_pipeline
  ON public.crm_pipeline_leads(id_pipeline);

CREATE INDEX IF NOT EXISTS idx_crm_pipeline_leads_etapa
  ON public.crm_pipeline_leads(id_etapa);

CREATE INDEX IF NOT EXISTS idx_crm_pipeline_leads_lead
  ON public.crm_pipeline_leads(id_lead);

-- Quiz aponta para pipeline de entrada dos leads
ALTER TABLE public.crm_quiz
  ADD COLUMN IF NOT EXISTS id_pipeline UUID REFERENCES public.crm_pipelines(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_quiz_pipeline
  ON public.crm_quiz(id_pipeline);

-- RLS
ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pipeline_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pipeline_leads ENABLE ROW LEVEL SECURITY;

-- Empresa autenticada gerencia seus pipelines
DROP POLICY IF EXISTS "Empresa gerencia crm_pipelines" ON public.crm_pipelines;
CREATE POLICY "Empresa gerencia crm_pipelines"
ON public.crm_pipelines FOR ALL
TO authenticated
USING (
  id_empresa IN (
    SELECT id_empresa
    FROM public.sis_membros_equipe
    WHERE id_usuario = auth.uid()
  )
)
WITH CHECK (
  id_empresa IN (
    SELECT id_empresa
    FROM public.sis_membros_equipe
    WHERE id_usuario = auth.uid()
  )
);

DROP POLICY IF EXISTS "Empresa gerencia crm_pipeline_etapas" ON public.crm_pipeline_etapas;
CREATE POLICY "Empresa gerencia crm_pipeline_etapas"
ON public.crm_pipeline_etapas FOR ALL
TO authenticated
USING (
  id_pipeline IN (
    SELECT p.id
    FROM public.crm_pipelines p
    WHERE p.id_empresa IN (
      SELECT id_empresa
      FROM public.sis_membros_equipe
      WHERE id_usuario = auth.uid()
    )
  )
)
WITH CHECK (
  id_pipeline IN (
    SELECT p.id
    FROM public.crm_pipelines p
    WHERE p.id_empresa IN (
      SELECT id_empresa
      FROM public.sis_membros_equipe
      WHERE id_usuario = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Empresa gerencia crm_pipeline_leads" ON public.crm_pipeline_leads;
CREATE POLICY "Empresa gerencia crm_pipeline_leads"
ON public.crm_pipeline_leads FOR ALL
TO authenticated
USING (
  id_pipeline IN (
    SELECT p.id
    FROM public.crm_pipelines p
    WHERE p.id_empresa IN (
      SELECT id_empresa
      FROM public.sis_membros_equipe
      WHERE id_usuario = auth.uid()
    )
  )
)
WITH CHECK (
  id_pipeline IN (
    SELECT p.id
    FROM public.crm_pipelines p
    WHERE p.id_empresa IN (
      SELECT id_empresa
      FROM public.sis_membros_equipe
      WHERE id_usuario = auth.uid()
    )
  )
);

-- Publico do quiz (anon): permite gravar vinculo do lead no pipeline
DROP POLICY IF EXISTS "Anon insere crm_pipeline_leads em quiz ativo" ON public.crm_pipeline_leads;
CREATE POLICY "Anon insere crm_pipeline_leads em quiz ativo"
ON public.crm_pipeline_leads FOR INSERT
TO anon
WITH CHECK (
  id_lead IN (
    SELECT l.id
    FROM public.crm_leads l
    JOIN public.crm_quiz q ON q.id = l.id_quiz
    WHERE q.ativo = true
      AND q.id_pipeline = crm_pipeline_leads.id_pipeline
      AND l.origem = 'Quiz'
  )
  AND (
    id_etapa IS NULL
    OR id_etapa IN (
      SELECT e.id
      FROM public.crm_pipeline_etapas e
      WHERE e.id_pipeline = crm_pipeline_leads.id_pipeline
    )
  )
);

-- Publico do quiz (anon): permite ajustar dados do lead durante o preenchimento
DROP POLICY IF EXISTS "Anon atualiza lead de quiz ativo" ON public.crm_leads;
CREATE POLICY "Anon atualiza lead de quiz ativo"
ON public.crm_leads FOR UPDATE
TO anon
USING (
  origem = 'Quiz'
  AND id_quiz IN (
    SELECT id FROM public.crm_quiz WHERE ativo = true
  )
)
WITH CHECK (
  origem = 'Quiz'
  AND id_quiz IN (
    SELECT id FROM public.crm_quiz WHERE ativo = true
  )
);

-- Publico do quiz (anon): respostas granulares
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'crm_quiz_respostas'
  ) THEN
    EXECUTE 'ALTER TABLE public.crm_quiz_respostas ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "Anon insere respostas granulares de quiz ativo" ON public.crm_quiz_respostas';
    EXECUTE '
      CREATE POLICY "Anon insere respostas granulares de quiz ativo"
      ON public.crm_quiz_respostas FOR INSERT
      TO anon
      WITH CHECK (
        id_lead IN (
          SELECT l.id
          FROM public.crm_leads l
          JOIN public.crm_quiz q ON q.id = l.id_quiz
          WHERE q.ativo = true AND l.origem = ''Quiz''
        )
      )
    ';

    EXECUTE 'DROP POLICY IF EXISTS "Anon remove respostas granulares de quiz ativo" ON public.crm_quiz_respostas';
    EXECUTE '
      CREATE POLICY "Anon remove respostas granulares de quiz ativo"
      ON public.crm_quiz_respostas FOR DELETE
      TO anon
      USING (
        id_lead IN (
          SELECT l.id
          FROM public.crm_leads l
          JOIN public.crm_quiz q ON q.id = l.id_quiz
          WHERE q.ativo = true AND l.origem = ''Quiz''
        )
      )
    ';
  END IF;
END $$;
