import { PropostaItem, Parcela } from '../types';
import { parseValorBrasileiro } from './formatters';

/**
 * Calcula o subtotal de todos os itens
 */
export const calcularSubtotal = (items: PropostaItem[]): number => {
  return items.reduce((acc, item) => acc + (item.valorTotal || 0), 0);
};

/**
 * Calcula o total geral com descontos e acréscimos
 */
export const calcularTotalGeral = (
  items: PropostaItem[],
  descontoGeralReal: string,
  descontoGeralPercent: string,
  acrescimo: string,
  frete: string
): number => {
  const subtotal = calcularSubtotal(items);
  
  let descontoTotal = 0;
  if (descontoGeralReal) {
    descontoTotal = parseValorBrasileiro(descontoGeralReal);
  } else if (descontoGeralPercent) {
    const percent = parseValorBrasileiro(descontoGeralPercent);
    descontoTotal = (subtotal * percent) / 100;
  }
  
  const valorAcrescimo = acrescimo ? parseValorBrasileiro(acrescimo) : 0;
  const valorFrete = frete ? parseValorBrasileiro(frete) : 0;
  
  return subtotal - descontoTotal + valorAcrescimo + valorFrete;
};

/**
 * Calcula o valor total de um item com desconto
 */
export const calcularValorTotalItem = (
  quantidade: number,
  valorUnitario: string,
  descontoReal: string,
  descontoPercent: string
): number => {
  const valorUnit = parseValorBrasileiro(valorUnitario);
  const subtotalItem = quantidade * valorUnit;
  
  let descontoItem = 0;
  if (descontoReal) {
    descontoItem = parseValorBrasileiro(descontoReal);
  } else if (descontoPercent) {
    const percent = parseValorBrasileiro(descontoPercent);
    descontoItem = (subtotalItem * percent) / 100;
  }
  
  return subtotalItem - descontoItem;
};

/**
 * Calcula o desconto em percentual baseado no valor real
 */
export const calcularDescontoPercent = (
  valorBase: number,
  descontoReal: number
): number => {
  if (valorBase === 0) return 0;
  return (descontoReal / valorBase) * 100;
};

/**
 * Calcula o desconto real baseado no percentual
 */
export const calcularDescontoReal = (
  valorBase: number,
  descontoPercent: number
): number => {
  return (valorBase * descontoPercent) / 100;
};

/**
 * Gera parcelas baseado nas regras da condição de pagamento
 * 
 * @param valorTotal - Valor total a ser parcelado
 * @param regras - Array de regras com dias e percentual de cada parcela
 * @param dataBase - Data base para cálculo dos vencimentos (formato YYYY-MM-DD)
 * @returns Array de parcelas calculadas
 */
export const gerarParcelas = (
  valorTotal: number,
  regras: Array<{ dias: number; percentual: number }>,
  dataBase: string
): Parcela[] => {
  if (!regras || regras.length === 0) {
    return [];
  }

  if (valorTotal <= 0) {
    return [];
  }

  const parcelas: Parcela[] = [];
  const criarIdParcela = (index: number, regra?: { dias: number; percentual: number }) =>
    `parcela-auto-${index + 1}-${regra?.dias ?? 0}-${regra?.percentual ?? 0}`;
  const dataBaseParsed = new Date(dataBase + 'T00:00:00'); // Garantir que não há problemas de timezone
  
  // Verificar se todos os percentuais são iguais (ou muito próximos)
  const percentuais = regras.map(r => r.percentual || 0);
  const primeiroPercentual = percentuais[0];
  const todosIguais = percentuais.every(p => Math.abs(p - primeiroPercentual) < 0.01);
  
  // Caso especial: se há apenas uma parcela com 100%, usar o valor total completo
  if (regras.length === 1 && Math.abs(primeiroPercentual - 100) < 0.01) {
    const regra = regras[0];
    const dataVencimento = new Date(dataBaseParsed);
    dataVencimento.setDate(dataVencimento.getDate() + (regra.dias || 0));
    
    parcelas.push({
      id: criarIdParcela(0, regra),
      numero: 1,
      valor: valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      vencimento: dataVencimento.toISOString().split('T')[0],
      formaPagamento: '',
      observacoes: ''
    });
  }
  // Se todos os percentuais são iguais e há mais de uma parcela, dividir o valor total igualmente
  else if (todosIguais && regras.length > 1) {
    // Calcular valor base por parcela (arredondado para baixo com 2 casas decimais)
    // Exemplo: 1300 / 3 = 433.333... -> Math.floor(43333.33) = 43333 -> 433.33
    const valorBasePorParcela = Math.floor((valorTotal / regras.length) * 100) / 100;
    let somaCalculada = 0;
    
    regras.forEach((regra, index) => {
      const dataVencimento = new Date(dataBaseParsed);
      dataVencimento.setDate(dataVencimento.getDate() + (regra.dias || 0));
      
      let valorParcela: number;
      
      if (index === regras.length - 1) {
        // Última parcela: usar o que falta para completar o valor total exato
        // Exemplo: 1300 - 866.66 = 433.34
        const diferenca = valorTotal - somaCalculada;
        // Arredondar para 2 casas decimais garantindo que não perca precisão
        valorParcela = Math.round(diferenca * 100) / 100;
        
        // Garantir que não seja negativo
        if (valorParcela < 0) {
          valorParcela = 0;
        }
      } else {
        // Parcelas anteriores: usar o valor base arredondado para baixo
        valorParcela = valorBasePorParcela;
        somaCalculada += valorParcela;
      }
      
      parcelas.push({
        id: criarIdParcela(index, regra),
        numero: index + 1,
        valor: valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        vencimento: dataVencimento.toISOString().split('T')[0],
        formaPagamento: '',
        observacoes: ''
      });
    });
  } else {
    // Percentuais diferentes - usar os percentuais e ajustar a última parcela
    let somaCalculada = 0;
    
    regras.forEach((regra, index) => {
      const dataVencimento = new Date(dataBaseParsed);
      dataVencimento.setDate(dataVencimento.getDate() + (regra.dias || 0));
      
      let valorParcela: number;
      
      if (index === regras.length - 1) {
        // Última parcela: usar o que falta para completar o valor total
        valorParcela = valorTotal - somaCalculada;
      } else {
        // Parcelas anteriores: calcular pelo percentual
        valorParcela = (valorTotal * (regra.percentual || 0)) / 100;
        somaCalculada += valorParcela;
      }
      
      parcelas.push({
        id: criarIdParcela(index, regra),
        numero: index + 1,
        valor: valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        vencimento: dataVencimento.toISOString().split('T')[0],
        formaPagamento: '',
        observacoes: ''
      });
    });
  }
  
  return parcelas;
};

/**
 * Recalcula todas as parcelas quando o valor total muda
 */
export const recalcularParcelas = (
  parcelas: Parcela[],
  novoValorTotal: number
): Parcela[] => {
  if (parcelas.length === 0) return [];
  
  const valorPorParcela = novoValorTotal / parcelas.length;
  
  return parcelas.map((parcela) => ({
    ...parcela,
    valor: valorPorParcela.toFixed(2)
  }));
};

/**
 * Valida se a soma das parcelas é igual ao valor total
 */
export const validarSomaParcelas = (
  parcelas: Parcela[],
  valorTotal: number,
  tolerancia: number = 0.01
): boolean => {
  const somaParcelas = parcelas.reduce((acc, p) => acc + parseFloat(p.valor), 0);
  return Math.abs(somaParcelas - valorTotal) <= tolerancia;
};
