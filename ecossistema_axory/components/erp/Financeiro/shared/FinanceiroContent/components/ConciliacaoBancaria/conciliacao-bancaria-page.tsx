'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, BadgeCheck, CircleDollarSign, Clock3, FilePlus2, Landmark, ListChecks, PlusCircle, ReceiptText, Search, Trash2, Upload, Wallet, X, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type Status='conciliado'|'nao_conciliado';
type Filtro='todos'|'conciliado'|'nao_conciliado';
type Launch={id:string;titulo:string;cliente:string;documento:string;valor:number;origem:string;data:string};
type Entry={id:string;numero:number;data:string;descricao:string;origem:string;documento:string;valor:number;status:Status;suggestedLaunchIds:string[];conciliadoCom?:string};
type Item={id:string;product:string;quantity:string;price:string};
type Statement={id:string;fileName:string;bank:string;importedAt:string;period:string;entries:number;status:'processado'|'pendente'};

const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const launches:Launch[]=[
  {id:'ERP-101',titulo:'Recebimento venda Atlas',cliente:'Atlas Construções',documento:'PIX-8841',valor:1480,origem:'PDV Loja Centro',data:'2026-03-28'},
  {id:'ERP-102',titulo:'Venda cartão terminal 03',cliente:'Consumidor Final',documento:'POS-2210',valor:920,origem:'PDV Loja Centro',data:'2026-03-28'},
  {id:'ERP-105',titulo:'Taxa Stone março',cliente:'Stone',documento:'TAX-7731',valor:-34.8,origem:'Conciliação automática',data:'2026-03-29'},
];
const baseEntries:Entry[]=[
  {id:'CON-1001',numero:1,data:'2026-03-28',descricao:'Recebimento PIX cliente Atlas',origem:'Banco Inter',documento:'PIX-8841',valor:1480,status:'conciliado',suggestedLaunchIds:['ERP-101'],conciliadoCom:'ERP-101'},
  {id:'CON-1002',numero:2,data:'2026-03-28',descricao:'Venda cartão terminal 03',origem:'Stone',documento:'POS-2210',valor:920,status:'conciliado',suggestedLaunchIds:['ERP-102'],conciliadoCom:'ERP-102'},
  {id:'CON-1003',numero:3,data:'2026-03-29',descricao:'Taxa operadora cartão',origem:'Stone',documento:'TAX-7731',valor:-34.8,status:'nao_conciliado',suggestedLaunchIds:['ERP-105']},
  {id:'CON-1004',numero:4,data:'2026-03-30',descricao:'Recebimento balcão sem vínculo',origem:'Caixa local',documento:'CX-901',valor:180,status:'nao_conciliado',suggestedLaunchIds:[]},
];
const baseStatements:Statement[]=[
  {id:'EXT-101',fileName:'inter-marco.ofx',bank:'Banco Inter',importedAt:'2026-03-30 08:45',period:'01/03 a 30/03',entries:48,status:'processado'},
  {id:'EXT-102',fileName:'bradesco-recebimentos.csv',bank:'Bradesco',importedAt:'2026-03-30 09:12',period:'15/03 a 30/03',entries:21,status:'processado'},
];

export function ConciliacaoBancariaPage(){
  const [entries,setEntries]=useState(baseEntries);
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState<Filtro>('nao_conciliado');
  const [selectedId,setSelectedId]=useState(baseEntries[2].id);
  const [modalOpen,setModalOpen]=useState(false);
  const [saleDate,setSaleDate]=useState('2026-03-30');
  const [fee,setFee]=useState('0');
  const [discount,setDiscount]=useState('0');
  const [items,setItems]=useState<Item[]>([]);
  const [statements,setStatements]=useState(baseStatements);

  const filtered=useMemo(()=>entries.filter(e=>{const q=search.trim().toLowerCase();if(filter!=='todos'&&e.status!==filter)return false;return !q||[e.descricao,e.origem,e.documento].join(' ').toLowerCase().includes(q)}),[entries,search,filter]);
  useEffect(()=>{if(filtered.length&&!filtered.some(e=>e.id===selectedId))setSelectedId(filtered[0].id)},[filtered,selectedId]);
  const selected=useMemo(()=>entries.find(e=>e.id===selectedId)??null,[entries,selectedId]);
  const selectedLaunch=useMemo(()=>launches.find(l=>l.id===selected?.conciliadoCom)??null,[selected]);
  const suggestions=useMemo(()=>selected?launches.filter(l=>selected.suggestedLaunchIds.includes(l.id)):[],[selected]);
  const summary=useMemo(()=>{const ok=entries.filter(e=>e.status==='conciliado');const pend=entries.filter(e=>e.status==='nao_conciliado');return{ok:ok.length,pend:pend.length,total:entries.reduce((a,e)=>a+e.valor,0),pending:pend.reduce((a,e)=>a+e.valor,0),suggested:launches.reduce((a,l)=>a+l.valor,0)}},[entries]);
  const itemsTotal=useMemo(()=>items.reduce((a,i)=>a+(Number(i.quantity)||0)*(Number(i.price)||0),0),[items]);
  const grandTotal=useMemo(()=>itemsTotal+(Number(fee)||0)-(Number(discount)||0),[discount,fee,itemsTotal]);

  const sanitize=(v:string)=>v.replace(',','.').replace(/[^\d.]/g,'');
  const openSale=(entry:Entry)=>{setSaleDate(entry.data);setFee('0');setDiscount('0');setItems([{id:`QS-${entry.id}-1`,product:entry.descricao,quantity:'1',price:String(Number(entry.valor.toFixed(2)))}]);setModalOpen(true)};
  const addItem=()=>setItems(c=>[...c,{id:`QS-${Date.now()}`,product:'',quantity:'1',price:'0'}]);
  const updateItem=(id:string,key:'product'|'quantity'|'price',value:string)=>setItems(c=>c.map(i=>i.id===id?{...i,[key]:key==='product'?value:sanitize(value)}:i));
  const removeItem=(id:string)=>setItems(c=>c.length>1?c.filter(i=>i.id!==id):c);
  const reconcile=(entryId:string,launchId:string)=>{setEntries(c=>c.map(e=>e.id===entryId?{...e,status:'conciliado',conciliadoCom:launchId}:e));toast.success(`Lançamento ${launchId} conciliado com o extrato.`)};
  const finishSale=(entryId:string)=>{const target=entries.find(e=>e.id===entryId);if(!target)return;setEntries(c=>c.map(e=>e.id===entryId?{...e,status:'conciliado',conciliadoCom:'VENDA-RAPIDA'}:e));toast.success(`Venda mockada finalizada em ${money.format(grandTotal||target.valor)}.`);setModalOpen(false)};
  const upload=()=>{setStatements(c=>[{id:`EXT-${Date.now()}`,fileName:`extrato-conciliacao-${c.length+1}.ofx`,bank:'Banco mockado',importedAt:'2026-03-30 10:30',period:'25/03 a 30/03',entries:16,status:'processado'},...c]);toast.success('Extrato mockado enviado para a conciliação.')};

  return <motion.main className="flex w-full flex-col gap-5 py-6" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}>
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Badge className="w-fit">Conciliação</Badge>
            <div>
              <CardTitle className="text-2xl">Conciliação Bancária</CardTitle>
              <CardDescription className="mt-1 max-w-3xl">Ambiente mockado para leitura de extrato, sugestão de lançamentos e criação de nova venda quando não houver correspondência.</CardDescription>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <p className="text-xs uppercase tracking-[0.18em] text-primary">Base mockada</p>
            <p className="mt-2">Fluxo local para validar a operação antes da integração bancária real.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Metric label="Já conciliados" value={String(summary.ok)} icon={BadgeCheck} tone="text-primary"/>
        <Metric label="Não conciliados" value={String(summary.pend)} icon={Clock3} tone="text-muted-foreground"/>
        <Metric label="Total do extrato" value={money.format(summary.total)} icon={Landmark} tone="text-primary"/>
        <Metric label="Pendente" value={money.format(summary.pending)} icon={Wallet} tone="text-destructive"/>
        <Metric label="ERP sugerido" value={money.format(summary.suggested)} icon={ArrowLeftRight} tone="text-secondary-foreground"/>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Upload de extratos</CardTitle>
            <CardDescription>Envie novos arquivos mockados e acompanhe os extratos carregados.</CardDescription>
          </div>
          <Button onClick={upload} className="h-11 rounded-2xl text-sm font-semibold"><Upload className="mr-2 h-4 w-4"/>Upload do extrato</Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-2">
        {statements.map(s=><div key={s.id} className="rounded-2xl border border-border bg-background px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{s.fileName}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>{s.bank}</span><span className="h-1 w-1 rounded-full bg-border"/><span>{s.period}</span></div>
            </div>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{s.status==='processado'?'Processado':'Pendente'}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground"><span>Importado em {s.importedAt}</span><span>{s.entries} lançamentos</span></div>
        </div>)}
      </CardContent>
    </Card>

    <section className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div><CardTitle>Lançamentos do extrato</CardTitle><CardDescription>Busca e seleção dos itens importados.</CardDescription></div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground"><ListChecks className="h-3.5 w-3.5"/>{filtered.length} registros</div>
          </div>
          <div className="space-y-3">
            <div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por banco, documento ou descrição" className="h-11 rounded-2xl pl-11"/></div>
            <div className="flex flex-wrap gap-2">{([{value:'todos',label:'Todos'},{value:'conciliado',label:'Já conciliados'},{value:'nao_conciliado',label:'Não conciliados'}] as const).map(o=><button key={o.value} type="button" onClick={()=>setFilter(o.value)} className={`inline-flex h-10 items-center rounded-xl border px-4 text-sm font-medium transition ${filter===o.value?'border-primary/20 bg-primary text-primary-foreground':'border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}>{o.label}</button>)}</div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {filtered.map(e=><button key={e.id} type="button" onClick={()=>setSelectedId(e.id)} className={`w-full rounded-2xl border px-4 py-3 text-left transition ${selected?.id===e.id?'border-primary/30 bg-primary/5':'border-border bg-background hover:border-primary/20 hover:bg-accent/40'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">#{e.numero}</span><StatusBadge status={e.status}/></div>
                <p className="text-sm font-semibold text-foreground">{e.descricao}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>{e.origem}</span><span className="h-1 w-1 rounded-full bg-border"/><span>{formatDate(e.data)}</span></div>
              </div>
              <p className={`shrink-0 pt-1 text-base font-semibold ${e.valor>=0?'text-primary':'text-destructive'}`}>{money.format(e.valor)}</p>
            </div>
          </button>)}
          {!filtered.length&&<div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">Nenhum lançamento encontrado para o filtro atual.</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Painel de análise</CardTitle><CardDescription>Clique em um lançamento para ver sugestões ou abrir uma nova venda.</CardDescription></CardHeader>
        <CardContent>{selected?<div className="space-y-4">
          <div className="rounded-3xl border border-border bg-muted/30 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><Badge>Extrato selecionado</Badge><StatusBadge status={selected.status}/></div>
                <h3 className="mt-3 text-lg font-semibold text-foreground">{selected.descricao}</h3>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2"><span>Banco: {selected.origem}</span><span>Data: {formatDate(selected.data)}</span><span>Documento: {selected.documento}</span><span>Número: #{selected.numero}</span></div>
              </div>
              <div className="rounded-2xl border border-border bg-background px-4 py-3 text-right"><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Valor no banco</p><p className={`mt-2 text-xl font-bold ${selected.valor>=0?'text-primary':'text-destructive'}`}>{money.format(selected.valor)}</p></div>
            </div>
          </div>
          {selected.status==='conciliado'?<div className="rounded-3xl border border-primary/20 bg-primary/10 p-4"><div className="flex items-start gap-3"><BadgeCheck className="mt-0.5 h-6 w-6 text-primary"/><div className="space-y-2"><p className="text-base font-semibold text-foreground">Lançamento já conciliado</p><p className="text-sm text-muted-foreground">Este item já foi tratado e está em modo somente leitura.</p><div className="rounded-2xl border border-border bg-card p-3 text-sm">{selectedLaunch?<><p className="font-semibold text-foreground">{selectedLaunch.titulo}</p><div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>{selectedLaunch.cliente}</span><span className="h-1 w-1 rounded-full bg-border"/><span>{selectedLaunch.documento}</span><span className="h-1 w-1 rounded-full bg-border"/><span>{formatDate(selectedLaunch.data)}</span></div></>:<><p className="font-semibold text-foreground">Baixa criada por nova venda</p><p className="text-xs text-muted-foreground">O fluxo mockado gerou a venda diretamente na conciliação.</p></>}</div></div></div></div>
          :suggestions.length?<div className="space-y-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-semibold text-foreground">Sugestões com base nos lançamentos da empresa</p><Button onClick={()=>openSale(selected)} className="h-10 rounded-2xl px-4 text-sm font-semibold"><FilePlus2 className="mr-2 h-4 w-4"/>Nova venda</Button></div>{suggestions.map(l=><div key={l.id} className="rounded-2xl border border-border bg-background p-3.5"><div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-foreground">{l.titulo}</p><div className="mt-2 grid gap-1.5 text-xs text-muted-foreground md:grid-cols-2"><span>Cliente: {l.cliente}</span><span>Documento: {l.documento}</span><span>Origem: {l.origem}</span><span>Data: {formatDate(l.data)}</span></div></div><div className="flex w-full flex-col items-start gap-2 xl:w-[220px] xl:items-stretch"><div className="inline-flex items-center gap-2 rounded-2xl border border-border bg-muted/40 px-4 py-2.5"><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Valor ERP</p><p className={`text-sm font-semibold ${l.valor>=0?'text-primary':'text-destructive'}`}>{money.format(l.valor)}</p></div><Button onClick={()=>reconcile(selected.id,l.id)} className="h-10 rounded-2xl px-4 text-sm font-semibold xl:w-full"><BadgeCheck className="mr-2 h-4 w-4"/>Conciliar lançamento</Button></div></div></div>)}</div>
          :<div className="rounded-3xl border border-border bg-muted/30 p-4"><div className="flex items-start gap-3"><CircleDollarSign className="mt-0.5 h-6 w-6 text-primary"/><div className="flex-1 space-y-3"><div><p className="text-base font-semibold text-foreground">Nenhuma sugestão encontrada</p><p className="mt-2 text-sm text-muted-foreground">Não existe lançamento correspondente na empresa para esse item. Abra uma nova venda mockada e liquide por aqui.</p></div><Button onClick={()=>openSale(selected)} className="h-11 rounded-2xl text-sm font-semibold"><FilePlus2 className="mr-2 h-4 w-4"/>Nova venda</Button></div></div></div>}
        </div>:<div className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-muted/20 text-center"><ReceiptText className="h-8 w-8 text-muted-foreground"/><p className="text-base font-medium text-foreground">Nenhum lançamento selecionado</p><p className="max-w-md text-xs text-muted-foreground">Escolha um item da lista à esquerda para ver a análise e as sugestões.</p></div>}</CardContent>
      </Card>
    </section>

    {modalOpen&&selected&&selected.status==='nao_conciliado'&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm"><div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-border bg-card shadow-2xl"><div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5"><div><p className="text-xs uppercase tracking-[0.18em] text-primary">Nova venda</p><h3 className="mt-2 text-xl font-semibold text-foreground">Gerar venda mockada</h3><p className="mt-2 text-sm text-muted-foreground">Configure produtos, quantidade, preço, taxas e finalize a venda para liquidar o lançamento selecionado.</p></div><button type="button" onClick={()=>setModalOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"><X className="h-4 w-4"/></button></div><div className="grid flex-1 gap-5 overflow-y-auto px-6 py-5 xl:grid-cols-[0.68fr_1.32fr]"><div className="space-y-4"><div className="rounded-2xl border border-border bg-background p-4"><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Extrato</p><div className="mt-3 space-y-2 text-sm text-foreground"><p><span className="text-muted-foreground">Banco:</span> {selected.origem}</p><p><span className="text-muted-foreground">Data:</span> {formatDate(selected.data)}</p><p><span className="text-muted-foreground">Descrição:</span> {selected.descricao}</p><p><span className="text-muted-foreground">Valor:</span> {money.format(selected.valor)}</p></div></div><div className="rounded-2xl border border-primary/20 bg-primary/10 p-4"><p className="text-xs uppercase tracking-[0.16em] text-primary">Cabeçalho da venda</p><div className="mt-3 space-y-2 text-sm text-foreground"><p><span className="text-muted-foreground">Cliente:</span> Consumidor Final</p><p><span className="text-muted-foreground">Origem:</span> Conciliação bancária</p><p><span className="text-muted-foreground">Situação:</span> Venda rápida mockada</p></div></div><div className="rounded-2xl border border-border bg-background p-4"><p className="mb-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">Data da venda</p><Input value={saleDate} onChange={e=>setSaleDate(e.target.value)} className="h-10 rounded-xl"/></div></div><div className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-foreground">Produtos da venda</p><p className="text-xs text-muted-foreground">Edite os itens antes de finalizar.</p></div><Button type="button" variant="outline" onClick={addItem} className="h-9 rounded-xl px-3 text-xs"><PlusCircle className="mr-2 h-4 w-4"/>Adicionar produto</Button></div><div className="overflow-hidden rounded-2xl border border-border bg-background"><div className="grid grid-cols-[minmax(0,1.7fr)_72px_92px_110px_52px] gap-3 border-b border-border px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"><span>Produto</span><span>Qtd</span><span>Preço</span><span>Total</span><span className="text-right">Ação</span></div>{items.map(i=>{const total=(Number(i.quantity)||0)*(Number(i.price)||0);return <div key={i.id} className="grid grid-cols-[minmax(0,1.7fr)_72px_92px_110px_52px] gap-3 border-b border-border px-4 py-3 last:border-b-0"><Input value={i.product} onChange={e=>updateItem(i.id,'product',e.target.value)} placeholder="Nome do produto" className="h-9 rounded-lg"/><Input value={i.quantity} onChange={e=>updateItem(i.id,'quantity',e.target.value)} placeholder="Qtd" className="h-9 rounded-lg"/><Input value={i.price} onChange={e=>updateItem(i.id,'price',e.target.value)} placeholder="Preço" className="h-9 rounded-lg"/><div className="flex h-9 items-center rounded-lg border border-border bg-muted/40 px-3 text-sm font-semibold text-foreground">{money.format(total)}</div><div className="flex h-9 items-center justify-end"><button type="button" onClick={()=>removeItem(i.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"><Trash2 className="h-3.5 w-3.5"/></button></div></div>})}</div><div className="grid gap-3 md:grid-cols-2"><div className="rounded-2xl border border-border bg-background p-4"><p className="mb-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">Taxas</p><Input value={fee} onChange={e=>setFee(sanitize(e.target.value))} className="h-10 rounded-xl"/></div><div className="rounded-2xl border border-border bg-background p-4"><p className="mb-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">Desconto</p><Input value={discount} onChange={e=>setDiscount(sanitize(e.target.value))} className="h-10 rounded-xl"/></div></div><div className="rounded-2xl border border-primary/20 bg-primary/10 p-4"><div className="space-y-2 text-sm text-foreground"><div className="flex items-center justify-between"><span>Produtos</span><span>{money.format(itemsTotal)}</span></div><div className="flex items-center justify-between"><span>Taxas</span><span>{money.format(Number(fee)||0)}</span></div><div className="flex items-center justify-between"><span>Desconto</span><span>{money.format(Number(discount)||0)}</span></div><div className="flex items-center justify-between border-t border-border pt-3 text-base font-semibold"><span>Total final</span><span>{money.format(grandTotal)}</span></div></div></div></div></div><div className="flex flex-col gap-3 border-t border-border px-6 py-5 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={()=>setModalOpen(false)} className="h-11 rounded-2xl">Cancelar</Button><Button type="button" onClick={()=>finishSale(selected.id)} className="h-11 rounded-2xl text-sm font-semibold"><PlusCircle className="mr-2 h-4 w-4"/>Finalizar venda</Button></div></div></div>}
  </motion.main>;
}

export default ConciliacaoBancariaPage;

function Metric({label,value,icon:Icon,tone}:{label:string;value:string;icon:LucideIcon;tone:string}){return <div className="rounded-2xl border border-border bg-muted/30 p-4"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{label}</p><Icon className={`h-4 w-4 ${tone}`}/></div><p className="mt-4 text-xl font-semibold text-foreground">{value}</p></div>}
function StatusBadge({status}:{status:Status}){const styles=status==='conciliado'?'border-primary/20 bg-primary/10 text-primary':'border-border bg-muted text-muted-foreground';return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${styles}`}>{status==='conciliado'?'Conciliado':'Não conciliado'}</span>}
function formatDate(value:string){return new Intl.DateTimeFormat('pt-BR').format(new Date(`${value}T00:00:00`))}
