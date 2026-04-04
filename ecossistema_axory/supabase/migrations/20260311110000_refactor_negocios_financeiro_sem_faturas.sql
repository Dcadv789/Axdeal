BEGIN;

CREATE TABLE IF NOT EXISTS public.erp_ordens_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empresa UUID NOT NULL REFERENCES public.sis_empresas(id) ON DELETE CASCADE,
  id_cliente UUID NULL REFERENCES public.erp_clientes(id) ON DELETE SET NULL,
  codigo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'EM_ABERTO',
  valor_total_final NUMERIC(14,2) NOT NULL DEFAULT 0,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes TEXT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_erp_ordens_servico_empresa_codigo
  ON public.erp_ordens_servico(id_empresa, codigo);

CREATE INDEX IF NOT EXISTS idx_erp_ordens_servico_empresa
  ON public.erp_ordens_servico(id_empresa);

CREATE OR REPLACE FUNCTION public.erp_fn_ordens_servico_set_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_erp_ordens_servico_set_atualizado_em ON public.erp_ordens_servico;
CREATE TRIGGER trg_erp_ordens_servico_set_atualizado_em
BEFORE UPDATE ON public.erp_ordens_servico
FOR EACH ROW
EXECUTE FUNCTION public.erp_fn_ordens_servico_set_atualizado_em();

ALTER TABLE public.erp_ordens_servico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Empresa ve ordens de servico ERP" ON public.erp_ordens_servico;
CREATE POLICY "Empresa ve ordens de servico ERP"
ON public.erp_ordens_servico FOR SELECT
TO authenticated
USING (
  id_empresa IN (
    SELECT me.id_empresa
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
);

DROP POLICY IF EXISTS "Empresa cria ordens de servico ERP" ON public.erp_ordens_servico;
CREATE POLICY "Empresa cria ordens de servico ERP"
ON public.erp_ordens_servico FOR INSERT
TO authenticated
WITH CHECK (
  id_empresa IN (
    SELECT me.id_empresa
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
);

DROP POLICY IF EXISTS "Empresa atualiza ordens de servico ERP" ON public.erp_ordens_servico;
CREATE POLICY "Empresa atualiza ordens de servico ERP"
ON public.erp_ordens_servico FOR UPDATE
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

DROP POLICY IF EXISTS "Empresa remove ordens de servico ERP" ON public.erp_ordens_servico;
CREATE POLICY "Empresa remove ordens de servico ERP"
ON public.erp_ordens_servico FOR DELETE
TO authenticated
USING (
  id_empresa IN (
    SELECT me.id_empresa
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.erp_ordens_servico TO authenticated;

CREATE TABLE IF NOT EXISTS public.erp_despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empresa UUID NOT NULL REFERENCES public.sis_empresas(id) ON DELETE CASCADE,
  id_usuario UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado.';
  END IF;

  IF TG_OP = 'INSERT' AND NEW.id_usuario IS NULL THEN
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
  AND id_usuario = auth.uid()
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
  AND id_usuario = auth.uid()
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

ALTER TABLE public.erp_parcelas
  ADD COLUMN IF NOT EXISTS id_venda UUID NULL,
  ADD COLUMN IF NOT EXISTS id_proposta UUID NULL,
  ADD COLUMN IF NOT EXISTS id_os UUID NULL,
  ADD COLUMN IF NOT EXISTS id_despesa UUID NULL,
  ADD COLUMN IF NOT EXISTS id_conta_bancaria UUID NULL;

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
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'erp_parcelas_id_proposta_fkey'
      AND conrelid = 'public.erp_parcelas'::regclass
  ) THEN
    ALTER TABLE public.erp_parcelas
      ADD CONSTRAINT erp_parcelas_id_proposta_fkey
      FOREIGN KEY (id_proposta) REFERENCES public.erp_propostas(id) ON DELETE SET NULL;
  END IF;
END;
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
      FOREIGN KEY (id_os) REFERENCES public.erp_ordens_servico(id) ON DELETE SET NULL;
  END IF;
END;
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
END;
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
END;
$$;

CREATE INDEX IF NOT EXISTS idx_erp_parcelas_id_venda
  ON public.erp_parcelas(id_venda);

CREATE INDEX IF NOT EXISTS idx_erp_parcelas_id_proposta
  ON public.erp_parcelas(id_proposta);

CREATE INDEX IF NOT EXISTS idx_erp_parcelas_id_os
  ON public.erp_parcelas(id_os);

CREATE INDEX IF NOT EXISTS idx_erp_parcelas_id_despesa
  ON public.erp_parcelas(id_despesa);

CREATE INDEX IF NOT EXISTS idx_erp_parcelas_id_conta_bancaria
  ON public.erp_parcelas(id_conta_bancaria);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'erp_faturas'
  ) THEN
    UPDATE public.erp_parcelas p
    SET
      id_venda = COALESCE(p.id_venda, f.id_venda),
      id_proposta = COALESCE(p.id_proposta, f.id_proposta),
      id_categoria = COALESCE(p.id_categoria, f.id_categoria)
    FROM public.erp_faturas f
    WHERE p.id_fatura = f.id
      AND p.id_empresa = f.id_empresa;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.erp_fn_parcelas_gerar_extrato_baixa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status_new TEXT;
  v_status_old TEXT := '';
  v_novo_pago BOOLEAN;
  v_antigo_pago BOOLEAN := FALSE;
  v_conta UUID;
  v_usuario UUID;
  v_valor NUMERIC(14,2);
  v_tipo TEXT;
  v_descricao TEXT;
BEGIN
  v_status_new := LOWER(COALESCE(NEW.status, ''));
  v_novo_pago := v_status_new IN ('pago', 'quitado', 'concluida', 'concluída');

  IF TG_OP = 'UPDATE' THEN
    v_status_old := LOWER(COALESCE(OLD.status, ''));
    v_antigo_pago := v_status_old IN ('pago', 'quitado', 'concluida', 'concluída');
  END IF;

  IF NOT v_novo_pago THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND v_antigo_pago THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.erp_extrato ex
    WHERE ex.id_parcela = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  v_conta := NEW.id_conta_bancaria;
  IF v_conta IS NULL THEN
    SELECT cb.id_conta
      INTO v_conta
    FROM public.erp_contas_bancarias cb
    WHERE cb.id_empresa = NEW.id_empresa
      AND cb.ativo = TRUE
    ORDER BY cb.criado_em ASC
    LIMIT 1;
  END IF;

  IF v_conta IS NULL THEN
    RAISE EXCEPTION 'Conta bancaria obrigatoria para gerar extrato da parcela %.', NEW.id;
  END IF;

  v_usuario := auth.uid();
  IF v_usuario IS NULL THEN
    SELECT me.id_usuario
      INTO v_usuario
    FROM public.sis_membros_equipe me
    WHERE me.id_empresa = NEW.id_empresa
    ORDER BY me.criado_em NULLS LAST
    LIMIT 1;
  END IF;

  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'Nao foi possivel identificar usuario para registrar extrato da parcela %.', NEW.id;
  END IF;

  v_tipo := CASE
    WHEN NEW.id_despesa IS NOT NULL THEN 'saida'
    ELSE 'entrada'
  END;

  v_valor := ABS(COALESCE(NEW.valor_quitado_total, NEW.valor_original, 0));
  IF v_tipo = 'saida' THEN
    v_valor := -v_valor;
  END IF;

  v_descricao := COALESCE(
    NULLIF(TRIM(NEW.descricao_parcela), ''),
    CASE WHEN v_tipo = 'entrada' THEN 'Recebimento de parcela' ELSE 'Pagamento de parcela' END
  );

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
    NEW.id_empresa,
    v_conta,
    NEW.id,
    NEW.id_categoria,
    v_usuario,
    v_descricao,
    v_valor,
    COALESCE(NEW.data_quitacao_total, NOW()),
    v_tipo,
    TRUE
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_erp_parcelas_gerar_extrato_baixa ON public.erp_parcelas;
CREATE TRIGGER trg_erp_parcelas_gerar_extrato_baixa
AFTER INSERT OR UPDATE OF status, data_quitacao_total, valor_quitado_total, id_conta_bancaria
ON public.erp_parcelas
FOR EACH ROW
EXECUTE FUNCTION public.erp_fn_parcelas_gerar_extrato_baixa();

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
