/*
  # Adicionar campo id_vendedor na tabela propostas

  1. Alterações
    - Adiciona coluna `id_vendedor` (UUID, nullable) na tabela `propostas`
    - Foreign key para a tabela `vendedores`
    - Permite associar uma proposta a um vendedor
  
  2. Notas
    - Campo nullable para permitir propostas sem vendedor atribuído
    - Foreign key com ON DELETE SET NULL para manter integridade
*/

-- Adicionar coluna id_vendedor
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'propostas' 
      AND column_name = 'id_vendedor'
  ) THEN
    ALTER TABLE propostas 
    ADD COLUMN id_vendedor UUID REFERENCES vendedores(id) ON DELETE SET NULL;
    
    -- Criar índice para melhor performance
    CREATE INDEX IF NOT EXISTS idx_propostas_id_vendedor ON propostas(id_vendedor);
  END IF;
END $$;





