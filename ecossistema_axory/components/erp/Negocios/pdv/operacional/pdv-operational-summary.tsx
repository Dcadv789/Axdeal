import { FileSymlink, History, Receipt, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

type PdvOperationalSummaryProps = {
  operatorName: string;
  linkedDocumentCode: string | null;
  linkedDocumentDescription: string | null;
  onOpenLinkModal: () => void;
  onPrintReceipt: () => void;
  onOpenLastSales: () => void;
};

export function PdvOperationalSummary({
  operatorName,
  linkedDocumentCode,
  linkedDocumentDescription,
  onOpenLinkModal,
  onPrintReceipt,
  onOpenLastSales,
}: PdvOperationalSummaryProps) {
  return (
    <div className="shrink-0 flex flex-col gap-2 xl:flex-row xl:items-stretch">
      <InfoPanel
        icon={UserRound}
        label="Operador"
        value={operatorName}
        helper="Usuario do sistema"
        helperIcon={ShieldCheck}
      />
      <ActionPanel
        icon={FileSymlink}
        label="Pedido de Venda/O.S"
        value={linkedDocumentCode ?? "Nenhum vinculo"}
        helper={linkedDocumentDescription ?? "Sem documento vinculado"}
        buttonLabel="Vincular"
        buttonShortcut="F3"
        onClick={onOpenLinkModal}
      />
      <ControlButton icon={Receipt} label="Recibo" shortcut="F9" onClick={onPrintReceipt} />
      <ControlButton icon={History} label="Ultimas vendas" shortcut="F10" onClick={onOpenLastSales} />
    </div>
  );
}

const panelClass = "min-w-0 rounded-2xl border border-[#E5E7EB] bg-white text-card-foreground shadow-sm dark:border-[#262626] dark:bg-black dark:shadow-none";
const iconShellClass = "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-700 dark:border-primary/20 dark:bg-primary/10 dark:text-primary";
const helperBadgeClass = "mt-1 inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-slate-50 px-2 py-1 text-[11px] text-slate-600 dark:border-[#262626] dark:bg-neutral-900 dark:text-muted-foreground";

function InfoPanel({
  icon: Icon,
  label,
  value,
  helper,
  helperIcon: HelperIcon,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  helper: string;
  helperIcon: typeof ShieldCheck;
}) {
  return (
    <div className={`${panelClass} p-3 xl:flex-[0.34]`}>
      <div className="flex items-center gap-3">
        <div className={iconShellClass}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-sm font-semibold text-card-foreground">{value}</p>
          <div className={helperBadgeClass}>
            <HelperIcon className="h-3.5 w-3.5 text-primary" />
            {helper}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionPanel({
  icon: Icon,
  label,
  value,
  helper,
  buttonLabel,
  buttonShortcut,
  onClick,
}: {
  icon: typeof FileSymlink;
  label: string;
  value: string;
  helper: string;
  buttonLabel: string;
  buttonShortcut: string;
  onClick: () => void;
}) {
  return (
    <div className={`${panelClass} p-3 xl:flex-[0.42]`}>
      <div className="flex items-center gap-3">
        <div className={iconShellClass}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-sm font-semibold text-card-foreground">{value}</p>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">{helper}</p>
        </div>
        <Button onClick={onClick} variant="ghost" className="h-9 shrink-0 rounded-xl border border-[#E5E7EB] bg-white px-3 text-[11px] text-slate-700 hover:bg-slate-50 dark:border-[#262626] dark:bg-neutral-900 dark:text-foreground dark:hover:bg-neutral-800">
          <span>{buttonLabel}</span>
          <span className="ml-2 rounded-lg border border-blue-200 bg-white px-2 py-0.5 text-[10px] tracking-[0.14em] text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300">
            {buttonShortcut}
          </span>
        </Button>
      </div>
    </div>
  );
}

function ControlButton({
  icon: Icon,
  label,
  shortcut,
  onClick,
}: {
  icon: typeof Receipt;
  label: string;
  shortcut: string;
  onClick: () => void;
}) {
  return (
    <Button
      onClick={onClick}
      variant="ghost"
      className="h-full min-h-20 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 hover:border-blue-200 hover:bg-slate-50 xl:min-w-[178px] dark:border-[#262626] dark:bg-black dark:text-card-foreground dark:hover:border-neutral-700 dark:hover:bg-neutral-900"
    >
      <div className="flex w-full items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <span className="min-w-0 flex-1 text-left leading-tight">{label}</span>
        <span className="rounded-full border border-blue-200 bg-white px-2.5 py-0.5 text-[10px] tracking-[0.18em] text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300">
          {shortcut}
        </span>
      </div>
    </Button>
  );
}
