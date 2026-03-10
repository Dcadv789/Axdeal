BEGIN;

CREATE TABLE IF NOT EXISTS public.crm_interacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_lead UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  status TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.crm_interacoes
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS id_lead UUID,
  ADD COLUMN IF NOT EXISTS tipo TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS id_usuario UUID,
  ADD COLUMN IF NOT EXISTS autor_nome TEXT,
  ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.crm_interacoes
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN criado_em SET DEFAULT NOW(),
  ALTER COLUMN descricao SET NOT NULL,
  ALTER COLUMN tipo SET NOT NULL,
  ALTER COLUMN id_lead SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'crm_interacoes_pkey'
      AND conrelid = 'public.crm_interacoes'::regclass
  ) THEN
    ALTER TABLE public.crm_interacoes
      ADD CONSTRAINT crm_interacoes_pkey PRIMARY KEY (id);
  END IF;
END $$;

ALTER TABLE public.crm_interacoes
  DROP CONSTRAINT IF EXISTS crm_interacoes_tipo_check;

ALTER TABLE public.crm_interacoes
  ADD CONSTRAINT crm_interacoes_tipo_check
  CHECK (tipo IN ('Nota', 'WhatsApp', 'Ligação', 'E-mail'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'crm_interacoes_id_lead_fkey'
      AND conrelid = 'public.crm_interacoes'::regclass
  ) THEN
    ALTER TABLE public.crm_interacoes
      ADD CONSTRAINT crm_interacoes_id_lead_fkey
      FOREIGN KEY (id_lead) REFERENCES public.crm_leads(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crm_interacoes_lead ON public.crm_interacoes (id_lead);
CREATE INDEX IF NOT EXISTS idx_crm_interacoes_lead_criado_em ON public.crm_interacoes (id_lead, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_crm_interacoes_tipo ON public.crm_interacoes (tipo);

ALTER TABLE public.crm_interacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Empresa gerencia interacoes de leads" ON public.crm_interacoes;
CREATE POLICY "Empresa gerencia interacoes de leads"
ON public.crm_interacoes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.crm_leads l
    JOIN public.sis_membros_equipe me ON me.id_empresa = l.id_empresa
    WHERE l.id = crm_interacoes.id_lead
      AND me.id_usuario = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.crm_leads l
    JOIN public.sis_membros_equipe me ON me.id_empresa = l.id_empresa
    WHERE l.id = crm_interacoes.id_lead
      AND me.id_usuario = auth.uid()
  )
  AND (id_usuario IS NULL OR id_usuario = auth.uid())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_interacoes TO authenticated;

COMMENT ON TABLE public.crm_interacoes IS 'Histórico de interações manuais e automáticas do CRM por lead.';
COMMENT ON COLUMN public.crm_interacoes.tipo IS 'Tipos suportados: Nota, WhatsApp, Ligação, E-mail.';

COMMIT;
