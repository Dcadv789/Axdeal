# NovoClientePage

## Estrutura

```text
NovoClientePage/
|-- index.tsx
|-- README.md
|-- types/
|   `-- index.ts
|-- utils/
|   |-- formatters.ts
|   `-- validators.ts
|-- integrations/
|   |-- brasilApi/
|   |   `-- cnpj.ts
|   `-- viaCep/
|       `-- cep.ts
`-- hooks/
    |-- useClienteData.ts
    |-- useCnpjLookup.ts
    `-- useViaCEP.ts
```

## Responsabilidades

- `index.tsx`: composicao da tela e renderizacao das abas.
- `hooks/useClienteData.ts`: carregamento e persistencia do cliente.
- `hooks/useCnpjLookup.ts`: orquestracao da consulta de CNPJ e merge no formulario.
- `hooks/useViaCEP.ts`: orquestracao da consulta de CEP e merge no formulario.
- `integrations/brasilApi/cnpj.ts`: chamada HTTP e mapeamento da BrasilAPI.
- `integrations/viaCep/cep.ts`: chamada HTTP e mapeamento da ViaCEP.
- `utils/formatters.ts`: mascaras e formatacoes.
- `utils/validators.ts`: validacoes do formulario.

## Integracoes externas

- BrasilAPI: `https://brasilapi.com.br/api/cnpj/v1/{cnpj}`
  Preenche dados cadastrais, endereco, email, telefone e whatsapp.
- ViaCEP: `https://viacep.com.br/ws/{cep}/json/`
  Preenche endereco a partir do CEP.
