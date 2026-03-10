-- Campos a exibir no bloco de contato (nome, email, whatsapp)
-- Array de texto: ex. ['nome','email','whatsapp'] ou ['nome'] apenas
ALTER TABLE crm_questoes
  ADD COLUMN IF NOT EXISTS campos_contato TEXT[] DEFAULT ARRAY['nome','email','whatsapp'];

COMMENT ON COLUMN crm_questoes.campos_contato IS 'Campos a exibir no bloco contato: nome, email, whatsapp. Default: todos.';
