'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save, Settings2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { CrmPipeline, CrmPipelineEtapa, CrmPlaybook } from '@/types/database';

type PipelineEtapaEditavel = CrmPipelineEtapa & {
  playbook_json?: Record<string, unknown> | null;
};

type EtapaDraft = {
  nome: string;
  script: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function obterScriptPlaybookEtapa(value: unknown): string {
  if (!isRecord(value)) return '';
  return String(
    value.script ??
      value.script_whatsapp ??
      value.roteiro ??
      value.script_vendas ??
      value.descricao ??
      value.etapa_descricao ??
      value.o_que_e_etapa ??
      ''
  ).trim();
}

interface CrmPlaybookEditorContentProps {
  playbookId: string;
}

export default function CrmPlaybookEditorContent({ playbookId }: CrmPlaybookEditorContentProps) {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [idEmpresa, setIdEmpresa] = useState<string | null>(null);
  const [playbook, setPlaybook] = useState<CrmPlaybook | null>(null);
  const [pipelines, setPipelines] = useState<CrmPipeline[]>([]);
  const [etapasMap, setEtapasMap] = useState<Record<string, PipelineEtapaEditavel[]>>({});

  const [playbookNome, setPlaybookNome] = useState('');
  const [playbookDescricao, setPlaybookDescricao] = useState('');
  const [playbookAtivo, setPlaybookAtivo] = useState(true);

  const [pipelineVinculados, setPipelineVinculados] = useState<string[]>([]);
  const [pipelineFiltroId, setPipelineFiltroId] = useState('');
  const [etapasDraft, setEtapasDraft] = useState<Record<string, EtapaDraft>>({});

  const inputClass =
    'w-full rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/35 focus:border-blue-500 transition-colors';
  const selectClass =
    'w-full rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/35 focus:border-blue-500 transition-colors';

  const carregarDados = useCallback(async () => {
    if (!user?.id || !playbookId) return;
    setLoading(true);
    setErro(null);
    setAviso(null);
    try {
      const { data: memberData, error: memberErr } = await supabase
        .from('sis_membros_equipe')
        .select('id_empresa')
        .eq('id_usuario', user.id)
        .maybeSingle();
      if (memberErr) throw memberErr;
      const empresaId = (memberData as { id_empresa?: string } | null)?.id_empresa ?? null;
      if (!empresaId) throw new Error('Empresa não encontrada.');
      setIdEmpresa(empresaId);

      const { data: playbookData, error: playbookErr } = await supabase
        .from('crm_playbooks')
        .select('*')
        .eq('id', playbookId)
        .eq('id_empresa', empresaId)
        .maybeSingle();
      if (playbookErr) throw playbookErr;
      if (!playbookData) throw new Error('Playbook não encontrado.');
      const playbookRow = playbookData as CrmPlaybook;
      setPlaybook(playbookRow);
      setPlaybookNome(playbookRow.nome || '');
      setPlaybookDescricao(playbookRow.descricao || '');
      setPlaybookAtivo(Boolean(playbookRow.ativo));

      const { data: pipelinesData, error: pipelinesErr } = await supabase
        .from('crm_pipelines')
        .select('*')
        .eq('id_empresa', empresaId)
        .order('nome', { ascending: true });
      if (pipelinesErr) throw pipelinesErr;
      const pipelinesRows = (pipelinesData || []) as CrmPipeline[];
      setPipelines(pipelinesRows);

      const vinculados = pipelinesRows
        .filter((pipeline) => pipeline.id_playbook === playbookId)
        .map((pipeline) => pipeline.id);
      setPipelineVinculados(vinculados);

      const pipelineIds = pipelinesRows.map((pipeline) => pipeline.id);
      if (pipelineIds.length === 0) {
        setEtapasMap({});
        setPipelineFiltroId('');
        setEtapasDraft({});
        setLoading(false);
        return;
      }

      const { data: etapasData, error: etapasErr } = await supabase
        .from('crm_pipeline_etapas')
        .select('id, id_pipeline, nome, ordem, cor, ativo, criado_em, playbook_json')
        .in('id_pipeline', pipelineIds)
        .order('ordem', { ascending: true });
      if (etapasErr) throw etapasErr;

      const mapa: Record<string, PipelineEtapaEditavel[]> = {};
      for (const pipeline of pipelinesRows) mapa[pipeline.id] = [];
      const drafts: Record<string, EtapaDraft> = {};
      for (const etapa of (etapasData || []) as PipelineEtapaEditavel[]) {
        if (!mapa[etapa.id_pipeline]) mapa[etapa.id_pipeline] = [];
        mapa[etapa.id_pipeline].push(etapa);
        drafts[etapa.id] = {
          nome: etapa.nome || '',
          script: obterScriptPlaybookEtapa(etapa.playbook_json),
        };
      }
      Object.keys(mapa).forEach((pipelineId) => {
        mapa[pipelineId] = mapa[pipelineId].sort((a, b) => a.ordem - b.ordem);
      });
      setEtapasMap(mapa);
      setEtapasDraft(drafts);

      const primeiroFunil = vinculados[0] || pipelineIds[0] || '';
      setPipelineFiltroId(primeiroFunil);
      setLoading(false);
    } catch (e) {
      console.error('Erro ao carregar editor de playbook:', e);
      setErro('Não foi possível carregar os dados do playbook.');
      setLoading(false);
    }
  }, [playbookId, user?.id]);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  const pipelinesVinculados = useMemo(
    () => pipelines.filter((pipeline) => pipelineVinculados.includes(pipeline.id)),
    [pipelines, pipelineVinculados]
  );

  const etapasDoFunil = useMemo(
    () => (pipelineFiltroId ? etapasMap[pipelineFiltroId] || [] : []),
    [pipelineFiltroId, etapasMap]
  );

  useEffect(() => {
    if (!pipelineFiltroId) return;
    if (!pipelines.some((pipeline) => pipeline.id === pipelineFiltroId)) {
      const fallback = pipelineVinculados[0] || pipelines[0]?.id || '';
      setPipelineFiltroId(fallback);
    }
  }, [pipelineFiltroId, pipelines, pipelineVinculados]);

  const togglePipelineVinculo = (pipelineId: string) => {
    setPipelineVinculados((prev) =>
      prev.includes(pipelineId) ? prev.filter((id) => id !== pipelineId) : [...prev, pipelineId]
    );
  };

  const atualizarEtapaDraft = (etapaId: string, patch: Partial<EtapaDraft>) => {
    setEtapasDraft((prev) => ({
      ...prev,
      [etapaId]: {
        nome: patch.nome ?? prev[etapaId]?.nome ?? '',
        script: patch.script ?? prev[etapaId]?.script ?? '',
      },
    }));
  };

  const salvar = async () => {
    if (!playbook || !idEmpresa) return;
    setSalvando(true);
    setErro(null);
    setAviso(null);
    try {
      const nome = playbookNome.trim();
      if (!nome) {
        setErro('Informe o nome do playbook.');
        setSalvando(false);
        return;
      }

      const { error: playbookErr } = await supabase
        .from('crm_playbooks')
        .update({
          nome,
          descricao: playbookDescricao.trim() || null,
          ativo: playbookAtivo,
        })
        .eq('id', playbook.id)
        .eq('id_empresa', idEmpresa);
      if (playbookErr) throw playbookErr;

      const { error: limparVinculosErr } = await supabase
        .from('crm_pipelines')
        .update({ id_playbook: null })
        .eq('id_empresa', idEmpresa)
        .eq('id_playbook', playbook.id);
      if (limparVinculosErr) throw limparVinculosErr;

      if (pipelineVinculados.length > 0) {
        const { error: vincularErr } = await supabase
          .from('crm_pipelines')
          .update({ id_playbook: playbook.id })
          .in('id', pipelineVinculados)
          .eq('id_empresa', idEmpresa);
        if (vincularErr) throw vincularErr;
      }

      const etapasParaAtualizar = Object.values(etapasMap)
        .flat()
        .filter((etapa) => pipelineVinculados.includes(etapa.id_pipeline));

      for (const etapa of etapasParaAtualizar) {
        const draft = etapasDraft[etapa.id];
        if (!draft) continue;
        const nomeEtapa = draft.nome.trim() || etapa.nome;
        const scriptEtapa = draft.script.trim();
        const atual = isRecord(etapa.playbook_json) ? etapa.playbook_json : {};
        const playbookJsonNovo: Record<string, unknown> = {
          ...atual,
          nome_etapa: nomeEtapa,
          script: scriptEtapa,
          id_playbook: playbook.id,
        };
        if (!scriptEtapa) delete playbookJsonNovo.script;
        delete playbookJsonNovo.descricao;
        delete playbookJsonNovo.etapa_descricao;
        delete playbookJsonNovo.o_que_e_etapa;

        const { error: etapaErr } = await supabase
          .from('crm_pipeline_etapas')
          .update({
            nome: nomeEtapa,
            playbook_json: playbookJsonNovo,
          })
          .eq('id', etapa.id);
        if (etapaErr) throw etapaErr;
      }

      await carregarDados();
      setAviso('Playbook salvo com sucesso.');
    } catch (e) {
      console.error('Erro ao salvar playbook:', e);
      setErro('Não foi possível salvar as alterações do playbook.');
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5 animate-pulse">
          <div className="h-4 w-56 rounded bg-slate-200 dark:bg-neutral-700" />
          <div className="mt-3 h-28 w-full rounded bg-slate-200 dark:bg-neutral-700" />
        </div>
      </div>
    );
  }

  if (!playbook) {
    return (
      <div className="py-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Playbook não encontrado.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => router.push('/crm/configuracoes')}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800"
        >
          <ArrowLeft size={14} />
          Voltar para Configurações
        </button>
        <button
          onClick={() => void salvar()}
          disabled={salvando}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
        >
          {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Salvar alterações
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm p-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
            <Settings2 size={16} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Editar playbook</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ajuste o funil e as etapas com campos lado a lado.
            </p>
          </div>
        </div>
      </div>

      {erro && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {erro}
        </div>
      )}
      {aviso && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {aviso}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-4 rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Dados do playbook</p>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Nome</label>
            <input
              type="text"
              value={playbookNome}
              onChange={(e) => setPlaybookNome(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Descrição</label>
            <textarea
              value={playbookDescricao}
              onChange={(e) => setPlaybookDescricao(e.target.value)}
              rows={4}
              className={`${inputClass} resize-y`}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Status</label>
            <select
              value={playbookAtivo ? 'ativo' : 'inativo'}
              onChange={(e) => setPlaybookAtivo(e.target.value === 'ativo')}
              className={selectClass}
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>

        <div className="xl:col-span-8 rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Funis vinculados</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {pipelines.map((pipeline) => {
              const ativo = pipelineVinculados.includes(pipeline.id);
              return (
                <label
                  key={pipeline.id}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer transition-colors ${
                    ativo
                      ? 'border-blue-300 bg-blue-100/70 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-200'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-neutral-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={ativo}
                    onChange={() => togglePipelineVinculo(pipeline.id)}
                    className="accent-blue-600"
                  />
                  <span className="truncate text-sm">{pipeline.nome}</span>
                </label>
              );
            })}
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50/70 dark:bg-neutral-800/60 px-3 py-2">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Este playbook está vinculado a {pipelinesVinculados.length}{' '}
              {pipelinesVinculados.length === 1 ? 'funil' : 'funis'}.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Filtrar funil</label>
            <select
              value={pipelineFiltroId}
              onChange={(e) => setPipelineFiltroId(e.target.value)}
              className={selectClass}
            >
              {pipelinesVinculados.length === 0 ? (
                <option value="">Nenhum funil vinculado</option>
              ) : (
                pipelinesVinculados.map((pipeline) => (
                  <option key={pipeline.id} value={pipeline.id}>
                    {pipeline.nome}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50/70 dark:bg-blue-500/10 px-3 py-2">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Edite lado a lado: nome da etapa e o script da etapa.
            </p>
          </div>
        </div>

        {pipelinesVinculados.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-neutral-700 p-6 text-center">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nenhum funil vinculado.</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Vincule um funil acima para configurar as etapas do playbook.
            </p>
          </div>
        ) : etapasDoFunil.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-neutral-700 p-6 text-center">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sem etapas neste funil.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {etapasDoFunil.map((etapa) => (
              <div
                key={etapa.id}
                className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50/70 dark:bg-neutral-800/60 p-3"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                  <div className="lg:col-span-4">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Nome da etapa {etapa.ordem}
                    </label>
                    <input
                      type="text"
                      value={etapasDraft[etapa.id]?.nome || ''}
                      onChange={(e) => atualizarEtapaDraft(etapa.id, { nome: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="lg:col-span-8">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Script da etapa
                    </label>
                    <textarea
                      value={etapasDraft[etapa.id]?.script || ''}
                      onChange={(e) => atualizarEtapaDraft(etapa.id, { script: e.target.value })}
                      rows={3}
                      className={`${inputClass} resize-y`}
                    />
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
