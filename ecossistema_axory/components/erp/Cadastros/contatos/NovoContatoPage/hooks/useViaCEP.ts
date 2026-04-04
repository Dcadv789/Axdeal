import { useState, useCallback } from 'react';
import { buscarEnderecoCEP, mapearDadosViaCEP } from '../integrations/viaCep/cep';
import type { ClienteFormData } from '../types';

export function useViaCEP() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const buscarCEP = useCallback(async (
    cep: string,
    setFormData: React.Dispatch<React.SetStateAction<ClienteFormData>>
  ): Promise<boolean> => {
    try {
      setCarregando(true);
      setErro(null);

      const dados = await buscarEnderecoCEP(cep);
      
      if (!dados) {
        throw new Error('Nenhum dado retornado');
      }

      const dadosMapeados = mapearDadosViaCEP(dados);
      
      setFormData((prev) => ({
        ...prev,
        ...dadosMapeados,
      }));

      return true;
    } catch (error: any) {
      const mensagemErro = error.message || 'Erro ao buscar CEP';
      setErro(mensagemErro);
      console.error('Erro ViaCEP:', error);
      return false;
    } finally {
      setCarregando(false);
    }
  }, []);

  const limparErro = useCallback(() => {
    setErro(null);
  }, []);

  return {
    buscarCEP,
    carregando,
    erro,
    limparErro,
  };
}





