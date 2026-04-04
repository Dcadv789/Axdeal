import { Check, ChevronDown, ListTree, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PropostaFormData, PropostaItem } from '../types';
import DatePickerPT from './DatePickerPT';

export type TipoCampoCustomizado = 'texto' | 'numero' | 'data' | 'selecao';

export interface CampoCustomizadoConfig {
  id: string;
  campo_chave: string;
  label: string;
  tipo_campo: TipoCampoCustomizado;
  ordem: number | null;
  opcoes_selecao: string[];
}

interface DetalhesCamposCustomizadosProps {
  formData: PropostaFormData;
  setFormData: (data: PropostaFormData) => void;
  items: PropostaItem[];
  departamentos: Array<{ id: string; nome: string }>;
  projetos: Array<{ id: string; nome: string }>;
  carregandoDepartamentos: boolean;
  carregandoProjetos: boolean;
  camposConfig: CampoCustomizadoConfig[];
  carregando: boolean;
  isViewMode: boolean;
  tipoDocumento?: 'proposta' | 'venda' | 'os';
}

export function normalizarTipoCampoCustomizado(valor: unknown): TipoCampoCustomizado {
  const texto = String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (texto === 'numero' || texto === 'number') return 'numero';
  if (texto === 'data' || texto === 'date') return 'data';
  if (texto === 'selecao' || texto === 'select') return 'selecao';
  return 'texto';
}

export function normalizarOpcoesSelecaoCustomizadas(valor: unknown): string[] {
  if (!valor) return [];
  if (Array.isArray(valor)) return valor.map((item) => String(item).trim()).filter(Boolean);

  if (typeof valor === 'string') {
    try {
      const parsed = JSON.parse(valor);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {}
  }

  return [];
}

function ordenarCampos(a: CampoCustomizadoConfig, b: CampoCustomizadoConfig) {
  const ordemA = a.ordem ?? Number.MAX_SAFE_INTEGER;
  const ordemB = b.ordem ?? Number.MAX_SAFE_INTEGER;
  if (ordemA !== ordemB) return ordemA - ordemB;
  return a.label.localeCompare(b.label, 'pt-BR');
}

function ajustarAlturaTextarea(textarea: HTMLTextAreaElement) {
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
}

export default function DetalhesCamposCustomizados({
  formData,
  setFormData,
  items: _items,
  departamentos,
  projetos,
  carregandoDepartamentos,
  carregandoProjetos,
  camposConfig,
  carregando,
  isViewMode,
  tipoDocumento = 'proposta',
}: DetalhesCamposCustomizadosProps) {
  const observacoesRef = useRef<HTMLTextAreaElement>(null);
  const observacoesInternasRef = useRef<HTMLTextAreaElement>(null);
  const departamentoDropdownRef = useRef<HTMLDivElement>(null);
  const projetoDropdownRef = useRef<HTMLDivElement>(null);
  const selecaoCampoRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const popupCampoRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [mostrarDropdownDepartamento, setMostrarDropdownDepartamento] = useState(false);
  const [mostrarDropdownProjeto, setMostrarDropdownProjeto] = useState(false);
  const [campoSelecaoAberto, setCampoSelecaoAberto] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  const campoSelecaoClass =
    'w-full min-h-[42px] flex items-center justify-between gap-2 px-3 py-2.5 text-sm rounded-lg border border-blue-500/30 dark:border-blue-400/30 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed';
  const campoTextoClass =
    'w-full px-3 py-2.5 text-sm rounded-lg border border-blue-500/30 dark:border-blue-400/30 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed';

  const camposOrdenados = useMemo(() => [...camposConfig].sort(ordenarCampos), [camposConfig]);
  const departamentoSelecionado = departamentos.find((item) => item.id === formData.id_departamento) || null;
  const projetoSelecionado = projetos.find((item) => item.id === formData.id_projeto) || null;
  const isVenda = tipoDocumento === 'venda';
  const tituloDocumento =
    tipoDocumento === 'os' ? 'ordem de serviço' : tipoDocumento === 'venda' ? 'pedido de venda' : 'proposta';

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (observacoesRef.current) ajustarAlturaTextarea(observacoesRef.current);
  }, [formData.observacoes]);

  useEffect(() => {
    if (observacoesInternasRef.current) ajustarAlturaTextarea(observacoesInternasRef.current);
  }, [formData.observacoesInternas]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (departamentoDropdownRef.current && !departamentoDropdownRef.current.contains(target)) {
        setMostrarDropdownDepartamento(false);
      }

      if (projetoDropdownRef.current && !projetoDropdownRef.current.contains(target)) {
        setMostrarDropdownProjeto(false);
      }

      if (!campoSelecaoAberto) return;
      const campoRef = selecaoCampoRefs.current[campoSelecaoAberto];
      const popupRef = popupCampoRefs.current[campoSelecaoAberto];

      if (!campoRef?.contains(target) && !popupRef?.contains(target)) {
        setCampoSelecaoAberto(null);
      }
    };

    if (mostrarDropdownDepartamento || mostrarDropdownProjeto || campoSelecaoAberto) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [campoSelecaoAberto, mostrarDropdownDepartamento, mostrarDropdownProjeto]);

  useEffect(() => {
    const atualizarPosicaoDropdown = () => {
      if (!campoSelecaoAberto) return;
      const campoRef = selecaoCampoRefs.current[campoSelecaoAberto];
      if (!campoRef) return;

      const rect = campoRef.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    };

    if (campoSelecaoAberto) {
      atualizarPosicaoDropdown();
      window.addEventListener('resize', atualizarPosicaoDropdown);
      window.addEventListener('scroll', atualizarPosicaoDropdown, true);
    } else {
      setDropdownPosition(null);
    }

    return () => {
      window.removeEventListener('resize', atualizarPosicaoDropdown);
      window.removeEventListener('scroll', atualizarPosicaoDropdown, true);
    };
  }, [campoSelecaoAberto]);

  const atualizarCampoAdicional = (campoChave: string, valor: string | number | null) => {
    setFormData({
      ...formData,
      campos_adicionais: {
        ...(formData.campos_adicionais || {}),
        [campoChave]: valor,
      },
    });
  };

  const renderCampoCustomizado = (campo: CampoCustomizadoConfig) => {
    const valorAtual = formData.campos_adicionais?.[campo.campo_chave];
    const valorTexto = valorAtual === null || valorAtual === undefined ? '' : String(valorAtual);

    if (campo.tipo_campo === 'data') {
      return (
        <DatePickerPT
          value={valorTexto}
          onChange={(value) => atualizarCampoAdicional(campo.campo_chave, value || null)}
          disabled={isViewMode}
          className={campoSelecaoClass}
        />
      );
    }

    if (campo.tipo_campo === 'numero') {
      return (
        <input
          type="number"
          value={valorTexto}
          disabled={isViewMode}
          onChange={(event) => {
            const valor = event.target.value;
            atualizarCampoAdicional(
              campo.campo_chave,
              valor === '' ? null : Number.isNaN(Number(valor)) ? null : Number(valor)
            );
          }}
          className={campoTextoClass}
          placeholder="Digite um número"
        />
      );
    }

    if (campo.tipo_campo === 'selecao') {
      const estaAberto = campoSelecaoAberto === campo.campo_chave;

      return (
        <div
          className="relative"
          ref={(node) => {
            selecaoCampoRefs.current[campo.campo_chave] = node;
          }}
        >
          <button
            type="button"
            disabled={isViewMode}
            className={campoSelecaoClass}
            onClick={() => {
              if (isViewMode) return;
              setCampoSelecaoAberto((atual) => (atual === campo.campo_chave ? null : campo.campo_chave));
            }}
          >
            <span className={`min-w-0 flex-1 truncate text-left ${valorTexto ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
              {valorTexto || 'Selecione uma opção'}
            </span>
            <ChevronDown size={16} className={`text-gray-500 dark:text-gray-400 transition-transform ${estaAberto ? 'rotate-180' : ''}`} />
          </button>

          {estaAberto && !isViewMode && mounted && dropdownPosition &&
            createPortal(
              <div
                ref={(node) => {
                  popupCampoRefs.current[campo.campo_chave] = node;
                }}
                className="z-[9999] overflow-hidden rounded-xl border border-[#BFDBFE] bg-white shadow-xl shadow-blue-500/10 dark:border-blue-500/35 dark:bg-neutral-900"
                style={{
                  position: 'fixed',
                  top: dropdownPosition.top,
                  left: dropdownPosition.left,
                  width: dropdownPosition.width,
                }}
              >
                <div className="p-1">
                  <button
                    type="button"
                    onClick={() => {
                      atualizarCampoAdicional(campo.campo_chave, null);
                      setCampoSelecaoAberto(null);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-blue-500/10"
                  >
                    <span className="truncate">Nenhuma opção</span>
                    {!valorTexto && <Check size={15} className="text-blue-600 dark:text-blue-400" />}
                  </button>
                </div>
                <div className="max-h-[min(24rem,calc(100vh-10rem))] overflow-y-auto px-1 pb-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700">
                  {campo.opcoes_selecao.map((opcao) => (
                    <button
                      key={`${campo.id}-${opcao}`}
                      type="button"
                      onClick={() => {
                        atualizarCampoAdicional(campo.campo_chave, opcao);
                        setCampoSelecaoAberto(null);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        valorTexto === opcao
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200'
                          : 'text-gray-800 hover:bg-blue-50 dark:text-gray-100 dark:hover:bg-blue-500/10'
                      }`}
                    >
                      <span className="truncate">{opcao}</span>
                      {valorTexto === opcao && <Check size={15} className="text-blue-600 dark:text-blue-400" />}
                    </button>
                  ))}
                </div>
              </div>,
              document.body
            )}
        </div>
      );
    }

    return (
      <input
        type="text"
        value={valorTexto}
        disabled={isViewMode}
        onChange={(event) => atualizarCampoAdicional(campo.campo_chave, event.target.value)}
        className={campoTextoClass}
        placeholder="Digite uma informação"
      />
    );
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-black">
        <div className="mb-6 flex items-start gap-3">
          <div className="inline-flex h-10 w-10 min-w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            <ListTree size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Detalhes</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Organize datas e informações complementares desta {tituloDocumento}.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="relative" ref={projetoDropdownRef}>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Projeto
            </label>
            <button
              type="button"
              onClick={() => {
                if (!isViewMode && !carregandoProjetos) {
                  setMostrarDropdownProjeto((prev) => !prev);
                  setMostrarDropdownDepartamento(false);
                }
              }}
              disabled={isViewMode || carregandoProjetos}
              className={campoSelecaoClass}
            >
              <span className={`min-w-0 flex-1 truncate text-left ${projetoSelecionado ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
                {projetoSelecionado?.nome || (carregandoProjetos ? 'Carregando projetos...' : 'Selecione um projeto')}
              </span>
              <ChevronDown size={16} className={`text-gray-500 dark:text-gray-400 transition-transform ${mostrarDropdownProjeto ? 'rotate-180' : ''}`} />
            </button>

            {mostrarDropdownProjeto && !isViewMode && !carregandoProjetos && (
              <div className="absolute left-0 top-full z-20 mt-2 w-full overflow-hidden rounded-xl border border-[#BFDBFE] bg-white shadow-xl shadow-blue-500/10 dark:border-blue-500/35 dark:bg-neutral-900">
                <div className="p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, id_projeto: null });
                      setMostrarDropdownProjeto(false);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-blue-500/10"
                  >
                    <span className="truncate">Nenhum projeto</span>
                    {!formData.id_projeto && <Check size={15} className="text-blue-600 dark:text-blue-400" />}
                  </button>
                </div>
                <div className="max-h-[min(24rem,calc(100vh-10rem))] overflow-y-auto px-1 pb-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700">
                  {projetos.map((projeto) => (
                    <button
                      key={projeto.id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, id_projeto: projeto.id });
                        setMostrarDropdownProjeto(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        formData.id_projeto === projeto.id
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200'
                          : 'text-gray-800 hover:bg-blue-50 dark:text-gray-100 dark:hover:bg-blue-500/10'
                      }`}
                    >
                      <span className="truncate">{projeto.nome}</span>
                      {formData.id_projeto === projeto.id && <Check size={15} className="text-blue-600 dark:text-blue-400" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={departamentoDropdownRef}>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Departamento
            </label>
            <button
              type="button"
              onClick={() => {
                if (!isViewMode && !carregandoDepartamentos) {
                  setMostrarDropdownDepartamento((prev) => !prev);
                  setMostrarDropdownProjeto(false);
                }
              }}
              disabled={isViewMode || carregandoDepartamentos}
              className={campoSelecaoClass}
            >
              <span className={`min-w-0 flex-1 truncate text-left ${departamentoSelecionado ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
                {departamentoSelecionado?.nome || (carregandoDepartamentos ? 'Carregando departamentos...' : 'Selecione um departamento')}
              </span>
              <ChevronDown size={16} className={`text-gray-500 dark:text-gray-400 transition-transform ${mostrarDropdownDepartamento ? 'rotate-180' : ''}`} />
            </button>

            {mostrarDropdownDepartamento && !isViewMode && !carregandoDepartamentos && (
              <div className="absolute left-0 top-full z-20 mt-2 w-full overflow-hidden rounded-xl border border-[#BFDBFE] bg-white shadow-xl shadow-blue-500/10 dark:border-blue-500/35 dark:bg-neutral-900">
                <div className="p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, id_departamento: null });
                      setMostrarDropdownDepartamento(false);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-blue-500/10"
                  >
                    <span className="truncate">Nenhum departamento</span>
                    {!formData.id_departamento && <Check size={15} className="text-blue-600 dark:text-blue-400" />}
                  </button>
                </div>
                <div className="max-h-[min(24rem,calc(100vh-10rem))] overflow-y-auto px-1 pb-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700">
                  {departamentos.map((departamento) => (
                    <button
                      key={departamento.id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, id_departamento: departamento.id });
                        setMostrarDropdownDepartamento(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        formData.id_departamento === departamento.id
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200'
                          : 'text-gray-800 hover:bg-blue-50 dark:text-gray-100 dark:hover:bg-blue-500/10'
                      }`}
                    >
                      <span className="truncate">{departamento.nome}</span>
                      {formData.id_departamento === departamento.id && <Check size={15} className="text-blue-600 dark:text-blue-400" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Referência
            </label>
            <input
              type="text"
              value={formData.referencia}
              onChange={(event) => setFormData({ ...formData, referencia: event.target.value })}
              disabled={isViewMode}
              placeholder="Ex: Pedido do cliente / nº interno"
              className={campoTextoClass}
            />
          </div>
        </div>

        {!isVenda && <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="min-w-0">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Data de Início
            </label>
            <DatePickerPT
              value={formData.dataInicio}
              onChange={(value) => setFormData({ ...formData, dataInicio: value })}
              disabled={isViewMode}
              className={campoSelecaoClass}
            />
          </div>
          <div className="min-w-0">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Data de Fim
            </label>
            <DatePickerPT
              value={formData.dataFim}
              onChange={(value) => setFormData({ ...formData, dataFim: value })}
              disabled={isViewMode}
              className={campoSelecaoClass}
            />
          </div>
        </div>}

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Observações
            </label>
            <textarea
              ref={observacoesRef}
              value={formData.observacoes}
              onChange={(event) => {
                setFormData({ ...formData, observacoes: event.target.value });
                ajustarAlturaTextarea(event.target);
              }}
              disabled={isViewMode}
              placeholder="Observações visíveis ao cliente..."
              rows={isVenda ? 5 : 3}
              className="w-full resize-y overflow-auto rounded-lg border border-blue-500/30 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:bg-gray-50 dark:border-blue-400/30 dark:bg-neutral-900 dark:text-gray-100 dark:disabled:bg-neutral-800"
              style={{ minHeight: isVenda ? '128px' : '80px' }}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Observações Internas
            </label>
            <textarea
              ref={observacoesInternasRef}
              value={formData.observacoesInternas}
              onChange={(event) => {
                setFormData({ ...formData, observacoesInternas: event.target.value });
                ajustarAlturaTextarea(event.target);
              }}
              disabled={isViewMode}
              placeholder="Observações internas (não visíveis ao cliente)..."
              rows={isVenda ? 5 : 3}
              className="w-full resize-y overflow-auto rounded-lg border border-blue-500/30 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:bg-gray-50 dark:border-blue-400/30 dark:bg-neutral-900 dark:text-gray-100 dark:disabled:bg-neutral-800"
              style={{ minHeight: isVenda ? '128px' : '80px' }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-black">
        <div className="mb-6 flex items-start gap-3">
          <div className="inline-flex h-10 w-10 min-w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            <SlidersHorizontal size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Campos Personalizados</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Campos configurados dinamicamente para esta {tituloDocumento}.
            </p>
          </div>
        </div>

        {carregando ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-sm text-slate-500 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-400">
            Carregando campos personalizados...
          </div>
        ) : camposOrdenados.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-sm text-slate-500 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-400">
            Nenhum campo personalizado ativo foi configurado para este documento.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {camposOrdenados.map((campo) => (
              <div key={campo.id} className="min-w-0">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {campo.label}
                </label>
                {renderCampoCustomizado(campo)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
