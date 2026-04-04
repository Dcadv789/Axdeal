import { useState } from 'react';

export function useParcelas(idEmpresa: string | null, enabled: boolean = true) {
  const [parcelas, setParcelas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);

  const buscarParcelas = async () => {
    // TODO: implementar busca de parcelas
  };

  return { parcelas, carregando, buscarParcelas };
}
