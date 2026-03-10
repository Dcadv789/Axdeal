-- Bucket para logos dos quizzes (funil) - público para URLs acessíveis
INSERT INTO storage.buckets (id, name, public)
VALUES ('quiz-logos', 'quiz-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas (drop antes para idempotência)
DROP POLICY IF EXISTS "quiz_logos_insert" ON storage.objects;
DROP POLICY IF EXISTS "quiz_logos_select_public" ON storage.objects;
DROP POLICY IF EXISTS "quiz_logos_update" ON storage.objects;
DROP POLICY IF EXISTS "quiz_logos_delete" ON storage.objects;

-- Política: usuários autenticados podem fazer upload
CREATE POLICY "quiz_logos_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'quiz-logos');

-- Política: leitura pública (bucket público)
CREATE POLICY "quiz_logos_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'quiz-logos');

-- Política: usuários autenticados podem atualizar/deletar
CREATE POLICY "quiz_logos_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'quiz-logos');

CREATE POLICY "quiz_logos_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'quiz-logos');
