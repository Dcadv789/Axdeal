/*
  # Adicionar campos de Acréscimo e Observações Internas

  1. Mudanças na tabela `propostas`:
    - Adicionar coluna `valor_acrescimo` (numeric, default 0.00)
      - Para armazenar acréscimos gerais na proposta
    - Adicionar coluna `observacoes_internas` (text, nullable)
      - Para observações internas que não são visíveis ao cliente
  
  2. Notas Importantes:
    - O campo `valor_frete_outros` continua existindo para frete
    - O campo `observacoes_cliente` será usado como "Observações" públicas
    - O campo `observacoes_internas` é para uso interno da empresa
*/

-- Adicionar coluna valor_acrescimo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'propostas' 
      AND column_name = 'valor_acrescimo'
  ) THEN
    ALTER TABLE propostas 
    ADD COLUMN valor_acrescimo NUMERIC(10,2) DEFAULT 0.00;
  END IF;
END $$;

-- Adicionar coluna observacoes_internas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'propostas' 
      AND column_name = 'observacoes_internas'
  ) THEN
    ALTER TABLE propostas 
    ADD COLUMN observacoes_internas TEXT;
  END IF;
END $$;
