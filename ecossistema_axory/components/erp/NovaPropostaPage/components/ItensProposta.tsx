import { Plus, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { PropostaItem, CatalogoItem } from '../types';
import { parseValorBrasileiro } from '../utils/formatters';

interface ItensPropostaProps {
  items: PropostaItem[];
  setItems: (items: PropostaItem[]) => void;
  catalogo: CatalogoItem[];
  descontoGeralReal: string;
  setDescontoGeralReal: (valor: string) => void;
  descontoGeralPercent: string;
  setDescontoGeralPercent: (valor: string) => void;
  acrescimo: string;
  setAcrescimo: (valor: string) => void;
  frete: string;
  setFrete: (valor: string) => void;
  isViewMode: boolean;
}

export default function ItensProposta({
  items = [],
  setItems,
  catalogo = [],
  descontoGeralReal,
  setDescontoGeralReal,
  descontoGeralPercent,
  setDescontoGeralPercent,
  acrescimo,
  setAcrescimo,
  frete,
  setFrete,
  isViewMode
}: ItensPropostaProps) {
  const [sugestoesAbertas, setSugestoesAbertas] = useState<{ [key: string]: boolean }>({});
  const [buscaItens, setBuscaItens] = useState<{ [key: string]: string }>({});
  const itemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Adicionar novo item
  const adicionarItem = (tipo: 'servico' | 'produto') => {
    try {
      const novoItem: PropostaItem = {
        id: `temp-${Date.now()}-${Math.random()}`,
        tipo,
        codigo: '',
        nome: '',
        quantidade: 1,
        valorUnitario: '',
        descontoReal: '',
        descontoPercent: '',
        valorTotal: 0,
      };
      const itemsAtuais = Array.isArray(items) ? items : [];
      setItems([...itemsAtuais, novoItem]);
      
      // Inicializar busca vazia para o novo item (sem abrir sugestões)
      setBuscaItens(prev => ({ ...prev, [novoItem.id]: '' }));
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      alert('Erro ao adicionar item. Tente novamente.');
    }
  };

  // Remover item
  const removerItem = (id: string) => {
    setItems((items || []).filter(item => item.id !== id));
  };

  // Atualizar item
  const atualizarItem = (id: string, campo: keyof PropostaItem, valor: any) => {
    setItems((items || []).map(item => {
      if (item.id !== id) return item;

      const itemAtualizado = { ...item, [campo]: valor };

      // Recalcular total quando campos relevantes mudarem
      if (['quantidade', 'valorUnitario', 'descontoReal', 'descontoPercent'].includes(campo)) {
        const valorUnit = parseValorBrasileiro(itemAtualizado.valorUnitario);
        const qtd = itemAtualizado.quantidade;
        const subtotal = valorUnit * qtd;
        
        let desconto = 0;
        if (campo === 'descontoReal') {
          desconto = parseValorBrasileiro(valor || '0,00');
          const percent = subtotal > 0 ? (desconto / subtotal) * 100 : 0;
          itemAtualizado.descontoPercent = percent.toFixed(2).replace('.', ',');
        } else if (campo === 'descontoPercent') {
          // Parse do valor formatado (ex: "10,50" vira 10.50)
          const percent = parseValorBrasileiro(valor || '0,00');
          desconto = (subtotal * percent) / 100;
          itemAtualizado.descontoReal = desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } else {
          desconto = parseValorBrasileiro(itemAtualizado.descontoReal || '0,00');
        }

        itemAtualizado.valorTotal = subtotal - desconto;
      }

      return itemAtualizado;
    }));
  };

  // Buscar itens do catálogo
  const buscarItensCatalogo = (busca: string, itemId: string) => {
    try {
      const item = (items || []).find(i => i.id === itemId);
      if (!item) return [];

      if (!catalogo || !Array.isArray(catalogo)) return [];

      // Só mostrar sugestões se houver busca (pelo menos 2 caracteres)
      if (!busca || busca.trim().length < 2) {
        return [];
      }

      // Se há busca, filtrar por nome ou código
      const filtrados = catalogo.filter(catItem => {
        if (!catItem) return false;
        const tipoMatch = (item.tipo === 'servico' && catItem.tipo === 'SERVICO') ||
                          (item.tipo === 'produto' && catItem.tipo === 'PRODUTO');
        const buscaMatch = (catItem.nome && catItem.nome.toLowerCase().includes(busca.toLowerCase())) ||
                          (catItem.codigo && catItem.codigo.toLowerCase().includes(busca.toLowerCase()));
        return tipoMatch && buscaMatch;
      });

      return filtrados.slice(0, 5);
    } catch (error) {
      console.error('Erro ao buscar itens do catálogo:', error);
      return [];
    }
  };

  // Fechar sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.keys(sugestoesAbertas).forEach((itemId) => {
        if (sugestoesAbertas[itemId] && itemRefs.current[itemId]) {
          if (!itemRefs.current[itemId]?.contains(event.target as Node)) {
            setSugestoesAbertas((prev) => ({ ...prev, [itemId]: false }));
          }
        }
      });
    };

    const hasOpenSuggestions = Object.values(sugestoesAbertas).some(open => open);
    if (hasOpenSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sugestoesAbertas]);

  // Buscar item por código (apenas números)
  const buscarItemPorCodigo = (codigo: string, itemId: string) => {
    try {
      const item = (items || []).find(i => i.id === itemId);
      if (!item) return null;

      if (!catalogo || !Array.isArray(catalogo)) return null;

      // Se o código contém apenas números, buscar no catálogo
      if (/^\d+$/.test(codigo.trim())) {
        const itemEncontrado = catalogo.find(catItem => {
          if (!catItem) return false;
          const tipoMatch = (item.tipo === 'servico' && catItem.tipo === 'SERVICO') ||
                           (item.tipo === 'produto' && catItem.tipo === 'PRODUTO');
          
          // Buscar por código que contenha apenas números (sem prefixo)
          const codigoCatalogo = catItem.codigo || '';
          const codigoSemPrefix = codigoCatalogo.includes('-') 
            ? codigoCatalogo.split('-').pop() 
            : codigoCatalogo.includes('_') 
              ? codigoCatalogo.split('_').pop() 
              : codigoCatalogo;
          
          return tipoMatch && codigoSemPrefix === codigo.trim();
        });

        return itemEncontrado || null;
      }

      return null;
    } catch (error) {
      console.error('Erro ao buscar item por código:', error);
      return null;
    }
  };

  // Selecionar item do catálogo
  const selecionarItemCatalogo = (itemId: string, catalogoItem: CatalogoItem) => {
    try {
      console.log('Selecionando item do catálogo:', { itemId, catalogoItem });
      
      const item = (items || []).find(i => i.id === itemId);
      if (!item || !catalogoItem) {
        console.warn('Item ou catalogoItem não encontrado');
        return;
      }

      // Preencher código, nome e valor unitário automaticamente
      const codigo = catalogoItem.codigo || '';
      const nome = catalogoItem.nome || '';
      const precoVenda = catalogoItem.preco_venda || 0;
      
      console.log('Preenchendo campos:', { codigo, nome, precoVenda });
      
      // Atualizar todos os campos de uma vez usando setItems diretamente
      setItems((items || []).map(i => {
        if (i.id !== itemId) return i;
        
        const itemAtualizado = { ...i };
        
        // Preencher código (remover prefixo se houver, ex: "SERV-001" -> "001")
        // Extrair apenas a parte numérica após o último hífen ou traço
        let codigoSemPrefix = codigo;
        if (codigo.includes('-')) {
          const partes = codigo.split('-');
          codigoSemPrefix = partes[partes.length - 1]; // Pega a última parte
        } else if (codigo.includes('_')) {
          const partes = codigo.split('_');
          codigoSemPrefix = partes[partes.length - 1]; // Pega a última parte
        }
        itemAtualizado.codigo = codigoSemPrefix;
        
        // Preencher nome
        itemAtualizado.nome = nome;
        
        // Preencher valor unitário (formatado)
        const precoFormatado = precoVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        itemAtualizado.valorUnitario = precoFormatado;
        
        // Garantir quantidade = 1
        itemAtualizado.quantidade = 1;
        
        // Recalcular total
        const subtotal = precoVenda * 1; // quantidade sempre 1
        itemAtualizado.valorTotal = subtotal;
        
        return itemAtualizado;
      }));

      setBuscaItens(prev => ({ ...prev, [itemId]: nome }));
      setSugestoesAbertas(prev => ({ ...prev, [itemId]: false }));
      
      console.log('Item atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao selecionar item do catálogo:', error);
    }
  };

  // Calcular subtotal
  const calcularSubtotal = () => {
    return (items || []).reduce((total, item) => total + (item.valorTotal || 0), 0);
  };

  // Calcular total geral
  const calcularTotalGeral = () => {
    const subtotal = calcularSubtotal();
    const descReal = parseValorBrasileiro(descontoGeralReal);
    const acresc = parseValorBrasileiro(acrescimo);
    const freteVal = parseValorBrasileiro(frete);
    
    return subtotal - descReal + acresc + freteVal;
  };

  // Atualizar desconto percentual quando desconto real mudar
  const handleDescontoRealChange = (valor: string) => {
    const valorNum = parseInt(valor) / 100;
    const valorFormatado = valorNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setDescontoGeralReal(valorFormatado);
    const subtotal = calcularSubtotal();
    const descReal = valorNum;
    const percent = subtotal > 0 ? (descReal / subtotal) * 100 : 0;
    setDescontoGeralPercent(percent.toFixed(2).replace('.', ','));
  };

  // Atualizar desconto real quando desconto percentual mudar
  const handleDescontoPercentChange = (valor: string) => {
    setDescontoGeralPercent(valor);
    const subtotal = calcularSubtotal();
    const percent = parseFloat(valor.replace(',', '.')) || 0;
    const descReal = (subtotal * percent) / 100;
    setDescontoGeralReal(descReal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const subtotal = calcularSubtotal();
  const totalGeral = calcularTotalGeral();

  return (
    <div className="space-y-6 w-full">
      {/* Card de Itens */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-[#E5E7EB] dark:border-[#262626] p-6 w-full">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Itens da Proposta
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Adicione produtos ou serviços
            </p>
          </div>
          
          {!isViewMode && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => adicionarItem('servico')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                Adicionar Serviço
              </button>
              <button
                type="button"
                onClick={() => adicionarItem('produto')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                Adicionar Produto
              </button>
            </div>
          )}
        </div>

        {/* Lista de Itens */}
        <div className="space-y-4">
          {(items || []).map((item, index) => {
            if (!item || !item.id) return null;
            
            const buscaAtual = buscaItens[item.id] || '';
            const sugestoes = buscarItensCatalogo(buscaAtual, item.id);
            const mostrarSugestoes = sugestoesAbertas[item.id] && sugestoes && sugestoes.length > 0;

            return (
              <div 
                key={item.id} 
                ref={(el) => { itemRefs.current[item.id] = el; }}
                className="flex items-center gap-3 p-4 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-gray-50 dark:bg-neutral-800 w-full"
              >
                {/* Badge numérico */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                  {index + 1}
                </div>

                {/* Tipo - largura fixa para alinhamento, menor e centralizado verticalmente */}
                <button
                  type="button"
                  disabled={isViewMode}
                  className={`flex-shrink-0 w-16 px-1.5 py-0.5 rounded text-[10px] font-medium text-center ${
                    item.tipo === 'servico'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                  } ${isViewMode ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {item.tipo === 'servico' ? 'SERVIÇO' : 'PRODUTO'}
                </button>

                {/* Campos do item */}
                <div className="flex-1 flex gap-3 items-center">
                  {/* Código - menor */}
                  <div className="w-24 flex-shrink-0">
                    <input
                      type="text"
                      value={item.codigo}
                      onChange={(e) => {
                        const codigo = e.target.value;
                        atualizarItem(item.id, 'codigo', codigo);
                        
                        // Se o código contém apenas números, buscar automaticamente o item
                        if (/^\d+$/.test(codigo.trim())) {
                          const itemEncontrado = buscarItemPorCodigo(codigo.trim(), item.id);
                          if (itemEncontrado) {
                            selecionarItemCatalogo(item.id, itemEncontrado);
                          }
                        }
                      }}
                      disabled={isViewMode}
                      placeholder="Código"
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Nome do item - ocupa todo espaço disponível */}
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={buscaItens[item.id] || item.nome}
                      onChange={(e) => {
                        const valor = e.target.value;
                        setBuscaItens({ ...buscaItens, [item.id]: valor });
                        atualizarItem(item.id, 'nome', valor);
                        // Só mostrar sugestões se houver pelo menos 2 caracteres
                        if (valor && valor.trim().length >= 2) {
                          setSugestoesAbertas({ ...sugestoesAbertas, [item.id]: true });
                        } else {
                          setSugestoesAbertas({ ...sugestoesAbertas, [item.id]: false });
                        }
                      }}
                      onFocus={() => {
                        // Só mostrar sugestões se houver texto (pelo menos 2 caracteres)
                        const buscaAtual = buscaItens[item.id] || item.nome || '';
                        if (buscaAtual.trim().length >= 2) {
                          setSugestoesAbertas({ ...sugestoesAbertas, [item.id]: true });
                        }
                      }}
                      disabled={isViewMode}
                      placeholder="Nome do item"
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
                    />
                    {mostrarSugestoes && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-neutral-800 border border-[#E5E7EB] dark:border-[#262626] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {sugestoes.map((sugestao) => (
                          <button
                            key={sugestao.id}
                            type="button"
                            onClick={() => selecionarItemCatalogo(item.id, sugestao)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors border-b border-[#E5E7EB] dark:border-[#262626] last:border-b-0 text-sm"
                          >
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {sugestao.nome}
                            </div>
                            {sugestao.codigo && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {sugestao.codigo}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quantidade */}
                  <div className="w-20 flex-shrink-0">
                    <input
                      type="number"
                      min="1"
                      value={item.quantidade}
                      onChange={(e) => atualizarItem(item.id, 'quantidade', parseInt(e.target.value) || 1)}
                      disabled={isViewMode}
                      placeholder="Qtde"
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Valor Unit. - maior */}
                  <div className="w-32 flex-shrink-0">
                    <input
                      type="text"
                      value={item.valorUnitario}
                      onChange={(e) => {
                        const valor = e.target.value.replace(/\D/g, '');
                        const valorNum = parseInt(valor) / 100;
                        const formatado = valorNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        atualizarItem(item.id, 'valorUnitario', formatado);
                      }}
                      disabled={isViewMode}
                      placeholder="Valor Unit."
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Desc. R$ - maior */}
                  <div className="w-32 flex-shrink-0">
                    <input
                      type="text"
                      value={item.descontoReal}
                      onChange={(e) => {
                        const valor = e.target.value.replace(/\D/g, '');
                        const valorNum = parseInt(valor) / 100;
                        const formatado = valorNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        atualizarItem(item.id, 'descontoReal', formatado);
                      }}
                      disabled={isViewMode}
                      placeholder="Desc. R$"
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Desc. % - maior */}
                  <div className="w-28 flex-shrink-0 relative">
                    <input
                      type="text"
                      value={item.descontoPercent}
                      onChange={(e) => {
                        // Remove tudo exceto números
                        const valor = e.target.value.replace(/\D/g, '');
                        // Converte para número e divide por 100 para ter 2 casas decimais
                        const valorNum = parseInt(valor) / 100;
                        // Formata como moeda brasileira
                        const formatado = valorNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        atualizarItem(item.id, 'descontoPercent', formatado);
                      }}
                      disabled={isViewMode}
                      placeholder="Desc. %"
                      className="w-full px-3 pr-8 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm pointer-events-none">
                      %
                    </span>
                  </div>

                  {/* Total - maior */}
                  <div className="w-32 flex-shrink-0">
                    <input
                      type="text"
                      value={item.valorTotal > 0 ? `R$ ${item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                      disabled
                      placeholder="Total"
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-gray-50 dark:bg-neutral-800 text-sm text-gray-900 dark:text-gray-100 cursor-not-allowed"
                    />
                  </div>

                  {/* Botão excluir - alinhado à direita */}
                  {!isViewMode && (
                    <div className="flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => removerItem(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {(!items || items.length === 0) && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Nenhum item adicionado. Clique em "Adicionar Serviço" ou "Adicionar Produto" para começar.
            </div>
          )}
        </div>

        {/* Resumo - dentro do mesmo card */}
        <div className="mt-6 pt-6 border-t border-[#E5E7EB] dark:border-[#262626]">
        <div className="grid grid-cols-5 gap-4">
          {/* Subtotal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Subtotal
            </label>
            <div className="px-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-gray-50 dark:bg-neutral-800">
              <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Acréscimo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Acréscimo
            </label>
            <input
              type="text"
              value={acrescimo}
              onChange={(e) => {
                const valor = e.target.value.replace(/\D/g, '');
                const valorNum = parseInt(valor) / 100;
                setAcrescimo(valorNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
              }}
              disabled={isViewMode}
              placeholder="0,00"
              className="w-full px-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
            />
          </div>

          {/* Frete */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Frete
            </label>
            <input
              type="text"
              value={frete}
              onChange={(e) => {
                const valor = e.target.value.replace(/\D/g, '');
                const valorNum = parseInt(valor) / 100;
                setFrete(valorNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
              }}
              disabled={isViewMode}
              placeholder="0,00"
              className="w-full px-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
            />
          </div>

          {/* Desconto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Desconto
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={descontoGeralReal}
                onChange={(e) => {
                const valor = e.target.value.replace(/\D/g, '');
                handleDescontoRealChange(valor);
              }}
                disabled={isViewMode}
                placeholder="0,00"
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
              />
              <input
                type="text"
                value={descontoGeralPercent}
                onChange={(e) => handleDescontoPercentChange(e.target.value)}
                disabled={isViewMode}
                placeholder="0,00"
                className="w-20 px-3 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed text-center"
              />
              <span className="flex items-center text-gray-500 dark:text-gray-400">%</span>
            </div>
          </div>

          {/* Total */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Total
            </label>
            <div className="px-4 py-2.5 rounded-lg border-2 border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20">
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

