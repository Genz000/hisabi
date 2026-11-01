import { useEffect } from "react";
import { CloudOff } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { PaceBar } from "@/components/PaceBar";
import { formatMoney, type Category, type Transaction } from "@/lib/hisabi";
import { cn } from "@/lib/utils";

export interface SlipInfo {
  transaction: Transaction;
  category: Category | undefined;
  spentThisMonth: number; // including this transaction
  balance: number;
}

/** The confirmation that rises over the keypad after a save: what was logged and what's left. */
export const ReceiptSlip = ({
  slip,
  currency,
  onUndo,
  onRetry,
  onDone,
}: {
  slip: SlipInfo;
  currency: string;
  onUndo: () => void;
  onRetry: () => void;
  onDone: () => void;
}) => {
  const { transaction: t, category, spentThisMonth, balance } = slip;
  const limit = category?.monthlyLimit ?? null;
  const left = limit !== null ? limit - spentThisMonth : null;

  useEffect(() => {
    const timer = setTimeout(onDone, t.pending ? 9000 : 5000);
    return () => clearTimeout(timer);
  }, [t.id, t.pending, onDone]);

  return (
    <div
      role="status"
      className="absolute inset-x-0 bottom-0 z-20 animate-slip-in rounded-t-[1.4rem] border-t border-border bg-card px-5 pb-6 pt-5 shadow-[0_-12px_32px_-12px_hsl(var(--foreground)/0.25)]"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-full",
            t.type === "income" ? "bg-success/10 text-success" : "bg-secondary text-primary",
          )}
        >
          <CategoryIcon icon={category?.icon ?? null} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-muted-foreground">{t.category}</p>
          <p className="font-display text-2xl font-semibold leading-tight tabular">
            {t.type === "income" ? "+" : ""}
            {formatMoney(t.amount, currency)}
          </p>
        </div>
        <button
          type="button"
          onClick={onUndo}
          className="rounded-full px-4 py-2 text-sm font-semibold text-primary active:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Undo
        </button>
      </div>

      <div className="mt-4">
        {t.type === "income" ? (
          <p className="text-sm text-muted-foreground">
            Balance is now <span className="font-semibold text-foreground tabular">{formatMoney(balance, currency)}</span>
          </p>
        ) : left === null ? (
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground tabular">{formatMoney(spentThisMonth, currency)}</span> on{" "}
            {t.category} this month
          </p>
        ) : (
          <>
            <PaceBar spent={spentThisMonth} limit={limit!} />
            <p className={cn("mt-2 text-sm", left < 0 ? "text-destructive" : "text-muted-foreground")}>
              {left < 0 ? (
                <>
                  Over by <span className="font-semibold tabular">{formatMoney(-left, currency)}</span> this month
                </>
              ) : (
                <>
                  <span className="font-semibold text-foreground tabular">{formatMoney(left, currency)}</span> left this
                  month
                </>
              )}
            </p>
          </>
        )}
      </div>

      {t.pending && (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-warning/10 px-3 py-2.5 text-sm">
          <CloudOff className="h-4 w-4 shrink-0 text-warning" aria-hidden />
          <p className="flex-1">Saved on this phone only. It syncs when you're back online.</p>
          <button type="button" onClick={onRetry} className="font-semibold text-primary">
            Retry
          </button>
        </div>
      )}
    </div>
  );
};
