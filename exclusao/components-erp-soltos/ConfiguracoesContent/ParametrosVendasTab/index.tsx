'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, FileText, FolderKanban, Hash, Plus, Power, Settings2, ShoppingCart, Star, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useParametrosGerais } from './hooks/useParametrosGerais';
import { useTermosGarantia } from './hooks/useTermosGarantia';
import { useNotasRodape } from './hooks/useNotasRodape';
import type { ParametrosGeraisData } from './hooks/useParametrosGerais';
import { useCompany } from '@/lib/context/company-context';
import { supabase } from '@/lib/supabase';

const campoClass =
  'rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-500 transition-colors';

const DIGITOS_NUMERACAO = 4;

function formatarExemplo(prefixo: string, numero: number, digits = DIGITOS_NUMERACAO): string {
  return `${prefixo || 'XXX'}-${String(numero).padStart(digits, '0')}`;
}

const cardBlockClass = 'rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5';

interface ParametrosVendasTabProps {
  aba: 'parametros-gerais' | 'vendas';
}

interface CadastroSimples {
  id: string;
  nome: string;
  ativo: boolean;
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/30 px-4 py-3">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          checked
            ? 'border-blue-500 bg-blue-500'
            : 'border-slate-300 dark:border-neutral-600 bg-slate-200 dark:bg-neutral-700'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

function CadastroSimplesCard({
  icon: Icon,
  titulo,
  descricao,
  itens,
  onAdicionar,
  onExcluir,
  onAlternarAtivo,
  textoVazio,
}: {
  icon: typeof FolderKanban;
  titulo: string;
  descricao: string;
  itens: CadastroSimples[];
  onAdicionar: () => void;
  onExcluir: (item: CadastroSimples) => void;
  onAlternarAtivo: (item: CadastroSimples) => void;
  textoVazio: string;
}) {
  return (
    <div className={`${cardBlockClass} h-full flex flex-col`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{titulo}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{descricao}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onAdicionar}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-500 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/30"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </button>
      </div>

      <div className="flex-1 space-y-2">
        {itens.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500 dark:border-neutral-700 dark:text-slate-400">
            {textoVazio}
          </div>
        ) : (
          itens.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-slate-300"
            >
              <div className="min-w-0 flex flex-1 items-center gap-2.5">
                <span className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 px-2 text-xs font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                  {index + 1}
                </span>
                <span className="truncate font-normal text-slate-700 dark:text-slate-300">
                  {item.nome}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onAlternarAtivo(item)}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
                    item.ativo
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : 'border-slate-200 bg-slate-100 text-slate-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-slate-500'
                  }`}
                  aria-label={item.ativo ? 'Desativar item' : 'Ativar item'}
                  title={item.ativo ? 'Ativo' : 'Inativo'}
                >
                  <Power className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onExcluir(item)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                  aria-label="Excluir item"
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AddTermoDrawer({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (nome: string, conteudo: string) => Promise<boolean>;
}) {
  const [nome, setNome] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!nome.trim()) {
      setError('Informe um nome.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const ok = await onSave(nome.trim(), conteudo);
      if (ok) onClose();
    } catch {
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[121] flex justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.button className="absolute inset-0 bg-black/45" aria-label="Fechar" onClick={onClose} />
      <motion.div
        className="relative z-10 flex h-[100dvh] w-full max-w-md flex-col overflow-hidden rounded-l-2xl border-l border-slate-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900 sm:max-w-lg"
        initial={{ x: 80 }}
        animate={{ x: 0 }}
        exit={{ x: 80 }}
        transition={{ duration: 0.2 }}
      >
        <div className="sticky top-0 z-20 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-6 py-5 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-blue-100 text-blue-600 shadow-sm dark:bg-blue-500/20 dark:text-blue-300">
              <FileText className="h-5 w-5 flex-none" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Novo termo de garantia</h3>
              <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                Cadastre um termo reutilizÃƒÆ’Ã‚Â¡vel para aplicar como padrÃƒÆ’Ã‚Â£o nos documentos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Nome do termo</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Garantia padrÃƒÆ’Ã‚Â£o 12 meses"
                className={`${campoClass} w-full`}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">ConteÃƒÆ’Ã‚Âºdo</label>
              <textarea
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                placeholder="Texto do termo..."
                rows={6}
                className={`${campoClass} w-full resize-y`}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:text-slate-300 dark:hover:bg-neutral-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AddNotaDrawer({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (nome: string, conteudo: string) => Promise<boolean>;
}) {
  const [nome, setNome] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!nome.trim()) {
      setError('Informe um nome.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const ok = await onSave(nome.trim(), conteudo);
      if (ok) onClose();
    } catch {
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[121] flex justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.button className="absolute inset-0 bg-black/45" aria-label="Fechar" onClick={onClose} />
      <motion.div
        className="relative z-10 flex h-[100dvh] w-full max-w-md flex-col overflow-hidden rounded-l-2xl border-l border-slate-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900 sm:max-w-lg"
        initial={{ x: 80 }}
        animate={{ x: 0 }}
        exit={{ x: 80 }}
        transition={{ duration: 0.2 }}
      >
        <div className="sticky top-0 z-20 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-6 py-5 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-blue-100 text-blue-600 shadow-sm dark:bg-blue-500/20 dark:text-blue-300">
              <FileText className="h-5 w-5 flex-none" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Nova nota de rodapÃƒÆ’Ã‚Â©</h3>
              <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                Cadastre uma nota reutilizÃƒÆ’Ã‚Â¡vel para usar nos documentos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Nome da nota</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: RodapÃƒÆ’Ã‚Â© padrÃƒÆ’Ã‚Â£o"
                className={`${campoClass} w-full`}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">ConteÃƒÆ’Ã‚Âºdo</label>
              <textarea
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                placeholder="Texto da nota..."
                rows={6}
                className={`${campoClass} w-full resize-y`}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:text-slate-300 dark:hover:bg-neutral-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AddCadastroDrawer({
  onClose,
  onSave,
  saving,
  titulo,
  descricao,
  placeholder,
  valor,
  setValor,
}: {
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  titulo: string;
  descricao: string;
  placeholder: string;
  valor: string;
  setValor: (value: string) => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[121] flex justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.button className="absolute inset-0 bg-black/45" aria-label="Fechar" onClick={onClose} />
      <motion.div
        className="relative z-10 flex h-[100dvh] w-full max-w-md flex-col overflow-hidden rounded-l-2xl border-l border-slate-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900 sm:max-w-lg"
        initial={{ x: 80 }}
        animate={{ x: 0 }}
        exit={{ x: 80 }}
        transition={{ duration: 0.2 }}
      >
        <div className="sticky top-0 z-20 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-6 py-5 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-blue-100 text-blue-600 shadow-sm dark:bg-blue-500/20 dark:text-blue-300">
              {titulo === 'Novo projeto' ? <FolderKanban className="h-5 w-5 flex-none" /> : <Building2 className="h-5 w-5 flex-none" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{titulo}</h3>
              <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{descricao}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Nome</label>
              <input
                type="text"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder={placeholder}
                className={`${campoClass} w-full`}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:text-slate-300 dark:hover:bg-neutral-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function BlocoPropostas({
  data,
  updateField,
}: {
  data: ParametrosGeraisData;
  updateField: <K extends keyof ParametrosGeraisData>(key: K, value: ParametrosGeraisData[K]) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900/50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-500/20">
          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{'Par\u00e2metros das Propostas'}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{'Prazos padr\u00e3o aplicados \u00e0s novas propostas'}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Prazo de validade</label>
          <div className="flex gap-2">
            <input type="number" min={0} value={data.validadePropostaDias} onChange={(e) => updateField('validadePropostaDias', Number(e.target.value) || 0)} className={`${campoClass} w-20`} />
            <select value={data.validadePropostaTipo} onChange={(e) => updateField('validadePropostaTipo', e.target.value as 'dias' | 'meses')} className={`${campoClass} w-24`}>
              <option value="dias">dias</option>
              <option value="meses">meses</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">{'Garantia padr\u00e3o'}</label>
          <div className="flex gap-2">
            <input type="number" min={0} value={data.prazoGarantiaDias} onChange={(e) => updateField('prazoGarantiaDias', Number(e.target.value) || 0)} className={`${campoClass} w-20`} />
            <select value={data.prazoGarantiaTipo} onChange={(e) => updateField('prazoGarantiaTipo', e.target.value as 'dias' | 'meses')} className={`${campoClass} w-24`}>
              <option value="dias">dias</option>
              <option value="meses">meses</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">{'Prazo de entrega padr\u00e3o'}</label>
          <div className="flex gap-2">
            <input type="number" min={0} value={data.prazoEntregaDias} onChange={(e) => updateField('prazoEntregaDias', Number(e.target.value) || 0)} className={`${campoClass} w-20`} />
            <select value={data.prazoEntregaTipo} onChange={(e) => updateField('prazoEntregaTipo', e.target.value as 'dias' | 'meses')} className={`${campoClass} w-24`}>
              <option value="dias">dias</option>
              <option value="meses">meses</option>
            </select>
          </div>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">{'Observa\u00e7\u00e3o padr\u00e3o das propostas'}</label>
          <textarea value={data.obsPadraoProposta} onChange={(e) => updateField('obsPadraoProposta', e.target.value)} placeholder={'Ex.: Proposta v\u00e1lida por 15 dias...'} rows={3} className={`${campoClass} min-h-[80px] w-full resize-y`} />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <ToggleSwitch label="Gerar venda automaticamente" checked={data.gerarVendaAutomatica} onChange={(v) => updateField('gerarVendaAutomatica', v)} />
        </div>
      </div>
    </div>
  );
}
function BlocoVendas({
  data,
  updateField,
}: {
  data: ParametrosGeraisData;
  updateField: <K extends keyof ParametrosGeraisData>(key: K, value: ParametrosGeraisData[K]) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900/50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
          <ShoppingCart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{'Par\u00e2metros de Vendas'}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{'Observa\u00e7\u00f5es e instru\u00e7\u00f5es padr\u00e3o aplicadas \u00e0s vendas'}</p>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">{'Observa\u00e7\u00f5es padr\u00e3o de vendas'}</label>
          <textarea value={data.obsPadraoVenda} onChange={(e) => updateField('obsPadraoVenda', e.target.value)} placeholder={'Ex.: Pagamento \u00e0 vista com 5% de desconto...'} rows={3} className={`${campoClass} min-h-[80px] w-full resize-y`} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">{'Instru\u00e7\u00f5es de pagamento'}</label>
          <textarea value={data.instrucoesPadraoPagamento} onChange={(e) => updateField('instrucoesPadraoPagamento', e.target.value)} placeholder="Ex.: Pagar conforme boleto enviado por e-mail..." rows={3} className={`${campoClass} min-h-[80px] w-full resize-y`} />
        </div>
        <ToggleSwitch label="Gerar financeiro automaticamente" checked={data.gerarParcelaAutomatica} onChange={(v) => updateField('gerarParcelaAutomatica', v)} />
      </div>
    </div>
  );
}
function BlocoNumeracaoSequencia({
  data,
  updateField,
}: {
  data: ParametrosGeraisData;
  updateField: <K extends keyof ParametrosGeraisData>(key: K, value: ParametrosGeraisData[K]) => void;
}) {
  const linhasNumeracao: Array<{
    key: string;
    titulo: string;
    prefixoKey: keyof ParametrosGeraisData;
    numeroKey: keyof ParametrosGeraisData;
    placeholder: string;
  }> = [
    { key: 'proposta', titulo: 'Proposta', prefixoKey: 'prefixoProposta', numeroKey: 'proximoNumeroProposta', placeholder: 'PROP' },
    { key: 'venda', titulo: 'Venda', prefixoKey: 'prefixoVenda', numeroKey: 'proximoNumeroVenda', placeholder: 'VDA' },
    { key: 'os', titulo: 'Ordem de Serviço', prefixoKey: 'prefixoOs', numeroKey: 'proximoNumeroOs', placeholder: 'OS' },
    { key: 'produto', titulo: 'Produto', prefixoKey: 'prefixoProduto', numeroKey: 'proximoNumeroProduto', placeholder: 'P' },
    { key: 'servico', titulo: 'Serviço', prefixoKey: 'prefixoServico', numeroKey: 'proximoNumeroServico', placeholder: 'S' },
  ];

  return (
    <div className={`${cardBlockClass} h-full flex flex-col`}>
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/20">
          <Hash className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{'Numera\u00e7\u00e3o e Sequ\u00eancia'}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{'Prefixos e sequ\u00eancias para documentos'}</p>
        </div>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-neutral-800">
        {linhasNumeracao.map((linha) => {
          const prefixoValor = String(data[linha.prefixoKey] ?? '');
          const numeroValor = Number(data[linha.numeroKey] || 1);
          return (
            <div key={linha.key} className="grid grid-cols-12 items-center gap-2 py-2">
              <div className="col-span-12 text-xs font-semibold text-slate-600 dark:text-slate-300 sm:col-span-3">
                {linha.titulo}
              </div>
              <div className="col-span-6 sm:col-span-3">
                <input
                  type="text"
                  value={prefixoValor}
                  onChange={(e) => updateField(linha.prefixoKey, e.target.value as ParametrosGeraisData[typeof linha.prefixoKey])}
                  className={`${campoClass} h-8 w-full`}
                  placeholder={linha.placeholder}
                />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <input
                  type="number"
                  min={1}
                  value={numeroValor}
                  onChange={(e) =>
                    updateField(
                      linha.numeroKey,
                      Math.max(1, Number(e.target.value) || 1) as ParametrosGeraisData[typeof linha.numeroKey]
                    )
                  }
                  className={`${campoClass} h-8 w-full`}
                />
              </div>
              <div className="col-span-12 text-right text-[11px] text-slate-500 dark:text-slate-400 sm:col-span-4">
                Ex.: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{formatarExemplo(prefixoValor, numeroValor)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function BlocoParametrosGerais({
  data,
  updateField,
  termos,
  notas,
  adicionarTermo,
  adicionarNota,
}: {
  data: ParametrosGeraisData;
  updateField: <K extends keyof ParametrosGeraisData>(key: K, value: ParametrosGeraisData[K]) => void;
  termos: { id: string; nome: string }[];
  notas: { id: string; nome: string }[];
  adicionarTermo: (nome: string, conteudo: string) => Promise<boolean>;
  adicionarNota: (nome: string, conteudo: string) => Promise<boolean>;
}) {
  const [drawerTermo, setDrawerTermo] = useState(false);
  const [drawerNota, setDrawerNota] = useState(false);

  return (
    <div className={`${cardBlockClass} h-full flex flex-col`}>
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/20">
          <Settings2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{'Par\u00e2metros Gerais'}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{'Termos padr\u00e3o, e-mail e nota fiscal'}</p>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Termos de garantia</label>
            <button type="button" onClick={() => setDrawerTermo(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/30">
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </button>
          </div>
          <div className="max-h-32 space-y-1.5 overflow-y-auto">
            {termos.length === 0 ? (
              <p className="py-2 text-sm text-slate-500 dark:text-slate-400">Nenhum termo cadastrado.</p>
            ) : (
              termos.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900/80">
                  <span className="flex-1 truncate text-sm text-slate-700 dark:text-slate-300">{t.nome}</span>
                  <button
                    type="button"
                    onClick={() => updateField('idTermoGarantiaPadrao', data.idTermoGarantiaPadrao === t.id ? null : t.id)}
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition ${data.idTermoGarantiaPadrao === t.id ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/30 dark:text-amber-400' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-neutral-800'}`}
                  >
                    <Star className={`h-3.5 w-3.5 ${data.idTermoGarantiaPadrao === t.id ? 'fill-current' : ''}`} />
                    {data.idTermoGarantiaPadrao === t.id ? 'Padrão' : 'Definir padrão'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">{'Notas de rodapé'}</label>
            <button type="button" onClick={() => setDrawerNota(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/30">
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </button>
          </div>
          <div className="max-h-32 space-y-1.5 overflow-y-auto">
            {notas.length === 0 ? (
              <p className="py-2 text-sm text-slate-500 dark:text-slate-400">Nenhuma nota cadastrada.</p>
            ) : (
              notas.map((n) => (
                <div key={n.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900/80">
                  <span className="flex-1 truncate text-sm text-slate-700 dark:text-slate-300">{n.nome}</span>
                  <button
                    type="button"
                    onClick={() => updateField('idNotaRodapePadrao', data.idNotaRodapePadrao === n.id ? null : n.id)}
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition ${data.idNotaRodapePadrao === n.id ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/30 dark:text-amber-400' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-neutral-800'}`}
                  >
                    <Star className={`h-3.5 w-3.5 ${data.idNotaRodapePadrao === n.id ? 'fill-current' : ''}`} />
                    {data.idNotaRodapePadrao === n.id ? 'Padrão' : 'Definir padrão'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        <ToggleSwitch label="Enviar e-mail de venda" checked={data.enviarEmailVenda} onChange={(v) => updateField('enviarEmailVenda', v)} />
        <ToggleSwitch label="Gerar nota fiscal automaticamente" checked={data.gerarNfAutomatica} onChange={(v) => updateField('gerarNfAutomatica', v)} />
      </div>
      <AnimatePresence>
        {drawerTermo && <AddTermoDrawer key="drawer-termo" onClose={() => setDrawerTermo(false)} onSave={adicionarTermo} />}
        {drawerNota && <AddNotaDrawer key="drawer-nota" onClose={() => setDrawerNota(false)} onSave={adicionarNota} />}
      </AnimatePresence>
    </div>
  );
}
export default function ParametrosVendasTab({ aba }: ParametrosVendasTabProps) {
  const { companyId } = useCompany();
  const { data, updateField, save, loading, saving, notification, clearNotification } = useParametrosGerais();
  const { termos, adicionarTermo } = useTermosGarantia(companyId);
  const { notas, adicionarNota } = useNotasRodape(companyId);
  const abaInterna = aba;
  const setAbaInterna = (_tab: 'parametros-gerais' | 'vendas') => {};
  const [departamentos, setDepartamentos] = useState<CadastroSimples[]>([]);
  const [projetos, setProjetos] = useState<CadastroSimples[]>([]);
  const [carregandoCadastros, setCarregandoCadastros] = useState(true);
  const [drawerDepartamentoAberto, setDrawerDepartamentoAberto] = useState(false);
  const [drawerProjetoAberto, setDrawerProjetoAberto] = useState(false);
  const [nomeNovoDepartamento, setNomeNovoDepartamento] = useState('');
  const [nomeNovoProjeto, setNomeNovoProjeto] = useState('');
  const [salvandoDepartamento, setSalvandoDepartamento] = useState(false);
  const [salvandoProjeto, setSalvandoProjeto] = useState(false);

  const carregarCadastros = async () => {
    if (!companyId) {
      setDepartamentos([]);
      setProjetos([]);
      setCarregandoCadastros(false);
      return;
    }

    setCarregandoCadastros(true);
    try {
      const [departamentosResult, projetosResult] = await Promise.all([
        supabase
          .from('erp_departamentos')
          .select('id, nome, ativo')
          .eq('id_empresa', companyId)
          .order('nome'),
        supabase
          .from('erp_projetos')
          .select('id, nome, ativo')
          .eq('id_empresa', companyId)
          .order('nome'),
      ]);

      if (departamentosResult.error) {
        console.error('Erro ao buscar departamentos:', departamentosResult.error);
      } else {
        setDepartamentos((departamentosResult.data || []).map((item) => ({ id: item.id, nome: item.nome, ativo: Boolean(item.ativo) })));
      }

      if (projetosResult.error) {
        console.error('Erro ao buscar projetos:', projetosResult.error);
      } else {
        setProjetos((projetosResult.data || []).map((item) => ({ id: item.id, nome: item.nome, ativo: Boolean(item.ativo) })));
      }
    } catch (error) {
      console.error('Erro ao carregar cadastros:', error);
    } finally {
      setCarregandoCadastros(false);
    }
  };

  useEffect(() => {
    void carregarCadastros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const salvarDepartamento = async () => {
    if (!companyId) return;
    const nome = nomeNovoDepartamento.trim();
    if (!nome) {
      toast.error('Informe o nome do departamento.');
      return;
    }

    try {
      setSalvandoDepartamento(true);
      const { error } = await supabase.from('erp_departamentos').insert({
        id_empresa: companyId,
        nome,
        ativo: true,
      });

      if (error) throw error;

      toast.success('Departamento adicionado com sucesso.');
      setNomeNovoDepartamento('');
      setDrawerDepartamentoAberto(false);
      await carregarCadastros();
    } catch (error) {
      console.error('Erro ao salvar departamento:', error);
      toast.error('NÃ£o foi possÃ­vel salvar o departamento.');
    } finally {
      setSalvandoDepartamento(false);
    }
  };

  const salvarProjeto = async () => {
    if (!companyId) return;
    const nome = nomeNovoProjeto.trim();
    if (!nome) {
      toast.error('Informe o nome do projeto.');
      return;
    }

    try {
      setSalvandoProjeto(true);
      const { error } = await supabase.from('erp_projetos').insert({
        id_empresa: companyId,
        nome,
        ativo: true,
      });

      if (error) throw error;

      toast.success('Projeto adicionado com sucesso.');
      setNomeNovoProjeto('');
      setDrawerProjetoAberto(false);
      await carregarCadastros();
    } catch (error) {
      console.error('Erro ao salvar projeto:', error);
      toast.error('NÃ£o foi possÃ­vel salvar o projeto.');
    } finally {
      setSalvandoProjeto(false);
    }
  };

  const alternarAtivoProjeto = async (item: CadastroSimples) => {
    if (!companyId) return;

    try {
      const { error } = await supabase
        .from('erp_projetos')
        .update({ ativo: !item.ativo })
        .eq('id', item.id)
        .eq('id_empresa', companyId);

      if (error) throw error;

      toast.success(item.ativo ? 'Projeto desativado com sucesso.' : 'Projeto ativado com sucesso.');
      await carregarCadastros();
    } catch (error) {
      console.error('Erro ao alterar status do projeto:', error);
      toast.error('Não foi possível atualizar o status do projeto.');
    }
  };

  const alternarAtivoDepartamento = async (item: CadastroSimples) => {
    if (!companyId) return;

    try {
      const { error } = await supabase
        .from('erp_departamentos')
        .update({ ativo: !item.ativo })
        .eq('id', item.id)
        .eq('id_empresa', companyId);

      if (error) throw error;

      toast.success(item.ativo ? 'Departamento desativado com sucesso.' : 'Departamento ativado com sucesso.');
      await carregarCadastros();
    } catch (error) {
      console.error('Erro ao alterar status do departamento:', error);
      toast.error('Não foi possível atualizar o status do departamento.');
    }
  };

  const excluirProjeto = async (item: CadastroSimples) => {
    if (!companyId) return;

    try {
      const { error } = await supabase
        .from('erp_projetos')
        .delete()
        .eq('id', item.id)
        .eq('id_empresa', companyId);

      if (error) throw error;

      toast.success('Projeto excluído com sucesso.');
      await carregarCadastros();
    } catch (error) {
      console.error('Erro ao excluir projeto:', error);
      toast.error('Não foi possível excluir o projeto.');
    }
  };

  const excluirDepartamento = async (item: CadastroSimples) => {
    if (!companyId) return;

    try {
      const { error } = await supabase
        .from('erp_departamentos')
        .delete()
        .eq('id', item.id)
        .eq('id_empresa', companyId);

      if (error) throw error;

      toast.success('Departamento excluído com sucesso.');
      await carregarCadastros();
    } catch (error) {
      console.error('Erro ao excluir departamento:', error);
      toast.error('Não foi possível excluir o departamento.');
    }
  };

  // Auto-dismissar notificaÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o apÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³s 5 segundos
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(clearNotification, 5000);
    return () => clearTimeout(t);
  }, [notification, clearNotification]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
        <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
        <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
        <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <>
      {notification && (
        <div
          role="alert"
          className={`mb-4 flex items-center justify-between rounded-lg border px-4 py-3 ${
            notification.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200'
          }`}
        >
          <span className="text-sm font-medium">{notification.message}</span>
          <button
            type="button"
            onClick={clearNotification}
            className="ml-2 rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Fechar notificaÃ§Ã£o"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="hidden mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40">
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setAbaInterna('parametros-gerais')}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              abaInterna === 'parametros-gerais'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-neutral-800 dark:hover:text-slate-100'
            }`}
          >
            ParÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢metros Gerais
          </button>
          <button
            type="button"
            onClick={() => setAbaInterna('vendas')}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              abaInterna === 'vendas'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-neutral-800 dark:hover:text-slate-100'
            }`}
          >
            Vendas
          </button>
        </div>
      </div>

      {abaInterna === 'parametros-gerais' && (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="min-w-0 h-full">
            <BlocoParametrosGerais
              data={data}
              updateField={updateField}
              termos={termos}
              notas={notas}
              adicionarTermo={adicionarTermo}
              adicionarNota={adicionarNota}
            />
          </div>
          <div className="min-w-0 h-full">
            <BlocoNumeracaoSequencia data={data} updateField={updateField} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="min-w-0 h-full">
            <CadastroSimplesCard
              icon={FolderKanban}
              titulo="Projetos"
              descricao="Cadastre quantos projetos quiser para organizar a classificação gerencial."
              itens={carregandoCadastros ? [] : projetos}
              onAdicionar={() => setDrawerProjetoAberto(true)}
              onExcluir={excluirProjeto}
              onAlternarAtivo={alternarAtivoProjeto}
              textoVazio={carregandoCadastros ? 'Carregando projetos...' : 'Nenhum projeto cadastrado ainda.'}
            />
          </div>
          <div className="min-w-0 h-full">
            <CadastroSimplesCard
              icon={Building2}
              titulo="Departamentos"
              descricao="Cadastre quantos departamentos quiser para separar a gestão interna."
              itens={carregandoCadastros ? [] : departamentos}
              onAdicionar={() => setDrawerDepartamentoAberto(true)}
              onExcluir={excluirDepartamento}
              onAlternarAtivo={alternarAtivoDepartamento}
              textoVazio={carregandoCadastros ? 'Carregando departamentos...' : 'Nenhum departamento cadastrado ainda.'}
            />
          </div>
        </div>
        </>
      )}

      {abaInterna === 'vendas' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="min-w-0">
            <BlocoPropostas data={data} updateField={updateField} />
          </div>
          <div className="min-w-0">
            <BlocoVendas data={data} updateField={updateField} />
          </div>
        </div>
      )}

      <AnimatePresence>
        {drawerProjetoAberto && (
          <AddCadastroDrawer
            key="drawer-projeto"
            onClose={() => setDrawerProjetoAberto(false)}
            onSave={salvarProjeto}
            saving={salvandoProjeto}
            titulo="Novo projeto"
            descricao={'Crie um novo projeto para usar na classificação gerencial das propostas.'}
            placeholder={'Ex.: Implantação, Expansão, Renovação...'}
            valor={nomeNovoProjeto}
            setValor={setNomeNovoProjeto}
          />
        )}
        {drawerDepartamentoAberto && (
          <AddCadastroDrawer
            key="drawer-departamento"
            onClose={() => setDrawerDepartamentoAberto(false)}
            onSave={salvarDepartamento}
            saving={salvandoDepartamento}
            titulo="Novo departamento"
            descricao={'Crie um novo departamento para organizar os documentos por área.'}
            placeholder={'Ex.: Comercial, Financeiro, Operações...'}
            valor={nomeNovoDepartamento}
            setValor={setNomeNovoDepartamento}
          />
        )}
      </AnimatePresence>

      <div className="flex justify-end mt-6">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </>
  );
}


