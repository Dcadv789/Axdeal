'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  CheckSquare,
  Loader2,
  MessageCircle,
  PencilLine,
  Plus,
  Settings2,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { Card } from '@axdeal/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import { supabase } from '@/lib/supabase';
import type {
  CrmCustomFieldDefinition,
  CrmCustomFieldType,
  CrmPipeline,
  CrmPipelineEtapa,
  CrmPlaybook,
} from '@/types/database';

type AbaConfiguracao = 'playbooks' | 'checklists' | 'whatsapp' | 'campos_personalizados';

type PipelineEtapaConfig = CrmPipelineEtapa & {
  checklist_json?: string[] | null;
  templates_whatsapp_json?: Record<string, unknown> | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function obterTemplateWhatsApp(valor: unknown): string {
  if (!isRecord(valor)) return '';
  const template = String(valor.template ?? valor.mensagem ?? valor.texto ?? '').trim();
  return template;
}

function gerarChaveCampo(nome: string): string {
  const base = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '_');
  return base || `campo_${Date.now()}`;
}

function normalizarOpcoesCampo(texto: string): string[] {
  const unicas = new Set<string>();
  texto
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => unicas.add(item));
  return Array.from(unicas);
}

function opcoesParaTexto(opcoes: unknown): string {
  if (!Array.isArray(opcoes)) return '';
  return opcoes
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join(', ');
}

const tipoCampoLabel: Record<CrmCustomFieldType, string> = {
  text: 'Texto',
  number: 'Número',
  date: 'Data',
  select: 'Seleção',
};

export default function CrmConfiguracoesEstrategicasContent() {
  const { user } = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<AbaConfiguracao>('playbooks');

  const [idEmpresa, setIdEmpresa] = useState<string | null>(null);
  const [pipelines, setPipelines] = useState<CrmPipeline[]>([]);
  const [etapasMap, setEtapasMap] = useState<Record<string, PipelineEtapaConfig[]>>({});
  const [playbooks, setPlaybooks] = useState<CrmPlaybook[]>([]);

  const [criandoPlaybook, setCriandoPlaybook] = useState(false);
  const [novoPlaybookNome, setNovoPlaybookNome] = useState('');
  const [novoPlaybookDescricao, setNovoPlaybookDescricao] = useState('');
  const [novoPlaybookPipelines, setNovoPlaybookPipelines] = useState<string[]>([]);

  const [pipelineChecklistId, setPipelineChecklistId] = useState('');
  const [etapaChecklistId, setEtapaChecklistId] = useState('');
  const [checklistItens, setChecklistItens] = useState<string[]>([]);

  const [pipelineTemplateId, setPipelineTemplateId] = useState('');
  const [etapaTemplateId, setEtapaTemplateId] = useState('');
  const [templateWhatsApp, setTemplateWhatsApp] = useState('');
  const [camposPersonalizados, setCamposPersonalizados] = useState<CrmCustomFieldDefinition[]>([]);
  const [novoCampoNome, setNovoCampoNome] = useState('');
  const [novoCampoTipo, setNovoCampoTipo] = useState<CrmCustomFieldType>('text');
  const [novoCampoOpcoes, setNovoCampoOpcoes] = useState('');
  const [campoEditandoId, setCampoEditandoId] = useState<string | null>(null);
  const [campoEditNome, setCampoEditNome] = useState('');
  const [campoEditTipo, setCampoEditTipo] = useState<CrmCustomFieldType>('text');
  const [campoEditOpcoes, setCampoEditOpcoes] = useState('');

  const inputClass =
    'w-full rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/35 focus:border-blue-500 transition-colors';
  const selectClass =
    'w-full rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/35 focus:border-blue-500 transition-colors';

  const carregarIdEmpresa = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('sis_membros_equipe')
      .select('id_empresa')
      .eq('id_usuario', user.id)
      .maybeSingle();
    if (error) throw error;
    const empresaId = (data as { id_empresa?: string } | null)?.id_empresa ?? null;
    setIdEmpresa(empresaId);
    if (!empresaId) {
      setErro('Empresa não encontrada para o usuário atual.');
      setLoading(false);
    }
  }, [user?.id]);

  const carregarDados = useCallback(async () => {
    if (!idEmpresa) return;
    setLoading(true);
    setErro(null);
    setAviso(null);

    const [pipelinesRes, playbooksRes, customFieldsRes] = await Promise.all([
      supabase
        .from('crm_pipelines')
        .select('*')
        .eq('id_empresa', idEmpresa)
        .order('nome', { ascending: true }),
      supabase
        .from('crm_playbooks')
        .select('*')
        .eq('id_empresa', idEmpresa)
        .order('criado_em', { ascending: true }),
      supabase
        .from('crm_custom_field_definitions')
        .select('*')
        .eq('id_empresa', idEmpresa)
        .eq('ativo', true)
        .order('ordem', { ascending: true })
        .order('criado_em', { ascending: true }),
    ]);

    if (pipelinesRes.error) throw pipelinesRes.error;
    if (playbooksRes.error) throw playbooksRes.error;
    if (customFieldsRes.error) throw customFieldsRes.error;

    const pipelinesData = (pipelinesRes.data || []) as CrmPipeline[];
    const playbooksData = (playbooksRes.data || []) as CrmPlaybook[];
    const customFieldsData = (customFieldsRes.data || []) as CrmCustomFieldDefinition[];
    setPipelines(pipelinesData);
    setPlaybooks(playbooksData);
    setCamposPersonalizados(customFieldsData);

    const pipelineIds = pipelinesData.map((p) => p.id);
    if (pipelineIds.length === 0) {
      setEtapasMap({});
      setPipelineChecklistId('');
      setPipelineTemplateId('');
      setEtapaChecklistId('');
      setEtapaTemplateId('');
      setLoading(false);
      return;
    }

    const { data: etapasData, error: etapasErr } = await supabase
      .from('crm_pipeline_etapas')
      .select('id, id_pipeline, nome, ordem, cor, ativo, criado_em, checklist_json, templates_whatsapp_json')
      .in('id_pipeline', pipelineIds)
      .order('ordem', { ascending: true });
    if (etapasErr) throw etapasErr;

    const mapa: Record<string, PipelineEtapaConfig[]> = {};
    for (const pipeline of pipelinesData) mapa[pipeline.id] = [];
    for (const item of (etapasData || []) as PipelineEtapaConfig[]) {
      if (!mapa[item.id_pipeline]) mapa[item.id_pipeline] = [];
      mapa[item.id_pipeline].push(item);
    }
    Object.keys(mapa).forEach((pipelineId) => {
      mapa[pipelineId] = mapa[pipelineId].sort((a, b) => a.ordem - b.ordem);
    });
    setEtapasMap(mapa);

    setPipelineChecklistId((prev) => (prev && pipelineIds.includes(prev) ? prev : pipelineIds[0]));
    setPipelineTemplateId((prev) => (prev && pipelineIds.includes(prev) ? prev : pipelineIds[0]));
    setLoading(false);
  }, [idEmpresa]);

  useEffect(() => {
    void (async () => {
      try {
        await carregarIdEmpresa();
      } catch (e) {
        console.error('Erro ao carregar empresa:', e);
        setErro('Não foi possível carregar os dados da empresa.');
        setLoading(false);
      }
    })();
  }, [carregarIdEmpresa]);

  useEffect(() => {
    if (!idEmpresa) return;
    void (async () => {
      try {
        await carregarDados();
      } catch (e) {
        console.error('Erro ao carregar configurações estratégicas:', e);
        setErro('Não foi possível carregar as configurações estratégicas.');
        setLoading(false);
      }
    })();
  }, [idEmpresa, carregarDados]);

  const etapasChecklist = useMemo(
    () => (pipelineChecklistId ? etapasMap[pipelineChecklistId] || [] : []),
    [pipelineChecklistId, etapasMap]
  );
  const etapasTemplate = useMemo(
    () => (pipelineTemplateId ? etapasMap[pipelineTemplateId] || [] : []),
    [pipelineTemplateId, etapasMap]
  );

  useEffect(() => {
    if (!etapasChecklist.length) {
      setEtapaChecklistId('');
      setChecklistItens([]);
      return;
    }
    setEtapaChecklistId((prev) => {
      const valido = prev && etapasChecklist.some((etapa) => etapa.id === prev);
      return valido ? prev : etapasChecklist[0].id;
    });
  }, [etapasChecklist]);

  useEffect(() => {
    if (!etapasTemplate.length) {
      setEtapaTemplateId('');
      setTemplateWhatsApp('');
      return;
    }
    setEtapaTemplateId((prev) => {
      const valido = prev && etapasTemplate.some((etapa) => etapa.id === prev);
      return valido ? prev : etapasTemplate[0].id;
    });
  }, [etapasTemplate]);

  useEffect(() => {
    if (!etapaChecklistId || !pipelineChecklistId) {
      setChecklistItens([]);
      return;
    }
    const etapa = (etapasMap[pipelineChecklistId] || []).find((item) => item.id === etapaChecklistId);
    const itens = Array.isArray(etapa?.checklist_json)
      ? etapa.checklist_json.map((item) => String(item || '').trim()).filter(Boolean)
      : [];
    setChecklistItens(itens.length ? itens : ['']);
  }, [etapaChecklistId, pipelineChecklistId, etapasMap]);

  useEffect(() => {
    if (!etapaTemplateId || !pipelineTemplateId) {
      setTemplateWhatsApp('');
      return;
    }
    const etapa = (etapasMap[pipelineTemplateId] || []).find((item) => item.id === etapaTemplateId);
    setTemplateWhatsApp(obterTemplateWhatsApp(etapa?.templates_whatsapp_json || null));
  }, [etapaTemplateId, pipelineTemplateId, etapasMap]);

  const pipelinesPorPlaybook = useMemo(() => {
    const mapa: Record<string, CrmPipeline[]> = {};
    for (const playbook of playbooks) mapa[playbook.id] = [];
    for (const pipeline of pipelines) {
      if (!pipeline.id_playbook) continue;
      if (!mapa[pipeline.id_playbook]) mapa[pipeline.id_playbook] = [];
      mapa[pipeline.id_playbook].push(pipeline);
    }
    return mapa;
  }, [playbooks, pipelines]);

  const togglePipelineNovoPlaybook = (pipelineId: string) => {
    setNovoPlaybookPipelines((prev) =>
      prev.includes(pipelineId) ? prev.filter((id) => id !== pipelineId) : [...prev, pipelineId]
    );
  };

  const salvarNovoPlaybook = async () => {
    if (!idEmpresa) return;
    setSalvando(true);
    setErro(null);
    setAviso(null);
    try {
      const nomePadrao = `Playbook ${playbooks.length + 1}`;
      const nome = novoPlaybookNome.trim() || nomePadrao;
      const descricao = novoPlaybookDescricao.trim() || null;

      const { data: playbookCriado, error: playbookErr } = await supabase
        .from('crm_playbooks')
        .insert({
          id_empresa: idEmpresa,
          nome,
          descricao,
          configuracao: { versao: 2, etapas: {} },
          ativo: true,
        })
        .select('*')
        .single();
      if (playbookErr) throw playbookErr;

      if (novoPlaybookPipelines.length > 0) {
        const { error: vinculoErr } = await supabase
          .from('crm_pipelines')
          .update({ id_playbook: (playbookCriado as { id: string }).id })
          .in('id', novoPlaybookPipelines)
          .eq('id_empresa', idEmpresa);
        if (vinculoErr) throw vinculoErr;
      }

      setCriandoPlaybook(false);
      setNovoPlaybookNome('');
      setNovoPlaybookDescricao('');
      setNovoPlaybookPipelines([]);
      await carregarDados();
      setAviso('Playbook criado com sucesso.');
    } catch (e) {
      console.error('Erro ao criar playbook:', e);
      setErro('Não foi possível criar o playbook.');
    } finally {
      setSalvando(false);
    }
  };

  const salvarChecklist = async () => {
    if (!pipelineChecklistId || !etapaChecklistId) return;
    setSalvando(true);
    setErro(null);
    setAviso(null);
    try {
      const itens = checklistItens.map((item) => item.trim()).filter(Boolean);
      const { error: updateErr } = await supabase
        .from('crm_pipeline_etapas')
        .update({ checklist_json: itens })
        .eq('id', etapaChecklistId);
      if (updateErr) throw updateErr;

      setEtapasMap((prev) => ({
        ...prev,
        [pipelineChecklistId]: (prev[pipelineChecklistId] || []).map((etapa) =>
          etapa.id === etapaChecklistId ? { ...etapa, checklist_json: itens } : etapa
        ),
      }));
      setAviso('Checklist salvo com sucesso.');
    } catch (e) {
      console.error('Erro ao salvar checklist:', e);
      setErro('Não foi possível salvar o checklist.');
    } finally {
      setSalvando(false);
    }
  };

  const salvarTemplateWhatsApp = async () => {
    if (!pipelineTemplateId || !etapaTemplateId) return;
    setSalvando(true);
    setErro(null);
    setAviso(null);
    try {
      const etapaAtual = (etapasMap[pipelineTemplateId] || []).find((etapa) => etapa.id === etapaTemplateId);
      const atual = isRecord(etapaAtual?.templates_whatsapp_json) ? etapaAtual.templates_whatsapp_json : {};
      const payload = {
        ...atual,
        template: templateWhatsApp.trim(),
      };

      const { error: updateErr } = await supabase
        .from('crm_pipeline_etapas')
        .update({ templates_whatsapp_json: payload })
        .eq('id', etapaTemplateId);
      if (updateErr) throw updateErr;

      setEtapasMap((prev) => ({
        ...prev,
        [pipelineTemplateId]: (prev[pipelineTemplateId] || []).map((etapa) =>
          etapa.id === etapaTemplateId ? { ...etapa, templates_whatsapp_json: payload } : etapa
        ),
      }));
      setAviso('Template de WhatsApp salvo com sucesso.');
    } catch (e) {
      console.error('Erro ao salvar template de WhatsApp:', e);
      setErro('Não foi possível salvar o template de WhatsApp.');
    } finally {
      setSalvando(false);
    }
  };

  const iniciarEdicaoCampo = (campo: CrmCustomFieldDefinition) => {
    setCampoEditandoId(campo.id);
    setCampoEditNome(campo.nome || '');
    setCampoEditTipo((campo.tipo as CrmCustomFieldType) || 'text');
    setCampoEditOpcoes(opcoesParaTexto(campo.opcoes));
  };

  const cancelarEdicaoCampo = () => {
    setCampoEditandoId(null);
    setCampoEditNome('');
    setCampoEditTipo('text');
    setCampoEditOpcoes('');
  };

  const criarCampoPersonalizado = async () => {
    if (!idEmpresa) return;
    const nome = novoCampoNome.trim();
    if (!nome) {
      setErro('Informe o nome do campo personalizado.');
      return;
    }

    setSalvando(true);
    setErro(null);
    setAviso(null);

    try {
      const ordemBase = camposPersonalizados.reduce((maior, item) => Math.max(maior, item.ordem || 0), 0);
      const opcoes = novoCampoTipo === 'select' ? normalizarOpcoesCampo(novoCampoOpcoes) : [];
      if (novoCampoTipo === 'select' && opcoes.length === 0) {
        setErro('Informe pelo menos uma opção para o campo de seleção.');
        setSalvando(false);
        return;
      }
      const chaveBase = gerarChaveCampo(nome);

      let chave = chaveBase;
      let sufixo = 2;
      while (camposPersonalizados.some((campo) => campo.chave === chave)) {
        chave = `${chaveBase}_${sufixo}`;
        sufixo += 1;
      }

      const { data, error } = await supabase
        .from('crm_custom_field_definitions')
        .insert({
          id_empresa: idEmpresa,
          chave,
          nome,
          tipo: novoCampoTipo,
          opcoes,
          ordem: ordemBase + 1,
          ativo: true,
        })
        .select('*')
        .single();
      if (error) throw error;

      const novoCampo = data as CrmCustomFieldDefinition;
      setCamposPersonalizados((prev) =>
        [...prev, novoCampo].sort(
          (a, b) => (a.ordem || 0) - (b.ordem || 0) || (a.criado_em || '').localeCompare(b.criado_em || '')
        )
      );
      setNovoCampoNome('');
      setNovoCampoTipo('text');
      setNovoCampoOpcoes('');
      setAviso('Campo personalizado criado com sucesso.');
    } catch (e) {
      console.error('Erro ao criar campo personalizado:', e);
      setErro('Não foi possível criar o campo personalizado.');
    } finally {
      setSalvando(false);
    }
  };

  const salvarEdicaoCampo = async () => {
    if (!campoEditandoId) return;
    const nome = campoEditNome.trim();
    if (!nome) {
      setErro('Informe o nome do campo personalizado.');
      return;
    }

    setSalvando(true);
    setErro(null);
    setAviso(null);

    try {
      const opcoes = campoEditTipo === 'select' ? normalizarOpcoesCampo(campoEditOpcoes) : [];
      if (campoEditTipo === 'select' && opcoes.length === 0) {
        setErro('Informe pelo menos uma opção para o campo de seleção.');
        setSalvando(false);
        return;
      }
      const { data, error } = await supabase
        .from('crm_custom_field_definitions')
        .update({
          nome,
          tipo: campoEditTipo,
          opcoes,
        })
        .eq('id', campoEditandoId)
        .select('*')
        .single();
      if (error) throw error;

      const campoAtualizado = data as CrmCustomFieldDefinition;
      setCamposPersonalizados((prev) =>
        prev.map((campo) => (campo.id === campoEditandoId ? campoAtualizado : campo))
      );
      cancelarEdicaoCampo();
      setAviso('Campo personalizado atualizado com sucesso.');
    } catch (e) {
      console.error('Erro ao salvar campo personalizado:', e);
      setErro('Não foi possível salvar o campo personalizado.');
    } finally {
      setSalvando(false);
    }
  };

  const excluirCampoPersonalizado = async (campoId: string) => {
    setSalvando(true);
    setErro(null);
    setAviso(null);
    try {
      const { error } = await supabase
        .from('crm_custom_field_definitions')
        .delete()
        .eq('id', campoId);
      if (error) throw error;

      setCamposPersonalizados((prev) => prev.filter((campo) => campo.id !== campoId));
      if (campoEditandoId === campoId) cancelarEdicaoCampo();
      setAviso('Campo personalizado removido com sucesso.');
    } catch (e) {
      console.error('Erro ao excluir campo personalizado:', e);
      setErro('Não foi possível excluir o campo personalizado.');
    } finally {
      setSalvando(false);
    }
  };

  const renderAbaPlaybooks = () => (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Playbooks</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Escolha um playbook para ver e editar etapas por funil.
            </p>
          </div>
          <button
            onClick={() => setCriandoPlaybook((prev) => !prev)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
          >
            <Plus size={14} />
            {criandoPlaybook ? 'Fechar criação' : 'Criar playbook'}
          </button>
        </div>

        {criandoPlaybook && (
          <div className="mt-4 rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/10 p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Nome</label>
                <input
                  type="text"
                  value={novoPlaybookNome}
                  onChange={(e) => setNovoPlaybookNome(e.target.value)}
                  placeholder="Playbook Comercial"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Descrição</label>
                <input
                  type="text"
                  value={novoPlaybookDescricao}
                  onChange={(e) => setNovoPlaybookDescricao(e.target.value)}
                  placeholder="Opcional"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Vincular a funis (opcional)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {pipelines.map((pipeline) => {
                  const ativo = novoPlaybookPipelines.includes(pipeline.id);
                  return (
                    <label
                      key={pipeline.id}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer transition-colors ${
                        ativo
                          ? 'border-blue-300 bg-blue-100/70 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-200'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={ativo}
                        onChange={() => togglePipelineNovoPlaybook(pipeline.id)}
                        className="accent-blue-600"
                      />
                      <span className="truncate">{pipeline.nome}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setCriandoPlaybook(false)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => void salvarNovoPlaybook()}
                disabled={salvando}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-60"
              >
                {salvando && <Loader2 size={14} className="animate-spin" />}
                Criar playbook
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {playbooks.length === 0 ? (
          <div className="lg:col-span-2 rounded-2xl border border-dashed border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-8 text-center">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nenhum playbook cadastrado.</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Clique em "Criar playbook" para começar.
            </p>
          </div>
        ) : (
          playbooks.map((playbook, index) => {
            const funis = pipelinesPorPlaybook[playbook.id] || [];
            return (
              <div
                key={playbook.id}
                className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Playbook {index + 1}
                    </p>
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {playbook.nome}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                      {playbook.descricao || 'Sem descrição.'}
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300">
                    {playbook.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Funis vinculados</p>
                  <div className="flex flex-wrap gap-1.5">
                    {funis.length === 0 ? (
                      <span className="text-xs text-slate-500 dark:text-slate-400">Nenhum funil vinculado.</span>
                    ) : (
                      funis.map((funil) => (
                        <span
                          key={funil.id}
                          className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-slate-200"
                        >
                          {funil.nome}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end">
                  <button
                    onClick={() => router.push(`/crm/configuracoes/playbooks/${playbook.id}`)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                  >
                    <PencilLine size={14} />
                    Ver e editar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const renderAbaChecklist = () => (
    <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm p-4 md:p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Funil</label>
          <select
            value={pipelineChecklistId}
            onChange={(e) => setPipelineChecklistId(e.target.value)}
            className={selectClass}
          >
            {pipelines.map((pipeline) => (
              <option key={pipeline.id} value={pipeline.id}>
                {pipeline.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Etapa</label>
          <select
            value={etapaChecklistId}
            onChange={(e) => setEtapaChecklistId(e.target.value)}
            className={selectClass}
          >
            {etapasChecklist.map((etapa) => (
              <option key={etapa.id} value={etapa.id}>
                {etapa.ordem}. {etapa.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Itens de verificação</p>
          <button
            onClick={() => setChecklistItens((prev) => [...prev, ''])}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300"
          >
            <Plus size={12} />
            Adicionar item
          </button>
        </div>
        <div className="space-y-2">
          {checklistItens.map((item, idx) => (
            <div key={`check-${idx}`} className="flex items-center gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) =>
                  setChecklistItens((prev) => prev.map((value, i) => (i === idx ? e.target.value : value)))
                }
                placeholder={`Item ${idx + 1}`}
                className={inputClass}
              />
              <button
                onClick={() => setChecklistItens((prev) => prev.filter((_, i) => i !== idx))}
                className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 text-sm text-slate-600 dark:text-slate-300"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          onClick={() => void salvarChecklist()}
          disabled={salvando || !etapaChecklistId}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-60"
        >
          {salvando && <Loader2 size={14} className="animate-spin" />}
          Salvar checklist
        </button>
      </div>
    </div>
  );

  const renderAbaWhatsApp = () => (
    <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm p-4 md:p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Funil</label>
          <select
            value={pipelineTemplateId}
            onChange={(e) => setPipelineTemplateId(e.target.value)}
            className={selectClass}
          >
            {pipelines.map((pipeline) => (
              <option key={pipeline.id} value={pipeline.id}>
                {pipeline.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Etapa</label>
          <select
            value={etapaTemplateId}
            onChange={(e) => setEtapaTemplateId(e.target.value)}
            className={selectClass}
          >
            {etapasTemplate.map((etapa) => (
              <option key={etapa.id} value={etapa.id}>
                {etapa.ordem}. {etapa.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
          Template de resposta rápida
        </label>
        <textarea
          value={templateWhatsApp}
          onChange={(e) => setTemplateWhatsApp(e.target.value)}
          rows={10}
          placeholder="Olá {{nome_lead}}, tudo bem? ..."
          className={`${inputClass} resize-y`}
        />
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          Variáveis suportadas: {'{{nome_lead}}'}, {'{{email}}'}, {'{{whatsapp}}'}, {'{{origem}}'}, {'{{funil}}'} e {'{{etapa}}'}.
        </p>
      </div>

      <div className="flex items-center justify-end">
        <button
          onClick={() => void salvarTemplateWhatsApp()}
          disabled={salvando || !etapaTemplateId}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-60"
        >
          {salvando && <Loader2 size={14} className="animate-spin" />}
          Salvar template
        </button>
      </div>
    </div>
  );

  const renderAbaCamposPersonalizados = () => (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm p-4 md:p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Novo campo</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Crie campos adicionais para adaptar o CRM ao seu nicho.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Nome do campo</label>
            <input
              type="text"
              value={novoCampoNome}
              onChange={(e) => setNovoCampoNome(e.target.value)}
              placeholder="Ex.: Faixa de faturamento"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Tipo</label>
            <select
              value={novoCampoTipo}
              onChange={(e) => setNovoCampoTipo(e.target.value as CrmCustomFieldType)}
              className={selectClass}
            >
              <option value="text">Texto</option>
              <option value="number">Número</option>
              <option value="date">Data</option>
              <option value="select">Seleção</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => void criarCampoPersonalizado()}
              disabled={salvando}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-60"
            >
              {salvando && <Loader2 size={14} className="animate-spin" />}
              Criar campo
            </button>
          </div>
        </div>

        {novoCampoTipo === 'select' && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Opções (separadas por vírgula)
            </label>
            <input
              type="text"
              value={novoCampoOpcoes}
              onChange={(e) => setNovoCampoOpcoes(e.target.value)}
              placeholder="Ex.: Pequeno, Médio, Grande"
              className={inputClass}
            />
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm p-4 md:p-5">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Campos cadastrados</p>

        {camposPersonalizados.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-neutral-700 bg-slate-50/70 dark:bg-neutral-800/40 px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Nenhum campo personalizado cadastrado.
          </div>
        ) : (
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {camposPersonalizados.map((campo) => {
              const editando = campoEditandoId === campo.id;
              return (
                <div
                  key={campo.id}
                  className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50/70 dark:bg-neutral-800/40 p-3"
                >
                  {editando ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="lg:col-span-2">
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            Nome do campo
                          </label>
                          <input
                            type="text"
                            value={campoEditNome}
                            onChange={(e) => setCampoEditNome(e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Tipo</label>
                          <select
                            value={campoEditTipo}
                            onChange={(e) => setCampoEditTipo(e.target.value as CrmCustomFieldType)}
                            className={selectClass}
                          >
                            <option value="text">Texto</option>
                            <option value="number">Número</option>
                            <option value="date">Data</option>
                            <option value="select">Seleção</option>
                          </select>
                        </div>
                        <div className="flex items-end justify-end gap-2">
                          <button
                            onClick={() => void salvarEdicaoCampo()}
                            disabled={salvando}
                            className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-60"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={cancelarEdicaoCampo}
                            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 text-sm font-medium text-slate-700 dark:text-slate-200"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                      {campoEditTipo === 'select' && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            Opções (separadas por vírgula)
                          </label>
                          <input
                            type="text"
                            value={campoEditOpcoes}
                            onChange={(e) => setCampoEditOpcoes(e.target.value)}
                            className={inputClass}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{campo.nome}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 font-medium text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300">
                            {tipoCampoLabel[(campo.tipo as CrmCustomFieldType) || 'text']}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">Chave: {campo.chave}</span>
                          {Array.isArray(campo.opcoes) && campo.opcoes.length > 0 && (
                            <span className="text-slate-500 dark:text-slate-400 truncate">
                              Opções: {campo.opcoes.map((item) => String(item)).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => iniciarEdicaoCampo(campo)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800"
                        >
                          <PencilLine size={14} />
                          Editar
                        </button>
                        <button
                          onClick={() => void excluirCampoPersonalizado(campo.id)}
                          disabled={salvando}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-rose-200 text-rose-600 text-sm font-medium hover:bg-rose-50 dark:border-rose-500/35 dark:text-rose-300 dark:hover:bg-rose-500/10 disabled:opacity-60"
                        >
                          <Trash2 size={14} />
                          Excluir
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Settings2 size={28} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configurações Estratégicas</h1>
        </div>
        <Card>
          <div className="p-1 animate-pulse">
            <div className="h-4 w-48 rounded bg-slate-200 dark:bg-neutral-700" />
            <div className="mt-3 h-24 w-full rounded bg-slate-200 dark:bg-neutral-700" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Settings2 size={28} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configurações Estratégicas</h1>
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

      {!isMobile && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-6 -mb-px overflow-x-auto">
            <button
              onClick={() => setAbaAtiva('playbooks')}
              className={`relative pb-3 text-sm font-medium transition-colors whitespace-nowrap ${
                abaAtiva === 'playbooks'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <BookOpen size={14} />
                Playbook
              </span>
              {abaAtiva === 'playbooks' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
            <button
              onClick={() => setAbaAtiva('checklists')}
              className={`relative pb-3 text-sm font-medium transition-colors whitespace-nowrap ${
                abaAtiva === 'checklists'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <CheckSquare size={14} />
                Checklists
              </span>
              {abaAtiva === 'checklists' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
            <button
              onClick={() => setAbaAtiva('whatsapp')}
              className={`relative pb-3 text-sm font-medium transition-colors whitespace-nowrap ${
                abaAtiva === 'whatsapp'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <MessageCircle size={14} />
                WhatsApp
              </span>
              {abaAtiva === 'whatsapp' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
            <button
              onClick={() => setAbaAtiva('campos_personalizados')}
              className={`relative pb-3 text-sm font-medium transition-colors whitespace-nowrap ${
                abaAtiva === 'campos_personalizados'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <SlidersHorizontal size={14} />
                Campos Personalizados
              </span>
              {abaAtiva === 'campos_personalizados' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
          </nav>
        </div>
      )}

      {isMobile && (
        <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm p-2">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <button
              onClick={() => setAbaAtiva('playbooks')}
              className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                abaAtiva === 'playbooks'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800'
              }`}
            >
              <BookOpen size={14} />
              Playbook
            </button>
            <button
              onClick={() => setAbaAtiva('checklists')}
              className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                abaAtiva === 'checklists'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800'
              }`}
            >
              <CheckSquare size={14} />
              Checklists
            </button>
            <button
              onClick={() => setAbaAtiva('whatsapp')}
              className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                abaAtiva === 'whatsapp'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800'
              }`}
            >
              <MessageCircle size={14} />
              WhatsApp
            </button>
            <button
              onClick={() => setAbaAtiva('campos_personalizados')}
              className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                abaAtiva === 'campos_personalizados'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800'
              }`}
            >
              <SlidersHorizontal size={14} />
              Campos
            </button>
          </div>
        </div>
      )}

      <Card>
        {abaAtiva === 'playbooks' && renderAbaPlaybooks()}
        {abaAtiva === 'checklists' && renderAbaChecklist()}
        {abaAtiva === 'whatsapp' && renderAbaWhatsApp()}
        {abaAtiva === 'campos_personalizados' && renderAbaCamposPersonalizados()}
      </Card>
    </div>
  );
}
