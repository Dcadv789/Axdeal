BEGIN;

ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS valor_estimado_contrato NUMERIC(14,2);

ALTER TABLE public.crm_pipelines
  ADD COLUMN IF NOT EXISTS valor_estimado_padrao NUMERIC(14,2);

COMMENT ON COLUMN public.crm_pipelines.valor_estimado_padrao IS
'Valor padrão estimado para novos leads vinculados ao funil.';

CREATE INDEX IF NOT EXISTS idx_crm_pipelines_valor_estimado_padrao
  ON public.crm_pipelines(valor_estimado_padrao);

CREATE OR REPLACE FUNCTION public.crm_fn_aplicar_valor_estimado_padrao_pipeline()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id_pipeline IS NULL OR NEW.id_lead IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' OR NEW.id_pipeline IS DISTINCT FROM OLD.id_pipeline THEN
    UPDATE public.crm_leads l
    SET
      valor_estimado_contrato = p.valor_estimado_padrao,
      atualizado_em = NOW()
    FROM public.crm_pipelines p
    WHERE l.id = NEW.id_lead
      AND p.id = NEW.id_pipeline
      AND p.valor_estimado_padrao IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_pipeline_leads_valor_padrao ON public.crm_pipeline_leads;

CREATE TRIGGER trg_crm_pipeline_leads_valor_padrao
AFTER INSERT OR UPDATE OF id_pipeline ON public.crm_pipeline_leads
FOR EACH ROW
EXECUTE FUNCTION public.crm_fn_aplicar_valor_estimado_padrao_pipeline();

UPDATE public.crm_leads l
SET
  valor_estimado_contrato = p.valor_estimado_padrao,
  atualizado_em = NOW()
FROM public.crm_pipeline_leads pl
JOIN public.crm_pipelines p ON p.id = pl.id_pipeline
WHERE l.id = pl.id_lead
  AND p.valor_estimado_padrao IS NOT NULL
  AND (l.valor_estimado_contrato IS NULL OR l.valor_estimado_contrato = 0);

COMMIT;
