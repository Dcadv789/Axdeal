/*
  # Adicionar tipos de período para configurações

  1. Mudanças
    - Adiciona coluna `validade_proposta_tipo` para armazenar se é dias/meses/anos
    - Adiciona coluna `prazo_garantia_padrao_tipo` para armazenar se é dias/meses/anos
    - Adiciona coluna `prazo_entrega_padrao_tipo` para armazenar se é dias/meses/anos
  
  2. Notas
    - Valores padrão definidos como 'dias' para manter compatibilidade com dados existentes
    - Permite que o usuário escolha a unidade de tempo mais apropriada
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'configuracoes' AND column_name = 'validade_proposta_tipo'
  ) THEN
    ALTER TABLE configuracoes ADD COLUMN validade_proposta_tipo varchar(10) DEFAULT 'dias';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'configuracoes' AND column_name = 'prazo_garantia_padrao_tipo'
  ) THEN
    ALTER TABLE configuracoes ADD COLUMN prazo_garantia_padrao_tipo varchar(10) DEFAULT 'dias';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'configuracoes' AND column_name = 'prazo_entrega_padrao_tipo'
  ) THEN
    ALTER TABLE configuracoes ADD COLUMN prazo_entrega_padrao_tipo varchar(10) DEFAULT 'dias';
  END IF;
END $$;