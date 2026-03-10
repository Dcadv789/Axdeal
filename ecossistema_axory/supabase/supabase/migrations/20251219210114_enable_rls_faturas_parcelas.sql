/*
  # Habilitar RLS para Faturas e Parcelas

  1. Alterações
    - Habilita Row Level Security nas tabelas `faturas` e `parcelas`
  
  2. Motivo
    - As políticas já existem mas o RLS estava desabilitado
    - Isso impedia o acesso aos dados das parcelas no frontend
  
  3. Segurança
    - As políticas existentes (`Politica Unificada Faturas` e `Politica Unificada Parcelas`) 
      já estão configuradas e usam a função `verificar_acesso_empresa(id_empresa)`
    - Ao habilitar o RLS, essas políticas entrarão em vigor
*/

-- Habilitar RLS na tabela faturas
ALTER TABLE faturas ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS na tabela parcelas
ALTER TABLE parcelas ENABLE ROW LEVEL SECURITY;
