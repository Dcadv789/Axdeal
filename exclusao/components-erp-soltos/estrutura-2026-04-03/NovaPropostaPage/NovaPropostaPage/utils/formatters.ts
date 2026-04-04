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

/**
 * Formata nome do cliente para exibição (prioriza razão social, depois nome fantasia)
 */
export function formatarNomeCliente(contato: { nome_razao_social?: string | null; nome_fantasia?: string | null } | null): string {
  if (!contato) return 'Sem cliente';
  return (contato.nome_razao_social || contato.nome_fantasia || '').trim() || 'Sem cliente';
}

/**
 * Formata CNPJ ou CPF para exibição
 */
export function formatarCnpjCpf(documento: string | null | undefined): string {
  if (!documento) return '';
  const numeros = documento.replace(/\D/g, '');
  if (numeros.length === 14) {
    return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  if (numeros.length === 11) {
    return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return documento;
}
