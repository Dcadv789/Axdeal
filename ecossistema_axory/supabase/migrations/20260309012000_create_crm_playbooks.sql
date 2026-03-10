BEGIN;

CREATE TABLE IF NOT EXISTS public.crm_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empresa UUID NOT NULL REFERENCES public.sis_empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  configuracao JSONB NOT NULL DEFAULT '{}'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_playbooks_empresa ON public.crm_playbooks(id_empresa);
CREATE INDEX IF NOT EXISTS idx_crm_playbooks_empresa_ativo ON public.crm_playbooks(id_empresa, ativo);

ALTER TABLE public.crm_pipelines
  ADD COLUMN IF NOT EXISTS id_playbook UUID REFERENCES public.crm_playbooks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_pipelines_id_playbook ON public.crm_pipelines(id_playbook);

CREATE OR REPLACE FUNCTION public.crm_set_updated_em()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_playbooks_set_updated_em ON public.crm_playbooks;
CREATE TRIGGER trg_crm_playbooks_set_updated_em
BEFORE UPDATE ON public.crm_playbooks
FOR EACH ROW
EXECUTE FUNCTION public.crm_set_updated_em();

CREATE OR REPLACE FUNCTION public.crm_validar_playbook_do_funil()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id_playbook IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.crm_playbooks pb
    WHERE pb.id = NEW.id_playbook
      AND pb.id_empresa = NEW.id_empresa
      AND pb.ativo = true
  ) THEN
    RAISE EXCEPTION 'Playbook invalido para este funil.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_validar_playbook_do_funil ON public.crm_pipelines;
CREATE TRIGGER trg_crm_validar_playbook_do_funil
BEFORE INSERT OR UPDATE OF id_playbook, id_empresa ON public.crm_pipelines
FOR EACH ROW
EXECUTE FUNCTION public.crm_validar_playbook_do_funil();

ALTER TABLE public.crm_playbooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Empresa gerencia crm_playbooks" ON public.crm_playbooks;
CREATE POLICY "Empresa gerencia crm_playbooks"
ON public.crm_playbooks
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_playbooks TO authenticated;

COMMENT ON TABLE public.crm_playbooks IS 'Playbooks comerciais por empresa para orientar atendimento de leads.';
COMMENT ON COLUMN public.crm_playbooks.configuracao IS 'JSON com niveis, foco e scripts por perfil (PF/PJ).';
COMMENT ON COLUMN public.crm_pipelines.id_playbook IS 'Playbook associado ao funil. Um playbook pode atender varios funis.';

COMMIT;
