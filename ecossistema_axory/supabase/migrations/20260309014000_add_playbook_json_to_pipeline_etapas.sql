BEGIN;

ALTER TABLE public.crm_pipeline_etapas
  ADD COLUMN IF NOT EXISTS playbook_json JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.crm_pipeline_etapas.playbook_json IS 'Configuracao do playbook por etapa: nome e descricao da etapa.';

COMMIT;
