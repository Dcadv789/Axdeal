/*
  # Criar tabela vendedores

  1. Nova tabela
    - Cria tabela `vendedores` para gerenciar vendedores
    - Permite associar com usuário do sistema (membros_equipe) ou cadastrar sem usuário
    - Suporta vendedores externos que não têm acesso ao sistema
  
  2. Estrutura
    - id: UUID (primary key)
    - id_empresa: UUID (foreign key para empresas)
    - id_usuario: UUID (nullable, foreign key para auth.users via membros_equipe)
    - nome_completo: TEXT (obrigatório)
    - email: TEXT (opcional)
    - telefone: TEXT (opcional)
    - status: TEXT (default 'ATIVO')
    - criado_em: TIMESTAMP
    - atualizado_em: TIMESTAMP
  
  3. Políticas RLS
    - SELECT: Usuários autenticados da mesma empresa
    - INSERT: Usuários autenticados da mesma empresa
    - UPDATE: Usuários autenticados da mesma empresa
    - DELETE: Usuários autenticados da mesma empresa
*/

-- Criar tabela vendedores
CREATE TABLE IF NOT EXISTS vendedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empresa UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  id_usuario UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nome_completo TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  status TEXT DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO')),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: nome_completo não pode ser vazio
  CONSTRAINT vendedores_nome_completo_check CHECK (LENGTH(TRIM(nome_completo)) > 0)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_vendedores_id_empresa ON vendedores(id_empresa);
CREATE INDEX IF NOT EXISTS idx_vendedores_id_usuario ON vendedores(id_usuario);
CREATE INDEX IF NOT EXISTS idx_vendedores_status ON vendedores(status);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_vendedores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at
CREATE TRIGGER trigger_update_vendedores_updated_at
  BEFORE UPDATE ON vendedores
  FOR EACH ROW
  EXECUTE FUNCTION update_vendedores_updated_at();

-- Habilitar RLS
ALTER TABLE vendedores ENABLE ROW LEVEL SECURITY;

-- Política de SELECT: Usuários autenticados podem ver vendedores da sua empresa
CREATE POLICY "Usuários podem ver vendedores da sua empresa"
ON vendedores
FOR SELECT
TO authenticated
USING (
  id_empresa IN (
    SELECT id_empresa 
    FROM membros_equipe 
    WHERE id_usuario = auth.uid()
  )
);

-- Política de INSERT: Usuários autenticados podem criar vendedores na sua empresa
CREATE POLICY "Usuários podem criar vendedores na sua empresa"
ON vendedores
FOR INSERT
TO authenticated
WITH CHECK (
  id_empresa IN (
    SELECT id_empresa 
    FROM membros_equipe 
    WHERE id_usuario = auth.uid()
  )
);

-- Política de UPDATE: Usuários autenticados podem atualizar vendedores da sua empresa
CREATE POLICY "Usuários podem atualizar vendedores da sua empresa"
ON vendedores
FOR UPDATE
TO authenticated
USING (
  id_empresa IN (
    SELECT id_empresa 
    FROM membros_equipe 
    WHERE id_usuario = auth.uid()
  )
)
WITH CHECK (
  id_empresa IN (
    SELECT id_empresa 
    FROM membros_equipe 
    WHERE id_usuario = auth.uid()
  )
);

-- Política de DELETE: Usuários autenticados podem deletar vendedores da sua empresa
CREATE POLICY "Usuários podem deletar vendedores da sua empresa"
ON vendedores
FOR DELETE
TO authenticated
USING (
  id_empresa IN (
    SELECT id_empresa 
    FROM membros_equipe 
    WHERE id_usuario = auth.uid()
  )
);





