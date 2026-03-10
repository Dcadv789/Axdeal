BEGIN;

ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS status_negocio TEXT;

UPDATE public.crm_leads
SET status_negocio = CASE
  WHEN lower(btrim(coalesce(status_negocio, ''))) = 'ganho' THEN 'ganho'
  WHEN lower(btrim(coalesce(status_negocio, ''))) = 'perdido' THEN 'perdido'
  ELSE 'aberto'
END;

ALTER TABLE public.crm_leads
  ALTER COLUMN status_negocio SET DEFAULT 'aberto',
  ALTER COLUMN status_negocio SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'crm_leads_status_negocio_check'
  ) THEN
    ALTER TABLE public.crm_leads
      ADD CONSTRAINT crm_leads_status_negocio_check
      CHECK (status_negocio IN ('aberto', 'ganho', 'perdido'));
  END IF;
END $$;

ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS data_fechamento TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_perda TEXT;

UPDATE public.crm_leads
SET data_fechamento = COALESCE(data_fechamento, atualizado_em)
WHERE status_negocio IN ('ganho', 'perdido')
  AND data_fechamento IS NULL;

CREATE INDEX IF NOT EXISTS idx_crm_leads_status_negocio
  ON public.crm_leads(status_negocio);

CREATE INDEX IF NOT EXISTS idx_crm_leads_data_fechamento
  ON public.crm_leads(data_fechamento DESC);

CREATE INDEX IF NOT EXISTS idx_crm_leads_motivo_perda
  ON public.crm_leads(motivo_perda);

CREATE OR REPLACE VIEW public.crm_vw_relatorio_leads
WITH (security_invoker = true)
AS
SELECT
  l.id AS lead_id,
  l.id_empresa,
  l.id_quiz,
  l.nome,
  l.email,
  l.whatsapp,
  l.origem,
  l.utm_source,
  l.utm_medium,
  l.utm_campaign,
  l.utm_term,
  l.utm_content,
  l.utm_id,
  l.status_conversao,
  l.score_qualificacao,
  q.titulo AS quiz_titulo,
  q.slug AS quiz_slug,
  pl.id_pipeline AS pipeline_id,
  p.nome AS pipeline_nome,
  pl.id_etapa AS etapa_id,
  e.nome AS etapa_nome,
  e.ordem AS etapa_ordem,
  COALESCE(resp.qtd_respostas, 0) AS qtd_respostas,
  COALESCE(resp.score_respostas, 0) AS score_respostas,
  resp.ultimo_evento_em,
  l.criado_em,
  l.atualizado_em,
  l.status_negocio,
  l.data_fechamento,
  l.motivo_perda
FROM public.crm_leads l
LEFT JOIN public.crm_quiz q
  ON q.id = l.id_quiz
LEFT JOIN public.crm_pipeline_leads pl
  ON pl.id_lead = l.id
LEFT JOIN public.crm_pipelines p
  ON p.id = pl.id_pipeline
LEFT JOIN public.crm_pipeline_etapas e
  ON e.id = pl.id_etapa
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::INT AS qtd_respostas,
    COALESCE(SUM(r.valor_score), 0)::INT AS score_respostas,
    MAX(r.criado_em) AS ultimo_evento_em
  FROM public.crm_quiz_respostas r
  WHERE r.id_lead = l.id
) resp ON TRUE;

COMMENT ON COLUMN public.crm_leads.data_fechamento IS
'Data/hora do fechamento do negócio (ganho ou perdido).';

COMMENT ON COLUMN public.crm_leads.motivo_perda IS
'Texto livre com motivo da perda do negócio.';

COMMENT ON VIEW public.crm_vw_relatorio_leads IS
'View consolidada de leads para relatórios CRM (lead + quiz + pipeline + etapa + UTM + status de negócio + data de fechamento + motivo da perda + agregados de respostas).';

GRANT SELECT ON public.crm_vw_relatorio_leads TO authenticated;

COMMIT;
