BEGIN;

CREATE TABLE IF NOT EXISTS public.crm_custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empresa UUID NOT NULL REFERENCES public.sis_empresas(id) ON DELETE CASCADE,
  chave TEXT NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  opcoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.crm_custom_field_definitions
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS id_empresa UUID,
  ADD COLUMN IF NOT EXISTS chave TEXT,
  ADD COLUMN IF NOT EXISTS nome TEXT,
  ADD COLUMN IF NOT EXISTS tipo TEXT,
  ADD COLUMN IF NOT EXISTS opcoes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ordem INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.crm_custom_field_definitions
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id_empresa SET NOT NULL,
  ALTER COLUMN chave SET NOT NULL,
  ALTER COLUMN nome SET NOT NULL,
  ALTER COLUMN tipo SET NOT NULL,
  ALTER COLUMN opcoes SET DEFAULT '[]'::jsonb,
  ALTER COLUMN opcoes SET NOT NULL,
  ALTER COLUMN ordem SET DEFAULT 0,
  ALTER COLUMN ordem SET NOT NULL,
  ALTER COLUMN ativo SET DEFAULT true,
  ALTER COLUMN ativo SET NOT NULL,
  ALTER COLUMN criado_em SET DEFAULT NOW(),
  ALTER COLUMN criado_em SET NOT NULL,
  ALTER COLUMN atualizado_em SET DEFAULT NOW(),
  ALTER COLUMN atualizado_em SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'crm_custom_field_definitions_pkey'
      AND conrelid = 'public.crm_custom_field_definitions'::regclass
  ) THEN
    ALTER TABLE public.crm_custom_field_definitions
      ADD CONSTRAINT crm_custom_field_definitions_pkey PRIMARY KEY (id);
  END IF;
END $$;

ALTER TABLE public.crm_custom_field_definitions
  DROP CONSTRAINT IF EXISTS crm_custom_field_definitions_tipo_check;

ALTER TABLE public.crm_custom_field_definitions
  ADD CONSTRAINT crm_custom_field_definitions_tipo_check
  CHECK (tipo IN ('text', 'number', 'date', 'select'));

ALTER TABLE public.crm_custom_field_definitions
  DROP CONSTRAINT IF EXISTS crm_custom_field_definitions_opcoes_array_check;

ALTER TABLE public.crm_custom_field_definitions
  ADD CONSTRAINT crm_custom_field_definitions_opcoes_array_check
  CHECK (jsonb_typeof(opcoes) = 'array');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'crm_custom_field_definitions_empresa_chave_key'
      AND conrelid = 'public.crm_custom_field_definitions'::regclass
  ) THEN
    ALTER TABLE public.crm_custom_field_definitions
      ADD CONSTRAINT crm_custom_field_definitions_empresa_chave_key
      UNIQUE (id_empresa, chave);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'crm_custom_field_definitions_id_empresa_fkey'
      AND conrelid = 'public.crm_custom_field_definitions'::regclass
  ) THEN
    ALTER TABLE public.crm_custom_field_definitions
      ADD CONSTRAINT crm_custom_field_definitions_id_empresa_fkey
      FOREIGN KEY (id_empresa) REFERENCES public.sis_empresas(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crm_custom_fields_empresa
  ON public.crm_custom_field_definitions(id_empresa);

CREATE INDEX IF NOT EXISTS idx_crm_custom_fields_empresa_ativo_ordem
  ON public.crm_custom_field_definitions(id_empresa, ativo, ordem);

CREATE OR REPLACE FUNCTION public.crm_set_updated_em()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_custom_fields_set_updated_em ON public.crm_custom_field_definitions;
CREATE TRIGGER trg_crm_custom_fields_set_updated_em
BEFORE UPDATE ON public.crm_custom_field_definitions
FOR EACH ROW
EXECUTE FUNCTION public.crm_set_updated_em();

ALTER TABLE public.crm_custom_field_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Empresa gerencia crm_custom_field_definitions" ON public.crm_custom_field_definitions;
CREATE POLICY "Empresa gerencia crm_custom_field_definitions"
ON public.crm_custom_field_definitions
FOR ALL
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_custom_field_definitions TO authenticated;

COMMENT ON TABLE public.crm_custom_field_definitions IS 'Definicoes de campos personalizados do CRM por empresa.';
COMMENT ON COLUMN public.crm_custom_field_definitions.chave IS 'Identificador estavel do campo, usado no JSON dados_extras.';
COMMENT ON COLUMN public.crm_custom_field_definitions.opcoes IS 'Lista de opcoes para campos do tipo select.';

COMMIT;
