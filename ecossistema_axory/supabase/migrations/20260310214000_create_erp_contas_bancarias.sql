BEGIN;

CREATE TABLE IF NOT EXISTS public.erp_contas_bancarias (
  id_conta UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empresa UUID NOT NULL REFERENCES public.sis_empresas(id) ON DELETE CASCADE,
  id_usuario UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  nome_conta TEXT NOT NULL,
  tipo_conta TEXT NOT NULL,
  saldo_inicial NUMERIC(14,2) NOT NULL DEFAULT 0,
  cor TEXT NOT NULL DEFAULT '#2563EB',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT erp_contas_bancarias_tipo_conta_check
    CHECK (tipo_conta IN ('corrente', 'poupanca', 'investimento', 'caixa'))
);

COMMENT ON TABLE public.erp_contas_bancarias IS
'Cadastro de contas bancarias do ERP por empresa.';

COMMENT ON COLUMN public.erp_contas_bancarias.id_conta IS 'Identificador da conta bancaria.';
COMMENT ON COLUMN public.erp_contas_bancarias.id_empresa IS 'Empresa proprietaria da conta bancaria.';
COMMENT ON COLUMN public.erp_contas_bancarias.id_usuario IS 'Usuario criador da conta (auth.uid).';
COMMENT ON COLUMN public.erp_contas_bancarias.nome_conta IS 'Nome de exibicao da conta bancaria.';
COMMENT ON COLUMN public.erp_contas_bancarias.tipo_conta IS 'Tipo da conta: corrente, poupanca, investimento ou caixa.';
COMMENT ON COLUMN public.erp_contas_bancarias.saldo_inicial IS 'Saldo inicial informado no cadastro da conta.';
COMMENT ON COLUMN public.erp_contas_bancarias.cor IS 'Cor hexadecimal usada para personalizacao visual da conta.';
COMMENT ON COLUMN public.erp_contas_bancarias.ativo IS 'Flag logica de conta ativa/inativa.';
COMMENT ON COLUMN public.erp_contas_bancarias.criado_em IS 'Data de criacao do registro.';
COMMENT ON COLUMN public.erp_contas_bancarias.atualizado_em IS 'Data da ultima atualizacao do registro.';

CREATE INDEX IF NOT EXISTS idx_erp_contas_bancarias_empresa
  ON public.erp_contas_bancarias(id_empresa);

CREATE INDEX IF NOT EXISTS idx_erp_contas_bancarias_usuario
  ON public.erp_contas_bancarias(id_usuario);

CREATE INDEX IF NOT EXISTS idx_erp_contas_bancarias_tipo
  ON public.erp_contas_bancarias(tipo_conta);

CREATE OR REPLACE FUNCTION public.erp_fn_contas_bancarias_set_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_erp_contas_bancarias_set_atualizado_em ON public.erp_contas_bancarias;
CREATE TRIGGER trg_erp_contas_bancarias_set_atualizado_em
BEFORE UPDATE ON public.erp_contas_bancarias
FOR EACH ROW
EXECUTE FUNCTION public.erp_fn_contas_bancarias_set_atualizado_em();

CREATE OR REPLACE FUNCTION public.erp_fn_contas_bancarias_set_id_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id_usuario IS NULL THEN
    NEW.id_usuario := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_erp_contas_bancarias_set_id_usuario ON public.erp_contas_bancarias;
CREATE TRIGGER trg_erp_contas_bancarias_set_id_usuario
BEFORE INSERT ON public.erp_contas_bancarias
FOR EACH ROW
EXECUTE FUNCTION public.erp_fn_contas_bancarias_set_id_usuario();

ALTER TABLE public.erp_contas_bancarias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Empresa ve contas bancarias ERP" ON public.erp_contas_bancarias;
CREATE POLICY "Empresa ve contas bancarias ERP"
ON public.erp_contas_bancarias FOR SELECT
TO authenticated
USING (
  id_empresa IN (
    SELECT me.id_empresa
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
);

DROP POLICY IF EXISTS "Empresa cria contas bancarias ERP" ON public.erp_contas_bancarias;
CREATE POLICY "Empresa cria contas bancarias ERP"
ON public.erp_contas_bancarias FOR INSERT
TO authenticated
WITH CHECK (
  id_empresa IN (
    SELECT me.id_empresa
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
  AND id_usuario = auth.uid()
);

DROP POLICY IF EXISTS "Empresa atualiza contas bancarias ERP" ON public.erp_contas_bancarias;
CREATE POLICY "Empresa atualiza contas bancarias ERP"
ON public.erp_contas_bancarias FOR UPDATE
TO authenticated
USING (
  id_empresa IN (
    SELECT me.id_empresa
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
)
WITH CHECK (
  id_empresa IN (
    SELECT me.id_empresa
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
);

DROP POLICY IF EXISTS "Empresa remove contas bancarias ERP" ON public.erp_contas_bancarias;
CREATE POLICY "Empresa remove contas bancarias ERP"
ON public.erp_contas_bancarias FOR DELETE
TO authenticated
USING (
  id_empresa IN (
    SELECT me.id_empresa
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.erp_contas_bancarias TO authenticated;

COMMIT;
