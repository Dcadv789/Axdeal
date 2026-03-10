/**
 * Formata CPF: 12345678900 -> 123.456.789-00
 */
export const formatarCPF = (cpf: string): string => {
  const cpfLimpo = cpf.replace(/\D/g, '');
  return cpfLimpo
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

/**
 * Formata CNPJ: 12345678000190 -> 12.345.678/0001-90
 */
export const formatarCNPJ = (cnpj: string): string => {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  return cnpjLimpo
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};

/**
 * Formata telefone: 11999999999 -> (11) 99999-9999
 */
export const formatarTelefone = (telefone: string): string => {
  const telefoneLimpo = telefone.replace(/\D/g, '');
  
  if (telefoneLimpo.length === 11) {
    return telefoneLimpo.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (telefoneLimpo.length === 10) {
    return telefoneLimpo.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return telefone;
};

/**
 * Formata CEP: 12345678 -> 12345-678
 */
export const formatarCEP = (cep: string): string => {
  const cepLimpo = cep.replace(/\D/g, '');
  return cepLimpo.replace(/(\d{5})(\d{3})/, '$1-$2');
};

/**
 * Remove formatação de string
 */
export const removerFormatacao = (valor: string): string => {
  return valor.replace(/\D/g, '');
};

/**
 * Formata valor monetário
 */
export const formatarMoeda = (valor: string | number): string => {
  const numero = typeof valor === 'string' ? parseFloat(valor) : valor;
  if (isNaN(numero)) return 'R$ 0,00';
  
  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
};

/**
 * Capitaliza primeira letra de cada palavra
 */
export const capitalizarNome = (nome: string): string => {
  return nome
    .toLowerCase()
    .split(' ')
    .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
    .join(' ');
};





