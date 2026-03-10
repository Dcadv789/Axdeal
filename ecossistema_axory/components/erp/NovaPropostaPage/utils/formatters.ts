/**
 * Formata um valor numérico para o padrão brasileiro (0.000,00)
 */
export const formatarValorBrasileiro = (valor: string): string => {
  const numero = parseFloat(valor);
  if (isNaN(numero)) return '0,00';
  return numero.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

/**
 * Remove a formatação brasileira e retorna um número com ponto decimal
 */
export const desformatarValorBrasileiro = (valor: string): string => {
  return valor.replace(/\./g, '').replace(',', '.');
};

/**
 * Formata um valor para moeda brasileira com símbolo
 */
export const formatarMoeda = (valor: number): string => {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
};

/**
 * Converte string formatada para número
 */
export const parseValorBrasileiro = (valor: string): number => {
  const valorDesformatado = desformatarValorBrasileiro(valor);
  const numero = parseFloat(valorDesformatado);
  return isNaN(numero) ? 0 : numero;
};

/**
 * Formata uma data para o padrão brasileiro (DD/MM/YYYY)
 */
export const formatarDataBrasileira = (data: string): string => {
  if (!data) return '';
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
};

/**
 * Formata número de parcela para exibição
 */
export const formatarNumeroParcela = (numero: number, total: number): string => {
  return `${numero.toString().padStart(2, '0')}/${total.toString().padStart(2, '0')}`;
};





