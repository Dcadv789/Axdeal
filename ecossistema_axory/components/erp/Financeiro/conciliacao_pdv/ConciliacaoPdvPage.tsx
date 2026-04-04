'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Wallet } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/lib/context/company-context';
import { supabase } from '@/lib/supabase';

type ConciliacaoPdvRow = {
  id_parcela: string;
  codigo_venda: string | null;
  nome_cliente: string | null;
  data_vencimento: string | null;
  forma_pagamento: string | null;
  conta_bancaria: string | null;
  valor_original: number | null;
  valor_taxa: number | null;
  valor_liquido: number | null;
};

type ConciliarParcelaRpcResponse = {
  sucesso?: boolean;
  mensagem?: string;
};

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function formatDate(value: string | null) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('pt-BR');
}

function formatMoney(value: number | null) {
  return brlFormatter.format(Number(value || 0));
}

function normalizeRpcResponse(data: unknown): ConciliarParcelaRpcResponse {
  if (Array.isArray(data)) {
    return normalizeRpcResponse(data[0]);
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    return {
      sucesso: typeof record.sucesso === 'boolean' ? record.sucesso : undefined,
      mensagem: typeof record.mensagem === 'string' ? record.mensagem : undefined,
    };
  }

  return {};
}

export default function ConciliacaoPdvPage() {
  const { toast } = useToast();
  const { companyId } = useCompany();
  const [rows, setRows] = useState<ConciliacaoPdvRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conciliatingId, setConciliatingId] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    if (!companyId) {
      setRows([]);
      setErrorMessage('Empresa ativa nao encontrada para consultar a conciliacao do PDV.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase
        .from('erp_vw_conciliacao_pdv')
        .select('*')
        .eq('id_empresa', companyId)
        .order('data_vencimento', { ascending: true });

      if (error) {
        throw error;
      }

      setRows(Array.isArray(data) ? (data as ConciliacaoPdvRow[]) : []);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Nao foi possivel carregar as parcelas pendentes de conciliacao.';

      setRows([]);
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const summary = useMemo(() => {
    return rows.reduce(
      (accumulator, row) => {
        accumulator.totalBruto += Number(row.valor_original || 0);
        accumulator.totalTaxas += Number(row.valor_taxa || 0);
        accumulator.totalLiquido += Number(row.valor_liquido || 0);
        return accumulator;
      },
      { totalBruto: 0, totalTaxas: 0, totalLiquido: 0 },
    );
  }, [rows]);

  async function handleConciliar(row: ConciliacaoPdvRow) {
    const confirmou = window.confirm(
      `Confirma o recebimento liquido de ${formatMoney(row.valor_liquido)} na conta ${row.conta_bancaria || '-'}?`,
    );

    if (!confirmou) {
      return;
    }

    setConciliatingId(row.id_parcela);

    try {
      const { data, error } = await supabase.rpc('erp_rpc_conciliar_parcela_pdv', {
        p_id_parcela: row.id_parcela,
      });

      if (error) {
        throw error;
      }

      const rpcResult = normalizeRpcResponse(data);

      if (rpcResult.sucesso === false) {
        toast({
          title: 'Nao foi possivel conciliar',
          description: rpcResult.mensagem || 'A parcela nao pode ser conciliada agora.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Parcela conciliada',
        description: rpcResult.mensagem || 'O recebimento foi conciliado com sucesso.',
      });

      await loadRows();
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : 'Nao foi possivel concluir a conciliacao.';

      toast({
        title: 'Erro ao conciliar',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setConciliatingId(null);
    }
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="bg-white dark:bg-black">
          <CardContent className="px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Parcelas pendentes</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{rows.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-black">
          <CardContent className="px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Valor cobrado</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{formatMoney(summary.totalBruto)}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-black">
          <CardContent className="px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Valor liquido</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(summary.totalLiquido)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden bg-white dark:bg-black">
        <CardHeader className="space-y-1">
          <CardTitle>Conferencia do PDV</CardTitle>
          <CardDescription>Recebimentos da frente de caixa que ainda estao com status em aberto.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando parcelas pendentes...
            </div>
          ) : errorMessage ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <Wallet size={24} />
              </div>
              <p className="text-sm font-medium text-foreground">Erro ao carregar conciliacao</p>
              <p className="mt-1 text-sm text-muted-foreground">{errorMessage}</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Wallet size={24} />
              </div>
              <p className="text-sm font-medium text-foreground">Nenhuma parcela pendente de conciliacao</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Quando houver recebimentos em aberto vindos do PDV, eles aparecerao aqui.
              </p>
            </div>
          ) : (
            <Table className="min-w-full">
              <TableHeader className="bg-blue-600 dark:bg-blue-700 [&_tr]:border-0">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-white">Codigo da Venda</TableHead>
                  <TableHead className="text-white">Cliente</TableHead>
                  <TableHead className="text-white">Vencimento</TableHead>
                  <TableHead className="text-white">Forma Pagamento / Conta</TableHead>
                  <TableHead className="text-right text-white">Valor Cobrado</TableHead>
                  <TableHead className="text-right text-white">Taxa</TableHead>
                  <TableHead className="text-right text-white">Valor Liquido</TableHead>
                  <TableHead className="text-right text-white">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const isConciliating = conciliatingId === row.id_parcela;

                  return (
                    <TableRow key={row.id_parcela}>
                      <TableCell className="font-semibold text-foreground">{row.codigo_venda || '-'}</TableCell>
                      <TableCell className="text-foreground">{row.nome_cliente || 'Consumidor Final'}</TableCell>
                      <TableCell className="text-foreground">{formatDate(row.data_vencimento)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">{row.forma_pagamento || '-'}</p>
                          <p className="text-xs text-muted-foreground">{row.conta_bancaria || 'Conta nao informada'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-foreground">{formatMoney(row.valor_original)}</TableCell>
                      <TableCell className="text-right font-medium text-red-600 dark:text-red-400">{formatMoney(row.valor_taxa)}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(row.valor_liquido)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          onClick={() => void handleConciliar(row)}
                          disabled={isConciliating}
                          className="inline-flex h-9 items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
                        >
                          {isConciliating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          Conciliar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
