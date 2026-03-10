import { PropostaItem, PropostaFormData, Cliente } from '../types';

/**
 * Valida se o formulário de proposta está completo
 */
export const validarFormularioProposta = (
  formData: PropostaFormData,
  clienteSelecionado: Cliente | null,
  items: PropostaItem[]
): { valido: boolean; mensagem: string } => {
  // Validar cliente
  if (!clienteSelecionado) {
    return {
      valido: false,
      mensagem: 'Por favor, selecione um cliente'
    };
  }

  // Validar título
  if (!formData.titulo.trim()) {
    return {
      valido: false,
      mensagem: 'Por favor, preencha o título da proposta'
    };
  }

  // Validar data da proposta
  if (!formData.dataProposta) {
    return {
      valido: false,
      mensagem: 'Por favor, selecione a data da proposta'
    };
  }

  // Validar itens
  if (items.length === 0) {
    return {
      valido: false,
      mensagem: 'Adicione pelo menos um item à proposta'
    };
  }

  // Validar itens individuais
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    if (!item.codigo.trim()) {
      return {
        valido: false,
        mensagem: `Item ${i + 1}: Código é obrigatório`
      };
    }
    
    if (!item.nome.trim()) {
      return {
        valido: false,
        mensagem: `Item ${i + 1}: Nome é obrigatório`
      };
    }
    
    if (item.quantidade <= 0) {
      return {
        valido: false,
        mensagem: `Item ${i + 1}: Quantidade deve ser maior que zero`
      };
    }
    
    if (!item.valorUnitario || parseFloat(item.valorUnitario) <= 0) {
      return {
        valido: false,
        mensagem: `Item ${i + 1}: Valor unitário deve ser maior que zero`
      };
    }
  }

  return {
    valido: true,
    mensagem: ''
  };
};

/**
 * Valida um item individual da proposta
 */
export const validarItem = (item: Partial<PropostaItem>): boolean => {
  return !!(
    item.codigo &&
    item.nome &&
    item.quantidade &&
    item.quantidade > 0 &&
    item.valorUnitario &&
    parseFloat(item.valorUnitario) > 0
  );
};

/**
 * Valida se uma data é válida
 */
export const validarData = (data: string): boolean => {
  if (!data) return false;
  const dataObj = new Date(data);
  return !isNaN(dataObj.getTime());
};

/**
 * Valida se uma data é futura
 */
export const validarDataFutura = (data: string): boolean => {
  if (!validarData(data)) return false;
  const dataObj = new Date(data);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return dataObj >= hoje;
};

/**
 * Valida valor numérico
 */
export const validarValorNumerico = (valor: string): boolean => {
  if (!valor) return true; // Valor vazio é válido (pode ser opcional)
  const numero = parseFloat(valor.replace(',', '.'));
  return !isNaN(numero) && numero >= 0;
};

/**
 * Valida percentual (0-100)
 */
export const validarPercentual = (valor: string): boolean => {
  if (!valor) return true;
  const numero = parseFloat(valor.replace(',', '.'));
  return !isNaN(numero) && numero >= 0 && numero <= 100;
};





