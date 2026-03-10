/*
  # Adicionar configurações de e-mail e nota fiscal

  1. Alterações
    - Adicionar coluna `enviar_email_venda` (boolean) - Controla se deve enviar e-mail automático ao cliente após venda
    - Adicionar coluna `gerar_nf_automatica` (boolean) - Controla se deve gerar NF-e automaticamente após pagamento
  
  2. Valores Padrão
    - `enviar_email_venda` padrão TRUE
    - `gerar_nf_automatica` padrão FALSE
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'configuracoes' AND column_name = 'enviar_email_venda'
  ) THEN
    ALTER TABLE configuracoes ADD COLUMN enviar_email_venda boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'configuracoes' AND column_name = 'gerar_nf_automatica'
  ) THEN
    ALTER TABLE configuracoes ADD COLUMN gerar_nf_automatica boolean DEFAULT false;
  END IF;
END $$;