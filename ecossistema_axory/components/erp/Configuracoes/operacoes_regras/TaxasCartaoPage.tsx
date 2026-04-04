'use client';

import type { FormEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Edit3, Loader2, Percent, Plus, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/lib/context/company-context';
import { supabase } from '@/lib/supabase';

type FormaPagamentoTaxa = 'CREDITO' | 'DEBITO';

type ParcelaConfig = {
  parcela: number;
  taxa_percentual: number;
  taxa_fixa: number;
  dias_recebimento: number;
};

type TaxaForm = {
  adquirente: string;
  forma_pagamento: FormaPagamentoTaxa;
  padrao: boolean;
  parcelasConfig: ParcelaConfig[];
};

interface AdquirenteListItem {
  key: string;
  adquirente: string;
  formas: FormaPagamentoTaxa[];
  rows: TaxaCartaoRow[];
}

interface TaxaCartaoRow {
  id: string;
  id_empresa?: string | null;
  id_usuario?: string | null;
  adquirente: string;
  forma_pagamento: FormaPagamentoTaxa;
  padrao: boolean;
  parcela: number;
  taxa_percentual: number;
  taxa_fixa: number;
  dias_recebimento: number;
  created_at?: string | null;
  updated_at?: string | null;
}

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const percent = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const FORMA_PAGAMENTO_ORDER: FormaPagamentoTaxa[] = ['CREDITO', 'DEBITO'];

export default function TaxasCartaoPage() {
  const { user } = useAuth();
  const { companyId } = useCompany();
  const { toast } = useToast();

  const [rows, setRows] = useState<TaxaCartaoRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAdquirenteKey, setEditingAdquirenteKey] = useState<string | null>(null);
  const [activeFormaPagamento, setActiveFormaPagamento] = useState<FormaPagamentoTaxa>('CREDITO');
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<TaxaForm>(() => createEmptyForm('CREDITO', 12));
  const [maxParcelasInput, setMaxParcelasInput] = useState('12');
  const [diasRecebimentoPadrao, setDiasRecebimentoPadrao] = useState('30');
  const [taxaFixaPadrao, setTaxaFixaPadrao] = useState('0,00');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const resumo = useMemo(() => {
    const adquirentes = new Set(rows.map((item) => item.adquirente)).size;
    const mediaPercentual = rows.length > 0 ? rows.reduce((acc, item) => acc + item.taxa_percentual, 0) / rows.length : 0;

    return {
      adquirentes,
      linhas: rows.length,
      mediaPercentual,
    };
  }, [rows]);

  const adquirentes = useMemo<AdquirenteListItem[]>(() => {
    const grouped = new Map<string, AdquirenteListItem>();

    rows.forEach((row) => {
      const key = buildAdquirenteKey(row.adquirente);
      const existing = grouped.get(key);
      if (existing) {
        existing.rows.push(row);
        if (!existing.formas.includes(row.forma_pagamento)) {
          existing.formas.push(row.forma_pagamento);
          existing.formas.sort(compareFormaPagamento);
        }
        return;
      }

      grouped.set(key, {
        key,
        adquirente: row.adquirente,
        formas: [row.forma_pagamento],
        rows: [row],
      });
    });

    return Array.from(grouped.values()).sort((a, b) => a.adquirente.localeCompare(b.adquirente, 'pt-BR'));
  }, [rows]);

  const adquirenteEmEdicao = useMemo(
    () => adquirentes.find((item) => item.key === editingAdquirenteKey) ?? null,
    [adquirentes, editingAdquirenteKey],
  );

  async function carregarTaxas() {
    if (!companyId) {
      setRows([]);
      setLoadError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    const { data, error } = await supabase
      .from('erp_taxas_cartao')
      .select('*')
      .eq('id_empresa', companyId)
      .order('adquirente', { ascending: true })
      .order('forma_pagamento', { ascending: true })
      .order('parcelas', { ascending: true });

    if (error) {
      console.error('Erro ao carregar adquirentes:', error);
      setRows([]);
      setLoadError(error.message || 'Nao foi possivel carregar as adquirentes.');
      setLoading(false);
      return;
    }

    setRows(sortRows(((data || []) as Array<Record<string, unknown>>).map(mapTaxaRow)));
    setLoadError(null);
    setLoading(false);
  }

  useEffect(() => {
    if (!user) {
      setRows([]);
      setLoadError(null);
      setLoading(false);
      return;
    }

    if (!companyId) {
      setRows([]);
      setLoadError('Empresa ativa nao encontrada.');
      setLoading(false);
      return;
    }

    void carregarTaxas();
  }, [companyId, user?.id]);

  function hydrateFormFromRows(sourceRows: TaxaCartaoRow[], formaPagamento: FormaPagamentoTaxa) {
    const groupRows = sourceRows.filter((item) => item.forma_pagamento === formaPagamento);
    const referencia = groupRows[0] ?? sourceRows[0];

    setForm({
      adquirente: referencia?.adquirente ?? '',
      forma_pagamento: formaPagamento,
      padrao: Boolean(groupRows[0]?.padrao),
      parcelasConfig: buildConfigsFromRows(groupRows, formaPagamento),
    });
    setMaxParcelasInput(
      String(
        formaPagamento === 'DEBITO'
          ? 1
          : Math.max(...groupRows.map((item) => item.parcela), 1),
      ),
    );
    setDiasRecebimentoPadrao(String(groupRows[0]?.dias_recebimento ?? (formaPagamento === 'DEBITO' ? 1 : 30)));
    setTaxaFixaPadrao(formatDecimalInput(groupRows[0]?.taxa_fixa ?? 0));
  }

  function openNewDialog() {
    setEditingAdquirenteKey(null);
    setActiveFormaPagamento('CREDITO');
    setForm(createEmptyForm('CREDITO', 12));
    setMaxParcelasInput('12');
    setDiasRecebimentoPadrao('30');
    setTaxaFixaPadrao('0,00');
    setFormError(null);
    setDialogOpen(true);
  }

  function openEditDialog(adquirente: AdquirenteListItem) {
    const formaInicial = adquirente.formas.includes('CREDITO') ? 'CREDITO' : adquirente.formas[0] ?? 'CREDITO';

    setEditingAdquirenteKey(adquirente.key);
    setActiveFormaPagamento(formaInicial);
    hydrateFormFromRows(adquirente.rows, formaInicial);
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleDelete(adquirente: AdquirenteListItem) {
    if (!companyId) {
      toast({
        title: 'Empresa nao encontrada',
        description: 'Nao foi possivel identificar a empresa ativa.',
        variant: 'destructive',
      });
      return;
    }

    const idsToDelete = adquirente.rows.map((item) => item.id).filter(Boolean);
    setDeletingId(adquirente.key);

    const { error } = await supabase.from('erp_taxas_cartao').delete().in('id', idsToDelete).eq('id_empresa', companyId);

    if (error) {
      console.error('Erro ao excluir adquirente:', error);
      toast({
        title: 'Nao foi possivel excluir a linha',
        description: error.message,
        variant: 'destructive',
      });
      setDeletingId(null);
      return;
    }

    setRows((current) => current.filter((item) => !idsToDelete.includes(item.id)));
    setDeletingId(null);
    toast({
      title: 'Adquirente excluida com sucesso',
    });
  }

  function handleEditFormaTabChange(formaPagamento: FormaPagamentoTaxa) {
    if (!adquirenteEmEdicao) {
      return;
    }

    setActiveFormaPagamento(formaPagamento);
    hydrateFormFromRows(adquirenteEmEdicao.rows, formaPagamento);
    setFormError(null);
  }

  function handleFormaChange(value: FormaPagamentoTaxa) {
    setFormError(null);
    setMaxParcelasInput(value === 'DEBITO' ? '1' : '12');
    setDiasRecebimentoPadrao(value === 'DEBITO' ? '1' : '30');
    setTaxaFixaPadrao('0,00');
    setForm((current) => {
      if (value === 'DEBITO') {
        return {
          ...current,
          forma_pagamento: value,
          padrao: false,
          parcelasConfig: buildGeneratedParcelasConfig(current.parcelasConfig, 1, value, 1, 0),
        };
      }

      return {
        ...current,
        forma_pagamento: value,
        padrao: false,
        parcelasConfig: buildGeneratedParcelasConfig(current.parcelasConfig, 12, value, 30, 0),
      };
    });
  }

  function handleGerarParcelas() {
    const totalParcelas = form.forma_pagamento === 'DEBITO' ? 1 : clampInteger(maxParcelasInput, 1);
    const diasPadrao = clampInteger(diasRecebimentoPadrao, form.forma_pagamento === 'DEBITO' ? 1 : 0);
    const taxaFixa = parseDecimal(taxaFixaPadrao);

    setFormError(null);
    setForm((current) => ({
      ...current,
      parcelasConfig: buildGeneratedParcelasConfig(current.parcelasConfig, totalParcelas, current.forma_pagamento, diasPadrao, taxaFixa),
    }));
  }

  function updateParcelaConfig(parcela: number, field: keyof Omit<ParcelaConfig, 'parcela'>, value: string) {
    setForm((current) => ({
      ...current,
      parcelasConfig: current.parcelasConfig.map((item) =>
        item.parcela === parcela
          ? {
              ...item,
              [field]: field === 'dias_recebimento' ? clampInteger(value, 0) : parseDecimal(value),
            }
          : item,
      ),
    }));
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const adquirenteNormalizado = form.adquirente.trim();
    if (!adquirenteNormalizado) {
      setFormError('Informe a adquirente antes de salvar.');
      return;
    }

    if (!companyId || !user?.id) {
      setFormError('Nao foi possivel identificar a empresa ou o usuario logado.');
      return;
    }

    const payload = form.parcelasConfig.map((config) => ({
      id_empresa: companyId,
      id_usuario: user.id,
      adquirente: adquirenteNormalizado,
      forma_pagamento: form.forma_pagamento,
      padrao: form.padrao,
      parcelas: config.parcela,
      taxa_percentual: Number(config.taxa_percentual.toFixed(2)),
      taxa_fixa: Number(config.taxa_fixa.toFixed(2)),
      dias_recebimento: Math.max(Math.trunc(config.dias_recebimento), 0),
    }));

    const existingAdquirenteRows = editingAdquirenteKey
      ? rows.filter((item) => buildAdquirenteKey(item.adquirente) === editingAdquirenteKey)
      : [];
    const originalAdquirente = existingAdquirenteRows[0]?.adquirente ?? null;
    const existingGroupRows = existingAdquirenteRows.filter((item) => item.forma_pagamento === form.forma_pagamento);

    const nextRows = payload.map<TaxaCartaoRow>((item) => {
      const existingRow = existingGroupRows.find((row) => row.parcela === item.parcelas);
      return {
        id: existingRow?.id ?? '',
        ...item,
        parcela: item.parcelas,
      };
    });

    const filtered = editingAdquirenteKey
      ? rows.filter(
          (item) =>
            buildAdquirenteKey(item.adquirente) !== editingAdquirenteKey || item.forma_pagamento !== form.forma_pagamento,
        )
      : rows;

    const duplicateConflict = filtered.some((item) =>
      nextRows.some((candidate) => buildRowKey(item) === buildRowKey(candidate)),
    );

    if (duplicateConflict) {
      setFormError('Ja existe uma linha para alguma combinacao de adquirente, forma e parcela desse cadastro.');
      return;
    }

    setIsSaving(true);

    try {
      if (form.padrao) {
        const { error: unsetDefaultError } = await supabase
          .from('erp_taxas_cartao')
          .update({
            is_padrao: false,
            id_usuario: user.id,
          })
          .eq('id_empresa', companyId)
          .eq('forma_pagamento', form.forma_pagamento)
          .eq('is_padrao', true);

        if (unsetDefaultError) {
          throw unsetDefaultError;
        }
      }

      if (editingAdquirenteKey) {
        if (originalAdquirente && originalAdquirente !== adquirenteNormalizado) {
          const { error: renameError } = await supabase
            .from('erp_taxas_cartao')
            .update({
              adquirente: adquirenteNormalizado,
              id_usuario: user.id,
            })
            .eq('id_empresa', companyId)
            .eq('adquirente', originalAdquirente);

          if (renameError) {
            throw renameError;
          }
        }

        const nextParcelas = new Set(nextRows.map((item) => item.parcela));
        const idsToDelete = existingGroupRows
          .filter((item) => !nextParcelas.has(item.parcela))
          .map((item) => item.id);

        if (idsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('erp_taxas_cartao')
            .delete()
            .in('id', idsToDelete)
            .eq('id_empresa', companyId);

          if (deleteError) {
            throw deleteError;
          }
        }

        const updates = nextRows
          .filter((item) => item.id)
          .map((item) =>
            supabase
              .from('erp_taxas_cartao')
              .update({
                adquirente: item.adquirente,
                forma_pagamento: item.forma_pagamento,
                is_padrao: item.padrao,
                parcelas: item.parcela,
                taxa_percentual: item.taxa_percentual,
                taxa_fixa: item.taxa_fixa,
                dias_recebimento: item.dias_recebimento,
                id_usuario: user.id,
              })
              .eq('id', item.id)
              .eq('id_empresa', companyId),
          );

        const inserts = nextRows
          .filter((item) => !item.id)
          .map((item) =>
            supabase.from('erp_taxas_cartao').insert({
              id_empresa: item.id_empresa,
              id_usuario: item.id_usuario,
              adquirente: item.adquirente,
              forma_pagamento: item.forma_pagamento,
              is_padrao: item.padrao,
              parcelas: item.parcela,
              taxa_percentual: item.taxa_percentual,
              taxa_fixa: item.taxa_fixa,
              dias_recebimento: item.dias_recebimento,
            }),
          );

        const responses = await Promise.all([...updates, ...inserts]);
        const operationError = responses.find((response) => response.error)?.error;
        if (operationError) {
          throw operationError;
        }
      } else {
        const { error } = await supabase.from('erp_taxas_cartao').insert(payload);
        if (error) {
          throw error;
        }
      }

      await carregarTaxas();
      setDialogOpen(false);
      setEditingAdquirenteKey(null);
      setActiveFormaPagamento('CREDITO');
      setForm(createEmptyForm('CREDITO', 12));
      setFormError(null);
      toast({
        title: editingAdquirenteKey ? 'Cadastro atualizado com sucesso' : 'Adquirente cadastrada com sucesso',
      });
    } catch (error) {
      console.error('Erro ao salvar adquirente:', error);
      setFormError(error instanceof Error ? error.message : 'Nao foi possivel salvar a adquirente.');
      toast({
        title: 'Nao foi possivel salvar a adquirente',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className="flex min-h-0 flex-col gap-4">
        <Card>
          <CardHeader className="flex flex-col gap-4 border-b border-border px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-xl text-foreground">Adquirentes e Taxas de Parcelamento</CardTitle>
                  <CardDescription className="mt-1">
                    Cadastre e mantenha as taxas reais de cada adquirente, com uma linha por parcela.
                  </CardDescription>
                </div>
              </div>
            </div>

            <Button className="h-11 rounded-2xl px-5" onClick={openNewDialog}>
              <Plus className="h-4 w-4" />
              Nova Adquirente
            </Button>
          </CardHeader>

          <CardContent className="grid gap-4 px-6 py-5 md:grid-cols-3">
            <ResumoCard
              icon={CreditCard}
              label="Adquirentes"
              value={String(resumo.adquirentes)}
              helper="Maquininhas configuradas"
            />
            <ResumoCard
              icon={Percent}
              label="Linhas"
              value={String(resumo.linhas)}
              helper="Registros que seriam enviados ao banco"
            />
            <ResumoCard
              icon={Percent}
              label="Taxa Media"
              value={`${percent.format(resumo.mediaPercentual)}%`}
              helper="Media atual das taxas cadastradas"
            />
          </CardContent>
        </Card>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-[#E5E7EB] bg-white dark:border-[#262626] dark:bg-black">
          <div className="min-h-0 flex-1 overflow-auto">
            <Table className="min-w-full table-fixed">
              <TableHeader className="sticky top-0 z-10 bg-blue-600 dark:bg-blue-700">
                <TableRow className="border-b border-blue-500/30 bg-transparent hover:bg-transparent dark:border-blue-400/30">
                  <TableHead className="w-[30%] px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-white">Adquirente</TableHead>
                  <TableHead className="w-[34%] px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-white">Formas de Pgto</TableHead>
                  <TableHead className="w-[16%] px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-white">Parcelas Configuradas</TableHead>
                  <TableHead className="w-[20%] px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-white">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#E5E7EB] bg-white dark:divide-[#262626] dark:bg-black">
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-gray-500 dark:text-gray-400">
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Carregando adquirentes...
                        </span>
                      </TableCell>
                    </TableRow>
                  ) : loadError ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-destructive">
                        {loadError}
                      </TableCell>
                    </TableRow>
                  ) : adquirentes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-gray-500 dark:text-gray-400">
                        Nenhuma adquirente cadastrada ainda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    adquirentes.map((item) => (
                    <TableRow key={item.key} className="border-0 transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800">
                      <TableCell className="px-5 py-3">
                        <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">{item.adquirente}</span>
                      </TableCell>
                      <TableCell className="px-5 py-3">
                        <div className="flex flex-wrap gap-2">
                          {item.formas.map((forma) => (
                            <Badge key={forma} className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-950/30 dark:text-blue-300">
                              {formatFormaPagamentoLabel(forma)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-3">
                        <span className="block whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          {Math.max(...item.rows.map((row) => row.parcela), 1)}x
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-lg border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-neutral-700 dark:text-slate-200 dark:hover:bg-neutral-800"
                            onClick={() => openEditDialog(item)}
                          >
                            <Edit3 className="h-4 w-4" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                            disabled={deletingId === item.key}
                            onClick={() => void handleDelete(item)}
                          >
                            {deletingId === item.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            Excluir
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    ))
                  )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingAdquirenteKey(null);
            setActiveFormaPagamento('CREDITO');
            setFormError(null);
          }
        }}
      >
        <DialogContent className="flex h-[94vh] max-h-[94vh] max-w-5xl flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
            <DialogTitle>{editingAdquirenteKey ? 'Editar cadastro de adquirente' : 'Cadastro de adquirente'}</DialogTitle>
            <DialogDescription>
              Cadastre a adquirente uma vez e gere abaixo as parcelas com os padroes iniciais. Depois, se quiser, ajuste linha a linha.
            </DialogDescription>
          </DialogHeader>

          <form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={handleSave}>
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-5 py-4 pb-4">
              {formError ? (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {formError}
                </div>
              ) : null}

              {editingAdquirenteKey && adquirenteEmEdicao ? (
                <div className="flex flex-wrap gap-2">
                  {adquirenteEmEdicao.formas.map((forma) => {
                    const active = activeFormaPagamento === forma;
                    return (
                      <button
                        key={forma}
                        type="button"
                        onClick={() => handleEditFormaTabChange(forma)}
                        className={
                          active
                            ? 'inline-flex h-10 items-center rounded-xl border border-primary bg-primary px-4 text-sm font-medium text-primary-foreground transition'
                            : 'inline-flex h-10 items-center rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-muted'
                        }
                      >
                        {formatFormaPagamentoLabel(forma)}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
                <div className="grid gap-3 lg:grid-cols-5">
                <FormField label="Adquirente">
                  <Input
                    value={form.adquirente}
                    onChange={(event) => {
                      setFormError(null);
                      setForm((current) => ({ ...current, adquirente: event.target.value }));
                    }}
                    placeholder="Ex.: Stone, Cielo, Rede"
                    required
                  />
                </FormField>

                {editingAdquirenteKey ? (
                  <FormField label="Forma de Pagamento">
                    <Input value={formatFormaPagamentoLabel(form.forma_pagamento)} disabled />
                  </FormField>
                ) : (
                  <FormField label="Forma de Pagamento">
                    <select
                      value={form.forma_pagamento}
                      onChange={(event) => handleFormaChange(event.target.value as FormaPagamentoTaxa)}
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <option value="CREDITO">CREDITO</option>
                      <option value="DEBITO">DEBITO</option>
                    </select>
                  </FormField>
                )}

                <FormField label="Total de Parcelas">
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={form.forma_pagamento === 'DEBITO' ? '1' : maxParcelasInput}
                    onChange={(event) => setMaxParcelasInput(event.target.value)}
                    disabled={form.forma_pagamento === 'DEBITO'}
                    required
                  />
                </FormField>

                <FormField label="Taxa Fixa (R$)">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={taxaFixaPadrao}
                    onChange={(event) => setTaxaFixaPadrao(normalizeDecimalTextInput(event.target.value))}
                    onFocus={(event) => event.target.select()}
                    placeholder="R$ 0,00"
                  />
                </FormField>

                <FormField label="Dias de Recebimento">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={diasRecebimentoPadrao}
                    onChange={(event) => setDiasRecebimentoPadrao(event.target.value)}
                    required
                  />
                </FormField>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={form.padrao}
                  onClick={() => {
                    setFormError(null);
                    setForm((current) => ({ ...current, padrao: !current.padrao }));
                  }}
                  className="flex w-full items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 text-left transition hover:bg-muted/40"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Forma de pagamento padrao</p>
                    <p className="text-sm text-muted-foreground">
                      Marque se esta adquirente deve ser a padrao para {form.forma_pagamento === 'CREDITO' ? 'credito' : 'debito'}.
                    </p>
                  </div>
                  <span
                    className={
                      form.padrao
                        ? 'relative inline-flex h-7 w-12 shrink-0 rounded-full bg-primary transition'
                        : 'relative inline-flex h-7 w-12 shrink-0 rounded-full bg-muted transition'
                    }
                  >
                    <span
                      className={
                        form.padrao
                          ? 'absolute left-[26px] top-1 h-5 w-5 rounded-full bg-primary-foreground transition'
                          : 'absolute left-1 top-1 h-5 w-5 rounded-full bg-background transition'
                      }
                    />
                  </span>
                </button>

                <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    O nome informado em <span className="font-medium text-foreground">Adquirente</span> vale para todo o cadastro.
                    Primeiro defina os padroes e depois gere as parcelas.
                  </p>
                  <Button type="button" variant="outline" className="shrink-0 rounded-xl" onClick={handleGerarParcelas}>
                    Gerar Linhas
                  </Button>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col space-y-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Configuracao por parcela</p>
                  <p className="text-sm text-muted-foreground">
                    Cada linha abaixo corresponde a uma parcela da mesma adquirente e vira um registro individual no backend.
                  </p>
                </div>

                <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-border bg-card">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-card">
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="w-[120px]">Parcela</TableHead>
                        <TableHead>Taxa Percentual (%)</TableHead>
                        <TableHead>Taxa Fixa (R$)</TableHead>
                        <TableHead>Recebimento (Dias)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.parcelasConfig.map((config) => (
                        <TableRow key={config.parcela}>
                          <TableCell className="font-medium text-foreground">{config.parcela}x</TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={formatDecimalInput(config.taxa_percentual)}
                            onChange={(event) => updateParcelaConfig(config.parcela, 'taxa_percentual', event.target.value)}
                            onFocus={(event) => event.target.select()}
                            placeholder="0,00 %"
                            required
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={formatDecimalInput(config.taxa_fixa)}
                            onChange={(event) => updateParcelaConfig(config.parcela, 'taxa_fixa', event.target.value)}
                            onFocus={(event) => event.target.select()}
                            placeholder="R$ 0,00"
                          />
                        </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={String(config.dias_recebimento)}
                              onChange={(event) => updateParcelaConfig(config.parcela, 'dias_recebimento', event.target.value)}
                              required
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <DialogFooter className="shrink-0 border-t border-border bg-background px-5 py-4 pb-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setEditingAdquirenteKey(null);
                  setActiveFormaPagamento('CREDITO');
                  setFormError(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editingAdquirenteKey ? 'Salvar Cadastro' : 'Cadastrar Adquirente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ResumoCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof CreditCard;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
          <p className="mt-2 text-sm text-muted-foreground">{helper}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function createEmptyForm(formaPagamento: FormaPagamentoTaxa, totalParcelas: number): TaxaForm {
  return {
    adquirente: '',
    forma_pagamento: formaPagamento,
    padrao: false,
    parcelasConfig: buildGeneratedParcelasConfig(
      [],
      formaPagamento === 'DEBITO' ? 1 : totalParcelas,
      formaPagamento,
      formaPagamento === 'DEBITO' ? 1 : 30,
      0,
    ),
  };
}

function buildConfigsFromRows(rows: TaxaCartaoRow[], formaPagamento: FormaPagamentoTaxa): ParcelaConfig[] {
  const sortedRows = [...rows].sort((a, b) => a.parcela - b.parcela);
  const maxParcelas = formaPagamento === 'DEBITO' ? 1 : Math.max(...sortedRows.map((item) => item.parcela), 1);

  return Array.from({ length: maxParcelas }, (_, index) => {
    const parcela = index + 1;
    const existing = sortedRows.find((item) => item.parcela === parcela);

    return (
      existing ?? {
        parcela,
        taxa_percentual: 0,
        taxa_fixa: 0,
        dias_recebimento: formaPagamento === 'DEBITO' ? 1 : 30,
      }
    );
  });
}

function syncParcelasConfig(current: ParcelaConfig[], totalParcelas: number, formaPagamento: FormaPagamentoTaxa) {
  const finalTotal = formaPagamento === 'DEBITO' ? 1 : totalParcelas;

  return Array.from({ length: finalTotal }, (_, index) => {
    const parcela = index + 1;
    const existing = current.find((item) => item.parcela === parcela);
    return existing ?? defaultConfigForParcela(parcela, formaPagamento);
  });
}

function buildGeneratedParcelasConfig(
  current: ParcelaConfig[],
  totalParcelas: number,
  formaPagamento: FormaPagamentoTaxa,
  diasRecebimentoPadrao: number,
  taxaFixaPadrao: number,
) {
  return syncParcelasConfig(current, totalParcelas, formaPagamento).map((item) => ({
    ...item,
    dias_recebimento: diasRecebimentoPadrao,
    taxa_fixa: taxaFixaPadrao,
  }));
}

function defaultConfigForParcela(parcela: number, formaPagamento: FormaPagamentoTaxa): ParcelaConfig {
  return {
    parcela,
    taxa_percentual: 0,
    taxa_fixa: 0,
    dias_recebimento: formaPagamento === 'DEBITO' ? 1 : 30,
  };
}

function parseDecimal(value: string) {
  const masked = normalizeDecimalTextInput(value);
  const parsed = Number(masked.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDecimalInput(value: number) {
  return value.toFixed(2).replace('.', ',');
}

function normalizeDecimalTextInput(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) {
    return '0,00';
  }

  const padded = digits.padStart(3, '0');
  const integerPart = padded.slice(0, -2).replace(/^0+(?=\d)/, '') || '0';
  const decimalPart = padded.slice(-2);
  return `${integerPart},${decimalPart}`;
}

function clampInteger(value: string, minimum: number) {
  const parsed = Math.trunc(Number(value));
  if (!Number.isFinite(parsed)) {
    return minimum;
  }

  return Math.max(parsed, minimum);
}

function normalizeSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildAdquirenteKey(adquirente: string) {
  return normalizeSlug(adquirente);
}

function buildGroupKey(adquirente: string, formaPagamento: FormaPagamentoTaxa) {
  return `${normalizeSlug(adquirente)}::${formaPagamento}`;
}

function compareFormaPagamento(a: FormaPagamentoTaxa, b: FormaPagamentoTaxa) {
  return FORMA_PAGAMENTO_ORDER.indexOf(a) - FORMA_PAGAMENTO_ORDER.indexOf(b);
}

function formatFormaPagamentoLabel(formaPagamento: FormaPagamentoTaxa) {
  return formaPagamento === 'CREDITO' ? 'Credito' : 'Debito';
}

function buildRowKey(row: Pick<TaxaCartaoRow, 'adquirente' | 'forma_pagamento' | 'parcela'>) {
  return `${buildGroupKey(row.adquirente, row.forma_pagamento)}::${row.parcela}`;
}

function sortRows(items: TaxaCartaoRow[]) {
  return [...items].sort((a, b) => {
    const adquirenteCompare = a.adquirente.localeCompare(b.adquirente, 'pt-BR');
    if (adquirenteCompare !== 0) return adquirenteCompare;

    const formaCompare = a.forma_pagamento.localeCompare(b.forma_pagamento, 'pt-BR');
    if (formaCompare !== 0) return formaCompare;

    return a.parcela - b.parcela;
  });
}

function mapTaxaRow(row: Record<string, unknown>): TaxaCartaoRow {
  return {
    id: String(row.id ?? ''),
    id_empresa: typeof row.id_empresa === 'string' ? row.id_empresa : null,
    id_usuario: typeof row.id_usuario === 'string' ? row.id_usuario : null,
    adquirente: String(row.adquirente ?? ''),
    forma_pagamento: normalizeFormaPagamento(row.forma_pagamento),
    padrao: Boolean(row.is_padrao),
    parcela: Number(row.parcelas ?? 1),
    taxa_percentual: Number(row.taxa_percentual ?? 0),
    taxa_fixa: Number(row.taxa_fixa ?? 0),
    dias_recebimento: Number(row.dias_recebimento ?? 0),
    created_at: typeof row.created_at === 'string' ? row.created_at : null,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
  };
}

function normalizeFormaPagamento(value: unknown): FormaPagamentoTaxa {
  return String(value).toUpperCase() === 'DEBITO' ? 'DEBITO' : 'CREDITO';
}
