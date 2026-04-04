import { useState, useCallback } from 'react';
import { buscarDadosCNPJ, mapearDadosBrasilApiCNPJ } from '../integrations/brasilApi/cnpj';
import type { ClienteFormData } from '../types';

export function useCnpjLookup() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const buscarCNPJ = useCallback(async (
    cnpj: string,
    setFormData: React.Dispatch<React.SetStateAction<ClienteFormData>>
  ): Promise<{ ok: boolean; reason?: 'not_found' | 'error' }> => {
    try {
      setCarregando(true);
      setErro(null);

      const dados = await buscarDadosCNPJ(cnpj);
      if (!dados) {
        throw new Error('Nenhum dado retornado');
      }

      const dadosMapeados = mapearDadosBrasilApiCNPJ(dados);

      setFormData((prev) => ({
        ...prev,
        ...dadosMapeados,
      }));

      return { ok: true };
    } catch (error: any) {
      const mensagemErro = error.message || 'Erro ao buscar dados do CNPJ';
      setErro(mensagemErro);
      console.error('Erro BrasilAPI CNPJ:', error);
      return {
        ok: false,
        reason: mensagemErro === 'Nenhum dado retornado' ? 'not_found' : 'error',
      };
    } finally {
      setCarregando(false);
    }
  }, []);

  const limparErro = useCallback(() => {
    setErro(null);
  }, []);

  return {
    buscarCNPJ,
    carregando,
    erro,
    limparErro,
  };
}
