BEGIN;

CREATE TABLE IF NOT EXISTS public.erp_grupos_dre (
  id_grupo UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empresa UUID NOT NULL REFERENCES public.sis_empresas(id) ON DELETE CASCADE,
  id_usuario UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  nome_grupo TEXT NOT NULL,
  tipo_grupo TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 1,
  cor TEXT NOT NULL DEFAULT '#2563EB',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT erp_grupos_dre_tipo_grupo_check
    CHECK (tipo_grupo IN ('receita', 'custo', 'despesa', 'resultado'))
);

COMMENT ON TABLE public.erp_grupos_dre IS
'Grupos principais do DRE (ex.: Receitas, Custos e Despesas) por empresa.';

COMMENT ON COLUMN public.erp_grupos_dre.id_grupo IS 'Identificador do grupo de DRE.';
COMMENT ON COLUMN public.erp_grupos_dre.id_empresa IS 'Empresa proprietaria do grupo.';
COMMENT ON COLUMN public.erp_grupos_dre.id_usuario IS 'Usuario autor da ultima alteracao (auth.uid).';
COMMENT ON COLUMN public.erp_grupos_dre.nome_grupo IS 'Nome do grupo de DRE.';
COMMENT ON COLUMN public.erp_grupos_dre.tipo_grupo IS 'Tipo macro do grupo: receita, custo, despesa ou resultado.';
COMMENT ON COLUMN public.erp_grupos_dre.descricao IS 'Descricao opcional do objetivo do grupo.';
COMMENT ON COLUMN public.erp_grupos_dre.ordem IS 'Ordem de exibicao no layout e na analise.';
COMMENT ON COLUMN public.erp_grupos_dre.cor IS 'Cor hexadecimal usada para identificacao visual.';
COMMENT ON COLUMN public.erp_grupos_dre.ativo IS 'Flag logica de ativacao/inativacao.';
COMMENT ON COLUMN public.erp_grupos_dre.criado_em IS 'Data de criacao do registro.';
COMMENT ON COLUMN public.erp_grupos_dre.atualizado_em IS 'Data da ultima alteracao do registro.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_erp_grupos_dre_empresa_nome
  ON public.erp_grupos_dre(id_empresa, nome_grupo);

CREATE INDEX IF NOT EXISTS idx_erp_grupos_dre_empresa_ordem
  ON public.erp_grupos_dre(id_empresa, ordem);

CREATE TABLE IF NOT EXISTS public.erp_categorias (
  id_categoria UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empresa UUID NOT NULL REFERENCES public.sis_empresas(id) ON DELETE CASCADE,
  id_usuario UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  id_grupo UUID NOT NULL REFERENCES public.erp_grupos_dre(id_grupo) ON DELETE CASCADE,
  id_categoria_pai UUID REFERENCES public.erp_categorias(id_categoria) ON DELETE SET NULL,
  nome_categoria TEXT NOT NULL,
  descricao TEXT,
  tipo_lancamento TEXT NOT NULL DEFAULT 'saida',
  ordem INTEGER NOT NULL DEFAULT 1,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT erp_categorias_tipo_lancamento_check
    CHECK (tipo_lancamento IN ('entrada', 'saida', 'ambos'))
);

COMMENT ON TABLE public.erp_categorias IS
'Categorias e subcategorias hierarquicas do ERP, vinculadas aos grupos de DRE.';

COMMENT ON COLUMN public.erp_categorias.id_categoria IS 'Identificador da categoria.';
COMMENT ON COLUMN public.erp_categorias.id_empresa IS 'Empresa proprietaria da categoria.';
COMMENT ON COLUMN public.erp_categorias.id_usuario IS 'Usuario autor da ultima alteracao (auth.uid).';
COMMENT ON COLUMN public.erp_categorias.id_grupo IS 'Grupo de DRE ao qual a categoria pertence.';
COMMENT ON COLUMN public.erp_categorias.id_categoria_pai IS 'Categoria pai para formar a hierarquia de subcategorias.';
COMMENT ON COLUMN public.erp_categorias.nome_categoria IS 'Nome da categoria.';
COMMENT ON COLUMN public.erp_categorias.descricao IS 'Descricao opcional da categoria.';
COMMENT ON COLUMN public.erp_categorias.tipo_lancamento IS 'Natureza da categoria para lancamentos: entrada, saida ou ambos.';
COMMENT ON COLUMN public.erp_categorias.ordem IS 'Ordem de exibicao dentro do grupo/pai.';
COMMENT ON COLUMN public.erp_categorias.ativo IS 'Flag logica de ativacao/inativacao.';
COMMENT ON COLUMN public.erp_categorias.criado_em IS 'Data de criacao do registro.';
COMMENT ON COLUMN public.erp_categorias.atualizado_em IS 'Data da ultima alteracao do registro.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_erp_categorias_empresa_grupo_pai_nome
  ON public.erp_categorias (
    id_empresa,
    id_grupo,
    COALESCE(id_categoria_pai, '00000000-0000-0000-0000-000000000000'::uuid),
    nome_categoria
  );

CREATE INDEX IF NOT EXISTS idx_erp_categorias_empresa_grupo_ordem
  ON public.erp_categorias(id_empresa, id_grupo, ordem);

CREATE INDEX IF NOT EXISTS idx_erp_categorias_pai
  ON public.erp_categorias(id_categoria_pai);

CREATE OR REPLACE FUNCTION public.erp_fn_grupos_dre_set_auditoria()
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

  IF NEW.id_empresa IS NULL THEN
    RAISE EXCEPTION 'id_empresa e obrigatorio para grupos de DRE.';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.id_empresa <> OLD.id_empresa THEN
    RAISE EXCEPTION 'Nao e permitido alterar id_empresa do grupo.';
  END IF;

  NEW.id_usuario := auth.uid();
  NEW.atualizado_em := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_erp_grupos_dre_auditoria ON public.erp_grupos_dre;
CREATE TRIGGER trg_erp_grupos_dre_auditoria
BEFORE INSERT OR UPDATE ON public.erp_grupos_dre
FOR EACH ROW
EXECUTE FUNCTION public.erp_fn_grupos_dre_set_auditoria();

CREATE OR REPLACE FUNCTION public.erp_fn_categorias_set_auditoria_integridade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_grupo UUID;
  v_empresa_pai UUID;
  v_grupo_pai UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado.';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.criado_em := COALESCE(NEW.criado_em, NOW());
  END IF;

  IF NEW.id_grupo IS NULL THEN
    RAISE EXCEPTION 'id_grupo e obrigatorio para categorias.';
  END IF;

  SELECT g.id_empresa INTO v_empresa_grupo
  FROM public.erp_grupos_dre g
  WHERE g.id_grupo = NEW.id_grupo;

  IF v_empresa_grupo IS NULL THEN
    RAISE EXCEPTION 'Grupo de DRE invalido para a categoria.';
  END IF;

  NEW.id_empresa := COALESCE(NEW.id_empresa, v_empresa_grupo);

  IF NEW.id_empresa <> v_empresa_grupo THEN
    RAISE EXCEPTION 'Categoria deve pertencer a mesma empresa do grupo.';
  END IF;

  IF NEW.id_categoria_pai IS NOT NULL THEN
    SELECT c.id_empresa, c.id_grupo
    INTO v_empresa_pai, v_grupo_pai
    FROM public.erp_categorias c
    WHERE c.id_categoria = NEW.id_categoria_pai;

    IF v_empresa_pai IS NULL THEN
      RAISE EXCEPTION 'Categoria pai informada nao existe.';
    END IF;

    IF v_empresa_pai <> NEW.id_empresa OR v_grupo_pai <> NEW.id_grupo THEN
      RAISE EXCEPTION 'Categoria pai deve pertencer ao mesmo grupo e empresa.';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.id_empresa <> OLD.id_empresa THEN
    RAISE EXCEPTION 'Nao e permitido alterar id_empresa da categoria.';
  END IF;

  NEW.id_usuario := auth.uid();
  NEW.atualizado_em := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_erp_categorias_auditoria ON public.erp_categorias;
CREATE TRIGGER trg_erp_categorias_auditoria
BEFORE INSERT OR UPDATE ON public.erp_categorias
FOR EACH ROW
EXECUTE FUNCTION public.erp_fn_categorias_set_auditoria_integridade();

ALTER TABLE public.erp_grupos_dre ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_categorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Empresa ve grupos DRE ERP" ON public.erp_grupos_dre;
CREATE POLICY "Empresa ve grupos DRE ERP"
ON public.erp_grupos_dre FOR SELECT
TO authenticated
USING (
  id_empresa IN (
    SELECT me.id_empresa
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
);

DROP POLICY IF EXISTS "Empresa cria grupos DRE ERP" ON public.erp_grupos_dre;
CREATE POLICY "Empresa cria grupos DRE ERP"
ON public.erp_grupos_dre FOR INSERT
TO authenticated
WITH CHECK (
  id_empresa IN (
    SELECT me.id_empresa
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
  AND id_usuario = auth.uid()
);

DROP POLICY IF EXISTS "Empresa atualiza grupos DRE ERP" ON public.erp_grupos_dre;
CREATE POLICY "Empresa atualiza grupos DRE ERP"
ON public.erp_grupos_dre FOR UPDATE
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

DROP POLICY IF EXISTS "Empresa remove grupos DRE ERP" ON public.erp_grupos_dre;
CREATE POLICY "Empresa remove grupos DRE ERP"
ON public.erp_grupos_dre FOR DELETE
TO authenticated
USING (
  id_empresa IN (
    SELECT me.id_empresa
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
);

DROP POLICY IF EXISTS "Empresa ve categorias ERP" ON public.erp_categorias;
CREATE POLICY "Empresa ve categorias ERP"
ON public.erp_categorias FOR SELECT
TO authenticated
USING (
  id_empresa IN (
    SELECT me.id_empresa
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
);

DROP POLICY IF EXISTS "Empresa cria categorias ERP" ON public.erp_categorias;
CREATE POLICY "Empresa cria categorias ERP"
ON public.erp_categorias FOR INSERT
TO authenticated
WITH CHECK (
  id_empresa IN (
    SELECT me.id_empresa
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
  AND id_usuario = auth.uid()
);

DROP POLICY IF EXISTS "Empresa atualiza categorias ERP" ON public.erp_categorias;
CREATE POLICY "Empresa atualiza categorias ERP"
ON public.erp_categorias FOR UPDATE
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

DROP POLICY IF EXISTS "Empresa remove categorias ERP" ON public.erp_categorias;
CREATE POLICY "Empresa remove categorias ERP"
ON public.erp_categorias FOR DELETE
TO authenticated
USING (
  id_empresa IN (
    SELECT me.id_empresa
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.erp_fn_importar_modelo_padrao_axory_categorias(
  p_id_empresa UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_usuario UUID;
  v_id_empresa UUID;
  v_grupo_receitas UUID;
  v_grupo_custos UUID;
  v_grupo_despesas UUID;
  v_categoria_marketing UUID;
BEGIN
  v_id_usuario := auth.uid();

  IF v_id_usuario IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado.';
  END IF;

  IF p_id_empresa IS NULL THEN
    SELECT me.id_empresa
    INTO v_id_empresa
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = v_id_usuario
    ORDER BY me.criado_em NULLS LAST
    LIMIT 1;
  ELSE
    SELECT me.id_empresa
    INTO v_id_empresa
    FROM public.sis_membros_equipe me
    WHERE me.id_usuario = v_id_usuario
      AND me.id_empresa = p_id_empresa
    LIMIT 1;
  END IF;

  IF v_id_empresa IS NULL THEN
    RAISE EXCEPTION 'Usuario sem acesso a empresa informada.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.erp_grupos_dre g
    WHERE g.id_empresa = v_id_empresa
  ) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'mensagem', 'Modelo padrao ja configurado para esta empresa.'
    );
  END IF;

  INSERT INTO public.erp_grupos_dre (
    id_empresa, id_usuario, nome_grupo, tipo_grupo, descricao, ordem, cor
  )
  VALUES (
    v_id_empresa, v_id_usuario, 'Receitas', 'receita',
    'Entradas financeiras do negocio.', 1, '#16A34A'
  )
  RETURNING id_grupo INTO v_grupo_receitas;

  INSERT INTO public.erp_grupos_dre (
    id_empresa, id_usuario, nome_grupo, tipo_grupo, descricao, ordem, cor
  )
  VALUES (
    v_id_empresa, v_id_usuario, 'Custos', 'custo',
    'Custos diretos vinculados a entrega dos produtos e servicos.', 2, '#F59E0B'
  )
  RETURNING id_grupo INTO v_grupo_custos;

  INSERT INTO public.erp_grupos_dre (
    id_empresa, id_usuario, nome_grupo, tipo_grupo, descricao, ordem, cor
  )
  VALUES (
    v_id_empresa, v_id_usuario, 'Despesas', 'despesa',
    'Despesas operacionais e administrativas do negocio.', 3, '#EF4444'
  )
  RETURNING id_grupo INTO v_grupo_despesas;

  INSERT INTO public.erp_categorias (
    id_empresa, id_usuario, id_grupo, nome_categoria, descricao, tipo_lancamento, ordem
  ) VALUES
    (v_id_empresa, v_id_usuario, v_grupo_receitas, 'Vendas de Produtos', 'Receita oriunda de venda de produtos.', 'entrada', 1),
    (v_id_empresa, v_id_usuario, v_grupo_receitas, 'Servicos Prestados', 'Receita oriunda de servicos executados.', 'entrada', 2),
    (v_id_empresa, v_id_usuario, v_grupo_receitas, 'Receitas Recorrentes', 'Planos, assinaturas e contratos recorrentes.', 'entrada', 3),
    (v_id_empresa, v_id_usuario, v_grupo_receitas, 'Outras Receitas', 'Entradas nao recorrentes e extraordinarias.', 'entrada', 4);

  INSERT INTO public.erp_categorias (
    id_empresa, id_usuario, id_grupo, nome_categoria, descricao, tipo_lancamento, ordem
  ) VALUES
    (v_id_empresa, v_id_usuario, v_grupo_custos, 'CMV - Custo Mercadoria Vendida', 'Custos diretamente ligados ao produto vendido.', 'saida', 1),
    (v_id_empresa, v_id_usuario, v_grupo_custos, 'Mao de Obra Direta', 'Custos operacionais diretamente produtivos.', 'saida', 2),
    (v_id_empresa, v_id_usuario, v_grupo_custos, 'Fretes e Logistica', 'Custos de transporte, entrega e armazenagem.', 'saida', 3),
    (v_id_empresa, v_id_usuario, v_grupo_custos, 'Comissoes', 'Comissoes variaveis de vendas e parceiros.', 'saida', 4);

  INSERT INTO public.erp_categorias (
    id_empresa, id_usuario, id_grupo, nome_categoria, descricao, tipo_lancamento, ordem
  )
  VALUES (
    v_id_empresa, v_id_usuario, v_grupo_despesas, 'Marketing',
    'Investimentos em divulgacao, midia e marca.', 'saida', 1
  )
  RETURNING id_categoria INTO v_categoria_marketing;

  INSERT INTO public.erp_categorias (
    id_empresa, id_usuario, id_grupo, nome_categoria, descricao, tipo_lancamento, ordem
  ) VALUES
    (v_id_empresa, v_id_usuario, v_grupo_despesas, 'Aluguel', 'Custo mensal de estrutura fisica.', 'saida', 2),
    (v_id_empresa, v_id_usuario, v_grupo_despesas, 'Salarios Administrativos', 'Folha administrativa e encargos.', 'saida', 3),
    (v_id_empresa, v_id_usuario, v_grupo_despesas, 'Sistemas e Tecnologia', 'Assinaturas de software e infraestrutura digital.', 'saida', 4),
    (v_id_empresa, v_id_usuario, v_grupo_despesas, 'Impostos e Taxas', 'Tributos, taxas e obrigacoes legais.', 'saida', 5),
    (v_id_empresa, v_id_usuario, v_grupo_despesas, 'Despesas Gerais', 'Despesas diversas de operacao.', 'saida', 6);

  INSERT INTO public.erp_categorias (
    id_empresa, id_usuario, id_grupo, id_categoria_pai, nome_categoria, descricao, tipo_lancamento, ordem
  ) VALUES
    (v_id_empresa, v_id_usuario, v_grupo_despesas, v_categoria_marketing, 'Trafego Pago', 'Anuncios em plataformas digitais.', 'saida', 1),
    (v_id_empresa, v_id_usuario, v_grupo_despesas, v_categoria_marketing, 'Conteudo e Branding', 'Producao de conteudo e fortalecimento da marca.', 'saida', 2);

  RETURN jsonb_build_object(
    'ok', true,
    'id_empresa', v_id_empresa,
    'grupos_criados', 3,
    'categorias_criadas', 16
  );
END;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.erp_grupos_dre TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.erp_categorias TO authenticated;
GRANT EXECUTE ON FUNCTION public.erp_fn_importar_modelo_padrao_axory_categorias(UUID) TO authenticated;

COMMIT;
