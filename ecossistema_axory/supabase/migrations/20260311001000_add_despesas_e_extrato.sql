BEGIN;

ALTER TABLE public.erp_faturas
  ADD COLUMN IF NOT EXISTS tipo_financeiro TEXT NOT NULL DEFAULT 'receita';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'erp_faturas_tipo_financeiro_check'
      AND conrelid = 'public.erp_faturas'::regclass
  ) THEN
    ALTER TABLE public.erp_faturas
      ADD CONSTRAINT erp_faturas_tipo_financeiro_check
      CHECK (tipo_financeiro IN ('receita', 'despesa'));
  END IF;
END;
$$;

ALTER TABLE public.erp_faturas
  ADD COLUMN IF NOT EXISTS id_categoria UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'erp_faturas_id_categoria_fkey'
      AND conrelid = 'public.erp_faturas'::regclass
  ) THEN
    ALTER TABLE public.erp_faturas
      ADD CONSTRAINT erp_faturas_id_categoria_fkey
      FOREIGN KEY (id_categoria) REFERENCES public.erp_categorias(id_categoria) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_erp_faturas_tipo_financeiro
  ON public.erp_faturas(tipo_financeiro);

CREATE INDEX IF NOT EXISTS idx_erp_faturas_id_categoria
  ON public.erp_faturas(id_categoria);

ALTER TABLE public.erp_parcelas
  ADD COLUMN IF NOT EXISTS id_categoria UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'erp_parcelas_id_categoria_fkey'
      AND conrelid = 'public.erp_parcelas'::regclass
  ) THEN
    ALTER TABLE public.erp_parcelas
      ADD CONSTRAINT erp_parcelas_id_categoria_fkey
      FOREIGN KEY (id_categoria) REFERENCES public.erp_categorias(id_categoria) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_erp_parcelas_id_categoria
  ON public.erp_parcelas(id_categoria);

CREATE TABLE IF NOT EXISTS public.erp_extrato (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empresa UUID NOT NULL REFERENCES public.sis_empresas(id) ON DELETE CASCADE,
  id_conta_bancaria UUID NOT NULL REFERENCES public.erp_contas_bancarias(id_conta) ON DELETE RESTRICT,
  id_parcela UUID NULL REFERENCES public.erp_parcelas(id) ON DELETE SET NULL,
  id_categoria UUID NULL REFERENCES public.erp_categorias(id_categoria) ON DELETE SET NULL,
  id_usuario UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  descricao TEXT NULL,
  valor NUMERIC(14,2) NOT NULL,
  data_pagamento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tipo_movimentacao TEXT NOT NULL CHECK (tipo_movimentacao IN ('entrada', 'saida')),
  conciliado BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.erp_extrato IS
'Extrato financeiro por conta bancaria, com vinculo opcional a parcelas.';

COMMENT ON COLUMN public.erp_extrato.id IS 'Identificador da movimentacao no extrato.';
COMMENT ON COLUMN public.erp_extrato.id_empresa IS 'Empresa proprietaria da movimentacao.';
COMMENT ON COLUMN public.erp_extrato.id_conta_bancaria IS 'Conta bancaria onde ocorreu a movimentacao.';
COMMENT ON COLUMN public.erp_extrato.id_parcela IS 'Parcela vinculada (quando houver).';
COMMENT ON COLUMN public.erp_extrato.id_categoria IS 'Categoria financeira da movimentacao.';
COMMENT ON COLUMN public.erp_extrato.id_usuario IS 'Usuario que registrou a movimentacao.';
COMMENT ON COLUMN public.erp_extrato.descricao IS 'Descricao da movimentacao.';
COMMENT ON COLUMN public.erp_extrato.valor IS 'Valor da movimentacao (positivo para entrada, negativo para saida).';
COMMENT ON COLUMN public.erp_extrato.data_pagamento IS 'Data/hora do pagamento ou recebimento.';
COMMENT ON COLUMN public.erp_extrato.tipo_movimentacao IS 'Tipo da movimentacao: entrada ou saida.';
COMMENT ON COLUMN public.erp_extrato.conciliado IS 'Indica se a movimentacao ja foi conciliada.';

CREATE INDEX IF NOT EXISTS idx_erp_extrato_empresa_data
  ON public.erp_extrato(id_empresa, data_pagamento DESC);

CREATE INDEX IF NOT EXISTS idx_erp_extrato_conta
  ON public.erp_extrato(id_conta_bancaria);

CREATE INDEX IF NOT EXISTS idx_erp_extrato_categoria
  ON public.erp_extrato(id_categoria);

CREATE OR REPLACE FUNCTION public.erp_fn_extrato_set_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado.';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.criado_em := COALESCE(NEW.criado_em, NOW());
  END IF;

  IF NEW.id_usuario IS NULL THEN
    NEW.id_usuario := auth.uid();
  END IF;

  NEW.atualizado_em := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_erp_extrato_set_auditoria ON public.erp_extrato;
CREATE TRIGGER trg_erp_extrato_set_auditoria
BEFORE INSERT OR UPDATE ON public.erp_extrato
FOR EACH ROW
EXECUTE FUNCTION public.erp_fn_extrato_set_auditoria();

ALTER TABLE public.erp_extrato ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Empresa ve extrato ERP" ON public.erp_extrato;
CREATE POLICY "Empresa ve extrato ERP"
ON public.erp_extrato FOR SELECT
TO authenticated
USING (
  id_empresa IN (
    SELECT me.id_empresa
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
);

DROP POLICY IF EXISTS "Empresa cria extrato ERP" ON public.erp_extrato;
CREATE POLICY "Empresa cria extrato ERP"
ON public.erp_extrato FOR INSERT
TO authenticated
WITH CHECK (
  id_empresa IN (
    SELECT me.id_empresa
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
  AND id_usuario = auth.uid()
);

DROP POLICY IF EXISTS "Empresa atualiza extrato ERP" ON public.erp_extrato;
CREATE POLICY "Empresa atualiza extrato ERP"
ON public.erp_extrato FOR UPDATE
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
  AND id_usuario = auth.uid()
);

DROP POLICY IF EXISTS "Empresa remove extrato ERP" ON public.erp_extrato;
CREATE POLICY "Empresa remove extrato ERP"
ON public.erp_extrato FOR DELETE
TO authenticated
USING (
  id_empresa IN (
    SELECT me.id_empresa
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.erp_fn_lancar_despesa_rapida(
  p_id_empresa UUID,
  p_valor NUMERIC,
  p_descricao TEXT,
  p_id_categoria UUID,
  p_id_conta_bancaria UUID,
  p_data_pagamento TIMESTAMPTZ,
  p_ja_pago BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario UUID := auth.uid();
  v_cliente UUID;
  v_fatura UUID;
  v_parcela UUID;
  v_extrato UUID;
  v_data TIMESTAMPTZ := COALESCE(p_data_pagamento, NOW());
  v_valor NUMERIC(14,2) := ROUND(ABS(COALESCE(p_valor, 0)), 2);
  v_codigo_fatura TEXT;
  v_status_fatura TEXT;
  v_status_parcela TEXT;
BEGIN
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado.';
  END IF;

  IF p_id_empresa IS NULL THEN
    RAISE EXCEPTION 'Empresa obrigatoria.';
  END IF;

  IF v_valor <= 0 THEN
    RAISE EXCEPTION 'Valor da despesa deve ser maior que zero.';
  END IF;

  IF p_id_categoria IS NULL THEN
    RAISE EXCEPTION 'Categoria obrigatoria para despesa.';
  END IF;

  IF p_id_conta_bancaria IS NULL THEN
    RAISE EXCEPTION 'Conta bancaria obrigatoria.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = v_usuario
      AND me.id_empresa = p_id_empresa
  ) THEN
    RAISE EXCEPTION 'Usuario sem acesso a empresa informada.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.erp_categorias c
    WHERE c.id_categoria = p_id_categoria
      AND c.id_empresa = p_id_empresa
      AND c.tipo_lancamento = 'saida'
  ) THEN
    RAISE EXCEPTION 'Categoria invalida. Use uma categoria de saida.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.erp_contas_bancarias cb
    WHERE cb.id_conta = p_id_conta_bancaria
      AND cb.id_empresa = p_id_empresa
  ) THEN
    RAISE EXCEPTION 'Conta bancaria invalida para a empresa.';
  END IF;

  SELECT c.id
    INTO v_cliente
  FROM public.erp_clientes c
  WHERE c.id_empresa = p_id_empresa
    AND c.nome_razao_social = 'Cliente Interno Despesas'
  ORDER BY c.criado_em
  LIMIT 1;

  IF v_cliente IS NULL THEN
    INSERT INTO public.erp_clientes (
      id_empresa,
      tipo_pessoa,
      nome_razao_social,
      nome_fantasia,
      status
    )
    VALUES (
      p_id_empresa,
      'PJ',
      'Cliente Interno Despesas',
      'Despesas Internas',
      'ATIVO'
    )
    RETURNING id INTO v_cliente;
  END IF;

  v_codigo_fatura := 'DSP-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') || '-' || SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 6);
  v_status_fatura := CASE WHEN p_ja_pago THEN 'PAGO' ELSE 'PENDENTE' END;
  v_status_parcela := CASE WHEN p_ja_pago THEN 'PAGO' ELSE 'PENDENTE' END;

  INSERT INTO public.erp_faturas (
    id_empresa,
    id_cliente,
    codigo_fatura,
    descricao,
    categoria,
    qtd_parcelas,
    valor_total_original,
    data_emissao,
    data_competencia,
    status,
    tipo_financeiro,
    id_categoria
  )
  VALUES (
    p_id_empresa,
    v_cliente,
    v_codigo_fatura,
    COALESCE(NULLIF(TRIM(p_descricao), ''), 'Despesa rapida'),
    'despesa',
    1,
    v_valor,
    v_data::DATE,
    v_data::DATE,
    v_status_fatura,
    'despesa',
    p_id_categoria
  )
  RETURNING id INTO v_fatura;

  INSERT INTO public.erp_parcelas (
    id_empresa,
    id_fatura,
    numero_parcela,
    descricao_parcela,
    valor_original,
    valor_quitado_total,
    saldo_devedor,
    data_vencimento,
    data_quitacao_total,
    status,
    observacoes,
    id_categoria
  )
  VALUES (
    p_id_empresa,
    v_fatura,
    1,
    COALESCE(NULLIF(TRIM(p_descricao), ''), 'Despesa rapida'),
    v_valor,
    CASE WHEN p_ja_pago THEN v_valor ELSE 0 END,
    CASE WHEN p_ja_pago THEN 0 ELSE v_valor END,
    v_data::DATE,
    CASE WHEN p_ja_pago THEN v_data ELSE NULL END,
    v_status_parcela,
    'Lancamento rapido de despesa',
    p_id_categoria
  )
  RETURNING id INTO v_parcela;

  IF p_ja_pago THEN
    INSERT INTO public.erp_extrato (
      id_empresa,
      id_conta_bancaria,
      id_parcela,
      id_categoria,
      id_usuario,
      descricao,
      valor,
      data_pagamento,
      tipo_movimentacao,
      conciliado
    )
    VALUES (
      p_id_empresa,
      p_id_conta_bancaria,
      v_parcela,
      p_id_categoria,
      v_usuario,
      COALESCE(NULLIF(TRIM(p_descricao), ''), 'Despesa rapida'),
      -v_valor,
      v_data,
      'saida',
      TRUE
    )
    RETURNING id INTO v_extrato;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'id_fatura', v_fatura,
    'id_parcela', v_parcela,
    'id_extrato', v_extrato
  );
END;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.erp_extrato TO authenticated;
GRANT EXECUTE ON FUNCTION public.erp_fn_lancar_despesa_rapida(UUID, NUMERIC, TEXT, UUID, UUID, TIMESTAMPTZ, BOOLEAN) TO authenticated;

COMMIT;
