export function validarCPF(cpf: string): boolean {
  return cpf.length === 11;
}

export function validarCNPJ(cnpj: string): boolean {
  return cnpj.length === 14;
}

export function validarFormularioCliente(data: any): { valido: boolean; mensagem: string } {
  return { valido: true, mensagem: '' };
}
