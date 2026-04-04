-- Adiciona coluna lancamento em erp_parcelas para lancamentos manuais sem associacao
-- (quando nao ha id_venda, id_proposta, id_os, id_contrato ou id_despesa)

ALTER TABLE public.erp_parcelas
  ADD COLUMN IF NOT EXISTS lancamento TEXT NULL,
  ADD COLUMN IF NOT EXISTS forma_pagamento TEXT NULL;

COMMENT ON COLUMN public.erp_parcelas.lancamento IS 'Descricao do lancamento quando nao ha documento associado (venda, proposta, OS, contrato ou despesa).';
COMMENT ON COLUMN public.erp_parcelas.forma_pagamento IS 'Forma de pagamento: PIX, Boleto, Cartao Credito, Cartao Debito, Transferencia, Dinheiro, etc.';

-- Forma de pagamento no extrato (para lancamentos manuais ou quando diferente da parcela)
ALTER TABLE public.erp_extrato
  ADD COLUMN IF NOT EXISTS forma_pagamento TEXT NULL;

COMMENT ON COLUMN public.erp_extrato.forma_pagamento IS 'Forma de pagamento da movimentacao.';
