-- =============================================================
-- Migração: Separar itens de proposta em erp_itens_proposta
-- erp_itens_movimentacao perde id_proposta e passa a usar apenas
-- id_os e id_pedido_venda.
-- =============================================================

BEGIN;

-- 1) Criar tabela erp_itens_proposta (mesma estrutura dos itens de proposta)
CREATE TABLE IF NOT EXISTS public.erp_itens_proposta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empresa UUID NOT NULL REFERENCES public.sis_empresas(id) ON DELETE CASCADE,
  id_proposta UUID NOT NULL REFERENCES public.erp_propostas(id) ON DELETE CASCADE,
  id_item_catalogo UUID NULL REFERENCES public.erp_catalogo(id) ON DELETE SET NULL,
  tipo_item TEXT NOT NULL CHECK (UPPER(tipo_item) IN ('PRODUTO', 'SERVICO')),
  descricao_item TEXT NOT NULL DEFAULT '',
  quantidade NUMERIC(14,4) NOT NULL DEFAULT 1,
  preco_unitario NUMERIC(14,2) NOT NULL DEFAULT 0,
  desconto_item NUMERIC(14,2) NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_erp_itens_proposta_id_proposta
  ON public.erp_itens_proposta(id_proposta);
CREATE INDEX IF NOT EXISTS idx_erp_itens_proposta_id_empresa
  ON public.erp_itens_proposta(id_empresa);

ALTER TABLE public.erp_itens_proposta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Empresa ve itens proposta ERP" ON public.erp_itens_proposta;
CREATE POLICY "Empresa ve itens proposta ERP"
ON public.erp_itens_proposta FOR SELECT TO authenticated
USING (
  id_empresa IN (
    SELECT me.id_empresa FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
);

DROP POLICY IF EXISTS "Empresa cria itens proposta ERP" ON public.erp_itens_proposta;
CREATE POLICY "Empresa cria itens proposta ERP"
ON public.erp_itens_proposta FOR INSERT TO authenticated
WITH CHECK (
  id_empresa IN (
    SELECT me.id_empresa FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
);

DROP POLICY IF EXISTS "Empresa atualiza itens proposta ERP" ON public.erp_itens_proposta;
CREATE POLICY "Empresa atualiza itens proposta ERP"
ON public.erp_itens_proposta FOR UPDATE TO authenticated
USING (
  id_empresa IN (
    SELECT me.id_empresa FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
)
WITH CHECK (
  id_empresa IN (
    SELECT me.id_empresa FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
);

DROP POLICY IF EXISTS "Empresa remove itens proposta ERP" ON public.erp_itens_proposta;
CREATE POLICY "Empresa remove itens proposta ERP"
ON public.erp_itens_proposta FOR DELETE TO authenticated
USING (
  id_empresa IN (
    SELECT me.id_empresa FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.erp_itens_proposta TO authenticated;

-- 2) Migrar dados existentes (se erp_itens_movimentacao ainda tiver id_proposta)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'erp_itens_movimentacao'
      AND column_name = 'id_proposta'
  ) THEN
    INSERT INTO public.erp_itens_proposta (
      id_empresa, id_proposta, id_item_catalogo, tipo_item, descricao_item,
      quantidade, preco_unitario, desconto_item, criado_em, atualizado_em
    )
    SELECT
      id_empresa, id_proposta, id_item_catalogo, tipo_item, descricao_item,
      COALESCE(quantidade, 1), COALESCE(preco_unitario, 0), COALESCE(desconto_item, 0),
      COALESCE(criado_em, NOW()), COALESCE(atualizado_em, NOW())
    FROM public.erp_itens_movimentacao
    WHERE id_proposta IS NOT NULL;

    DELETE FROM public.erp_itens_movimentacao WHERE id_proposta IS NOT NULL;

    ALTER TABLE public.erp_itens_movimentacao DROP COLUMN IF EXISTS id_proposta;
  END IF;
END
$$;

COMMIT;
