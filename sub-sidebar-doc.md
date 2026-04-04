# Sub-sidebar (ERP Configurações) - Implementação final

Este documento registra o padrão final da sub-sidebar de `erp/configuracoes`, incluindo layout, animação, alinhamento de ícones e estados expandido/recolhido.

## Objetivo do padrão

- Sub-sidebar interna acoplada à página de Configurações.
- Estado expandido e recolhido com transição suave.
- Ícones sem deslocamento visual durante animação.
- Texto aparece/some sem quebrar layout.
- Fundo da sub-sidebar e cards no mesmo tom da página de Negócios (`gray-100`).

## Arquivo principal

- `ecossistema_axory/components/erp/ErpConfiguracoesHubContent.tsx`

## Estrutura de layout

### Grade principal com largura animada

```tsx
<div
  className={`grid min-h-[calc(100vh-68px)] grid-cols-1 transition-[grid-template-columns] duration-300 ease-out ${
    isSubSidebarCollapsed ? 'lg:grid-cols-[98px_minmax(0,1fr)]' : 'lg:grid-cols-[284px_minmax(0,1fr)]'
  }`}
>
```

- Expandido: `284px`
- Recolhido: `98px`
- A animação acontece na propriedade `grid-template-columns`.

### Sub-sidebar

```tsx
<aside className="h-full border-r border-slate-300 bg-gray-100 dark:border-neutral-800 dark:bg-neutral-900/70">
```

## Cabeçalho da sub-sidebar

### Comportamento

- Expandido: mostra título `Configurações ERP` + botão recolher.
- Recolhido: mostra somente botão, centralizado horizontalmente.

```tsx
<div className={`mb-3 flex items-center ${isSubSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
  {!isSubSidebarCollapsed && (
    <h2 className="truncate pr-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
      Configurações ERP
    </h2>
  )}
  <button
    type="button"
    onClick={() => setIsSubSidebarCollapsed((prev) => !prev)}
    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors duration-200 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-300 dark:hover:bg-neutral-800"
  >
    {isSubSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
  </button>
</div>
```

## Itens do menu (ponto crítico)

### Regra que elimina a quebra visual

- O ícone **não muda de trilho** durante a animação.
- O container interno do item usa sempre:
  - `justify-start`
  - mesma altura (`h-9`)
- O texto fica em camada absoluta e anima só:
  - `max-width`
  - `opacity`
- O texto **não** anima `left`.

### Trecho final

```tsx
<button
  className={`relative rounded-xl border px-3 py-3 text-left transition-[width,margin,background-color,border-color,color] duration-200 ease-out ${
    isSubSidebarCollapsed ? 'mx-auto w-16' : 'w-full'
  } ${
    ativa
      ? 'border-blue-200 bg-white text-blue-700 shadow-sm dark:border-blue-500/35 dark:bg-neutral-950 dark:text-blue-300'
      : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-white/80 dark:text-slate-300 dark:hover:border-neutral-700 dark:hover:bg-neutral-950/70'
  }`}
>
  <div className="relative flex h-9 items-center justify-start">
    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${ativa ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-slate-200 text-slate-600 dark:bg-neutral-800 dark:text-slate-300'}`}>
      <Icon size={18} />
    </span>
    <span
      className={`pointer-events-none absolute left-[52px] top-1/2 block -translate-y-1/2 overflow-hidden whitespace-nowrap text-sm font-semibold transition-[max-width,opacity] duration-200 ease-out ${
        isSubSidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[150px] opacity-100'
      }`}
    >
      {aba.rotulo}
    </span>
  </div>
</button>
```

## Fundo e consistência visual

### Fundo da sub-sidebar

- Igual ao padrão da página de Negócios (`gray-100` -> `#f3f4f6`).

### Fundo dos cards do conteúdo

Aplicado por escopo local:

```tsx
<style jsx global>{`
  .erp-config-content .bg-white {
    background-color: #f3f4f6 !important;
  }
  .erp-config-content .bg-white\/95 {
    background-color: #f3f4f6 !important;
  }
  .erp-config-content .bg-slate-50\/80 {
    background-color: #f3f4f6 !important;
  }
`}</style>
```

## Ajustes complementares feitos no módulo

### Evitar card dentro de card em Contas Bancárias

- Arquivo: `ecossistema_axory/components/erp/ContasBancariasContent.tsx`
- Ajuste:

```tsx
<ConfigSectionLayout
  ...
  showHeader={false}
  wrapInCard={false}
>
```

## Checklist de validação

- Expandido: ícone alinhado com texto sem folga excessiva.
- Recolhido: ícones centralizados lateralmente.
- Transição expandir/recolher sem “pulo” do ícone.
- Botão de expandir centralizado quando recolhido.
- Fundo da sub-sidebar e cards coerentes com `gray-100`.

