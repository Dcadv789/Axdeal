BEGIN;

ALTER TABLE IF EXISTS public.crm_quiz_respostas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Empresa ve respostas do quiz" ON public.crm_quiz_respostas;
CREATE POLICY "Empresa ve respostas do quiz"
ON public.crm_quiz_respostas FOR SELECT
TO authenticated
USING (
  id_lead IN (
    SELECT l.id
    FROM public.crm_leads l
    WHERE l.id_empresa IN (
      SELECT m.id_empresa
      FROM public.sis_membros_equipe m
      WHERE m.id_usuario = auth.uid()
    )
  )
);

COMMIT;
