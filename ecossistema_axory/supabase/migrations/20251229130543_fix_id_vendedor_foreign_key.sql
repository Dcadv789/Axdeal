/*
  # Corrigir foreign key de id_vendedor na tabela propostas

  1. Problema
    - A coluna `id_vendedor` já existe na tabela `propostas`
    - Mas está referenciando `membros_equipe` ao invés de `vendedores`
    - Precisa ser atualizada para referenciar a nova tabela `vendedores`
  
  2. Solução
    - Remove a foreign key antiga (se existir)
    - Adiciona nova foreign key referenciando `vendedores`
    - Mantém os dados existentes (valores NULL ou inválidos serão mantidos)
*/

-- Verificar e remover foreign key antiga se existir
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  -- Buscar o nome da constraint de foreign key existente
  SELECT constraint_name INTO fk_name
  FROM information_schema.table_constraints
  WHERE table_schema = 'public'
    AND table_name = 'propostas'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%id_vendedor%';
  
  -- Se encontrou uma foreign key, removê-la
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE propostas DROP CONSTRAINT IF EXISTS %I', fk_name);
    RAISE NOTICE 'Foreign key antiga removida: %', fk_name;
  END IF;
END $$;

-- Limpar valores inválidos: definir como NULL os valores que não existem em vendedores
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  -- Contar quantos registros têm valores inválidos
  SELECT COUNT(*) INTO invalid_count
  FROM propostas p
  WHERE p.id_vendedor IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM vendedores v WHERE v.id = p.id_vendedor
    );
  
  IF invalid_count > 0 THEN
    -- Definir como NULL os valores que não existem em vendedores
    UPDATE propostas
    SET id_vendedor = NULL
    WHERE id_vendedor IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM vendedores WHERE id = propostas.id_vendedor
      );
    
    RAISE NOTICE 'Valores inválidos limpos: % registros atualizados', invalid_count;
  ELSE
    RAISE NOTICE 'Nenhum valor inválido encontrado';
  END IF;
END $$;

-- Adicionar nova foreign key referenciando vendedores
DO $$
BEGIN
  -- Verificar se a foreign key já existe com a referência correta
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'propostas'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'id_vendedor'
      AND ccu.table_name = 'vendedores'
  ) THEN
    -- Adicionar nova foreign key
    ALTER TABLE propostas
    ADD CONSTRAINT fk_propostas_id_vendedor
    FOREIGN KEY (id_vendedor)
    REFERENCES vendedores(id)
    ON DELETE SET NULL;
    
    RAISE NOTICE 'Foreign key criada: fk_propostas_id_vendedor';
  ELSE
    RAISE NOTICE 'Foreign key já existe corretamente';
  END IF;
END $$;

-- Garantir que o índice existe
CREATE INDEX IF NOT EXISTS idx_propostas_id_vendedor ON propostas(id_vendedor);

