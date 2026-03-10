BEGIN;

ALTER TABLE public.crm_pipeline_etapas
  ADD COLUMN IF NOT EXISTS checklist_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS templates_whatsapp_json JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.crm_configuracoes_estrategicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empresa UUID NOT NULL REFERENCES public.sis_empresas(id) ON DELETE CASCADE,
  playbook_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT crm_configuracoes_estrategicas_empresa_unique UNIQUE (id_empresa)
);

CREATE INDEX IF NOT EXISTS idx_crm_config_estrategicas_empresa
  ON public.crm_configuracoes_estrategicas(id_empresa);

CREATE OR REPLACE FUNCTION public.crm_set_updated_em()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_config_estrategicas_set_updated_em ON public.crm_configuracoes_estrategicas;
CREATE TRIGGER trg_crm_config_estrategicas_set_updated_em
BEFORE UPDATE ON public.crm_configuracoes_estrategicas
FOR EACH ROW
EXECUTE FUNCTION public.crm_set_updated_em();

ALTER TABLE public.crm_configuracoes_estrategicas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Empresa gerencia crm_configuracoes_estrategicas" ON public.crm_configuracoes_estrategicas;
CREATE POLICY "Empresa gerencia crm_configuracoes_estrategicas"
ON public.crm_configuracoes_estrategicas
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_configuracoes_estrategicas TO authenticated;

COMMENT ON TABLE public.crm_configuracoes_estrategicas IS 'Configuracoes estrategicas globais do CRM por empresa.';
COMMENT ON COLUMN public.crm_configuracoes_estrategicas.playbook_json IS 'Configuracao de niveis e orientacoes do Sales Advisor.';
COMMENT ON COLUMN public.crm_pipeline_etapas.checklist_json IS 'Checklist configuravel por etapa do funil.';
COMMENT ON COLUMN public.crm_pipeline_etapas.templates_whatsapp_json IS 'Templates de WhatsApp configuraveis por etapa.';

COMMIT;
