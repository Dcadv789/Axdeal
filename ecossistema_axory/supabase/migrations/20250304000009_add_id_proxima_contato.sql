-- Bloco contato: para qual pergunta redirecionar após preencher o formulário
ALTER TABLE crm_questoes
  ADD COLUMN IF NOT EXISTS id_proxima_questao_contato UUID REFERENCES crm_questoes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contato_finaliza BOOLEAN DEFAULT false;

COMMENT ON COLUMN crm_questoes.id_proxima_questao_contato IS 'No bloco contato: próxima pergunta após preencher. Se null, segue por ordem.';
COMMENT ON COLUMN crm_questoes.contato_finaliza IS 'No bloco contato: se true, envia e finaliza (ignora id_proxima_questao_contato).';
