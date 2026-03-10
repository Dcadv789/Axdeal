import { useState } from 'react';

export function useFiltrosContasReceber() {
  const [filtros, setFiltros] = useState({});
  return { filtros, setFiltros };
}
