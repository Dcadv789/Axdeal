'use client';

import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Bell,
  FileText,
  Mail,
  MessageCircle,
  Pencil,
  Plus,
  Power,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useReguaForm } from './hooks/useReguaForm';
import { useReguaCobranca } from './hooks/useReguaCobranca';
import type { Notificacao, ReguaCobranca } from './types';

const CANAIS = [
  { id: 'email', label: 'E-mail', icon: Mail },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
] as const;

const DIRECOES = [
  { id: 'antes' as const, label: 'Antes' },
  { id: 'vencimento' as const, label: 'No dia' },
  { id: 'depois' as const, label: 'Depois' },
];

const campoClass =
  'rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-500 transition-colors';

function NotificacaoMensagemDrawer({
  notif,
  numeroExibicao,
  onUpdate,
  onClose,
}: {
  notif: Notificacao;
  numeroExibicao: number;
  onUpdate: (campo: keyof Notificacao, valor: unknown) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[121] flex justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.button
        className="absolute inset-0 bg-black/45"
        aria-label="Fechar"
        onClick={onClose}
      />
      <motion.div
        className="relative z-10 w-full max-w-md h-screen bg-white dark:bg-neutral-900 border-l border-slate-200 dark:border-neutral-700 shadow-xl p-6 overflow-y-auto"
        initial={{ x: 80 }}
        animate={{ x: 0 }}
        exit={{ x: 80 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Mensagem da notificação #{numeroExibicao}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">
              Assunto (e-mail)
            </label>
            <input
              type="text"
              value={notif.subject}
              onChange={(e) => onUpdate('subject', e.target.value)}
              placeholder="Ex: Lembrete de pagamento"
              className="w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">
              Mensagem
            </label>
            <textarea
              value={notif.message}
              onChange={(e) => onUpdate('message', e.target.value)}
              placeholder="Use {{cliente}}, {{valor}}, {{vencimento}} como variáveis."
              rows={6}
              className="w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm resize-none"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {'{{cliente}}'} {'{{valor}}'} {'{{vencimento}}'}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function NotificacaoRow({
  notif,
  numeroExibicao,
  onUpdate,
  onRemove,
  onToggleCanal,
  onAbrirMensagem,
}: {
  notif: Notificacao;
  numeroExibicao: number;
  onUpdate: (campo: keyof Notificacao, valor: unknown) => void;
  onRemove: () => void;
  onToggleCanal: (canal: string) => void;
  onAbrirMensagem: () => void;
}) {
  const direction = notif.direction;
  const hideOffset = direction === 'vencimento';

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 w-full rounded-lg hover:bg-slate-50 dark:hover:bg-neutral-800/50 border-b border-slate-100 dark:border-neutral-800 last:border-0">
      <span className="w-8 text-sm font-semibold text-slate-600 dark:text-slate-300 shrink-0">
        #{numeroExibicao}
      </span>
      <select
        value={direction}
        onChange={(e) => onUpdate('direction', e.target.value as Notificacao['direction'])}
        className={`${campoClass} w-28 shrink-0`}
      >
        {DIRECOES.map((d) => (
          <option key={d.id} value={d.id}>
            {d.label}
          </option>
        ))}
      </select>
      {!hideOffset && (
        <>
          <input
            type="number"
            min={0}
            value={notif.offset}
            onChange={(e) => onUpdate('offset', Number(e.target.value) || 0)}
            className={`${campoClass} w-16 text-center`}
          />
          <select
            value={notif.unit}
            onChange={(e) => onUpdate('unit', e.target.value as Notificacao['unit'])}
            className={`${campoClass} w-20 shrink-0`}
          >
            <option value="dias">dias</option>
            <option value="meses">meses</option>
          </select>
        </>
      )}
      <div className="flex items-center gap-1.5 shrink-0">
        {CANAIS.map((c) => {
          const Icon = c.icon;
          const ativo = notif.channels.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onToggleCanal(c.id)}
              className={`p-2 rounded-md transition ${
                ativo
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                  : 'bg-slate-100 text-slate-400 dark:bg-neutral-800 dark:text-neutral-500'
              }`}
              title={c.label}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
      <input
        type="text"
        value={notif.subject}
        onChange={(e) => onUpdate('subject', e.target.value)}
        placeholder="Assunto"
        className={`${campoClass} flex-1 min-w-0`}
      />
      <button
        type="button"
        onClick={onAbrirMensagem}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-neutral-700 dark:text-slate-400 dark:hover:bg-neutral-800 shrink-0"
      >
        <FileText className="h-3.5 w-3.5" />
        Mensagem
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="p-2 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0"
        title="Remover"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function ReguaCobrancaTab() {
  const {
    reguas,
    loading,
    erro,
    salvando,
    criar,
    atualizar,
    alternarAtiva,
    excluir,
    definirComoPadrao,
  } = useReguaCobranca();

  const {
    modoEdicao,
    formData,
    setFormData,
    notificacoes,
    reguaEditandoId,
    iniciarCriacao,
    iniciarEdicao,
    cancelar,
    adicionarNotificacao,
    removerNotificacao,
    atualizarNotificacao,
    toggleCanal,
  } = useReguaForm();

  const [mensagemDrawerIndex, setMensagemDrawerIndex] = useState<number | null>(null);
  const notifMensagem = mensagemDrawerIndex !== null ? notificacoes[mensagemDrawerIndex] : null;

  const handleSalvar = useCallback(async () => {
    if (!formData.nome.trim()) {
      alert('Informe o nome da régua.');
      return;
    }
    try {
      if (reguaEditandoId) {
        await atualizar(
          reguaEditandoId,
          formData.nome,
          formData.descricao,
          formData.padrao,
          notificacoes
        );
      } else {
        await criar(formData.nome, formData.descricao, formData.padrao, notificacoes);
      }
      cancelar();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao salvar.');
    }
  }, [
    formData,
    notificacoes,
    reguaEditandoId,
    criar,
    atualizar,
    cancelar,
  ]);

  const handleExcluir = useCallback(
    async (regua: ReguaCobranca) => {
      if (!window.confirm(`Excluir a régua "${regua.nome}"?`)) return;
      try {
        await excluir(regua.id);
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Erro ao excluir.');
      }
    },
    [excluir]
  );

  if (modoEdicao === 'criar' || modoEdicao === 'editar') {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900/50 p-5">
          {/* Título + Voltar e Salvar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Réguas de Cobrança
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {reguaEditandoId ? 'Editar régua' : 'Nova régua'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={cancelar}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:text-slate-300 dark:hover:bg-neutral-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>
              <button
                type="button"
                onClick={handleSalvar}
                disabled={salvando}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>

          {/* Nome, Descrição, Padrão na mesma linha */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-400">
                Nome da régua
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData((p) => ({ ...p, nome: e.target.value }))}
                placeholder="Ex: Cobrança padrão 30 dias"
                className={`${campoClass} w-full`}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-400">
                Descrição
              </label>
              <input
                type="text"
                value={formData.descricao}
                onChange={(e) => setFormData((p) => ({ ...p, descricao: e.target.value }))}
                placeholder="Opcional"
                className={`${campoClass} w-full`}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-400">
                Régua padrão
              </label>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 h-10">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Padrão</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.padrao}
                  onClick={() => setFormData((p) => ({ ...p, padrao: !p.padrao }))}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    formData.padrao
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-slate-300 dark:border-neutral-600 bg-slate-200 dark:bg-neutral-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition ${
                      formData.padrao ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Seção Notificações (a régua) */}
          <div className="border-t border-slate-200 dark:border-neutral-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Notificações da régua
              </h4>
            <button
              type="button"
              onClick={adicionarNotificacao}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-500 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-400/60 dark:bg-blue-500/10 dark:text-blue-300"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </button>
            </div>

            {notificacoes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/50 py-6 text-center">
              <Bell className="mx-auto mb-1.5 h-8 w-8 text-slate-400" />
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Nenhuma notificação. Clique para adicionar.
              </p>
              <button
                type="button"
                onClick={adicionarNotificacao}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Adicionar notificação
              </button>
            </div>
          ) : (
            <div className="w-full rounded-lg border border-slate-200 dark:border-neutral-700 overflow-hidden">
              {notificacoes.map((notif, index) => (
                <NotificacaoRow
                  key={`notif-${index}`}
                  notif={notif}
                  numeroExibicao={index + 1}
                  onUpdate={(campo, valor) => atualizarNotificacao(index, campo, valor)}
                  onRemove={() => removerNotificacao(index)}
                  onToggleCanal={(c) => toggleCanal(index, c)}
                  onAbrirMensagem={() => setMensagemDrawerIndex(index)}
                />
              ))}
            </div>
          )}

          <AnimatePresence>
            {notifMensagem && mensagemDrawerIndex !== null && (
              <NotificacaoMensagemDrawer
                key={mensagemDrawerIndex}
                notif={notifMensagem}
                numeroExibicao={mensagemDrawerIndex + 1}
                onUpdate={(campo, valor) => atualizarNotificacao(mensagemDrawerIndex, campo, valor)}
                onClose={() => setMensagemDrawerIndex(null)}
              />
            )}
          </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
              <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Réguas de Cobrança
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Crie regras e configure notificações (e-mail, WhatsApp) para lembrar clientes de pagamento
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={iniciarCriacao}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 shrink-0"
          >
            <Plus className="h-4 w-4" />
            Nova Régua
          </button>
        </div>

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {erro}
        </div>
      )}

      {loading ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-neutral-700">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-neutral-900/50">
              <tr>
                <th className="px-6 py-4 text-left border-b-2 border-slate-200 dark:border-neutral-700">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">#</span>
                </th>
                <th className="px-6 py-4 text-left border-b-2 border-slate-200 dark:border-neutral-700">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Nome da Régua</span>
                </th>
                <th className="px-6 py-4 text-left border-b-2 border-slate-200 dark:border-neutral-700">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Padrão</span>
                </th>
                <th className="px-6 py-4 text-left border-b-2 border-slate-200 dark:border-neutral-700">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Notificações</span>
                </th>
                <th className="px-6 py-4 text-left border-b-2 border-slate-200 dark:border-neutral-700">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Status</span>
                </th>
                <th className="px-6 py-4 text-right border-b-2 border-slate-200 dark:border-neutral-700">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-neutral-950">
              {[1, 2, 3].map((i) => (
                <tr key={i} className="border-b border-slate-200 dark:border-neutral-700">
                  <td className="px-6 py-4">
                    <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-neutral-700 animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-40 bg-slate-200 dark:bg-neutral-700 rounded animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-6 w-16 bg-slate-200 dark:bg-neutral-700 rounded-full animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-6 w-24 bg-slate-200 dark:bg-neutral-700 rounded animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-6 w-14 bg-slate-200 dark:bg-neutral-700 rounded-full animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1">
                      <div className="h-8 w-8 bg-slate-200 dark:bg-neutral-700 rounded animate-pulse" />
                      <div className="h-8 w-8 bg-slate-200 dark:bg-neutral-700 rounded animate-pulse" />
                      <div className="h-8 w-8 bg-slate-200 dark:bg-neutral-700 rounded animate-pulse" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : reguas.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900/50 p-12 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            <Bell className="h-7 w-7" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Nenhuma régua de cobrança
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
            Crie sua primeira régua para automatizar lembretes de pagamento por e-mail e WhatsApp.
          </p>
          <button
            type="button"
            onClick={iniciarCriacao}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Criar régua de cobrança
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-neutral-700">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-neutral-900/50">
              <tr>
                <th className="px-6 py-4 text-left border-b-2 border-slate-200 dark:border-neutral-700 w-12">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">#</span>
                </th>
                <th className="px-6 py-4 text-left border-b-2 border-slate-200 dark:border-neutral-700">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Nome da Régua</span>
                </th>
                <th className="px-6 py-4 text-left border-b-2 border-slate-200 dark:border-neutral-700">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Padrão</span>
                </th>
                <th className="px-6 py-4 text-left border-b-2 border-slate-200 dark:border-neutral-700">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Notificações</span>
                </th>
                <th className="px-6 py-4 text-left border-b-2 border-slate-200 dark:border-neutral-700">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Status</span>
                </th>
                <th className="px-6 py-4 text-right border-b-2 border-slate-200 dark:border-neutral-700">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-neutral-950">
              {reguas.map((regua, index) => {
                const qtd = regua.etapas?.length ?? 0;
                const canais = new Set((regua.etapas ?? []).flatMap((e) => e.channels || []));
                const canaisLabel = Array.from(canais)
                  .map((c) => (c === 'email' ? 'E-mail' : c === 'whatsapp' ? 'WhatsApp' : c))
                  .join(', ');
                return (
                  <tr
                    key={regua.id}
                    className={`hover:bg-slate-50 dark:hover:bg-neutral-900/50 transition-colors ${
                      index !== reguas.length - 1 ? 'border-b border-slate-200 dark:border-neutral-700' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 dark:bg-neutral-700 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {regua.nome}
                        </span>
                        {regua.descricao && (
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-1 max-w-xs">
                            {regua.descricao}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {regua.padrao ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                          <Star className="h-3 w-3 fill-current" />
                          Padrão
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void definirComoPadrao(regua.id)}
                          disabled={salvando}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-neutral-700 dark:text-slate-400 dark:hover:bg-neutral-800"
                          title="Definir como padrão"
                        >
                          <Star className="h-3 w-3" />
                          Definir padrão
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium dark:bg-neutral-800">
                          {qtd} {qtd === 1 ? 'notificação' : 'notificações'}
                        </span>
                        {canais.size > 0 && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium dark:bg-neutral-800">
                            {canaisLabel}
                          </span>
                        )}
                        {qtd === 0 && canais.size === 0 && (
                          <span className="text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          regua.ativa
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-700 dark:bg-neutral-700 dark:text-slate-300'
                        }`}
                      >
                        {regua.ativa ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => iniciarEdicao(regua)}
                          className="p-2 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded transition-colors"
                          title="Configurar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => void alternarAtiva(regua)}
                          className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded transition-colors"
                          title={regua.ativa ? 'Desativar' : 'Ativar'}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => void handleExcluir(regua)}
                          className="p-2 text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
