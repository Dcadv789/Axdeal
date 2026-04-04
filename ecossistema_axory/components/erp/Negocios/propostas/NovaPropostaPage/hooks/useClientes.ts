import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Cliente } from '../types';

export function useClientes(idEmpresa: string | null) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Buscar todos os clientes
  const fetchClientes = useCallback(async () => {
    if (!idEmpresa) return;

    try {
      setCarregando(true);
      const { data, error } = await supabase
        .from('erp_contatos')
        .select('id, nome_razao_social, nome_fantasia, tipo_pessoa, cnpj, cpf')
        .eq('id_empresa', idEmpresa)
        .order('nome_razao_social');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setCarregando(false);
    }
  }, [idEmpresa]);

  // Filtrar clientes baseado na busca
  const filtrarClientes = useCallback((termoBusca: string) => {
    if (!termoBusca.trim()) {
      setClientesFiltrados([]);
      setMostrarSugestoes(false);
      return;
    }

    const termo = termoBusca.toLowerCase();
    const filtrados = clientes.filter(
      (c) =>
        c.nome_razao_social?.toLowerCase().includes(termo) ||
        c.nome_fantasia?.toLowerCase().includes(termo) ||
        c.cnpj?.includes(termo) ||
        c.cpf?.includes(termo)
    );

    setClientesFiltrados(filtrados);
    setMostrarSugestoes(filtrados.length > 0);
  }, [clientes]);

  // Selecionar cliente
  const selecionarCliente = useCallback((cliente: Cliente) => {
    setClienteSelecionado(cliente);
    setBusca(cliente.nome_razao_social);
    setMostrarSugestoes(false);
  }, []);

  // Limpar seleção
  const limparSelecao = useCallback(() => {
    setClienteSelecionado(null);
    setBusca('');
    setClientesFiltrados([]);
    setMostrarSugestoes(false);
  }, []);

  // Atualizar busca e filtrar
  const atualizarBusca = useCallback((valor: string) => {
    setBusca(valor);
    filtrarClientes(valor);
    if (clienteSelecionado && valor !== clienteSelecionado.nome_razao_social) {
      setClienteSelecionado(null);
    }
  }, [filtrarClientes, clienteSelecionado]);

  // Carregar clientes ao montar
  useEffect(() => {
    if (idEmpresa) {
      fetchClientes();
    }
  }, [idEmpresa, fetchClientes]);

  return {
    clientes,
    clientesFiltrados,
    clienteSelecionado,
    mostrarSugestoes,
    busca,
    carregando,
    setMostrarSugestoes,
    selecionarCliente,
    limparSelecao,
    atualizarBusca,
    setBusca,
    refetch: fetchClientes,
  };
}





