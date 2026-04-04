BEGIN;

-- =========================================================
-- 0) TABELA ERP_DESPESAS (garantia de dependência)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.erp_despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empresa UUID NOT NULL REFERENCES public.sis_empresas(id) ON DELETE CASCADE,
  id_usuario UUID NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  descricao TEXT NOT NULL,
  valor NUMERIC(14,2) NOT NULL,
  id_categoria UUID NULL REFERENCES public.erp_categorias(id_categoria) ON DELETE SET NULL,
  id_conta_bancaria UUID NULL REFERENCES public.erp_contas_bancarias(id_conta) ON DELETE SET NULL,
  data_despesa TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'PENDENTE',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT erp_despesas_status_check
    CHECK (UPPER(status) IN ('PENDENTE', 'PAGO', 'CANCELADO'))
);

CREATE INDEX IF NOT EXISTS idx_erp_despesas_empresa
  ON public.erp_despesas(id_empresa);

CREATE INDEX IF NOT EXISTS idx_erp_despesas_categoria
  ON public.erp_despesas(id_categoria);

CREATE OR REPLACE FUNCTION public.erp_fn_despesas_set_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id_usuario IS NULL THEN
    NEW.id_usuario := auth.uid();
  END IF;
  NEW.atualizado_em := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_erp_despesas_set_auditoria ON public.erp_despesas;
CREATE TRIGGER trg_erp_despesas_set_auditoria
BEFORE INSERT OR UPDATE ON public.erp_despesas
FOR EACH ROW
EXECUTE FUNCTION public.erp_fn_despesas_set_auditoria();

ALTER TABLE public.erp_despesas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Empresa ve despesas ERP" ON public.erp_despesas;
CREATE POLICY "Empresa ve despesas ERP"
ON public.erp_despesas FOR SELECT
TO authenticated
USING (
  id_empresa IN (
    SELECT me.id_empresa
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
);

DROP POLICY IF EXISTS "Empresa cria despesas ERP" ON public.erp_despesas;
CREATE POLICY "Empresa cria despesas ERP"
ON public.erp_despesas FOR INSERT
TO authenticated
WITH CHECK (
  id_empresa IN (
    SELECT me.id_empresa
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
);

DROP POLICY IF EXISTS "Empresa atualiza despesas ERP" ON public.erp_despesas;
CREATE POLICY "Empresa atualiza despesas ERP"
ON public.erp_despesas FOR UPDATE
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

DROP POLICY IF EXISTS "Empresa remove despesas ERP" ON public.erp_despesas;
CREATE POLICY "Empresa remove despesas ERP"
ON public.erp_despesas FOR DELETE
TO authenticated
USING (
  id_empresa IN (
    SELECT me.id_empresa
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.erp_despesas TO authenticated;

-- =========================================================
-- 1) TABELA ERP_OS (servicos pontuais)
-- =========================================================

DO $$
BEGIN
  IF to_regclass('public.erp_os') IS NULL THEN
    IF to_regclass('public.erp_ordens_servico') IS NOT NULL THEN
      ALTER TABLE public.erp_ordens_servico RENAME TO erp_os;
    ELSE
      CREATE TABLE public.erp_os (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        id_empresa UUID NOT NULL REFERENCES public.sis_empresas(id) ON DELETE CASCADE,
        id_usuario UUID NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
        id_cliente UUID NULL REFERENCES public.erp_clientes(id) ON DELETE SET NULL,
        codigo TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'EM_ABERTO',
        valor_total NUMERIC(14,2) NOT NULL DEFAULT 0,
        data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
        descricao TEXT NULL,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    END IF;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'erp_os'
      AND column_name = 'valor_total_final'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'erp_os'
      AND column_name = 'valor_total'
  ) THEN
    ALTER TABLE public.erp_os RENAME COLUMN valor_total_final TO valor_total;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'erp_os'
      AND column_name = 'observacoes'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'erp_os'
      AND column_name = 'descricao'
  ) THEN
    ALTER TABLE public.erp_os RENAME COLUMN observacoes TO descricao;
  END IF;
END
$$;

ALTER TABLE public.erp_os
  ADD COLUMN IF NOT EXISTS id_empresa UUID REFERENCES public.sis_empresas(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS id_usuario UUID NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS id_cliente UUID NULL REFERENCES public.erp_clientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS codigo TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'EM_ABERTO',
  ADD COLUMN IF NOT EXISTS valor_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS descricao TEXT NULL,
  ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS uq_erp_os_empresa_codigo
  ON public.erp_os(id_empresa, codigo);

CREATE INDEX IF NOT EXISTS idx_erp_os_empresa
  ON public.erp_os(id_empresa);

CREATE OR REPLACE FUNCTION public.erp_fn_os_set_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id_usuario IS NULL THEN
    NEW.id_usuario := auth.uid();
  END IF;
  NEW.atualizado_em := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_erp_os_set_auditoria ON public.erp_os;
CREATE TRIGGER trg_erp_os_set_auditoria
BEFORE INSERT OR UPDATE ON public.erp_os
FOR EACH ROW
EXECUTE FUNCTION public.erp_fn_os_set_auditoria();

ALTER TABLE public.erp_os ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Empresa ve OS ERP" ON public.erp_os;
CREATE POLICY "Empresa ve OS ERP"
ON public.erp_os FOR SELECT
TO authenticated
USING (
  id_empresa IN (
    SELECT me.id_empresa
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
);

DROP POLICY IF EXISTS "Empresa cria OS ERP" ON public.erp_os;
CREATE POLICY "Empresa cria OS ERP"
ON public.erp_os FOR INSERT
TO authenticated
WITH CHECK (
  id_empresa IN (
    SELECT me.id_empresa
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
  AND (id_usuario IS NULL OR id_usuario = auth.uid())
);

DROP POLICY IF EXISTS "Empresa atualiza OS ERP" ON public.erp_os;
CREATE POLICY "Empresa atualiza OS ERP"
ON public.erp_os FOR UPDATE
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

DROP POLICY IF EXISTS "Empresa remove OS ERP" ON public.erp_os;
CREATE POLICY "Empresa remove OS ERP"
ON public.erp_os FOR DELETE
TO authenticated
USING (
  id_empresa IN (
    SELECT me.id_empresa
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.erp_os TO authenticated;

-- =========================================================
-- 2) TABELA ERP_CONTRATOS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.erp_contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empresa UUID NOT NULL REFERENCES public.sis_empresas(id) ON DELETE CASCADE,
  id_usuario UUID NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  id_cliente UUID NULL REFERENCES public.erp_clientes(id) ON DELETE SET NULL,
  valor_recorrente NUMERIC(14,2) NOT NULL DEFAULT 0,
  dia_vencimento INTEGER NOT NULL DEFAULT 1 CHECK (dia_vencimento BETWEEN 1 AND 31),
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  proximo_faturamento DATE NULL,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'cancelado')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_erp_contratos_empresa
  ON public.erp_contratos(id_empresa);

CREATE INDEX IF NOT EXISTS idx_erp_contratos_status
  ON public.erp_contratos(id_empresa, status);

CREATE OR REPLACE FUNCTION public.erp_fn_contratos_set_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id_usuario IS NULL THEN
    NEW.id_usuario := auth.uid();
  END IF;
  NEW.atualizado_em := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_erp_contratos_set_auditoria ON public.erp_contratos;
CREATE TRIGGER trg_erp_contratos_set_auditoria
BEFORE INSERT OR UPDATE ON public.erp_contratos
FOR EACH ROW
EXECUTE FUNCTION public.erp_fn_contratos_set_auditoria();

ALTER TABLE public.erp_contratos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Empresa ve contratos ERP" ON public.erp_contratos;
CREATE POLICY "Empresa ve contratos ERP"
ON public.erp_contratos FOR SELECT
TO authenticated
USING (
  id_empresa IN (
    SELECT me.id_empresa
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
);

DROP POLICY IF EXISTS "Empresa cria contratos ERP" ON public.erp_contratos;
CREATE POLICY "Empresa cria contratos ERP"
ON public.erp_contratos FOR INSERT
TO authenticated
WITH CHECK (
  id_empresa IN (
    SELECT me.id_empresa
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
  AND (id_usuario IS NULL OR id_usuario = auth.uid())
);

DROP POLICY IF EXISTS "Empresa atualiza contratos ERP" ON public.erp_contratos;
CREATE POLICY "Empresa atualiza contratos ERP"
ON public.erp_contratos FOR UPDATE
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

DROP POLICY IF EXISTS "Empresa remove contratos ERP" ON public.erp_contratos;
CREATE POLICY "Empresa remove contratos ERP"
ON public.erp_contratos FOR DELETE
TO authenticated
USING (
  id_empresa IN (
    SELECT me.id_empresa
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.erp_contratos TO authenticated;

-- =========================================================
-- 3) AJUSTE DA ERP_PARCELAS (sem faturas)
-- =========================================================

ALTER TABLE public.erp_parcelas
  ADD COLUMN IF NOT EXISTS id_venda UUID NULL,
  ADD COLUMN IF NOT EXISTS id_os UUID NULL,
  ADD COLUMN IF NOT EXISTS id_contrato UUID NULL,
  ADD COLUMN IF NOT EXISTS id_despesa UUID NULL,
  ADD COLUMN IF NOT EXISTS id_conta_bancaria UUID NULL,
  ADD COLUMN IF NOT EXISTS id_categoria UUID NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'erp_faturas'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'erp_parcelas'
      AND column_name = 'id_fatura'
  ) THEN
    UPDATE public.erp_parcelas p
    SET
      id_venda = COALESCE(p.id_venda, f.id_venda),
      id_categoria = COALESCE(p.id_categoria, f.id_categoria)
    FROM public.erp_faturas f
    WHERE p.id_fatura = f.id
      AND p.id_empresa = f.id_empresa;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'erp_parcelas_id_os_fkey'
      AND conrelid = 'public.erp_parcelas'::regclass
  ) THEN
    ALTER TABLE public.erp_parcelas DROP CONSTRAINT erp_parcelas_id_os_fkey;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'erp_parcelas_id_venda_fkey'
      AND conrelid = 'public.erp_parcelas'::regclass
  ) THEN
    ALTER TABLE public.erp_parcelas
      ADD CONSTRAINT erp_parcelas_id_venda_fkey
      FOREIGN KEY (id_venda) REFERENCES public.erp_vendas(id) ON DELETE SET NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'erp_parcelas_id_os_fkey'
      AND conrelid = 'public.erp_parcelas'::regclass
  ) THEN
    ALTER TABLE public.erp_parcelas
      ADD CONSTRAINT erp_parcelas_id_os_fkey
      FOREIGN KEY (id_os) REFERENCES public.erp_os(id) ON DELETE SET NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'erp_parcelas_id_contrato_fkey'
      AND conrelid = 'public.erp_parcelas'::regclass
  ) THEN
    ALTER TABLE public.erp_parcelas
      ADD CONSTRAINT erp_parcelas_id_contrato_fkey
      FOREIGN KEY (id_contrato) REFERENCES public.erp_contratos(id) ON DELETE SET NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'erp_parcelas_id_despesa_fkey'
      AND conrelid = 'public.erp_parcelas'::regclass
  ) THEN
    ALTER TABLE public.erp_parcelas
      ADD CONSTRAINT erp_parcelas_id_despesa_fkey
      FOREIGN KEY (id_despesa) REFERENCES public.erp_despesas(id) ON DELETE SET NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'erp_parcelas_id_categoria_fkey'
      AND conrelid = 'public.erp_parcelas'::regclass
  ) THEN
    ALTER TABLE public.erp_parcelas
      ADD CONSTRAINT erp_parcelas_id_categoria_fkey
      FOREIGN KEY (id_categoria) REFERENCES public.erp_categorias(id_categoria) ON DELETE SET NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'erp_parcelas_id_conta_bancaria_fkey'
      AND conrelid = 'public.erp_parcelas'::regclass
  ) THEN
    ALTER TABLE public.erp_parcelas
      ADD CONSTRAINT erp_parcelas_id_conta_bancaria_fkey
      FOREIGN KEY (id_conta_bancaria) REFERENCES public.erp_contas_bancarias(id_conta) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_erp_parcelas_id_venda
  ON public.erp_parcelas(id_venda);

CREATE INDEX IF NOT EXISTS idx_erp_parcelas_id_os
  ON public.erp_parcelas(id_os);

CREATE INDEX IF NOT EXISTS idx_erp_parcelas_id_contrato
  ON public.erp_parcelas(id_contrato);

CREATE INDEX IF NOT EXISTS idx_erp_parcelas_id_despesa
  ON public.erp_parcelas(id_despesa);

CREATE INDEX IF NOT EXISTS idx_erp_parcelas_id_conta_bancaria
  ON public.erp_parcelas(id_conta_bancaria);

CREATE INDEX IF NOT EXISTS idx_erp_parcelas_id_categoria
  ON public.erp_parcelas(id_categoria);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'erp_parcelas_id_fatura_fkey'
      AND conrelid = 'public.erp_parcelas'::regclass
  ) THEN
    ALTER TABLE public.erp_parcelas DROP CONSTRAINT erp_parcelas_id_fatura_fkey;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'erp_parcelas'
      AND column_name = 'id_fatura'
  ) THEN
    ALTER TABLE public.erp_parcelas ALTER COLUMN id_fatura DROP NOT NULL;
    ALTER TABLE public.erp_parcelas DROP COLUMN id_fatura;
  END IF;
END
$$;

DROP TABLE IF EXISTS public.erp_faturas CASCADE;

-- =========================================================
-- 4) GERAÇÃO AUTOMÁTICA DE PARCELAS
-- =========================================================

CREATE OR REPLACE FUNCTION public.erp_fn_gerar_parcela_origem()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valor NUMERIC(14,2);
  v_data DATE;
  v_descricao TEXT;
BEGIN
  IF TG_TABLE_NAME = 'erp_vendas' THEN
    IF EXISTS (
      SELECT 1 FROM public.erp_parcelas p
      WHERE p.id_venda = NEW.id
        AND p.id_empresa = NEW.id_empresa
    ) THEN
      RETURN NEW;
    END IF;

    v_valor := ROUND(ABS(COALESCE(NEW.valor_total_final, 0)), 2);
    IF v_valor <= 0 THEN
      RETURN NEW;
    END IF;

    v_data := COALESCE(NEW.data_venda::date, CURRENT_DATE);
    v_descricao := COALESCE(NULLIF(TRIM('Venda ' || COALESCE(NEW.codigo, '')), ''), 'Parcela de venda');

    INSERT INTO public.erp_parcelas (
      id_empresa,
      id_venda,
      numero_parcela,
      descricao_parcela,
      valor_original,
      valor_quitado_total,
      saldo_devedor,
      data_vencimento,
      status
    )
    VALUES (
      NEW.id_empresa,
      NEW.id,
      1,
      v_descricao,
      v_valor,
      0,
      v_valor,
      v_data,
      'PENDENTE'
    );

    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'erp_os' THEN
    IF EXISTS (
      SELECT 1 FROM public.erp_parcelas p
      WHERE p.id_os = NEW.id
        AND p.id_empresa = NEW.id_empresa
    ) THEN
      RETURN NEW;
    END IF;

    v_valor := ROUND(ABS(COALESCE(NEW.valor_total, 0)), 2);
    IF v_valor <= 0 THEN
      RETURN NEW;
    END IF;

    v_data := COALESCE(NEW.data_emissao::date, CURRENT_DATE);
    v_descricao := COALESCE(NULLIF(TRIM('OS ' || COALESCE(NEW.codigo, '')), ''), 'Parcela de ordem de servico');

    INSERT INTO public.erp_parcelas (
      id_empresa,
      id_os,
      numero_parcela,
      descricao_parcela,
      valor_original,
      valor_quitado_total,
      saldo_devedor,
      data_vencimento,
      status
    )
    VALUES (
      NEW.id_empresa,
      NEW.id,
      1,
      v_descricao,
      v_valor,
      0,
      v_valor,
      v_data,
      'PENDENTE'
    );

    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'erp_contratos' THEN
    IF LOWER(COALESCE(NEW.status, 'ativo')) <> 'ativo' THEN
      RETURN NEW;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.erp_parcelas p
      WHERE p.id_contrato = NEW.id
        AND p.id_empresa = NEW.id_empresa
    ) THEN
      RETURN NEW;
    END IF;

    v_valor := ROUND(ABS(COALESCE(NEW.valor_recorrente, 0)), 2);
    IF v_valor <= 0 THEN
      RETURN NEW;
    END IF;

    v_data := COALESCE(NEW.proximo_faturamento, NEW.data_inicio, CURRENT_DATE);
    v_descricao := 'Parcela recorrente de contrato';

    INSERT INTO public.erp_parcelas (
      id_empresa,
      id_contrato,
      numero_parcela,
      descricao_parcela,
      valor_original,
      valor_quitado_total,
      saldo_devedor,
      data_vencimento,
      status
    )
    VALUES (
      NEW.id_empresa,
      NEW.id,
      1,
      v_descricao,
      v_valor,
      0,
      v_valor,
      v_data,
      'PENDENTE'
    );

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_erp_vendas_gerar_parcela ON public.erp_vendas;
CREATE TRIGGER trg_erp_vendas_gerar_parcela
AFTER INSERT ON public.erp_vendas
FOR EACH ROW
EXECUTE FUNCTION public.erp_fn_gerar_parcela_origem();

DROP TRIGGER IF EXISTS trg_erp_os_gerar_parcela ON public.erp_os;
CREATE TRIGGER trg_erp_os_gerar_parcela
AFTER INSERT ON public.erp_os
FOR EACH ROW
EXECUTE FUNCTION public.erp_fn_gerar_parcela_origem();

DROP TRIGGER IF EXISTS trg_erp_contratos_gerar_parcela ON public.erp_contratos;
CREATE TRIGGER trg_erp_contratos_gerar_parcela
AFTER INSERT ON public.erp_contratos
FOR EACH ROW
EXECUTE FUNCTION public.erp_fn_gerar_parcela_origem();

-- =========================================================
-- 5) DESPESA RÁPIDA SEM FATURA (compatível com arquitetura nova)
-- =========================================================

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
  v_despesa UUID;
  v_parcela UUID;
  v_data TIMESTAMPTZ := COALESCE(p_data_pagamento, NOW());
  v_valor NUMERIC(14,2) := ROUND(ABS(COALESCE(p_valor, 0)), 2);
  v_status TEXT;
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

  v_status := CASE WHEN p_ja_pago THEN 'PAGO' ELSE 'PENDENTE' END;

  INSERT INTO public.erp_despesas (
    id_empresa,
    id_usuario,
    descricao,
    valor,
    id_categoria,
    id_conta_bancaria,
    data_despesa,
    status
  )
  VALUES (
    p_id_empresa,
    v_usuario,
    COALESCE(NULLIF(TRIM(p_descricao), ''), 'Despesa rapida'),
    v_valor,
    p_id_categoria,
    p_id_conta_bancaria,
    v_data,
    v_status
  )
  RETURNING id INTO v_despesa;

  INSERT INTO public.erp_parcelas (
    id_empresa,
    id_despesa,
    id_categoria,
    id_conta_bancaria,
    numero_parcela,
    descricao_parcela,
    valor_original,
    valor_quitado_total,
    saldo_devedor,
    data_vencimento,
    data_quitacao_total,
    status,
    observacoes
  )
  VALUES (
    p_id_empresa,
    v_despesa,
    p_id_categoria,
    p_id_conta_bancaria,
    1,
    COALESCE(NULLIF(TRIM(p_descricao), ''), 'Despesa rapida'),
    v_valor,
    CASE WHEN p_ja_pago THEN v_valor ELSE 0 END,
    CASE WHEN p_ja_pago THEN 0 ELSE v_valor END,
    v_data::DATE,
    CASE WHEN p_ja_pago THEN v_data ELSE NULL END,
    v_status,
    'Lancamento rapido de despesa'
  )
  RETURNING id INTO v_parcela;

  RETURN jsonb_build_object(
    'ok', true,
    'id_despesa', v_despesa,
    'id_parcela', v_parcela
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.erp_fn_lancar_despesa_rapida(UUID, NUMERIC, TEXT, UUID, UUID, TIMESTAMPTZ, BOOLEAN) TO authenticated;

COMMIT;
