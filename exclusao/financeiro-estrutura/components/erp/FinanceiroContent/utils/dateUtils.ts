/**
 * Formata uma data (Date) para string no formato YYYY-MM-DD sem problemas de timezone
 */
export const formatarDataLocal = (data: Date): string => {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

/**
 * Converte string de data (YYYY-MM-DD) para exibição (DD/MM/YYYY)
 */
export const formatarDataParaExibicao = (dataString: string): string => {
  if (!dataString) return '';
  // Parse da string YYYY-MM-DD diretamente, sem usar new Date() para evitar problemas de timezone
  const partes = dataString.split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return dataString;
};

/**
 * Obtém o primeiro dia do mês atual
 */
export const obterPrimeiroDiaMesAtual = (): Date => {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
};

/**
 * Obtém o último dia do mês atual
 */
export const obterUltimoDiaMesAtual = (): Date => {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
};

/**
 * Obtém o primeiro dia do mês anterior
 */
export const obterPrimeiroDiaMesAnterior = (): Date => {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
};

/**
 * Obtém o último dia do mês anterior
 */
export const obterUltimoDiaMesAnterior = (): Date => {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth(), 0);
};

/**
 * Obtém o primeiro dia do próximo mês
 */
export const obterPrimeiroDiaProximoMes = (): Date => {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
};

/**
 * Obtém o último dia do próximo mês
 */
export const obterUltimoDiaProximoMes = (): Date => {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0);
};

/**
 * Formata valor em moeda brasileira
 */
export const formatarMoeda = (valor: number): string => {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};





