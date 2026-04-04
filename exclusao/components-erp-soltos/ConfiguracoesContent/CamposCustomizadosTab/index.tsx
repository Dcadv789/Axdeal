'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  FileText,
  ListOrdered,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/lib/context/company-context';

type ContextoCampo = 'PROPOSTA' | 'VENDA' | 'OS';
type TipoCampo = 'texto' | 'numero' | 'data' | 'selecao';

interface CampoCustomizado {
  id: string;
  contexto: ContextoCampo;
  rotulo: string;
  tipo_campo: TipoCampo;
  ordem: number | null;
  ativo: boolean;
  opcoes: string[];
}

const cardClass = 'rounded-xl border border-slate-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/50';

const CONTEXTOS: Array<{
  id: ContextoCampo;
  label: string;
  descricao: string;
  icon: typeof FileText;
}> = [
  { id: 'OS', label: 'Ordem de Serviço', descricao: 'Campos extras para ordens de serviço.', icon: Wrench },
  { id: 'PROPOSTA', label: 'Proposta', descricao: 'Campos extras para propostas comerciais.', icon: FileText },
  { id: 'VENDA', label: 'Pedido de Venda', descricao: 'Campos extras para pedidos de venda.', icon: ReceiptText },
];

const TIPOS_CAMPO: Array<{ value: TipoCampo; label: string }> = [
  { value: 'texto', label: 'Texto' },
  { value: 'numero', label: 'Número' },
  { value: 'data', label: 'Data' },
  { value: 'selecao', label: 'Seleção' },
];

function normalizarContexto(valor: unknown): ContextoCampo {
  const texto = String(valor || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

  if (texto === 'PEDIDO_DE_VENDA' || texto === 'PEDIDO_VENDA' || texto === 'VENDA') return 'VENDA';
  if (texto === 'ORDEM_DE_SERVICO' || texto === 'ORDEM_SERVICO' || texto === 'OS') return 'OS';
  return 'PROPOSTA';
}

function normalizarTipoCampo(valor: unknown): TipoCampo {
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

function normalizarOpcoes(valor: unknown): string[] {
  if (!valor) return [];
  if (Array.isArray(valor)) {
    return valor.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof valor === 'string') {
    const texto = valor.trim();
    if (!texto) return [];

    try {
      const parsed = JSON.parse(texto);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {}

    return texto
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizarCampo(row: Record<string, unknown>): CampoCustomizado {
  return {
    id: String(row.id || crypto.randomUUID()),
    contexto: normalizarContexto(row.contexto),
    rotulo: String(row.label || row.rotulo || row.nome || '').trim(),
    tipo_campo: normalizarTipoCampo(row.tipo_campo || row.tipo),
    ordem:
      row.ordem === null || row.ordem === undefined || row.ordem === ''
        ? null
        : Number(row.ordem),
    ativo: row.ativo !== false,
    opcoes: normalizarOpcoes(row.opcoes_selecao || row.opcoes || row.valores),
  };
}

function ordenarCampos(campos: CampoCustomizado[]) {
  return [...campos].sort((a, b) => {
    const ordemA = a.ordem ?? Number.MAX_SAFE_INTEGER;
    const ordemB = b.ordem ?? Number.MAX_SAFE_INTEGER;
    if (ordemA !== ordemB) return ordemA - ordemB;
    return a.rotulo.localeCompare(b.rotulo, 'pt-BR');
  });
}

export default function CamposCustomizadosTab() {
  const { companyId } = useCompany();
  const [contextoAtivo, setContextoAtivo] = useState<ContextoCampo>('OS');
  const [campos, setCampos] = useState<CampoCustomizado[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [rotulo, setRotulo] = useState('');
  const [tipoCampo, setTipoCampo] = useState<TipoCampo>('texto');
  const [ordem, setOrdem] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [opcoes, setOpcoes] = useState<string[]>(['']);
  const [tipoDropdownOpen, setTipoDropdownOpen] = useState(false);
  const [campoEmEdicaoId, setCampoEmEdicaoId] = useState<string | null>(null);
  const tipoDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tipoDropdownRef.current && !tipoDropdownRef.current.contains(event.target as Node)) {
        setTipoDropdownOpen(false);
      }
    };

    if (tipoDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [tipoDropdownOpen]);

  useEffect(() => {
    const carregarCampos = async () => {
      if (!companyId) {
        setCampos([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('erp_campos_customizados_config')
          .select('*')
          .eq('id_empresa', companyId);

        if (error) throw error;

        setCampos(ordenarCampos(((data || []) as Record<string, unknown>[]).map(normalizarCampo)));
      } catch (error) {
        console.error('Erro ao carregar campos customizados:', error);
        toast.error('Não foi possível carregar os campos customizados.');
      } finally {
        setLoading(false);
      }
    };

    void carregarCampos();
  }, [companyId]);

  const contextoAtual = CONTEXTOS.find((item) => item.id === contextoAtivo) || CONTEXTOS[0];
  const ContextoIcone = contextoAtual.icon;
  const tipoSelecionado = TIPOS_CAMPO.find((item) => item.value === tipoCampo) || TIPOS_CAMPO[0];
  const camposDoContexto = useMemo(
    () => ordenarCampos(campos.filter((campo) => campo.contexto === contextoAtivo)),
    [campos, contextoAtivo]
  );

  const resetFormulario = () => {
    setRotulo('');
    setTipoCampo('texto');
    setOrdem('');
    setAtivo(true);
    setOpcoes(['']);
    setCampoEmEdicaoId(null);
    setTipoDropdownOpen(false);
  };

  const editarCampo = (campo: CampoCustomizado) => {
    setContextoAtivo(campo.contexto);
    setCampoEmEdicaoId(campo.id);
    setRotulo(campo.rotulo);
    setTipoCampo(campo.tipo_campo);
    setOrdem(campo.ordem === null ? '' : String(campo.ordem));
    setAtivo(campo.ativo);
    setOpcoes(campo.opcoes.length > 0 ? campo.opcoes : ['']);
    setTipoDropdownOpen(false);
  };

  const excluirCampo = async (campo: CampoCustomizado) => {
    if (!companyId) {
      toast.error('Empresa não identificada.');
      return;
    }

    setSalvando(true);
    try {
      const { error } = await supabase
        .from('erp_campos_customizados_config')
        .delete()
        .eq('id', campo.id)
        .eq('id_empresa', companyId);

      if (error) throw error;

      setCampos((prev) => prev.filter((item) => item.id !== campo.id));
      if (campoEmEdicaoId === campo.id) {
        resetFormulario();
      }
      toast.success('Campo customizado excluído com sucesso.');
    } catch (error) {
      console.error('Erro ao excluir campo customizado:', error);
      toast.error('Não foi possível excluir o campo customizado.');
    } finally {
      setSalvando(false);
    }
  };

  const salvarCampo = async () => {
    if (!companyId) {
      toast.error('Empresa não identificada.');
      return;
    }

    const rotuloLimpo = rotulo.trim();
    if (!rotuloLimpo) {
      toast.error('Informe o rótulo do campo.');
      return;
    }

    const opcoesLimpas = opcoes.map((item) => item.trim()).filter(Boolean);
    if (tipoCampo === 'selecao' && opcoesLimpas.length === 0) {
      toast.error('Adicione ao menos uma opção para o campo de seleção.');
      return;
    }

    setSalvando(true);
    try {
      const payload: Record<string, unknown> = {
        id_empresa: companyId,
        contexto: contextoAtivo,
        label: rotuloLimpo,
        tipo_campo: tipoCampo,
        ordem: ordem.trim() ? Number(ordem) : null,
        ativo,
        opcoes_selecao: tipoCampo === 'selecao' ? opcoesLimpas : [],
      };

      const query = campoEmEdicaoId
        ? supabase
            .from('erp_campos_customizados_config')
            .update(payload)
            .eq('id', campoEmEdicaoId)
            .eq('id_empresa', companyId)
            .select('*')
            .single()
        : supabase
            .from('erp_campos_customizados_config')
            .insert(payload)
            .select('*')
            .single();

      const { data, error } = await query;

      if (error) throw error;

      const campoNormalizado = normalizarCampo((data || payload) as Record<string, unknown>);
      setCampos((prev) =>
        ordenarCampos(
          campoEmEdicaoId
            ? prev.map((item) => (item.id === campoEmEdicaoId ? campoNormalizado : item))
            : [...prev, campoNormalizado]
        )
      );
      resetFormulario();
      toast.success(campoEmEdicaoId ? 'Campo customizado atualizado com sucesso.' : 'Campo customizado adicionado com sucesso.');
    } catch (error) {
      console.error('Erro ao salvar campo customizado:', error);
      toast.error(campoEmEdicaoId ? 'Não foi possível atualizar o campo customizado.' : 'Não foi possível adicionar o campo customizado.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[290px,minmax(0,1fr)]">
        <div className={`${cardClass} p-3`}>
          <div className="space-y-2">
            {CONTEXTOS.map((contexto) => {
              const Icon = contexto.icon;
              const ativoNoContexto = contextoAtivo === contexto.id;
              const quantidade = campos.filter((campo) => campo.contexto === contexto.id).length;

              return (
                <button
                  key={contexto.id}
                  type="button"
                  onClick={() => setContextoAtivo(contexto.id)}
                  className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                    ativoNoContexto
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-400/50 dark:bg-blue-500/10 dark:text-blue-300'
                      : 'border-transparent bg-slate-50 text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900 dark:bg-neutral-900/70 dark:text-slate-300 dark:hover:border-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-slate-100'
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                      ativoNoContexto
                        ? 'bg-blue-600 text-white dark:bg-blue-500'
                        : 'bg-white text-slate-500 dark:bg-neutral-800 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{contexto.label}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          ativoNoContexto
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-400/20 dark:text-blue-200'
                            : 'bg-slate-200 text-slate-600 dark:bg-neutral-700 dark:text-slate-300'
                        }`}
                      >
                        {quantidade}
                      </span>
                    </div>
                    <p className={`mt-1 text-xs leading-5 ${ativoNoContexto ? 'text-blue-600/90 dark:text-blue-200/80' : 'text-slate-500 dark:text-slate-400'}`}>
                      {contexto.descricao}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className={cardClass}>
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">
              <ContextoIcone className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {campoEmEdicaoId ? `Editar campo em ${contextoAtual.label}` : `Novo campo em ${contextoAtual.label}`}
              </h4>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{contextoAtual.descricao}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr),220px,120px,120px]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Rótulo</label>
              <input
                type="text"
                value={rotulo}
                onChange={(event) => setRotulo(event.target.value)}
                placeholder="Ex.: Centro de custo, responsável técnico, código interno..."
                className="h-11 w-full rounded-xl border border-blue-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>

            <div ref={tipoDropdownRef} className="relative">
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Tipo de campo</label>
              <button
                type="button"
                onClick={() => setTipoDropdownOpen((prev) => !prev)}
                className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-blue-200 bg-white px-3 text-sm text-slate-900 transition-colors hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-slate-100 dark:hover:border-blue-400/50"
              >
                <span>{tipoSelecionado.label}</span>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${tipoDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {tipoDropdownOpen && (
                <div className="absolute left-0 top-full z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
                  {TIPOS_CAMPO.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        setTipoCampo(item.value);
                        setTipoDropdownOpen(false);
                      }}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-blue-500/10"
                    >
                      <span>{item.label}</span>
                      {tipoCampo === item.value && <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Ordem</label>
              <input
                type="number"
                min="0"
                value={ordem}
                onChange={(event) => setOrdem(event.target.value)}
                placeholder="0"
                className="h-11 w-full rounded-xl border border-blue-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Ativo</label>
              <button
                type="button"
                role="switch"
                aria-checked={ativo}
                onClick={() => setAtivo((prev) => !prev)}
                className={`flex h-11 w-full items-center justify-between rounded-xl border px-3 text-sm font-medium transition ${
                  ativo
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'border-slate-200 bg-white text-slate-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-400'
                }`}
              >
                <span>{ativo ? 'Ativo' : 'Inativo'}</span>
                <span
                  className={`inline-flex h-5 w-9 items-center rounded-full transition ${
                    ativo ? 'bg-emerald-500/20 justify-end' : 'bg-slate-200 justify-start dark:bg-neutral-700'
                  }`}
                >
                  <span className={`mx-1 h-3.5 w-3.5 rounded-full ${ativo ? 'bg-emerald-600' : 'bg-slate-500 dark:bg-slate-300'}`} />
                </span>
              </button>
            </div>
          </div>

          {tipoCampo === 'selecao' && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h5 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Opções da seleção</h5>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Defina as opções que vão aparecer no campo quando ele for exibido.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpcoes((prev) => [...prev, ''])}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/30"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar opção
                </button>
              </div>

              <div className="space-y-2">
                {opcoes.map((opcao, index) => (
                  <div key={`opcao-${index}`} className="flex items-center gap-2">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-semibold text-slate-500 shadow-sm dark:bg-neutral-900 dark:text-slate-300">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={opcao}
                      onChange={(event) =>
                        setOpcoes((prev) => prev.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))
                      }
                      placeholder={`Opção ${index + 1}`}
                      className="h-10 flex-1 rounded-xl border border-blue-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setOpcoes((prev) => (prev.length > 1 ? prev.filter((_, itemIndex) => itemIndex !== index) : ['']))
                      }
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex justify-end gap-3">
            {campoEmEdicaoId && (
              <button
                type="button"
                onClick={resetFormulario}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-neutral-800"
              >
                Cancelar edição
              </button>
            )}
            <button
              type="button"
              onClick={salvarCampo}
              disabled={salvando}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
            >
              {campoEmEdicaoId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {salvando ? 'Salvando...' : campoEmEdicaoId ? 'Salvar alterações' : 'Adicionar campo'}
            </button>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Campos cadastrados em {contextoAtual.label}
            </h4>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Visualize a estrutura que já está configurada para este contexto.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-slate-300">
            <ListOrdered className="h-4 w-4" />
            <span>{camposDoContexto.length} campo(s)</span>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-neutral-800" />
            <div className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-neutral-800" />
          </div>
        ) : camposDoContexto.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-neutral-700 dark:text-slate-400">
            Nenhum campo customizado cadastrado para {contextoAtual.label.toLowerCase()} ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {camposDoContexto.map((campo) => (
              <div
                key={campo.id}
                className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-4 dark:border-neutral-700 dark:bg-neutral-900/40"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h5 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{campo.rotulo}</h5>
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                        {TIPOS_CAMPO.find((item) => item.value === campo.tipo_campo)?.label || campo.tipo_campo}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          campo.ativo
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-600 dark:bg-neutral-800 dark:text-slate-300'
                        }`}
                      >
                        {campo.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>

                    {campo.opcoes.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {campo.opcoes.map((opcao) => (
                          <span
                            key={`${campo.id}-${opcao}`}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-300"
                          >
                            {opcao}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-300">
                      Contexto: {contextoAtual.label}
                    </span>
                    <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-300">
                      Ordem: {campo.ordem ?? '-'}
                    </span>
                    <button
                      type="button"
                      onClick={() => editarCampo(campo)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:border-blue-500/30 dark:bg-neutral-900 dark:text-blue-300 dark:hover:bg-blue-500/10"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void excluirCampo(campo)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:bg-neutral-900 dark:text-rose-300 dark:hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
