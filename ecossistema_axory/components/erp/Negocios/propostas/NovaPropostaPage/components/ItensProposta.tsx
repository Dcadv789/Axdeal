import { Layers3, Plus, Trash2 } from 'lucide-react';
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
  isVenda?: boolean;
  tipoDocumento?: 'proposta' | 'venda' | 'os';
  /** Filtra exibição: apenas serviços, apenas produtos, ou ambos (null) */
  filterTipo?: 'servico' | 'produto' | null;
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
  isViewMode,
  isVenda,
  tipoDocumento = 'proposta',
  filterTipo = null
}: ItensPropostaProps) {
  type CampoSugestao = 'nome' | 'codigo' | null;

  const [sugestoesAbertas, setSugestoesAbertas] = useState<{ [key: string]: boolean }>({});
  const [buscaItens, setBuscaItens] = useState<{ [key: string]: string }>({});
  const [buscaCodigos, setBuscaCodigos] = useState<{ [key: string]: string }>({});
  const [campoSugestaoAtivo, setCampoSugestaoAtivo] = useState<{ [key: string]: CampoSugestao }>({});
  const itemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const linhaInicialCriadaRef = useRef(false);

  const normalizarTipo = (tipo: string | null | undefined): 'SERVICO' | 'PRODUTO' | '' => {
    if (!tipo) return '';
    const valor = tipo
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();
    if (valor === 'SERVICO') return 'SERVICO';
    if (valor === 'PRODUTO') return 'PRODUTO';
    return '';
  };

  const criarNovoItem = (tipo: 'servico' | 'produto'): PropostaItem => ({
    id: `temp-${Date.now()}-${Math.random()}`,
    tipo,
    codigo: '',
    nome: '',
    quantidade: 1,
    valorUnitario: '',
    descontoReal: '',
    descontoPercent: '',
    valorTotal: 0,
    id_item_catalogo: null,
    custoAquisicao: null,
  });

  // Adicionar novo item
  const adicionarItem = (tipo: 'servico' | 'produto') => {
    try {
      const novoItem = criarNovoItem(tipo);
      const itemsAtuais = Array.isArray(items) ? items : [];
      setItems([...itemsAtuais, novoItem]);
      
      // Inicializar buscas vazias para o novo item
      setBuscaItens(prev => ({ ...prev, [novoItem.id]: '' }));
      setBuscaCodigos(prev => ({ ...prev, [novoItem.id]: '' }));
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

      const tipoItemAtual: 'SERVICO' | 'PRODUTO' = item.tipo === 'servico' ? 'SERVICO' : 'PRODUTO';
      const termoBusca = (busca || '').trim().toLowerCase();

      const itensDoTipo = catalogo.filter(catItem => {
        if (!catItem) return false;
        return normalizarTipo(catItem.tipo) === tipoItemAtual;
      });

      // Sem busca, mostra os primeiros itens do tipo (UX mais rápida)
      if (!termoBusca) {
        return itensDoTipo.slice(0, 8);
      }

      // Com busca, filtra por nome, código ou descrição
      const filtrados = itensDoTipo.filter(catItem => {
        const nome = (catItem.nome || '').toLowerCase();
        const codigo = (catItem.codigo || '').toLowerCase();
        const descricao = (catItem.descricao_padrao || '').toLowerCase();
        return nome.includes(termoBusca) || codigo.includes(termoBusca) || descricao.includes(termoBusca);
      });

      return filtrados.slice(0, 8);
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
            setCampoSugestaoAtivo((prev) => ({ ...prev, [itemId]: null }));
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

  useEffect(() => {
    if (isViewMode || linhaInicialCriadaRef.current) return;

    const itemsAtuais = Array.isArray(items) ? items : [];
    if (itemsAtuais.length > 0) {
      linhaInicialCriadaRef.current = true;
      return;
    }

    const novosItens = [criarNovoItem('servico'), criarNovoItem('produto')];
    setItems(novosItens);
    setBuscaItens((prev) => ({
      ...prev,
      ...Object.fromEntries(novosItens.map((item) => [item.id, ''])),
    }));
    setBuscaCodigos((prev) => ({
      ...prev,
      ...Object.fromEntries(novosItens.map((item) => [item.id, ''])),
    }));
    linhaInicialCriadaRef.current = true;
  }, [isViewMode, items, setItems, tipoDocumento]);

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
          const tipoEsperado = item.tipo === 'servico' ? 'SERVICO' : 'PRODUTO';
          const tipoMatch = normalizarTipo(catItem.tipo) === tipoEsperado;
          
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
        
        // Guardar UUID do catálogo para persistência em erp_itens_proposta
        itemAtualizado.id_item_catalogo = catalogoItem.id ?? null;
        itemAtualizado.custoAquisicao = catalogoItem.custo_aquisicao ?? null;
        
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

      const codigoSemPrefix = codigo.includes('-')
        ? codigo.split('-').pop() || ''
        : codigo.includes('_')
          ? codigo.split('_').pop() || ''
          : codigo;

      setBuscaItens(prev => ({ ...prev, [itemId]: nome }));
      setBuscaCodigos(prev => ({ ...prev, [itemId]: codigoSemPrefix }));
      setSugestoesAbertas(prev => ({ ...prev, [itemId]: false }));
      setCampoSugestaoAtivo(prev => ({ ...prev, [itemId]: null }));
      
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

  const itemsFiltrados = (items || []).filter((item) => {
    if (!filterTipo) return true;
    return filterTipo === 'servico' ? item.tipo === 'servico' : item.tipo === 'produto';
  });

  const subtotal = calcularSubtotal();
  const totalGeral = calcularTotalGeral();
  const mostrarResumoExclusivoProdutosOs = tipoDocumento === 'os' && filterTipo === 'produto';
  const subtotalProdutosExclusivo = itemsFiltrados.reduce((total, item) => total + (item.valorTotal || 0), 0);
  const acrescimoProdutosExclusivo = 0;
  const freteProdutosExclusivo = 0;
  const descontoProdutosExclusivo = 0;
  const totalProdutosExclusivo = subtotalProdutosExclusivo;

  const tituloSecao =
    filterTipo === 'servico'
      ? 'Serviços'
      : filterTipo === 'produto'
        ? 'Produtos'
        : tipoDocumento === 'os'
          ? 'Itens da Ordem de Serviço'
          : isVenda
            ? 'Itens da Venda'
            : 'Itens da Proposta';

  const descricaoSecao =
    filterTipo === 'servico'
      ? 'Adicione os serviços'
      : filterTipo === 'produto'
        ? 'Adicione os produtos'
        : tipoDocumento === 'os'
          ? 'Adicione os itens da ordem de serviço'
          : isVenda
            ? 'Adicione os itens da venda'
            : 'Adicione produtos ou serviços';

  const mostrarBotaoProduto = !filterTipo || filterTipo === 'produto';
  const mostrarBotaoServico = !filterTipo || filterTipo === 'servico';

  return (
    <div className="space-y-6 w-full">
      {/* Card de Itens */}
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-black">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="inline-flex h-10 w-10 min-w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
              <Layers3 size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{tituloSecao}</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {descricaoSecao}
              </p>
            </div>
          </div>

          {!isViewMode && (
            <div className="flex items-center gap-2">
              {mostrarBotaoServico && (
                <button
                  type="button"
                  onClick={() => adicionarItem('servico')}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                >
                  <Plus size={16} />
                  <span>Novo serviço</span>
                </button>
              )}
              {mostrarBotaoProduto && (
                <button
                  type="button"
                  onClick={() => adicionarItem('produto')}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  <Plus size={16} />
                  <span>Novo produto</span>
                </button>
              )}
              {false && mostrarBotaoServico && (
                <button
                  type="button"
                  onClick={() => adicionarItem('servico')}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-neutral-800"
                >
                  <Plus size={16} />
                  <span>Novo serviço</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Container master: cabeçalho + itens da proposta - bordas arredondadas nos 4 cantos */}
        <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 overflow-visible">
          {/* Cabeçalho - fundo azul, cantos arredondados (bottom quando vazio) */}
          <div className={`flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-white uppercase tracking-wider bg-blue-600 dark:bg-blue-700 rounded-t-2xl ${itemsFiltrados.length === 0 ? 'rounded-b-2xl' : ''}`}>
            <div className="flex-shrink-0 w-8" aria-hidden />
            <div className="flex-shrink-0 w-16" aria-hidden />
            <div className="w-20 flex-shrink-0">Código</div>
            <div className="flex-1 min-w-0">Nome</div>
            <div className="w-20 flex-shrink-0 pl-3">Un.</div>
            <div className="w-24 flex-shrink-0 pl-3">Valor Unit.</div>
            <div className="w-32 flex-shrink-0 text-right">Desc. R$</div>
            <div className="w-28 flex-shrink-0 text-right">Desc. %</div>
            <div className="w-32 flex-shrink-0 text-right">Total</div>
            {!isViewMode && <div className="flex-shrink-0 w-10" aria-hidden />}
          </div>
          {itemsFiltrados.map((item, index) => {
            if (!item || !item.id) return null;
            
            const buscaNomeAtual = buscaItens[item.id] || item.nome || '';
            const buscaCodigoAtual = buscaCodigos[item.id] || item.codigo || '';
            const campoAtivo = campoSugestaoAtivo[item.id];
            const termoBusca = campoAtivo === 'codigo' ? buscaCodigoAtual : buscaNomeAtual;
            const sugestoes = buscarItensCatalogo(termoBusca, item.id);
            const mostrarSugestoesCodigo = sugestoesAbertas[item.id] && campoAtivo === 'codigo' && sugestoes.length > 0;
            const mostrarSugestoesNome = sugestoesAbertas[item.id] && campoAtivo === 'nome' && sugestoes.length > 0;

            const isLast = index === itemsFiltrados.length - 1;
            return (
              <div
                key={item.id}
                ref={(el) => { itemRefs.current[item.id] = el; }}
                className={`flex items-center gap-3 p-4 border-t border-slate-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800/50 ${isLast ? 'rounded-b-2xl' : ''}`}
              >
                {/* Badge numérico */}
                <div
                  className={`flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full font-semibold text-sm text-white ${
                    item.tipo === 'servico' ? 'bg-emerald-600' : 'bg-blue-600'
                  }`}
                >
                  {index + 1}
                </div>

                {/* Tipo - largura fixa para alinhamento, menor e centralizado verticalmente */}
                <button
                  type="button"
                  disabled={isViewMode}
                  className={`flex-shrink-0 w-16 px-1.5 py-0.5 rounded text-[10px] font-medium text-center ${
                    item.tipo === 'servico'
                      ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                      : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  } ${isViewMode ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {item.tipo === 'servico' ? 'SERVIÇO' : 'PRODUTO'}
                </button>

                {/* Campos do item */}
                <div className="flex-1 flex gap-3 items-center">
                  {/* Código */}
                  <div className="w-20 flex-shrink-0 relative">
                    <input
                      type="text"
                      value={buscaCodigos[item.id] || item.codigo}
                      onChange={(e) => {
                        const codigo = e.target.value;
                        setBuscaCodigos({ ...buscaCodigos, [item.id]: codigo });
                        atualizarItem(item.id, 'codigo', codigo);
                        setSugestoesAbertas({ ...sugestoesAbertas, [item.id]: true });
                        setCampoSugestaoAtivo({ ...campoSugestaoAtivo, [item.id]: 'codigo' });

                        // Se o código contém apenas números, buscar automaticamente o item
                        if (/^\d+$/.test(codigo.trim())) {
                          const itemEncontrado = buscarItemPorCodigo(codigo.trim(), item.id);
                          if (itemEncontrado) {
                            selecionarItemCatalogo(item.id, itemEncontrado);
                          }
                        }
                      }}
                      onFocus={() => {
                        setSugestoesAbertas({ ...sugestoesAbertas, [item.id]: true });
                        setCampoSugestaoAtivo({ ...campoSugestaoAtivo, [item.id]: 'codigo' });
                      }}
                      disabled={isViewMode}
                      placeholder="Código"
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
                    />
                    {mostrarSugestoesCodigo && (
                      <div className="absolute z-[9999] min-w-[320px] mt-1 bg-white dark:bg-neutral-800 border border-[#E5E7EB] dark:border-[#262626] rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        {sugestoes.map((sugestao) => (
                          <button
                            key={sugestao.id}
                            type="button"
                            onClick={() => selecionarItemCatalogo(item.id, sugestao)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors border-b border-[#E5E7EB] dark:border-[#262626] last:border-b-0 text-sm"
                          >
                            <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                              {sugestao.nome}
                            </div>
                            <div className="mt-0.5 flex items-center justify-between gap-3">
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {sugestao.codigo || 'Sem código'}
                              </div>
                              <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 whitespace-nowrap">
                                R$ {(Number(sugestao.preco_venda || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Nome do item - ocupa todo espaço disponível */}
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={buscaNomeAtual}
                      onChange={(e) => {
                        const valor = e.target.value;
                        setBuscaItens({ ...buscaItens, [item.id]: valor });
                        atualizarItem(item.id, 'nome', valor);
                        setSugestoesAbertas({ ...sugestoesAbertas, [item.id]: true });
                        setCampoSugestaoAtivo({ ...campoSugestaoAtivo, [item.id]: 'nome' });
                      }}
                      onFocus={() => {
                        setSugestoesAbertas({ ...sugestoesAbertas, [item.id]: true });
                        setCampoSugestaoAtivo({ ...campoSugestaoAtivo, [item.id]: 'nome' });
                      }}
                      disabled={isViewMode}
                      placeholder="Nome do item"
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
                    />
                    {mostrarSugestoesNome && (
                      <div className="absolute z-[9999] w-full mt-1 bg-white dark:bg-neutral-800 border border-[#E5E7EB] dark:border-[#262626] rounded-lg shadow-xl max-h-48 overflow-y-auto">
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
                            <div className="mt-0.5 flex items-center justify-between gap-3">
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {sugestao.codigo || 'Sem código'}
                              </div>
                              <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 whitespace-nowrap">
                                R$ {(Number(sugestao.preco_venda || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
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

                  {/* Valor Unit. */}
                  <div className="w-24 flex-shrink-0">
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
                      placeholder="0,00"
                      className="w-full px-3 pr-8 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
                    />
                    {(item.descontoPercent || '').trim() !== '' && (
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm pointer-events-none">
                        %
                      </span>
                    )}
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

          {false && !isViewMode && (
            <div className="flex flex-col items-start gap-2 pt-1">
              {tipoDocumento !== 'venda' && (
                <button
                  type="button"
                  onClick={() => adicionarItem('servico')}
                  title="Novo serviço"
                  aria-label="Novo serviço"
                  className="inline-flex h-8 w-32 items-center justify-center gap-1 rounded-lg bg-blue-600 px-2.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <Plus size={18} />
                  <span>Novo serviço</span>
                </button>
              )}
              {tipoDocumento !== 'os' && (
                <button
                  type="button"
                  onClick={() => adicionarItem('produto')}
                  title="Novo produto"
                  aria-label="Novo produto"
                  className="inline-flex h-8 w-32 items-center justify-center gap-1 rounded-lg bg-green-600 px-2.5 text-xs font-medium text-white transition-colors hover:bg-green-700"
                >
                  <Plus size={18} />
                  <span>Novo produto</span>
                </button>
              )}
            </div>
          )}
        </div>

        {mostrarResumoExclusivoProdutosOs && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-neutral-800 dark:bg-neutral-950/40">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Totais exclusivos dos produtos
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Este bloco considera apenas os produtos desta ordem de serviço.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Subtotal
                </label>
                <div className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 dark:border-[#262626] dark:bg-neutral-900">
                  <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                    R$ {subtotalProdutosExclusivo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Acréscimo
                </label>
                <div className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 dark:border-[#262626] dark:bg-neutral-900">
                  <span className="text-base font-semibold text-gray-700 dark:text-gray-200">
                    R$ {acrescimoProdutosExclusivo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Frete
                </label>
                <div className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 dark:border-[#262626] dark:bg-neutral-900">
                  <span className="text-base font-semibold text-gray-700 dark:text-gray-200">
                    R$ {freteProdutosExclusivo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="md:col-span-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Desconto
                </label>
                <div className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 dark:border-[#262626] dark:bg-neutral-900">
                  <span className="text-base font-semibold text-gray-700 dark:text-gray-200">
                    R$ {descontoProdutosExclusivo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Total
                </label>
                <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 dark:border-emerald-500/40 dark:bg-emerald-500/10">
                  <span className="text-base font-bold text-emerald-700 dark:text-emerald-300">
                    R$ {totalProdutosExclusivo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resumo - dentro do mesmo card */}
        <div className="mt-6 border-t border-[#E5E7EB] pt-6 dark:border-[#262626]">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Totais consolidados
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Soma geral do documento, considerando serviços e produtos.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Subtotal */}
          <div className="md:col-span-2">
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
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Acréscimo
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm pointer-events-none">
                R$
              </span>
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
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Frete */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Frete
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm pointer-events-none">
                R$
              </span>
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
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Desconto */}
          <div className="md:col-span-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Desconto
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm pointer-events-none">
                  R$
                </span>
                <input
                  type="text"
                  value={descontoGeralReal}
                  onChange={(e) => {
                    const valor = e.target.value.replace(/\D/g, '');
                    handleDescontoRealChange(valor);
                  }}
                  disabled={isViewMode}
                  placeholder="0,00"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
                />
              </div>
              <div className="relative w-24">
                <input
                  type="text"
                  value={descontoGeralPercent}
                  onChange={(e) => handleDescontoPercentChange(e.target.value)}
                  disabled={isViewMode}
                  placeholder="0,00"
                  className="w-full px-3 pr-8 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed text-center"
                />
                {(descontoGeralPercent || '').trim() !== '' && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm pointer-events-none">
                    %
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Total
            </label>
            <div className="px-4 py-2.5 rounded-lg border border-blue-300 dark:border-blue-500/50 bg-blue-50 dark:bg-blue-900/20">
              <span className="text-base font-bold text-blue-700 dark:text-blue-300">
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
