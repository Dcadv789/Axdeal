export interface ParametrosVendasTabProps {
  onNavigateToCondicoes?: () => void;
}

export interface TermoGarantia {
  id: string;
  nome: string;
  conteudo: string;
  isPadrao: boolean;
}

export interface NotaRodape {
  id: string;
  nome: string;
  conteudo: string;
  isPadrao: boolean;
}

export interface ParametrosFormData {
  prazoValidadePadrao: string;
  prazoValidadeTipo: string;
  prazoGarantiaPadrao: string;
  prazoGarantiaTipo: string;
  prazoEntregaPadrao: string;
  prazoEntregaTipo: string;
  obsPadraoProposta: string;
  obsPadraoVenda: string;
  instrucoesPadraoPagamento: string;
  prefixoProposta: string;
  prefixoVenda: string;
  prefixoProduto: string;
  prefixoServico: string;
  sequenciaPropostaInicio: string;
  sequenciaAtualVenda: string;
  sequenciaAtualProduto: string;
  sequenciaAtualServico: string;
  enviarEmailVenda: boolean;
  gerarNfAutomatica: boolean;
}





