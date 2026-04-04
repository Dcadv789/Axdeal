import { useCallback } from 'react';
import type { Parcela, CondicaoPagamento } from '../types';
import { gerarParcelas } from '../utils/calculations';

/**
 * Hook para gerenciar o cálculo de parcelas baseado em condições de pagamento
 */
export function useCalculoParcelas() {
  /**
   * Calcula parcelas baseado na condição de pagamento selecionada
   */
  const calcularParcelasDeCondicao = useCallback((
    condicao: CondicaoPagamento | null,
    valorTotal: number,
    dataBase: string
  ): Parcela[] => {
    if (!condicao || !condicao.regras || condicao.regras.length === 0) {
      return [];
    }

    if (valorTotal <= 0 || !dataBase) {
      return [];
    }

    try {
      return gerarParcelas(valorTotal, condicao.regras, dataBase);
    } catch (error) {
      console.error('Erro ao calcular parcelas:', error);
      return [];
    }
  }, []);

  /**
   * Valida se uma condição de pagamento tem regras válidas
   * Aceita percentuais que somam entre 99% e 101% (para lidar com arredondamentos)
   */
  const validarCondicao = useCallback((condicao: CondicaoPagamento | null): boolean => {
    if (!condicao) return false;
    if (!condicao.regras || condicao.regras.length === 0) return false;
    
    // Validar que a soma dos percentuais está entre 99% e 101% (tolerância para arredondamentos)
    const somaPercentuais = condicao.regras.reduce((acc, regra) => acc + (regra.percentual || 0), 0);
    return somaPercentuais >= 99 && somaPercentuais <= 101; // Tolerância mais flexível
  }, []);

  return {
    calcularParcelasDeCondicao,
    validarCondicao,
  };
}

