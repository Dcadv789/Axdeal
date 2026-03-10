/*
  # Adicionar coluna descricao em reguas_cobranca

  1. Alterações
    - Adicionar coluna `descricao` (text, nullable) - Descrição opcional da régua de cobrança
  
  2. Notas
    - Campo opcional para descrever o propósito da régua
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reguas_cobranca' AND column_name = 'descricao'
  ) THEN
    ALTER TABLE reguas_cobranca ADD COLUMN descricao text;
  END IF;
END $$;