-- Adicionar tipo multipla_selecao (usuário pode marcar várias opções)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.crm_questoes'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%tipo_questao%'
  LOOP
    EXECUTE format('ALTER TABLE crm_questoes DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE crm_questoes ADD CONSTRAINT crm_questoes_tipo_questao_check
  CHECK (tipo_questao IN ('multipla_escolha', 'multipla_selecao', 'contato', 'resultado', 'informativo'));

ALTER TABLE crm_questoes
  ADD COLUMN IF NOT EXISTS id_proxima_questao_selecao UUID REFERENCES crm_questoes(id) ON DELETE SET NULL;

COMMENT ON COLUMN crm_questoes.id_proxima_questao_selecao IS 'No bloco multipla_selecao: próxima pergunta após Continuar. Se null, segue por ordem.';
