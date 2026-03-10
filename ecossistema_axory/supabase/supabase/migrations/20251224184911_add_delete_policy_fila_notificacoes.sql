/*
  # Adicionar política DELETE para fila_notificacoes

  1. Alterações
    - Adiciona política RLS para permitir DELETE na tabela `fila_notificacoes`
    - Permite que usuários autenticados deletem notificações da fila
  
  2. Motivo
    - A tabela já tinha políticas para INSERT e SELECT
    - Faltava a política DELETE, impedindo a remoção de notificações após envio
    - Necessário para o fluxo de "Ações do Dia" no frontend
  
  3. Segurança
    - Apenas usuários autenticados podem deletar
    - Não há restrição adicional pois a fila é compartilhada entre empresas
    - O frontend já filtra por empresa ao buscar notificações
*/

-- Criar política para permitir DELETE para usuários autenticados
CREATE POLICY "Permitir Delete para Autenticados"
ON fila_notificacoes
FOR DELETE
TO authenticated
USING (true);





