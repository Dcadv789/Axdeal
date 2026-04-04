'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@axdeal/ui';
import { AlertCircle, ChevronDown, ChevronRight, FolderTree, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/lib/context/company-context';
import { supabase } from '@/lib/supabase';

type TipoGrupoDre = 'receita' | 'custo' | 'despesa' | 'resultado';
type TipoLancamento = 'entrada' | 'saida' | 'ambos';

interface GrupoDre {
  id_grupo: string;
  id_empresa: string;
  nome_grupo: string;
  tipo_grupo: TipoGrupoDre;
  descricao: string | null;
  ordem: number;
  cor: string | null;
}

interface CategoriaDre {
  id_categoria: string;
  id_empresa: string;
  id_grupo: string;
  id_categoria_pai: string | null;
  nome_categoria: string;
  descricao: string | null;
  tipo_lancamento: TipoLancamento;
  ordem: number;
}

const LABEL_GRUPO: Record<TipoGrupoDre, string> = {
  receita: 'Receitas',
  custo: 'Custos',
  despesa: 'Despesas',
  resultado: 'Resultado',
};

const LABEL_LANCAMENTO: Record<TipoLancamento, string> = {
  entrada: 'Entrada',
  saida: 'Saida',
  ambos: 'Ambos',
};

function ordenar<T extends { ordem: number }>(lista: T[], nome: keyof T): T[] {
  return [...lista].sort((a, b) => {
    if ((a.ordem || 0) !== (b.ordem || 0)) return (a.ordem || 0) - (b.ordem || 0);
    return String(a[nome] || '').localeCompare(String(b[nome] || ''), 'pt-BR');
  });
}

export default function ErpCategoriasDreContent() {
  const { user } = useAuth();
  const { companyId } = useCompany();

  const [loading, setLoading] = useState(true);
  const [importando, setImportando] = useState(false);
  const [salvandoGrupo, setSalvandoGrupo] = useState(false);
  const [salvandoCategoria, setSalvandoCategoria] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const [grupos, setGrupos] = useState<GrupoDre[]>([]);
  const [categorias, setCategorias] = useState<CategoriaDre[]>([]);
  const [gruposExpandidos, setGruposExpandidos] = useState<Record<string, boolean>>({});
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Record<string, boolean>>({});

  const [grupoForm, setGrupoForm] = useState({
    nome: '',
    tipo: 'receita' as TipoGrupoDre,
    descricao: '',
    ordem: '1',
    cor: '#2563EB',
  });
  const [categoriaForm, setCategoriaForm] = useState({
    idGrupo: '',
    idPai: '',
    nome: '',
    descricao: '',
    tipoLancamento: 'saida' as TipoLancamento,
    ordem: '1',
  });

  const campoClass =
    'w-full rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-500 transition-colors';

  const carregar = useCallback(async () => {
    if (!companyId) {
      setGrupos([]);
      setCategorias([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErro(null);
    const [resG, resC] = await Promise.all([
      supabase.from('erp_grupos_dre').select('*').eq('id_empresa', companyId).order('ordem'),
      supabase.from('erp_categorias').select('*').eq('id_empresa', companyId).order('ordem'),
    ]);
    if (resG.error || resC.error) {
      console.error('Erro ao carregar categorias DRE:', resG.error || resC.error);
      setErro('Nao foi possivel carregar os dados.');
      setLoading(false);
      return;
    }
    setGrupos((resG.data || []) as GrupoDre[]);
    setCategorias((resC.data || []) as CategoriaDre[]);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    void carregar();
  }, [user, carregar]);

  useEffect(() => {
    setGruposExpandidos((atual) => {
      const next = { ...atual };
      for (const g of grupos) if (!(g.id_grupo in next)) next[g.id_grupo] = true;
      return next;
    });
  }, [grupos]);

  useEffect(() => {
    setCategoriasExpandidas((atual) => {
      const next = { ...atual };
      for (const c of categorias) if (!(c.id_categoria in next)) next[c.id_categoria] = true;
      return next;
    });
  }, [categorias]);

  const gruposOrdenados = useMemo(() => ordenar(grupos, 'nome_grupo'), [grupos]);

  const filhosMap = useMemo(() => {
    const map = new Map<string, CategoriaDre[]>();
    for (const c of ordenar(categorias, 'nome_categoria')) {
      const key = `${c.id_grupo}:${c.id_categoria_pai || 'root'}`;
      const list = map.get(key) || [];
      list.push(c);
      map.set(key, list);
    }
    return map;
  }, [categorias]);

  const categoriasGrupoSelecionado = useMemo(
    () => ordenar(categorias.filter((c) => c.id_grupo === categoriaForm.idGrupo), 'nome_categoria'),
    [categorias, categoriaForm.idGrupo]
  );

  const opcoesPai = useMemo(() => {
    return categoriasGrupoSelecionado.map((c) => ({ id: c.id_categoria, nome: c.nome_categoria }));
  }, [categoriasGrupoSelecionado]);

  const salvarGrupo = async () => {
    if (!user?.id || !companyId) return;
    if (!grupoForm.nome.trim()) {
      setErro('Informe o nome do grupo.');
      return;
    }
    setSalvandoGrupo(true);
    setErro(null);
    setMensagem(null);
    const { error } = await supabase.from('erp_grupos_dre').insert({
      id_empresa: companyId,
      id_usuario: user.id,
      nome_grupo: grupoForm.nome.trim(),
      tipo_grupo: grupoForm.tipo,
      descricao: grupoForm.descricao.trim() || null,
      ordem: Math.max(1, Number(grupoForm.ordem || 1)),
      cor: grupoForm.cor || '#2563EB',
    });
    setSalvandoGrupo(false);
    if (error) {
      console.error('Erro ao criar grupo:', error);
      setErro('Nao foi possivel criar o grupo.');
      return;
    }
    setMensagem('Grupo criado com sucesso.');
    setGrupoForm({ nome: '', tipo: 'receita', descricao: '', ordem: '1', cor: '#2563EB' });
    await carregar();
  };

  const salvarCategoria = async () => {
    if (!user?.id || !companyId) return;
    if (!categoriaForm.idGrupo) {
      setErro('Selecione o grupo da categoria.');
      return;
    }
    if (!categoriaForm.nome.trim()) {
      setErro('Informe o nome da categoria.');
      return;
    }
    setSalvandoCategoria(true);
    setErro(null);
    setMensagem(null);
    const { error } = await supabase.from('erp_categorias').insert({
      id_empresa: companyId,
      id_usuario: user.id,
      id_grupo: categoriaForm.idGrupo,
      id_categoria_pai: categoriaForm.idPai || null,
      nome_categoria: categoriaForm.nome.trim(),
      descricao: categoriaForm.descricao.trim() || null,
      tipo_lancamento: categoriaForm.tipoLancamento,
      ordem: Math.max(1, Number(categoriaForm.ordem || 1)),
    });
    setSalvandoCategoria(false);
    if (error) {
      console.error('Erro ao criar categoria:', error);
      setErro('Nao foi possivel criar a categoria.');
      return;
    }
    setMensagem('Categoria criada com sucesso.');
    setCategoriaForm((atual) => ({ ...atual, idPai: '', nome: '', descricao: '', ordem: '1' }));
    await carregar();
  };

  const importarPadrao = async () => {
    if (!companyId) return;
    setImportando(true);
    setErro(null);
    setMensagem(null);
    const { error } = await supabase.rpc('erp_fn_importar_modelo_padrao_axory_categorias', { p_id_empresa: companyId });
    setImportando(false);
    if (error) {
      console.error('Erro ao importar modelo padrao:', error);
      setErro('Nao foi possivel importar o modelo padrao.');
      return;
    }
    setMensagem('Modelo padrao Axory aplicado.');
    await carregar();
  };

  const excluirGrupo = async (grupo: GrupoDre) => {
    if (!companyId) return;
    if (!window.confirm(`Excluir grupo "${grupo.nome_grupo}" e suas categorias?`)) return;
    const { error } = await supabase.from('erp_grupos_dre').delete().eq('id_grupo', grupo.id_grupo).eq('id_empresa', companyId);
    if (error) {
      setErro('Nao foi possivel excluir o grupo.');
      return;
    }
    await carregar();
  };

  const excluirCategoria = async (categoria: CategoriaDre) => {
    if (!companyId) return;
    if (!window.confirm(`Excluir categoria "${categoria.nome_categoria}"?`)) return;
    const { error } = await supabase.from('erp_categorias').delete().eq('id_categoria', categoria.id_categoria).eq('id_empresa', companyId);
    if (error) {
      setErro('Nao foi possivel excluir a categoria.');
      return;
    }
    await carregar();
  };

  const renderCategoria = (categoria: CategoriaDre, depth: number): JSX.Element => {
    const filhas = filhosMap.get(`${categoria.id_grupo}:${categoria.id_categoria}`) || [];
    const temFilhas = filhas.length > 0;
    const expandida = categoriasExpandidas[categoria.id_categoria] ?? true;
    return (
      <div key={categoria.id_categoria} className="space-y-2">
        <div className="group flex items-start gap-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5" style={{ marginLeft: `${depth * 18}px` }}>
          <button
            type="button"
            disabled={!temFilhas}
            onClick={() => setCategoriasExpandidas((atual) => ({ ...atual, [categoria.id_categoria]: !expandida }))}
            className={`mt-0.5 h-5 w-5 rounded-md inline-flex items-center justify-center ${temFilhas ? 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-neutral-800' : 'text-transparent cursor-default'}`}
          >
            {temFilhas ? (expandida ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <ChevronRight size={14} />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{categoria.nome_categoria}</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-neutral-800 dark:text-slate-200">
                {LABEL_LANCAMENTO[categoria.tipo_lancamento]}
              </span>
            </div>
            {categoria.descricao && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{categoria.descricao}</p>}
          </div>
          <button type="button" onClick={() => void excluirCategoria(categoria)} className="h-7 w-7 rounded-lg inline-flex items-center justify-center border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/15">
            <Trash2 size={13} />
          </button>
        </div>
        {temFilhas && expandida && <div className="space-y-2">{filhas.map((f) => renderCategoria(f, depth + 1))}</div>}
      </div>
    );
  };

  return (
    <div className="py-6 space-y-6">
      <Card>
        <div className="space-y-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">Categorias Hierarquicas e DRE</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">Grupos DRE com categorias e subcategorias em arvore.</p>
            </div>
            <button type="button" onClick={() => void importarPadrao()} disabled={importando || loading} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              <Sparkles size={16} />
              {importando ? 'Configurando...' : 'Configurar com Modelo Padrao Axory'}
            </button>
          </div>

          {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 flex items-start gap-2"><AlertCircle size={16} className="mt-0.5" />{erro}</div>}
          {mensagem && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">{mensagem}</div>}

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-4">
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-slate-50/70 dark:bg-neutral-900/40 p-3 flex items-center gap-2">
                <FolderTree size={16} className="text-blue-600 dark:text-blue-300" />
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Estrutura em Arvore</p>
              </div>
              {loading ? (
                <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-950" />)}</div>
              ) : gruposOrdenados.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 p-10 text-center">
                  <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"><Sparkles size={20} /></div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Nenhuma estrutura configurada.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {gruposOrdenados.map((grupo) => {
                    const expandido = gruposExpandidos[grupo.id_grupo] ?? true;
                    const raizes = filhosMap.get(`${grupo.id_grupo}:root`) || [];
                    return (
                      <div key={grupo.id_grupo} className="overflow-hidden rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950">
                        <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-neutral-700 px-4 py-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <button type="button" onClick={() => setGruposExpandidos((atual) => ({ ...atual, [grupo.id_grupo]: !expandido }))} className="mt-0.5 h-7 w-7 rounded-lg inline-flex items-center justify-center text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-neutral-800">
                              {expandido ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                            <span className="mt-2 h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: grupo.cor || '#2563EB' }} />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{grupo.nome_grupo}</p>
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{LABEL_GRUPO[grupo.tipo_grupo]}</span>
                              </div>
                              {grupo.descricao && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{grupo.descricao}</p>}
                            </div>
                          </div>
                          <button type="button" onClick={() => void excluirGrupo(grupo)} className="h-8 w-8 rounded-lg inline-flex items-center justify-center border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/15">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {expandido && <div className="p-3 space-y-2">{raizes.length ? raizes.map((c) => renderCategoria(c, 0)) : <div className="rounded-xl border border-dashed border-slate-300 dark:border-neutral-700 px-3 py-4 text-center text-xs text-slate-500 dark:text-slate-400">Sem categorias neste grupo.</div>}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-3 xl:sticky xl:top-4 self-start">
              <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 p-4 shadow-sm space-y-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Novo grupo DRE</p>
                <input type="text" value={grupoForm.nome} onChange={(e) => setGrupoForm((a) => ({ ...a, nome: e.target.value }))} placeholder="Nome do grupo" className={campoClass} />
                <div className="grid grid-cols-2 gap-3">
                  <select value={grupoForm.tipo} onChange={(e) => setGrupoForm((a) => ({ ...a, tipo: e.target.value as TipoGrupoDre }))} className={campoClass}>
                    <option value="receita">Receitas</option><option value="custo">Custos</option><option value="despesa">Despesas</option><option value="resultado">Resultado</option>
                  </select>
                  <input type="number" min={1} value={grupoForm.ordem} onChange={(e) => setGrupoForm((a) => ({ ...a, ordem: e.target.value }))} className={campoClass} />
                </div>
                <textarea value={grupoForm.descricao} onChange={(e) => setGrupoForm((a) => ({ ...a, descricao: e.target.value }))} rows={3} placeholder="Descricao" className={campoClass} />
                <input type="color" value={grupoForm.cor} onChange={(e) => setGrupoForm((a) => ({ ...a, cor: e.target.value }))} className="h-11 w-full rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-500" />
                <button type="button" onClick={() => void salvarGrupo()} disabled={salvandoGrupo} className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{salvandoGrupo ? 'Salvando...' : 'Criar grupo'}</button>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 p-4 shadow-sm space-y-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Nova categoria</p>
                <select value={categoriaForm.idGrupo} onChange={(e) => setCategoriaForm((a) => ({ ...a, idGrupo: e.target.value, idPai: '' }))} className={campoClass}>
                  <option value="">Selecione o grupo</option>
                  {gruposOrdenados.map((grupo) => <option key={grupo.id_grupo} value={grupo.id_grupo}>{grupo.nome_grupo}</option>)}
                </select>
                <select value={categoriaForm.idPai} onChange={(e) => setCategoriaForm((a) => ({ ...a, idPai: e.target.value }))} className={campoClass} disabled={!categoriaForm.idGrupo}>
                  <option value="">Sem pai (categoria principal)</option>
                  {opcoesPai.map((op) => <option key={op.id} value={op.id}>{op.nome}</option>)}
                </select>
                <input type="text" value={categoriaForm.nome} onChange={(e) => setCategoriaForm((a) => ({ ...a, nome: e.target.value }))} placeholder="Nome da categoria" className={campoClass} />
                <div className="grid grid-cols-2 gap-3">
                  <select value={categoriaForm.tipoLancamento} onChange={(e) => setCategoriaForm((a) => ({ ...a, tipoLancamento: e.target.value as TipoLancamento }))} className={campoClass}>
                    <option value="entrada">Entrada</option><option value="saida">Saida</option><option value="ambos">Ambos</option>
                  </select>
                  <input type="number" min={1} value={categoriaForm.ordem} onChange={(e) => setCategoriaForm((a) => ({ ...a, ordem: e.target.value }))} className={campoClass} />
                </div>
                <textarea value={categoriaForm.descricao} onChange={(e) => setCategoriaForm((a) => ({ ...a, descricao: e.target.value }))} rows={3} placeholder="Descricao" className={campoClass} />
                <button type="button" onClick={() => void salvarCategoria()} disabled={salvandoCategoria} className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{salvandoCategoria ? 'Salvando...' : <span className="inline-flex items-center gap-1"><Plus size={14} />Criar categoria</span>}</button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
