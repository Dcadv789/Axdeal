'use client';

import { useMemo, useState } from 'react';
import { BadgeCheck, Copy, Lightbulb, Sparkles } from 'lucide-react';
import playbookConfig from '@/components/crm/playbookConfig.json';

type PerfilOrigem = 'PF' | 'PJ';
type NivelPlaybook = 'nivel1' | 'nivel2' | 'nivel3' | 'nivel4';

interface TrilhaPlaybook {
  titulo: string;
  orientacao: string;
  scriptWhatsApp: string;
  scriptCall: string;
}

interface NivelPlaybookConfig {
  perfilBadge: string;
  faixaScore: string;
  foco: string;
  pf: TrilhaPlaybook;
  pj: TrilhaPlaybook;
}

interface PlaybookConfigData {
  niveis: Record<NivelPlaybook, NivelPlaybookConfig>;
}

interface SalesPlaybookProps {
  scoreQualificacao: number | null;
  origemLead: string | null;
  playbookConfiguracao?: Record<string, unknown> | null;
  playbookNome?: string | null;
  modoResumido?: boolean;
}

function detectarPerfilOrigem(origemLead: string | null): PerfilOrigem {
  const origem = (origemLead || '').trim().toLowerCase();
  if (!origem) return 'PF';
  if (origem === 'pj' || origem.includes('pessoa juridica') || origem.includes('juridica') || origem.includes('empresa') || origem.includes('cnpj')) {
    return 'PJ';
  }
  if (origem === 'pf' || origem.includes('pessoa fisica') || origem.includes('fisica') || origem.includes('cpf')) {
    return 'PF';
  }
  return 'PF';
}

function nivelPorScore(score: number): NivelPlaybook {
  if (score <= 350) return 'nivel1';
  if (score <= 650) return 'nivel2';
  if (score <= 850) return 'nivel3';
  return 'nivel4';
}

async function copiarTexto(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const el = document.createElement('textarea');
    el.value = texto;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.focus();
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function validarTrilha(value: unknown): value is TrilhaPlaybook {
  if (!isObject(value)) return false;
  return (
    typeof value.titulo === 'string' &&
    typeof value.orientacao === 'string' &&
    typeof value.scriptWhatsApp === 'string' &&
    typeof value.scriptCall === 'string'
  );
}

function validarNivel(value: unknown): value is NivelPlaybookConfig {
  if (!isObject(value)) return false;
  return (
    typeof value.perfilBadge === 'string' &&
    typeof value.faixaScore === 'string' &&
    typeof value.foco === 'string' &&
    validarTrilha(value.pf) &&
    validarTrilha(value.pj)
  );
}

function resolverConfiguracaoPlaybook(configuracao?: Record<string, unknown> | null): PlaybookConfigData {
  const fallback = playbookConfig as PlaybookConfigData;
  if (!configuracao || !isObject(configuracao) || !isObject(configuracao.niveis)) return fallback;

  const niveis = configuracao.niveis as Record<string, unknown>;
  if (!validarNivel(niveis.nivel1) || !validarNivel(niveis.nivel2) || !validarNivel(niveis.nivel3) || !validarNivel(niveis.nivel4)) {
    return fallback;
  }

  return {
    niveis: {
      nivel1: niveis.nivel1,
      nivel2: niveis.nivel2,
      nivel3: niveis.nivel3,
      nivel4: niveis.nivel4,
    },
  };
}

function obterProximoPasso(nivel: NivelPlaybook, perfilOrigem: PerfilOrigem) {
  const passos: Record<NivelPlaybook, { PF: string; PJ: string }> = {
    nivel1: {
      PF: 'Agendar uma conversa rápida para conter perdas e organizar o caixa imediato.',
      PJ: 'Mapear desperdícios críticos e definir um plano de contenção para os próximos 30 dias.',
    },
    nivel2: {
      PF: 'Estruturar uma rotina semanal simples para sair da correria e ganhar previsibilidade.',
      PJ: 'Definir indicadores essenciais e responsabilidades para reduzir retrabalho da operação.',
    },
    nivel3: {
      PF: 'Revisar alocação de recursos e priorizar ações que acelerem a multiplicação patrimonial.',
      PJ: 'Organizar estratégia de margem e reinvestimento para escalar com controle financeiro.',
    },
    nivel4: {
      PF: 'Montar arquitetura patrimonial com foco em proteção, eficiência e crescimento sustentável.',
      PJ: 'Conduzir plano executivo de escala com governança, eficiência de capital e visão de longo prazo.',
    },
  };
  return passos[nivel][perfilOrigem];
}

export default function SalesPlaybook({ scoreQualificacao, origemLead, playbookConfiguracao, playbookNome, modoResumido = false }: SalesPlaybookProps) {
  const [copiado, setCopiado] = useState<'whatsapp' | 'call' | null>(null);
  const score = Math.max(0, Math.min(1000, Number(scoreQualificacao || 0)));
  const perfilOrigem = detectarPerfilOrigem(origemLead);
  const configAtual = useMemo(() => resolverConfiguracaoPlaybook(playbookConfiguracao), [playbookConfiguracao]);
  const tituloPlaybook = playbookNome?.trim() || 'Playbook padrao';

  const conteudo = useMemo(() => {
    const nivel = nivelPorScore(score);
    const nivelCfg = configAtual.niveis[nivel];
    const trilha = perfilOrigem === 'PJ' ? nivelCfg.pj : nivelCfg.pf;
    return {
      nivel,
      perfilBadge: nivelCfg.perfilBadge,
      faixaScore: nivelCfg.faixaScore,
      foco: nivelCfg.foco,
      ...trilha,
    };
  }, [score, perfilOrigem, configAtual]);
  const proximoPasso = useMemo(() => obterProximoPasso(conteudo.nivel, perfilOrigem), [conteudo.nivel, perfilOrigem]);

  const handleCopiar = async (chave: 'whatsapp' | 'call', texto: string) => {
    const ok = await copiarTexto(texto);
    if (!ok) return;
    setCopiado(chave);
    window.setTimeout(() => setCopiado((atual) => (atual === chave ? null : atual)), 1200);
  };

  if (modoResumido) {
    return (
      <div className="rounded-2xl border border-blue-200 dark:border-blue-500/30 bg-gradient-to-br from-blue-50 to-amber-50/70 dark:from-blue-500/10 dark:to-amber-500/10 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300">
              <Lightbulb size={16} />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Playbook</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">{tituloPlaybook}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:border-blue-500/30 dark:bg-neutral-900/70 dark:text-blue-300">
            <BadgeCheck size={12} />
            {conteudo.perfilBadge}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white/85 dark:bg-neutral-900/70 p-3">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Próximo passo</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{proximoPasso}</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Para detalhes, veja mais.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-blue-200 dark:border-blue-500/30 bg-gradient-to-br from-blue-50 to-amber-50/70 dark:from-blue-500/10 dark:to-amber-500/10 p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300">
            <Lightbulb size={16} />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Dica do Especialista</p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">{tituloPlaybook}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:border-blue-500/30 dark:bg-neutral-900/70 dark:text-blue-300">
          <BadgeCheck size={12} />
          {conteudo.perfilBadge}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="rounded-xl bg-white/80 dark:bg-neutral-900/70 px-3 py-2 border border-slate-200 dark:border-neutral-700">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Score</p>
          <p className="font-semibold text-slate-800 dark:text-slate-100">{score}</p>
        </div>
        <div className="rounded-xl bg-white/80 dark:bg-neutral-900/70 px-3 py-2 border border-slate-200 dark:border-neutral-700">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Faixa</p>
          <p className="font-semibold text-slate-800 dark:text-slate-100">{conteudo.faixaScore}</p>
        </div>
        <div className="rounded-xl bg-white/80 dark:bg-neutral-900/70 px-3 py-2 border border-slate-200 dark:border-neutral-700">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Origem</p>
          <p className="font-semibold text-slate-800 dark:text-slate-100">{perfilOrigem}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white/85 dark:bg-neutral-900/70 p-3">
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 inline-flex items-center gap-1">
          <Sparkles size={12} />
          {conteudo.titulo}
        </p>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-semibold">Foco:</span> {conteudo.foco}
        </p>
        <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{conteudo.orientacao}</p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white/85 dark:bg-neutral-900/70 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Script para WhatsApp</p>
          <button
            onClick={() => void handleCopiar('whatsapp', conteudo.scriptWhatsApp)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-neutral-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800"
          >
            <Copy size={12} />
            {copiado === 'whatsapp' ? 'Copiado' : 'Copiar Script'}
          </button>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-200">{conteudo.scriptWhatsApp}</p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white/85 dark:bg-neutral-900/70 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Script para Call</p>
          <button
            onClick={() => void handleCopiar('call', conteudo.scriptCall)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-neutral-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800"
          >
            <Copy size={12} />
            {copiado === 'call' ? 'Copiado' : 'Copiar Script'}
          </button>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-200">{conteudo.scriptCall}</p>
      </div>
    </div>
  );
}
