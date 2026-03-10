BEGIN;

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
  l.atualizado_em
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

ALTER TABLE public.crm_leads
  DROP COLUMN IF EXISTS telefone;

COMMENT ON VIEW public.crm_vw_relatorio_leads IS
'View consolidada de leads para relatorios CRM (lead + quiz + pipeline + etapa + agregados de respostas).';

GRANT SELECT ON public.crm_vw_relatorio_leads TO authenticated;

COMMIT;
