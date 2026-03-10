/*
  # Adicionar campo de cobrança recorrente

  1. Mudanças
    - Adiciona coluna `cobranca_recorrente` na tabela `propostas`
      - Tipo: boolean
      - Padrão: false
      - Indica se a proposta possui cobrança recorrente

  2. Notas
    - Campo não nulo com valor padrão false
    - Permite identificar propostas com modelo de cobrança recorrente
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'propostas' AND column_name = 'cobranca_recorrente'
  ) THEN
    ALTER TABLE propostas ADD COLUMN cobranca_recorrente boolean DEFAULT false NOT NULL;
  END IF;
END $$;