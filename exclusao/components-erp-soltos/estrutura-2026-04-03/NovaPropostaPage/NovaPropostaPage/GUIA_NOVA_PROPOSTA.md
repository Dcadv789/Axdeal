# Guia da Página "Nova Proposta"

Este documento descreve como a página de **Nova Proposta** funciona hoje, incluindo fluxo de tela, regras de validação, persistência no banco e proteção contra saída sem salvar.

## 1. Onde a página é usada

- Tela principal: `app/(platform)/erp/negocios/page.tsx`
- Componente de formulário: `components/erp/NovaPropostaPage/index.tsx`

Na rota de Negócios, quando o usuário clica em **Nova Proposta**, a listagem é substituída pelo formulário da proposta.

## 2. Arquitetura do módulo

A página foi dividida em:

- `index.tsx`: orquestração geral, salvar/editar, integração com Supabase.
- `hooks/`: carregamento e estado de dados.
- `components/`: blocos visuais da tela.
- `utils/`: cálculos, formatação e validações.
- `types/`: contratos TypeScript.

## 3. Blocos visuais da tela

No formulário (`#form-nova-proposta`), os blocos aparecem nesta ordem:

1. **Informações Básicas**
2. **Configurações Adicionais**
3. **Itens da Proposta**
4. **Condições Comerciais**
5. **Informações Adicionais**
6. **Ações finais** (Cancelar, Salvar rascunho, Criar proposta)

## 4. Fluxo de inicialização

Quando a página abre:

1. Busca `id_empresa` do usuário logado em `sis_membros_equipe`.
2. Carrega dados auxiliares por empresa:
   - clientes (`erp_contatos`)
   - catálogo (`erp_catalogo`)
   - vendedores (`erp_vendedores`)
   - condições de pagamento (`erp_condicoes_pagamento`, globais + empresa)
3. Em `mode=create`:
   - gera número inicial da proposta com base em `sis_configuracoes` (`prefixo_proposta` + `proximo_numero_proposta`)
   - carrega defaults de validade, prazos e observações
   - status inicial em memória: `AGUARDANDO_ENVIO`
4. Em `mode=edit`/`mode=view`:
   - carrega proposta existente, cliente, itens e configurações de blocos
   - sincroniza vendedor e condição selecionada

## 5. Hooks e responsabilidades

### `usePropostaData`

- Controla `formData`, itens, status, descontos/acréscimos/frete e dados carregados de proposta existente.
- Carrega defaults da empresa para propostas novas.
- Gera código da proposta no create.

### `useClientes`

- Busca clientes da empresa.
- Faz filtro por nome/razão social/CNPJ/CPF para autocomplete.

### `useCatalogo`

- Busca itens da tabela `erp_catalogo`.
- Normaliza tipo para `SERVICO` ou `PRODUTO`.
- Permite busca por nome e código.

### `useCondicoesPagamento`

- Busca condições globais (`id_empresa is null`) e da empresa atual.
- Remove duplicadas por `id`.
- Mantém condição atualmente selecionada.

### `useParcelas`

- Armazena parcelas da proposta.
- Permite atualizar, remover, recalcular e definir conjunto de parcelas.

## 6. Regras dos itens da proposta

No bloco **Itens da Proposta**:

- usuário pode adicionar item como **Serviço** ou **Produto**
- busca no catálogo por nome e código
- ao selecionar item do catálogo, preenche código, nome e valor unitário
- valor total do item é recalculado ao mudar quantidade, valor ou desconto
- resumo calcula subtotal, desconto, frete, acréscimo e total final

## 7. Regras das condições comerciais e parcelas

No bloco **Condições Comerciais**:

- seleciona condição de pagamento em dropdown custom
- ao selecionar condição, gera parcelas automaticamente
- parcelas também são atualizadas quando muda `valorTotal` ou `dataProposta`
- se o total ainda for zero, cria parcelas com `R$ 0,00` (placeholder)
- cada parcela permite editar:
  - vencimento
  - valor
  - forma de pagamento
  - observações
- o campo de forma de pagamento usa dropdown custom no padrão visual azul

## 8. Validação e status de gravação

### Salvar rascunho

- botão: `submitAction=rascunho`
- salva mesmo sem campos obrigatórios
- status gravado: `RASCUNHO`

### Criar proposta (normal)

- botão: `submitAction=criar`
- validações obrigatórias em `utils/validators.ts`:
  - cliente selecionado
  - título
  - número da proposta
  - data da proposta
  - pelo menos 1 item
  - item com código, nome, quantidade > 0 e valor unitário > 0
- status gravado (create): `AGUARDANDO_ENVIO`

### Número da proposta

- é preenchido automaticamente no create
- pode ser editado manualmente
- antes de salvar, valida unicidade por `id_empresa + codigo`

## 9. Persistência no banco (Supabase)

Ao salvar:

1. `erp_propostas`
   - create: `insert`
   - edit: `update`
2. `erp_itens_proposta`
   - remove itens antigos da proposta
   - insere lista nova de itens
3. `erp_parcelas`
   - remove parcelas anteriores da proposta com status diferente de `PAGO`
   - insere parcelas atuais

Campos relevantes gravados em `erp_propostas`:

- `id_empresa`, `id_cliente`, `codigo`
- `introducao`, `data_emissao`, `data_validade`
- `observacoes_cliente`, `observacoes_internas`
- `valor_desconto_global`, `valor_acrescimo`, `valor_frete_outros`, `valor_total_final`
- `status`, `id_vendedor`, `id_condicao_pagamento`
- `cobranca_recorrente`, `configuracao_blocos`

## 10. Proteção de saída sem salvar

Na tela `erp/negocios`, enquanto está em **Nova Proposta**:

- clicar em **Cancelar** abre modal de confirmação
- clicar no breadcrumb para sair abre modal
- navegar pela sidebar para outra página abre modal
- refresh/fechar aba dispara aviso de `beforeunload`

Somente ao confirmar saída a navegação é concluída.

## 11. Tratamento de erros

- Erros de Supabase são tratados com mensagens amigáveis quando possível.
- Caso de duplicidade (`23505`) exibe alerta específico para número já existente.
- Logs de debug da proposta usam prefixo `[NovaProposta]` no console.

## 12. Estilo visual aplicado

- Inputs, selects e textareas usam borda azul clara.
- Focus com anel azul.
- Suporte a modo escuro.
- Dropdowns customizados no padrão visual da página.

## 13. Observação importante

Este guia descreve o comportamento atual do módulo conforme o código fonte dos arquivos:

- `app/(platform)/erp/negocios/page.tsx`
- `components/erp/NovaPropostaPage/index.tsx`
- `components/erp/NovaPropostaPage/hooks/*`
- `components/erp/NovaPropostaPage/components/*`
- `components/erp/NovaPropostaPage/utils/*`

