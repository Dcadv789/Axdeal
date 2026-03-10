import { MoreVertical, Share2, Mail, Link2, Pencil, CheckCircle, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

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
}

interface MenuPosition {
  top: number;
  right: number;
}

type PropostaStatus = 'rascunho' | 'aguardando_envio' | 'enviada' | 'em_negociacao' | 'aprovada' | 'recusada' | 'expirada';

const STATUS_COLUMNS: PropostaStatus[] = ['rascunho', 'aguardando_envio', 'enviada', 'em_negociacao', 'aprovada', 'recusada', 'expirada'];

const STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  aguardando_envio: 'Aguardando Envio',
  enviada: 'Enviada',
  em_negociacao: 'Em Negociação',
  aprovada: 'Aprovada',
  recusada: 'Recusada',
  expirada: 'Expirada'
};

export default function KanbanView({ propostas: initialPropostas }: KanbanViewProps) {
  const [propostas, setPropostas] = useState<Proposta[]>(initialPropostas);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ top: 0, right: 0 });
  const [draggedItem, setDraggedItem] = useState<Proposta | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<PropostaStatus | null>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  useEffect(() => {
    setPropostas(initialPropostas);
  }, [initialPropostas]);

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenu(null);
    };

    if (openMenu !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenu]);

  const handleMenuClick = (propostaId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const button = buttonRefs.current[propostaId];
    if (button) {
      const rect = button.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
    setOpenMenu(openMenu === propostaId ? null : propostaId);
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '—';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleCopyLink = (propostaId: string) => {
    const link = `${window.location.origin}/proposta/${propostaId}`;
    navigator.clipboard.writeText(link);
    console.log('Link copiado:', link);
    setOpenMenu(null);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, proposta: Proposta) => {
    setDraggedItem(proposta);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedItem(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (status: PropostaStatus) => {
    setDragOverColumn(status);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget === e.target) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: PropostaStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (draggedItem && draggedItem.status !== newStatus) {
      const updatedPropostas = propostas.map(p =>
        p.id === draggedItem.id ? { ...p, status: newStatus } : p
      );
      setPropostas(updatedPropostas);
      console.log(`Proposta ${draggedItem.id} movida para ${newStatus}`);
    }
  };

  return (
    <div className="overflow-x-auto pb-4 -mx-4 px-4">
      <div className="flex gap-3 min-w-max">
      {STATUS_COLUMNS.map((status) => {
        const columnPropostas = propostas.filter(p => p.status === status);
        const isDragOver = dragOverColumn === status;

        if (columnPropostas.length === 0) {
          return null;
        }

        return (
          <div
            key={status}
            onDragOver={handleDragOver}
            onDragEnter={() => handleDragEnter(status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
            className={`w-[320px] flex-shrink-0 rounded-lg border-2 transition-all ${
              isDragOver
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                : 'border-[#E5E7EB] dark:border-[#262626]'
            } bg-white dark:bg-neutral-900`}
          >
            <div className="p-4 border-b-2 border-b-blue-600">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {STATUS_LABELS[status]}
                </h3>
                <span className="flex-shrink-0 px-2 py-1 text-xs font-medium bg-white dark:bg-gray-800 rounded-full text-gray-700 dark:text-gray-300">
                  {columnPropostas.length}
                </span>
              </div>
            </div>

            <div className="p-3 space-y-3 min-h-[200px]">
              {columnPropostas.length > 0 ? (
                columnPropostas.map((proposta) => (
                  <div
                    key={proposta.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, proposta)}
                    onDragEnd={handleDragEnd}
                    className="bg-white dark:bg-neutral-900 border border-[#E5E7EB] dark:border-[#262626] rounded-lg p-4 hover:shadow-md dark:hover:shadow-gray-900/50 transition-all cursor-move"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                        {proposta.introducao || proposta.codigo}
                      </h4>
                      <button
                        ref={(el) => { buttonRefs.current[proposta.id] = el; }}
                        onClick={(e) => handleMenuClick(proposta.id, e)}
                        className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                      >
                        <MoreVertical size={16} className="text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {proposta.cliente_nome}
                      </p>

                      <div className="flex gap-2 flex-wrap">
                        <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          {proposta.codigo}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(proposta.valor_total_final)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                  Nenhuma proposta
                </div>
              )}
            </div>
          </div>
        );
      })}

      {openMenu !== null && (
        <div
          style={{
            position: 'fixed',
            top: `${menuPosition.top}px`,
            right: `${menuPosition.right}px`,
            zIndex: 9999
          }}
          className="w-56 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl"
        >
          <button
            onClick={() => {
              console.log('Editar proposta:', openMenu);
              setOpenMenu(null);
            }}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors whitespace-nowrap rounded-t-lg"
          >
            <Pencil size={16} className="text-gray-600 dark:text-gray-400 flex-shrink-0" />
            <span>Editar</span>
          </button>
          <button
            onClick={() => {
              console.log('Aprovar proposta:', openMenu);
              setOpenMenu(null);
            }}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors border-t border-gray-200 dark:border-gray-700 whitespace-nowrap"
          >
            <CheckCircle size={16} className="text-green-600 dark:text-green-400 flex-shrink-0" />
            <span>Aprovar Manualmente</span>
          </button>
          <button
            onClick={() => {
              console.log('Enviar via WhatsApp');
              setOpenMenu(null);
            }}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors border-t border-gray-200 dark:border-gray-700 whitespace-nowrap"
          >
            <Share2 size={16} className="text-green-600 dark:text-green-400 flex-shrink-0" />
            <span>Enviar via WhatsApp</span>
          </button>
          <button
            onClick={() => {
              console.log('Enviar via E-mail');
              setOpenMenu(null);
            }}
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
              console.log('Excluir proposta:', openMenu);
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
    </div>
  );
}
