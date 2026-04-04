import { CheckCircle, Copy, CopyPlus, Link2, Mail, MoreVertical, Share2, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { STATUS_LABELS, STATUS_STYLES } from '@/config/propostas';

interface Proposta {
  id: string;
  codigo: string;
  cliente_nome: string;
  status: string;
  valor_total_final: number;
  data_emissao: string;
  introducao?: string;
}

interface KanbanViewProps {
  propostas: Proposta[];
  statusOptions?: { value: string; label: string }[];
  onEditarProposta?: (id: string) => void;
  onCopiarProposta?: (id: string) => void;
  onExcluirDocumento?: (proposta: Proposta) => void;
  onAprovarProposta?: (id: string) => void;
  onAlterarStatus?: (proposta: Proposta) => void;
  permiteEdicaoStatus?: boolean;
}

interface MenuPosition {
  top: number;
  right: number;
}

interface DragOverInfo {
  status: string;
  index: number;
}

const KANBAN_ACCENT_PALETTE = [
  { header: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200', border: 'border-l-blue-500 dark:border-l-blue-400' },
  { header: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200', border: 'border-l-amber-500 dark:border-l-amber-400' },
  { header: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200', border: 'border-l-emerald-500 dark:border-l-emerald-400' },
  { header: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200', border: 'border-l-violet-500 dark:border-l-violet-400' },
  { header: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200', border: 'border-l-cyan-500 dark:border-l-cyan-400' },
  { header: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200', border: 'border-l-rose-500 dark:border-l-rose-400' },
  { header: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300', border: 'border-l-slate-500 dark:border-l-slate-400' },
];

function normalizarStatus(valor: string): string {
  return (valor || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
}

function formatCurrency(value?: number): string {
  if (!value) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(date?: string): string {
  if (!date) return '-';
  const data = new Date(date);
  if (Number.isNaN(data.getTime())) return '-';
  return data.toLocaleDateString('pt-BR');
}

function obterIniciais(nome: string): string {
  const partes = (nome || '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '--';
  if (partes.length === 1) return (partes[0][0] || '').toUpperCase();
  return `${partes[0][0] || ''}${partes[1][0] || ''}`.toUpperCase();
}

function corCabecalhoKanbanPorIndice(indice: number): string {
  return KANBAN_ACCENT_PALETTE[indice % KANBAN_ACCENT_PALETTE.length].header;
}

function corBordaEsquerdaCardKanbanPorIndice(indice: number): string {
  return KANBAN_ACCENT_PALETTE[indice % KANBAN_ACCENT_PALETTE.length].border;
}

export default function KanbanView({
  propostas: initialPropostas,
  statusOptions = [],
  onEditarProposta,
  onCopiarProposta,
  onExcluirDocumento,
  onAprovarProposta,
  onAlterarStatus,
  permiteEdicaoStatus = false,
}: KanbanViewProps) {
  const [propostas, setPropostas] = useState<Proposta[]>(initialPropostas);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ top: 0, right: 0 });
  const [dragPropostaId, setDragPropostaId] = useState<string | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<DragOverInfo | null>(null);

  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPropostas((prev) => {
      const prevMap = new Map(prev.map((item) => [item.id, item]));
      const changed =
        initialPropostas.length !== prev.length ||
        initialPropostas.some((item) => {
          const atual = prevMap.get(item.id);
          if (!atual) return true;
          return (
            atual.status !== item.status ||
            atual.codigo !== item.codigo ||
            atual.cliente_nome !== item.cliente_nome ||
            atual.introducao !== item.introducao ||
            atual.valor_total_final !== item.valor_total_final ||
            atual.data_emissao !== item.data_emissao
          );
        });

      if (!changed) return prev;

      const inicialMap = new Map(initialPropostas.map((item) => [item.id, item]));
      const ordenados = prev.filter((item) => inicialMap.has(item.id)).map((item) => ({ ...item, ...inicialMap.get(item.id)! }));
      const novos = initialPropostas.filter((item) => !prevMap.has(item.id));
      return [...ordenados, ...novos];
    });
  }, [initialPropostas]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        const isButtonClick = Object.values(buttonRefs.current).some((button) => button && button.contains(event.target as Node));
        if (!isButtonClick) setOpenMenu(null);
      }
    };

    if (openMenu !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenu]);

  const propostaArrastando = useMemo(() => {
    if (!dragPropostaId) return null;
    return propostas.find((item) => item.id === dragPropostaId) || null;
  }, [dragPropostaId, propostas]);

  const colunas = useMemo(() => {
    const options = statusOptions.filter((opt) => opt.value);
    const fallback = Array.from(new Set(propostas.map((item) => normalizarStatus(item.status)).filter(Boolean)));
    const statuses = options.length > 0 ? options.map((opt) => normalizarStatus(opt.value)) : fallback;
    const labelByStatus = new Map(options.map((opt) => [normalizarStatus(opt.value), opt.label]));

    return statuses.map((status) => ({
      status,
      label: labelByStatus.get(status) || STATUS_LABELS[status] || status.replace(/_/g, ' '),
      propostas: propostas.filter((item) => normalizarStatus(item.status) === status),
    }));
  }, [propostas, statusOptions]);

  const handleMenuClick = (propostaId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const button = buttonRefs.current[propostaId];
    if (button) {
      const rect = button.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setOpenMenu(openMenu === propostaId ? null : propostaId);
  };

  const handleCopyLink = (propostaId: string) => {
    const link = `${window.location.origin}/proposta/${propostaId}`;
    navigator.clipboard.writeText(link);
    setOpenMenu(null);
  };

  const moverProposta = (proposta: Proposta, statusDestino: string, indexDestino: number) => {
    setPropostas((prev) => {
      const semProposta = prev.filter((item) => item.id !== proposta.id);
      const propostaAtualizada: Proposta = { ...proposta, status: statusDestino };
      const destinoLista = semProposta.filter((item) => normalizarStatus(item.status) === statusDestino);
      const indexSeguro = Math.max(0, Math.min(indexDestino, destinoLista.length));

      if (destinoLista.length === 0 || indexSeguro >= destinoLista.length) {
        const ultimaDestino = destinoLista[destinoLista.length - 1];
        if (!ultimaDestino) return [...semProposta, propostaAtualizada];

        const posUltima = semProposta.findIndex((item) => item.id === ultimaDestino.id);
        const next = [...semProposta];
        next.splice(posUltima + 1, 0, propostaAtualizada);
        return next;
      }

      const referencia = destinoLista[indexSeguro];
      const posReferencia = semProposta.findIndex((item) => item.id === referencia.id);
      const next = [...semProposta];
      next.splice(posReferencia, 0, propostaAtualizada);
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, proposta: Proposta) => {
    e.dataTransfer.setData('text/plain', proposta.id);
    e.dataTransfer.effectAllowed = 'move';

    const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
    ghost.style.position = 'fixed';
    ghost.style.top = '-1000px';
    ghost.style.left = '-1000px';
    ghost.style.width = `${e.currentTarget.clientWidth}px`;
    ghost.style.pointerEvents = 'none';
    ghost.style.opacity = '0.95';
    ghost.style.transform = 'scale(0.98)';
    ghost.style.zIndex = '9999';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 24, 20);
    window.setTimeout(() => {
      if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
    }, 0);

    setDragPropostaId(proposta.id);
    setDragOverInfo(null);
    setOpenMenu(null);
  };

  const handleDragEnd = () => {
    setDragPropostaId(null);
    setDragOverInfo(null);
  };

  const renderPreviewCardKanban = (proposta: Proposta, statusIndex: number) => (
    <div
      className={`rounded-lg border border-dashed border-slate-300 dark:border-neutral-600 border-l-4 bg-white/80 dark:bg-black p-3 opacity-60 pointer-events-none shadow-sm ${corBordaEsquerdaCardKanbanPorIndice(
        statusIndex
      )}`}
    >
      <div className="flex items-start gap-2 min-w-0">
        <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center text-xs font-semibold flex-shrink-0">
          {obterIniciais(proposta.cliente_nome)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{proposta.cliente_nome || 'Sem cliente'}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{proposta.introducao || proposta.codigo}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-[11px] text-gray-600 dark:text-gray-300">{formatDate(proposta.data_emissao)}</p>
        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(proposta.valor_total_final)}</p>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-320px)] min-h-[420px] overflow-x-auto overflow-y-hidden">
      <div className="flex h-full items-stretch gap-4 min-w-max">
        {colunas.map((coluna, colunaIdx) => {
          const placeholderAtivo = Boolean(dragPropostaId && dragOverInfo?.status === coluna.status);
          const placeholderIndex = placeholderAtivo
            ? Math.max(0, Math.min(dragOverInfo?.index ?? coluna.propostas.length, coluna.propostas.length))
            : -1;
          const mostrarPreviewCard = Boolean(placeholderAtivo && propostaArrastando && normalizarStatus(propostaArrastando.status) !== coluna.status);

          return (
            <div
              key={coluna.status}
              className={`w-[320px] h-full flex-shrink-0 flex flex-col min-h-0 rounded-lg transition-colors ${
                placeholderAtivo ? 'bg-blue-50/70 dark:bg-blue-500/10' : ''
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                if (e.target !== e.currentTarget) return;
                const indexFinal = coluna.propostas.length;
                if (!dragOverInfo || dragOverInfo.status !== coluna.status || dragOverInfo.index !== indexFinal) {
                  setDragOverInfo({ status: coluna.status, index: indexFinal });
                }
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragOverInfo((prev) => prev ?? { status: coluna.status, index: coluna.propostas.length });
              }}
              onDragLeave={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const dentroDaColuna = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
                if (!dentroDaColuna) {
                  setDragOverInfo((prev) => (prev?.status === coluna.status ? null : prev));
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const propostaIdArrastada = e.dataTransfer.getData('text/plain') || dragPropostaId;
                const propostaArrastada = propostas.find((item) => item.id === propostaIdArrastada) || null;
                if (propostaArrastada) {
                  const indiceDestino = dragOverInfo?.status === coluna.status ? dragOverInfo.index : coluna.propostas.length;
                  moverProposta(propostaArrastada, coluna.status, indiceDestino);
                }
                setDragOverInfo(null);
                setDragPropostaId(null);
              }}
            >
              <div className={`px-3 py-2 rounded-md ${corCabecalhoKanbanPorIndice(colunaIdx)}`}>
                <p className="text-sm font-semibold">
                  {coluna.label} ({coluna.propostas.length})
                </p>
              </div>

              <div className="pt-2 space-y-2 flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300/70 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600/70 [&::-webkit-scrollbar-thumb]:rounded-full">
                {coluna.propostas.length === 0 && !placeholderAtivo ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Nenhum registro nesta etapa.</p>
                ) : (
                  coluna.propostas.map((proposta, cardIndex) => {
                    const mostrarLinhaAntes = !mostrarPreviewCard && placeholderAtivo && placeholderIndex === cardIndex;
                    const mostrarLinhaDepois = !mostrarPreviewCard && placeholderAtivo && placeholderIndex === cardIndex + 1;

                    return (
                      <div key={proposta.id} className="space-y-1">
                        {mostrarPreviewCard && placeholderIndex === cardIndex && propostaArrastando && (
                          <div className="mb-1">{renderPreviewCardKanban(propostaArrastando, colunaIdx)}</div>
                        )}
                        {mostrarLinhaAntes && <div className="h-1 rounded-full bg-blue-400/80 dark:bg-blue-400/60" />}

                        <div
                          draggable
                          onClick={() => onEditarProposta?.(proposta.id)}
                          onDragStart={(e) => handleDragStart(e, proposta)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            const posicaoDepois = e.clientY > rect.top + rect.height / 2;
                            const indiceDestino = posicaoDepois ? cardIndex + 1 : cardIndex;
                            if (!dragOverInfo || dragOverInfo.status !== coluna.status || dragOverInfo.index !== indiceDestino) {
                              setDragOverInfo({ status: coluna.status, index: indiceDestino });
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const propostaIdArrastada = e.dataTransfer.getData('text/plain') || dragPropostaId;
                            const propostaArrastada = propostas.find((item) => item.id === propostaIdArrastada) || null;
                            if (propostaArrastada) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const posicaoDepois = e.clientY > rect.top + rect.height / 2;
                              const indiceDestino = posicaoDepois ? cardIndex + 1 : cardIndex;
                              moverProposta(propostaArrastada, coluna.status, indiceDestino);
                            }
                            setDragOverInfo(null);
                            setDragPropostaId(null);
                          }}
                          className={`rounded-lg border border-slate-200 dark:border-neutral-700 border-l-4 bg-white dark:bg-black p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 ${corBordaEsquerdaCardKanbanPorIndice(
                            colunaIdx
                          )} ${dragPropostaId === proposta.id ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0">
                              <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                {obterIniciais(proposta.cliente_nome)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{proposta.cliente_nome || 'Sem cliente'}</p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{proposta.introducao || proposta.codigo}</p>
                              </div>
                            </div>
                            <button
                              ref={(el) => {
                                buttonRefs.current[proposta.id] = el;
                              }}
                              onClick={(e) => handleMenuClick(proposta.id, e)}
                              className={`group inline-flex items-center justify-center h-7 w-7 rounded-md border transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                                openMenu === proposta.id
                                  ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-300'
                                  : 'border-slate-200 text-slate-600 hover:bg-slate-200 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-700'
                              }`}
                              title="Ações"
                            >
                              <MoreVertical
                                size={12}
                                className={`transition-colors duration-200 ${
                                  openMenu === proposta.id ? 'text-blue-700 dark:text-blue-300' : ''
                                }`}
                              />
                            </button>
                          </div>

                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                              {proposta.codigo}
                            </span>
                            {permiteEdicaoStatus && onAlterarStatus ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAlterarStatus(proposta);
                                }}
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold cursor-pointer hover:opacity-90 transition-opacity ${STATUS_STYLES[coluna.status] || STATUS_STYLES[normalizarStatus(coluna.status)] || 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300'}`}
                                title="Clique para alterar o status"
                              >
                                {coluna.label}
                              </button>
                            ) : (
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[coluna.status] || STATUS_STYLES[normalizarStatus(coluna.status)] || 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300'}`}>
                                {coluna.label}
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex items-center justify-between gap-2">
                            <p className="text-[11px] text-gray-600 dark:text-gray-300">{formatDate(proposta.data_emissao)}</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(proposta.valor_total_final)}</p>
                          </div>
                        </div>

                        {mostrarLinhaDepois && <div className="h-1 rounded-full bg-blue-400/80 dark:bg-blue-400/60" />}
                      </div>
                    );
                  })
                )}

                {mostrarPreviewCard && placeholderIndex === coluna.propostas.length && propostaArrastando && (
                  <div className="mt-1">{renderPreviewCardKanban(propostaArrastando, colunaIdx)}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {openMenu !== null && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${menuPosition.top}px`,
            right: `${menuPosition.right}px`,
            zIndex: 9999,
          }}
          className="w-56 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl"
        >
          <button
            onClick={() => {
              if (openMenu && onCopiarProposta) {
                onCopiarProposta(openMenu);
              }
              setOpenMenu(null);
            }}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors border-t border-gray-200 dark:border-gray-700 whitespace-nowrap"
          >
            <CopyPlus size={16} className="text-teal-600 dark:text-teal-400 flex-shrink-0" />
            <span>Copiar</span>
          </button>
          {onAprovarProposta && (
            <button
              onClick={() => {
                if (openMenu) {
                  onAprovarProposta(openMenu);
                }
                setOpenMenu(null);
              }}
              className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors border-t border-gray-200 dark:border-gray-700 whitespace-nowrap"
            >
              <CheckCircle size={16} className="text-green-600 dark:text-green-400 flex-shrink-0" />
              <span>Aprovar Manualmente</span>
            </button>
          )}
          <button
            onClick={() => setOpenMenu(null)}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors border-t border-gray-200 dark:border-gray-700 whitespace-nowrap"
          >
            <Share2 size={16} className="text-green-600 dark:text-green-400 flex-shrink-0" />
            <span>Enviar via WhatsApp</span>
          </button>
          <button
            onClick={() => setOpenMenu(null)}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors border-t border-gray-200 dark:border-gray-700 whitespace-nowrap"
          >
            <Mail size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span>Enviar via E-mail</span>
          </button>
          <button
            onClick={() => handleCopyLink(openMenu)}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors border-t border-gray-200 dark:border-gray-700 whitespace-nowrap"
          >
            <Link2 size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span>Copiar Link</span>
          </button>
          <button
            onClick={() => {
              if (openMenu && onExcluirDocumento) {
                const proposta = propostas.find((p) => p.id === openMenu);
                if (proposta) onExcluirDocumento(proposta);
              }
              setOpenMenu(null);
            }}
            className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-3 transition-colors border-t border-gray-200 dark:border-gray-700 whitespace-nowrap rounded-b-lg"
          >
            <Trash2 size={16} className="text-red-600 dark:text-red-400 flex-shrink-0" />
            <span>Excluir</span>
          </button>
        </div>
      )}
    </div>
  );
}
