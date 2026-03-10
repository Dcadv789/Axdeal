'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, ArrowLeft } from 'lucide-react';
import { QuizTextWithBold } from './QuizTextWithBold';
import { getQuizLogoClasse } from './quizLogoUtils';
import {
  interpolarVariaveis,
  ordenarOpcoesPorRotulo,
  isValidEmail,
  isValidWhatsApp,
  formatarWhatsApp,
} from './quizVariables';
import type { Quiz, Questao, Opcao, RespostaLog, QuizResultado } from '@/types/database';
import QuizScoreGauge, { getScoreNivel } from './QuizScoreGauge';

interface QuizPreviewProps {
  quiz: Quiz;
  questoes: Questao[];
  opcoesPorQuestao: (id: string) => Opcao[];
  resultados?: QuizResultado[];
}

export default function QuizPreview({ quiz, questoes, opcoesPorQuestao, resultados = [] }: QuizPreviewProps) {
  const [questaoAtual, setQuestaoAtual] = useState<Questao | null>(null);
  const [scoreTotal, setScoreTotal] = useState(0);
  const [respostasLog, setRespostasLog] = useState<RespostaLog[]>([]);
  const [selecionadosMultipla, setSelecionadosMultipla] = useState<Set<string>>(new Set());
  const [direction, setDirection] = useState(0);
  const [formContato, setFormContato] = useState({ nome: '', email: '', whatsapp: '', empresa: '' });
  const [enviado, setEnviado] = useState(false);
  const [historico, setHistorico] = useState<Questao[]>([]);
  const [resultadoLoading, setResultadoLoading] = useState(false);

  const corPrimaria = quiz.cor_primaria || '#0047FF';
  const temaModo = (quiz as { tema_modo?: 'light' | 'dark' }).tema_modo || 'light';
  const themeClass = temaModo === 'dark' ? 'dark' : '';
  const questaoInicial = questoes.find((q) => q.is_inicial) ?? questoes[0];

  useEffect(() => {
    setQuestaoAtual(questaoInicial ?? null);
    setScoreTotal(0);
    setRespostasLog([]);
    setSelecionadosMultipla(new Set());
    setFormContato({ nome: '', email: '', whatsapp: '', empresa: '' });
    setEnviado(false);
    setHistorico([]);
  }, [questaoInicial?.id, questoes.length]);

  useEffect(() => {
    if (questaoAtual?.tipo_questao === 'resultado') {
      setResultadoLoading(true);
      const t = setTimeout(() => setResultadoLoading(false), 1500);
      return () => clearTimeout(t);
    } else {
      setResultadoLoading(false);
    }
  }, [questaoAtual?.id, questaoAtual?.tipo_questao]);

  const obterProximaQuestao = useCallback(
    (opcao: Opcao, atual: Questao): Questao | null => {
      if (!questoes.length) return null;
      if (opcao.id_proxima_questao) {
        const proxima = questoes.find((q) => q.id === opcao.id_proxima_questao);
        return proxima ?? null;
      }
      const idxAtual = questoes.findIndex((q) => q.id === atual.id);
      if (idxAtual < 0 || idxAtual >= questoes.length - 1) return null;
      return questoes[idxAtual + 1];
    },
    [questoes]
  );

  const obterProximaPorOrdem = useCallback(
    (atual: Questao): Questao | null => {
      const idx = questoes.findIndex((q) => q.id === atual.id);
      if (idx < 0 || idx >= questoes.length - 1) return null;
      return questoes[idx + 1];
    },
    [questoes]
  );

  const handleSelecionarOpcao = useCallback(
    (opcao: Opcao) => {
      if (!questaoAtual) return;
      setScoreTotal((s) => s + (opcao.valor_score ?? 0));
      setRespostasLog((prev) => [
        ...prev,
        { id_questao: questaoAtual.id, id_opcao: opcao.id, valor_score: opcao.valor_score ?? 0 },
      ]);
      const proxima = obterProximaQuestao(opcao, questaoAtual);
      setHistorico((h) => [...h, questaoAtual]);
      setDirection(1);
      setQuestaoAtual(proxima);
    },
    [questaoAtual, obterProximaQuestao]
  );

  const handleToggleOpcaoMultipla = useCallback((idOpcao: string) => {
    setSelecionadosMultipla((prev) => {
      const next = new Set(prev);
      if (next.has(idOpcao)) next.delete(idOpcao);
      else next.add(idOpcao);
      return next;
    });
  }, []);

  const handleContinuarMultiplaSelecao = useCallback(
    (q: Questao) => {
      const opcoes = opcoesPorQuestao(q.id) ?? [];
      const ids = Array.from(selecionadosMultipla);
      const toAdd = ids
        .map((idOpcao) => {
          const op = opcoes.find((o) => o.id === idOpcao);
          return op ? { id_questao: q.id, id_opcao: op.id, valor_score: op.valor_score ?? 0 } : null;
        })
        .filter((r): r is RespostaLog => r !== null);
      setRespostasLog((prev) => [...prev, ...toAdd]);
      setScoreTotal((s) => s + toAdd.reduce((acc, r) => acc + r.valor_score, 0));
      setSelecionadosMultipla(new Set());
      const proxima = q.id_proxima_questao_selecao
        ? questoes.find((x) => x.id === q.id_proxima_questao_selecao)
        : obterProximaPorOrdem(q);
      setHistorico((h) => [...h, q]);
      setDirection(1);
      setQuestaoAtual(proxima ?? null);
    },
    [selecionadosMultipla, opcoesPorQuestao, questoes, obterProximaPorOrdem]
  );

  const handleVoltar = useCallback(() => {
    const anterior = historico[historico.length - 1];
    if (!anterior) return;
    const veioDeInformativo = anterior.tipo_questao === 'informativo';
    const veioDeMultiplaSelecao = anterior.tipo_questao === 'multipla_selecao';
    setHistorico((h) => h.slice(0, -1));
    if (!veioDeInformativo) {
      if (veioDeMultiplaSelecao) {
        const entradasQuestao = respostasLog.filter((r) => r.id_questao === anterior.id);
        const scoreARemover = entradasQuestao.reduce((s, r) => s + (r.valor_score ?? 0), 0);
        setRespostasLog((prev) => prev.filter((r) => r.id_questao !== anterior.id));
        setScoreTotal((s) => s - scoreARemover);
        setSelecionadosMultipla(new Set(entradasQuestao.map((r) => r.id_opcao)));
      } else {
        const ultimaResposta = respostasLog[respostasLog.length - 1];
        const scoreARemover = ultimaResposta?.valor_score ?? 0;
        setRespostasLog((prev) => prev.slice(0, -1));
        setScoreTotal((s) => s - scoreARemover);
      }
    }
    setDirection(-1);
    setQuestaoAtual(anterior);
  }, [historico, respostasLog]);

  const handleContinuarInformativo = useCallback(() => {
    if (!questaoAtual) return;
    const proxima = obterProximaPorOrdem(questaoAtual);
    setHistorico((h) => [...h, questaoAtual]);
    setDirection(1);
    setQuestaoAtual(proxima ?? null);
  }, [questaoAtual, obterProximaPorOrdem]);

  const handleEnviarContato = useCallback(() => {
    setEnviado(true);
  }, []);

  const handleContatoContinuar = useCallback(
    (proxima: Questao | null) => {
      if (proxima) {
        setHistorico((h) => [...h, questaoAtual!]);
        setDirection(1);
        setQuestaoAtual(proxima);
      } else {
        setEnviado(true);
      }
    },
    [questaoAtual]
  );

  const vars = {
    nome: formContato.nome,
    email: formContato.email,
    whatsapp: formContato.whatsapp,
    empresa: formContato.empresa,
  };
  const interpolar = (t: string) => interpolarVariaveis(t, vars);

  const handleReiniciar = useCallback(() => {
    setQuestaoAtual(questaoInicial ?? null);
    setScoreTotal(0);
    setRespostasLog([]);
    setSelecionadosMultipla(new Set());
    setFormContato({ nome: '', email: '', whatsapp: '', empresa: '' });
    setEnviado(false);
    setHistorico([]);
    setDirection(0);
  }, [questaoInicial]);

  const totalPassosConfigurado = Number(quiz.passos_totais ?? 12);
  const totalPassos = Number.isFinite(totalPassosConfigurado)
    ? Math.max(1, Math.round(totalPassosConfigurado))
    : 12;
  const passosPercorridos = questaoAtual ? historico.length + 1 : historico.length;
  const progresso = Math.min(Math.max(passosPercorridos / totalPassos, 0), 1);

  if (questoes.length === 0) {
    return (
      <div
        className={`rounded-xl border-2 border-dashed border-gray-300 dark:border-neutral-700 p-8 flex flex-col items-center justify-center min-h-[320px] ${themeClass}`}
        style={{ backgroundColor: temaModo === 'dark' ? '#171717' : '#f9fafb' }}
      >
        <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
          Adicione questões para testar o funil
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-gray-200 dark:border-neutral-800 overflow-hidden shadow-sm ${themeClass}`}
      style={{ backgroundColor: temaModo === 'dark' ? '#171717' : '#f9fafb' }}
    >
      <div className="p-3 border-b border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Teste o funil — clique nas opções para navegar
        </p>
        <button
          onClick={handleReiniciar}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <RotateCcw size={14} />
          Reiniciar
        </button>
      </div>
      {quiz.url_logo && (
        <div className="flex justify-center pt-6 pb-3">
          <img
            src={quiz.url_logo}
            alt="Logo"
            className={`${getQuizLogoClasse((quiz as { tamanho_logo?: number }).tamanho_logo)} object-contain`}
          />
        </div>
      )}
      <div className="px-4 pb-2 flex items-center">
        <div className="w-8 flex-shrink-0">
          {historico.length > 0 && (
            <button
              onClick={handleVoltar}
              className="p-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
              aria-label="Voltar"
            >
              <ArrowLeft size={16} />
            </button>
          )}
        </div>
        <div className="flex-1" />
      </div>
      <div className="p-4 pt-0">
        <div className="h-1.5 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden mb-2">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: corPrimaria }}
            animate={{ width: `${progresso * 100}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>

        <AnimatePresence mode="wait">
          {enviado ? (
            <motion.div
              key="obrigado"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm p-6 text-center"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Obrigado!
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                (Prévia — dados não são salvos)
              </p>
              <button
                onClick={handleReiniciar}
                className="text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800"
              >
                Testar novamente
              </button>
            </motion.div>
          ) : questaoAtual && questaoAtual.tipo_questao === 'informativo' ? (
            <motion.div
              key="informativo"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="px-4 pt-2 pb-4"
            >
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5 text-center">
                <QuizTextWithBold text={interpolar(questaoAtual.titulo)} />
              </h3>
              {questaoAtual.subtitulo && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-6 whitespace-pre-line text-justify">
                  <QuizTextWithBold text={interpolar(questaoAtual.subtitulo)} />
                </p>
              )}
              <button
                onClick={handleContinuarInformativo}
                className="w-full py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: corPrimaria }}
              >
                {questaoAtual.id === questaoInicial?.id ? 'Iniciar Mapeamento' : 'Continuar'}
              </button>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 text-center leading-tight">
                Ao clicar em alguma das opções, você concorda com os Termos de utilização e serviço, Política de privacidade, Política de subscrição e Política de cookies.
              </p>
            </motion.div>
          ) : questaoAtual && questaoAtual.tipo_questao === 'contato' ? (
            (() => {
              const campos = (questaoAtual.campos_contato ?? ['nome', 'email', 'whatsapp']) as string[];
              const proxima = questaoAtual.contato_finaliza
                ? null
                : (questaoAtual.id_proxima_questao_contato
                    ? questoes.find((q) => q.id === questaoAtual.id_proxima_questao_contato)
                    : null) ?? obterProximaPorOrdem(questaoAtual);
              const isUltimo = !proxima;
              const nomeOk = !campos.includes('nome') || formContato.nome.trim().length > 0;
              const emailOk = !campos.includes('email') || isValidEmail(formContato.email);
              const whatsappOk = !campos.includes('whatsapp') || isValidWhatsApp(formContato.whatsapp);
              const empresaOk = !campos.includes('empresa') || formContato.empresa.trim().length > 0;
              const podeEnviar = nomeOk && emailOk && whatsappOk && empresaOk;
              const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm';
              return (
                <motion.div
                  key="contato"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="px-4 pt-2 pb-4"
                >
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3 text-center">
                    {interpolar(questaoAtual.titulo)}
                  </h3>
                  {questaoAtual.subtitulo && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-5 text-center">{interpolar(questaoAtual.subtitulo)}</p>
                  )}
                  <div className="space-y-2">
                    {campos.includes('nome') && (
                      <input
                        type="text"
                        placeholder="Nome *"
                        value={formContato.nome}
                        onChange={(e) => setFormContato((p) => ({ ...p, nome: e.target.value }))}
                        className={inputCls}
                      />
                    )}
                    {campos.includes('email') && (
                      <input
                        type="email"
                        placeholder="E-mail * (ex: seu@email.com)"
                        value={formContato.email}
                        onChange={(e) => setFormContato((p) => ({ ...p, email: e.target.value }))}
                        className={inputCls}
                      />
                    )}
                    {campos.includes('whatsapp') && (
                      <input
                        type="tel"
                        placeholder="WhatsApp * (00) 00000-0000"
                        value={formContato.whatsapp}
                        onChange={(e) =>
                          setFormContato((p) => ({ ...p, whatsapp: formatarWhatsApp(e.target.value) }))
                        }
                        maxLength={15}
                        className={inputCls}
                      />
                    )}
                    {campos.includes('empresa') && (
                      <input
                        type="text"
                        placeholder="Nome da Empresa *"
                        value={formContato.empresa}
                        onChange={(e) => setFormContato((p) => ({ ...p, empresa: e.target.value }))}
                        className={inputCls}
                      />
                    )}
                    <button
                      onClick={() => handleContatoContinuar(proxima)}
                      disabled={!podeEnviar}
                      className="w-full py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: corPrimaria }}
                    >
                      {isUltimo ? 'Enviar (prévia)' : 'Continuar'}
                    </button>
                  </div>
                </motion.div>
              );
            })()
          ) : questaoAtual && questaoAtual.tipo_questao === 'multipla_selecao' ? (
            <motion.div
              key={questaoAtual.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="px-4 pt-2 pb-4"
            >
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3 text-center">
                <QuizTextWithBold text={interpolar(questaoAtual.titulo)} />
              </h3>
              {questaoAtual.subtitulo && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-6 text-center">{interpolar(questaoAtual.subtitulo)}</p>
              )}
              <div className="space-y-2">
                {ordenarOpcoesPorRotulo(opcoesPorQuestao(questaoAtual.id) || []).map((op) => {
                  const checked = selecionadosMultipla.has(op.id);
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => handleToggleOpcaoMultipla(op.id)}
                      className={`w-full py-2.5 px-4 rounded-xl border text-sm font-medium text-left transition-colors flex items-center gap-3 ${
                        temaModo === 'dark'
                          ? 'border-neutral-600 bg-neutral-800/60 text-gray-100 hover:border-neutral-500 hover:bg-neutral-700/70'
                          : 'border-gray-200 bg-white text-gray-900 hover:opacity-90'
                      }`}
                      style={
                        temaModo !== 'dark'
                          ? { borderColor: checked ? corPrimaria : `${corPrimaria}50`, backgroundColor: `${corPrimaria}10` }
                          : undefined
                      }
                    >
                      <span
                        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                          temaModo === 'dark' ? 'border-neutral-500' : ''
                        }`}
                        style={
                          checked
                            ? { borderColor: corPrimaria, backgroundColor: corPrimaria }
                            : temaModo !== 'dark'
                              ? { borderColor: `${corPrimaria}80` }
                              : undefined
                        }
                      >
                        {checked && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                      {op.rotulo?.trim() ? (
                        <span
                          className={`flex-shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center text-xs font-semibold ${
                            temaModo === 'dark' ? 'border-neutral-500 text-neutral-300' : ''
                          }`}
                          style={temaModo !== 'dark' ? { borderColor: `${corPrimaria}80`, color: corPrimaria } : undefined}
                        >
                          {op.rotulo.trim()}
                        </span>
                      ) : null}
                      <span className="flex-1">{interpolar(op.texto)}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => handleContinuarMultiplaSelecao(questaoAtual)}
                className="w-full py-2 rounded-lg text-sm font-medium text-white mt-4"
                style={{ backgroundColor: corPrimaria }}
              >
                Continuar
              </button>
            </motion.div>
          ) : questaoAtual && questaoAtual.tipo_questao === 'resultado' ? (
            (() => {
              const scoreTotal = respostasLog.reduce((acc, r) => acc + (r.valor_score ?? 0), 0);
              const range = getScoreNivel(Math.min(scoreTotal, 1000));
              const resultado = resultados.find((r) => r.nivel === range.nivel);
              const tituloResultado = resultado?.titulo ?? questaoAtual.titulo;
              const textoResultado = resultado?.texto ?? questaoAtual.subtitulo ?? '';
              const botaoTexto = resultado?.botao_texto ?? null;
              const botaoUrl = resultado?.botao_url ?? null;
              const temaModo = (quiz as { tema_modo?: 'light' | 'dark' }).tema_modo || 'light';
              const isDark = temaModo === 'dark';
              if (resultadoLoading) {
                return (
                  <motion.div
                    key={questaoAtual.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-4 pt-2 pb-4 flex flex-col items-center justify-center min-h-[200px]"
                  >
                    <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: `${corPrimaria}40`, borderTopColor: corPrimaria }} />
                    <p className="mt-3 text-xs font-medium text-gray-600 dark:text-gray-400">Calculando seu resultado...</p>
                  </motion.div>
                );
              }
              return (
                <motion.div
                  key={questaoAtual.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                  className="px-4 pt-2 pb-4 text-center flex flex-col items-center gap-3"
                >
                  <div className="flex flex-col items-center w-full gap-0">
<h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 w-full m-0 p-0 leading-none block overflow-hidden" style={{ lineHeight: 1, marginBottom: 0 }}>
                    <QuizTextWithBold text={interpolar(tituloResultado || '')} />
                    </h3>
                    <div className="w-full flex justify-center" style={{ marginTop: '-75px' }}>
                      <QuizScoreGauge
                      score={scoreTotal}
                      corPrimaria={corPrimaria}
                      isDark={isDark}
                      size={200}
                      label={range.label}
                        labelSmall
                      />
                    </div>
                  </div>
                  {textoResultado && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 w-full max-w-sm whitespace-pre-line">
                      <QuizTextWithBold text={interpolar(textoResultado)} />
                    </p>
                  )}
                  {botaoTexto && (
                    botaoUrl ? (
                      <a
                        href={botaoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block w-full py-2 rounded-lg text-xs font-medium text-white"
                        style={{ backgroundColor: corPrimaria }}
                      >
                        {botaoTexto}
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="inline-block w-full py-2 rounded-lg text-xs font-medium text-white"
                        style={{ backgroundColor: corPrimaria }}
                      >
                        {botaoTexto}
                      </button>
                    )
                  )}
                  <button
                    onClick={handleReiniciar}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800"
                  >
                    Reiniciar
                  </button>
                </motion.div>
              );
            })()
          ) : questaoAtual ? (
            <motion.div
              key={questaoAtual.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="px-4 pt-2 pb-4"
            >
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3 text-center">
                {interpolar(questaoAtual.titulo)}
              </h3>
              {questaoAtual.subtitulo && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-6 text-center">{interpolar(questaoAtual.subtitulo)}</p>
              )}
              <div className="space-y-2">
                {ordenarOpcoesPorRotulo(opcoesPorQuestao(questaoAtual.id) || []).map((op) => (
                  <button
                    key={op.id}
                    onClick={() => handleSelecionarOpcao(op)}
                    className={`w-full py-2.5 px-4 rounded-xl border text-sm font-medium text-left transition-colors flex items-center gap-3 ${
                      temaModo === 'dark'
                        ? 'border-neutral-600 bg-neutral-800/60 text-gray-100 hover:border-neutral-500 hover:bg-neutral-700/70'
                        : 'border-gray-200 bg-white text-gray-900 hover:opacity-90'
                    }`}
                    style={temaModo !== 'dark' ? { borderColor: `${corPrimaria}50`, backgroundColor: `${corPrimaria}10` } : undefined}
                  >
                    {op.rotulo?.trim() ? (
                      <span
                        className={`flex-shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center text-xs font-semibold ${
                          temaModo === 'dark' ? 'border-neutral-500 text-neutral-300' : ''
                        }`}
                        style={temaModo !== 'dark' ? { borderColor: `${corPrimaria}80`, color: corPrimaria } : undefined}
                      >
                        {op.rotulo.trim()}
                      </span>
                    ) : null}
                    <span className="flex-1">{interpolar(op.texto)}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="fim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-4 pt-2 pb-4 text-center"
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">Fim do fluxo</p>
              <button
                onClick={handleReiniciar}
                className="mt-2 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-700"
              >
                Reiniciar
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
