# Padrão de Drawer

Este módulo usa drawer lateral no estilo adotado em `crm/leads`.

## Estrutura

- Overlay escuro no fundo
- Drawer ancorado à direita
- Bordas arredondadas no lado esquerdo
- Largura responsiva com `max-w-md` e `sm:max-w-lg`
- Altura total da viewport com `h-[100dvh]`

## Cabeçalho

- Título fixo no topo
- Descrição curta abaixo do título
- Botão de fechar no canto direito
- Separador inferior para destacar o header do conteúdo

## Corpo

- Área rolável independente com `flex-1 overflow-y-auto`
- Padding lateral e vertical consistente
- Conteúdo interno sem depender do scroll da página

## Rodapé de ações

- Botões alinhados no fim do conteúdo
- Ação primária em azul
- Ação secundária em borda neutra

## Regras visuais

- Usar `rounded-l-2xl`
- Usar `shadow-2xl`
- Manter texto do título sempre visível durante o scroll
- Evitar que o cabeçalho faça parte da área rolável
- Preferir um drawer por vez por contexto de cadastro

## Aplicação neste módulo

- Termos de garantia
- Notas de rodapé
- Cadastro de projetos
- Cadastro de departamentos
