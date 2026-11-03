import { useCallback, useMemo, useState } from "react";
import { getDay, startOfWeek } from "date-fns";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { CategoryBadge } from "@/components/CategoryIcon";
import { MonthScore } from "@/components/MonthScore";
import { WeeklyRecap } from "@/components/WeeklyRecap";
import { AmountSheet, type AmountEntry } from "./AmountSheet";
import { ReceiptSlip, type SlipInfo } from "./ReceiptSlip";
import { useHisabi } from "@/data/HisabiStore";
import { catStyle } from "@/lib/colors";
import {
  balanceOf,
  debtCashFlow,
  formatNumber,
  isActiveToday,
  limitState,
  monthStatus,
  sortByUsage,
  todayISO,
  toISODate,
  totalsThisMonth,
  type Category,
  type Kind,
} from "@/lib/hisabi";
import { cn } from "@/lib/utils";

// The recap shows on the Log screen on Sundays and Mondays until dismissed for that week.
const recapKey = () => `hisabi.recap.${toISODate(startOfWeek(new Date(), { weekStartsOn: 1 }))}`;
const recapDismissed = () => {
  try {
    return localStorage.getItem(recapKey()) === "1";
  } catch {
    return false;
  }
};

export const QuickAdd = ({ onOpenBudget }: { onOpenBudget: () => void }) => {
  const { data, addTransaction, deleteTransaction, retryPending, checkIn } = useHisabi();
  const { currency, startingBalance } = data.profile;

  const [kind, setKind] = useState<Kind>("expense");
  const [picked, setPicked] = useState<Category | null>(null);
  const [restore, setRestore] = useState<string | undefined>(undefined);
  const [slip, setSlip] = useState<SlipInfo | null>(null);
  const [recapHidden, setRecapHidden] = useState(recapDismissed);

  const categories = useMemo(() => sortByUsage(data.categories, data.transactions, kind), [data, kind]);
  const totals = useMemo(() => totalsThisMonth(data.transactions, kind), [data.transactions, kind]);
  const month = useMemo(() => monthStatus(data.categories, data.transactions), [data.categories, data.transactions]);
  const activeToday = isActiveToday(data.transactions, data.checkIns);
  const day = getDay(new Date());
  const showRecap = !recapHidden && (day === 0 || day === 1) && data.transactions.length > 0;

  const leftFor = (c: Category) => (c.monthlyLimit !== null ? c.monthlyLimit - (totals.get(c.name) ?? 0) : null);

  const save = async ({ amount, date, note }: AmountEntry) => {
    const category = picked;
    if (!category) return;
    setPicked(null);
    setRestore(undefined);
    const saved = await addTransaction({ amount, category: category.name, type: kind, date, description: note });
    const isThisMonth = saved.date.slice(0, 7) === todayISO().slice(0, 7);
    setSlip({
      transaction: saved,
      category,
      spentThisMonth: (totals.get(category.name) ?? 0) + (isThisMonth ? saved.amount : 0),
      balance: balanceOf(data.transactions, startingBalance, debtCashFlow(data.debts, data.debtPayments)) + (kind === "income" ? amount : -amount),
    });
    navigator.vibrate?.(12);
  };

  const undo = async () => {
    if (!slip) return;
    const { transaction: t, category } = slip;
    setSlip(null);
    try {
      await deleteTransaction(t.id);
      // Reopen with the amount so a wrong category or typo is one tap from fixed.
      setRestore(String(t.amount));
      if (category) setPicked(category);
    } catch {
      toast.error("Couldn't undo. Delete it from History instead.");
    }
  };

  const retry = async () => {
    const saved = await retryPending();
    if (saved > 0) {
      toast.success(saved === 1 ? "Synced" : `${saved} expenses synced`);
      setSlip((s) => s && { ...s, transaction: { ...s.transaction, pending: undefined } });
    } else {
      toast.error("Still offline. It stays saved on this phone.");
    }
  };

  const closeSlip = useCallback(() => setSlip(null), []);

  const nothingToday = async () => {
    try {
      await checkIn();
      toast.success("Today counts. Nice, no spending.");
    } catch {
      toast.error("Couldn't save that. Check your connection.");
    }
  };

  const hideRecap = () => {
    try {
      localStorage.setItem(recapKey(), "1");
    } catch {
      // ignore: it just shows again next time
    }
    setRecapHidden(true);
  };

  return (
    <div className="relative h-full overflow-hidden">
      <div className="h-full overflow-y-auto px-4 pb-6 pt-1">
        <MonthScore {...month} currency={currency} onClick={onOpenBudget} />

        {showRecap && (
          <div className="mt-3">
            <WeeklyRecap data={data} currency={currency} onDismiss={hideRecap} />
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-2">
          <div className="flex rounded-full bg-muted p-1 text-sm" role="tablist" aria-label="Type">
            {(["expense", "income"] as const).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={kind === k}
                onClick={() => setKind(k)}
                className={cn(
                  "type-label rounded-full px-4 py-2 transition-colors",
                  kind === k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                {k === "expense" ? "Spent" : "Received"}
              </button>
            ))}
          </div>
          {!activeToday && kind === "expense" && (
            <button
              type="button"
              onClick={nothingToday}
              className="type-label flex items-center gap-1.5 rounded-full bg-success/10 px-3.5 py-2 text-success active:scale-95"
            >
              <Check className="h-4 w-4" aria-hidden />
              Nothing today
            </button>
          )}
        </div>

        <h2 className="type-title mt-6 px-1">
          {kind === "expense" ? "What did you spend on?" : "Where did it come from?"}
        </h2>

        <div className="mt-3 grid grid-cols-3 gap-2.5" aria-label="Categories">
          {categories.map((c, i) => {
            const left = leftFor(c);
            const state = limitState(totals.get(c.name) ?? 0, c.monthlyLimit);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setPicked(c)}
                style={{ ...catStyle(c.id), animationDelay: `${Math.min(i, 8) * 25}ms` }}
                className="flex min-h-[104px] animate-pop flex-col items-center justify-center gap-2 rounded-3xl bg-card p-2.5 text-center shadow-[0_2px_10px_-4px_hsl(var(--foreground)/0.12)] transition-transform [animation-fill-mode:both] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CategoryBadge id={c.id} icon={c.icon} size="lg" />
                <span className="w-full">
                  <span className="type-label line-clamp-2 hyphens-auto" lang="en">
                    {/* let names like "Health/medical" wrap after the slash */}
                    {c.name.replace(/\//g, "/​")}
                  </span>
                  {left !== null && (
                    <span
                      className={cn(
                        "type-meta mt-1 block truncate tabular",
                        state === "over" ? "text-destructive" : state === "near" && "text-warning-ink",
                      )}
                    >
                      {left < 0 ? `${formatNumber(-left)} over` : `${formatNumber(left)} left`}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {slip && <ReceiptSlip slip={slip} currency={currency} onUndo={undo} onRetry={retry} onDone={closeSlip} />}

      <AmountSheet
        category={picked}
        left={picked ? leftFor(picked) : null}
        currency={currency}
        initialAmount={restore}
        onSave={save}
        onClose={() => {
          setPicked(null);
          setRestore(undefined);
        }}
      />
    </div>
  );
};
