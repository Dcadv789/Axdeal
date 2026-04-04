BEGIN;

-- 1) Garante função do pipeline robusta (sem depender de permissões do usuário final)
CREATE OR REPLACE FUNCTION public.crm_fn_aplicar_valor_estimado_padrao_pipeline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id_pipeline IS NULL OR NEW.id_lead IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' OR NEW.id_pipeline IS DISTINCT FROM OLD.id_pipeline THEN
    UPDATE public.crm_leads l
    SET
      valor_estimado_contrato = COALESCE(l.valor_estimado_contrato, p.valor_estimado_padrao),
      atualizado_em = NOW()
    FROM public.crm_pipelines p
    WHERE l.id = NEW.id_lead
      AND p.id = NEW.id_pipeline
      AND p.valor_estimado_padrao IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Preenche valor já no INSERT/UPDATE do lead vindo de quiz
CREATE OR REPLACE FUNCTION public.crm_fn_aplicar_valor_estimado_padrao_no_lead_quiz()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valor_padrao NUMERIC(14,2);
BEGIN
  -- Respeita valor já definido manualmente
  IF NEW.valor_estimado_contrato IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.id_quiz IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.valor_estimado_padrao
  INTO v_valor_padrao
  FROM public.crm_quiz q
  JOIN public.crm_pipelines p ON p.id = q.id_pipeline
  WHERE q.id = NEW.id_quiz
  LIMIT 1;

  IF v_valor_padrao IS NOT NULL THEN
    NEW.valor_estimado_contrato := v_valor_padrao;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_leads_aplicar_valor_padrao_quiz ON public.crm_leads;
CREATE TRIGGER trg_crm_leads_aplicar_valor_padrao_quiz
BEFORE INSERT OR UPDATE OF id_quiz, valor_estimado_contrato
ON public.crm_leads
FOR EACH ROW
EXECUTE FUNCTION public.crm_fn_aplicar_valor_estimado_padrao_no_lead_quiz();

-- 3) Backfill para leads já criados sem valor
UPDATE public.crm_leads l
SET
  valor_estimado_contrato = p.valor_estimado_padrao,
  atualizado_em = NOW()
FROM public.crm_quiz q
JOIN public.crm_pipelines p ON p.id = q.id_pipeline
WHERE l.id_quiz = q.id
  AND p.valor_estimado_padrao IS NOT NULL
  AND l.valor_estimado_contrato IS NULL;

COMMIT;
