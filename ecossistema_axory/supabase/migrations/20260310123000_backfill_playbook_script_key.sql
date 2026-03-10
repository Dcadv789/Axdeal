BEGIN;

WITH candidatos AS (
  SELECT
    e.id,
    btrim(
      COALESCE(
        NULLIF(e.playbook_json ->> 'script', ''),
        NULLIF(e.playbook_json ->> 'script_whatsapp', ''),
        NULLIF(e.playbook_json ->> 'roteiro', ''),
        NULLIF(e.playbook_json ->> 'script_vendas', ''),
        NULLIF(e.playbook_json ->> 'descricao', ''),
        NULLIF(e.playbook_json ->> 'etapa_descricao', ''),
        NULLIF(e.playbook_json ->> 'o_que_e_etapa', '')
      )
    ) AS script
  FROM public.crm_pipeline_etapas e
)
UPDATE public.crm_pipeline_etapas e
SET playbook_json = jsonb_set(
  COALESCE(e.playbook_json, '{}'::jsonb),
  '{script}',
  to_jsonb(c.script),
  true
)
FROM candidatos c
WHERE c.id = e.id
  AND c.script IS NOT NULL
  AND c.script <> ''
  AND btrim(COALESCE(e.playbook_json ->> 'script', '')) = '';

COMMENT ON COLUMN public.crm_pipeline_etapas.playbook_json IS
'JSON da etapa do playbook por funil; usar a chave script para roteiro comercial da etapa.';

COMMIT;
