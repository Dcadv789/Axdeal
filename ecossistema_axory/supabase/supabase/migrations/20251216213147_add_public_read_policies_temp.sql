/*
  # Adicionar políticas públicas temporárias para desenvolvimento

  1. Políticas
    - Adiciona política de leitura pública para `empresas`
    - Adiciona política de leitura e escrita pública para `configuracoes`
    
  2. Notas
    - Estas são políticas TEMPORÁRIAS para desenvolvimento
    - Quando a autenticação estiver completa, estas políticas devem ser removidas
    - As políticas existentes permanecem ativas para usuários autenticados
*/

-- Remover políticas temporárias antigas se existirem
DROP POLICY IF EXISTS "Acesso publico temporario - SELECT empresas" ON empresas;
DROP POLICY IF EXISTS "Acesso publico temporario - INSERT empresas" ON empresas;
DROP POLICY IF EXISTS "Acesso publico temporario - UPDATE empresas" ON empresas;
DROP POLICY IF EXISTS "Acesso publico temporario - SELECT config" ON configuracoes;
DROP POLICY IF EXISTS "Acesso publico temporario - INSERT config" ON configuracoes;
DROP POLICY IF EXISTS "Acesso publico temporario - UPDATE config" ON configuracoes;

-- Política temporária de SELECT público para empresas
CREATE POLICY "Acesso publico temporario - SELECT empresas"
  ON empresas
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Política temporária de INSERT público para empresas
CREATE POLICY "Acesso publico temporario - INSERT empresas"
  ON empresas
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Política temporária de UPDATE público para empresas
CREATE POLICY "Acesso publico temporario - UPDATE empresas"
  ON empresas
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Política temporária de SELECT público para configuracoes
CREATE POLICY "Acesso publico temporario - SELECT config"
  ON configuracoes
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Política temporária de INSERT público para configuracoes
CREATE POLICY "Acesso publico temporario - INSERT config"
  ON configuracoes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Política temporária de UPDATE público para configuracoes
CREATE POLICY "Acesso publico temporario - UPDATE config"
  ON configuracoes
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
