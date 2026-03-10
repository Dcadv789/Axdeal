-- Adicionar tipo de bloco informativo (disclaimer) e coluna texto_disclaimer
-- Remove apenas o CHECK que restringe tipo_questao (evita dropar NOT NULL e outros)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc
      ON cc.constraint_name = tc.constraint_name
      AND cc.constraint_schema = tc.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'crm_questoes'
      AND tc.constraint_type = 'CHECK'
      AND cc.check_clause LIKE '%multipla_escolha%'
  LOOP
    EXECUTE format('ALTER TABLE crm_questoes DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
  END LOOP;
END $$;

ALTER TABLE crm_questoes ADD CONSTRAINT crm_questoes_tipo_questao_check
  CHECK (tipo_questao IN ('multipla_escolha', 'contato', 'resultado', 'informativo'));

ALTER TABLE crm_questoes ADD COLUMN IF NOT EXISTS texto_disclaimer TEXT;

COMMENT ON COLUMN crm_questoes.texto_disclaimer IS 'Texto do disclaimer/termos (usado no bloco informativo)';
