/*
  # Adicionar novos campos de identificação da empresa

  1. Alterações na Tabela `clientes`
    - Adicionar coluna `porte` (text, opcional) - Porte da empresa
    - Adicionar coluna `nome_socio` (text, opcional) - Nome do sócio principal
    - Adicionar coluna `qualificacao_socio` (text, opcional) - Qualificação do sócio
    - Adicionar coluna `natureza_juridica` (text, opcional) - Natureza jurídica da empresa
    - Adicionar coluna `opcao_pelo_simples` (text, opcional) - Se optante pelo Simples Nacional
    - Adicionar coluna `opcao_pelo_mei` (text, opcional) - Se optante pelo MEI
    - Adicionar coluna `telefone_contato` (text, opcional) - Telefone do contato
    - Adicionar coluna `site` (text, opcional) - Site da empresa
    - Adicionar coluna `instagram` (text, opcional) - Instagram da empresa
    - Remover coluna `site_instagram` (se existir)
  
  2. Notas Importantes
    - Todos os campos são opcionais
    - Campos serão preenchidos automaticamente pela API da Receita Federal
*/

-- Adicionar novos campos de identificação da empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'porte'
  ) THEN
    ALTER TABLE clientes ADD COLUMN porte text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'nome_socio'
  ) THEN
    ALTER TABLE clientes ADD COLUMN nome_socio text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'qualificacao_socio'
  ) THEN
    ALTER TABLE clientes ADD COLUMN qualificacao_socio text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'natureza_juridica'
  ) THEN
    ALTER TABLE clientes ADD COLUMN natureza_juridica text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'opcao_pelo_simples'
  ) THEN
    ALTER TABLE clientes ADD COLUMN opcao_pelo_simples text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'opcao_pelo_mei'
  ) THEN
    ALTER TABLE clientes ADD COLUMN opcao_pelo_mei text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'telefone_contato'
  ) THEN
    ALTER TABLE clientes ADD COLUMN telefone_contato text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'site'
  ) THEN
    ALTER TABLE clientes ADD COLUMN site text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'instagram'
  ) THEN
    ALTER TABLE clientes ADD COLUMN instagram text;
  END IF;
END $$;