-- Garantir que erp_reguas_cobranca existe com estrutura correta e RLS
-- A tabela pode já existir (renomeada de reguas_cobranca)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'erp_reguas_cobranca') THEN
    CREATE TABLE public.erp_reguas_cobranca (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      id_empresa UUID NOT NULL REFERENCES public.sis_empresas(id) ON DELETE CASCADE,
      criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      nome TEXT NOT NULL,
      descricao TEXT,
      ativa BOOLEAN DEFAULT true,
      padrao BOOLEAN DEFAULT false,
      etapas JSONB DEFAULT '[]',
      criado_em TIMESTAMPTZ DEFAULT now(),
      atualizado_em TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_erp_reguas_cobranca_empresa ON public.erp_reguas_cobranca(id_empresa);
  END IF;
END $$;

-- Adicionar coluna etapas se não existir (para tabelas antigas)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'erp_reguas_cobranca' AND column_name = 'etapas'
  ) THEN
    ALTER TABLE public.erp_reguas_cobranca ADD COLUMN etapas JSONB DEFAULT '[]';
  END IF;
END $$;

ALTER TABLE public.erp_reguas_cobranca ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Empresa ve reguas cobranca" ON public.erp_reguas_cobranca;
CREATE POLICY "Empresa ve reguas cobranca"
ON public.erp_reguas_cobranca FOR SELECT
USING (
  id_empresa IN (
    SELECT me.id_empresa FROM public.sis_membros_equipe me WHERE me.id_usuario = auth.uid()
  )
);

DROP POLICY IF EXISTS "Empresa cria reguas cobranca" ON public.erp_reguas_cobranca;
CREATE POLICY "Empresa cria reguas cobranca"
ON public.erp_reguas_cobranca FOR INSERT
WITH CHECK (
  id_empresa IN (
    SELECT me.id_empresa FROM public.sis_membros_equipe me WHERE me.id_usuario = auth.uid()
  )
);

DROP POLICY IF EXISTS "Empresa atualiza reguas cobranca" ON public.erp_reguas_cobranca;
CREATE POLICY "Empresa atualiza reguas cobranca"
ON public.erp_reguas_cobranca FOR UPDATE
USING (
  id_empresa IN (
    SELECT me.id_empresa FROM public.sis_membros_equipe me WHERE me.id_usuario = auth.uid()
  )
)
WITH CHECK (
  id_empresa IN (
    SELECT me.id_empresa FROM public.sis_membros_equipe me WHERE me.id_usuario = auth.uid()
  )
);

DROP POLICY IF EXISTS "Empresa remove reguas cobranca" ON public.erp_reguas_cobranca;
CREATE POLICY "Empresa remove reguas cobranca"
ON public.erp_reguas_cobranca FOR DELETE
USING (
  id_empresa IN (
    SELECT me.id_empresa FROM public.sis_membros_equipe me WHERE me.id_usuario = auth.uid()
  )
);
