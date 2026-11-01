import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronRight, Plus } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { PaceBar } from "@/components/PaceBar";
import { CategorySheet } from "./CategorySheet";
import { useHisabi } from "@/data/HisabiStore";
import {
  daysLeftInMonth,
  formatMoney,
  limitState,
  monthProgress,
  totalsThisMonth,
  type Category,
  type Kind,
} from "@/lib/hisabi";
import { cn } from "@/lib/utils";

const STATE_TEXT = {
  near: "Close to limit",
  over: "Over limit",
} as const;

export const BudgetView = () => {
  const { data } = useHisabi();
  const { currency } = data.profile;
  const [editing, setEditing] = useState<Category | null>(null);
  const [adding, setAdding] = useState<Kind | null>(null);

  const spent = useMemo(() => totalsThisMonth(data.transactions, "expense"), [data.transactions]);
  const active = data.categories.filter((c) => !c.archived);
  const limited = active.filter((c) => c.kind === "expense" && c.monthlyLimit !== null).sort((a, b) => a.sortOrder - b.sortOrder);
  const unlimited = active.filter((c) => c.kind === "expense" && c.monthlyLimit === null).sort((a, b) => a.sortOrder - b.sortOrder);
  const income = active.filter((c) => c.kind === "income").sort((a, b) => a.sortOrder - b.sortOrder);
  const archived = data.categories.filter((c) => c.archived);

  const totalLimit = limited.reduce((s, c) => s + (c.monthlyLimit ?? 0), 0);
  const totalSpent = limited.reduce((s, c) => s + (spent.get(c.name) ?? 0), 0);
  const left = totalLimit - totalSpent;
  const daysLeft = daysLeftInMonth();
  const perDay = Math.floor(Math.max(left, 0) / daysLeft);
  const aheadOfPace = totalLimit > 0 && totalSpent > totalLimit * monthProgress();

  const row = (c: Category) => {
    const s = spent.get(c.name) ?? 0;
    const state = limitState(s, c.monthlyLimit);
    return (
      <li key={c.id}>
        <button
          type="button"
          onClick={() => setEditing(c)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-muted focus-visible:bg-muted focus-visible:outline-none"
        >
          <CategoryIcon icon={c.icon} className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate font-semibold">{c.name}</span>
              {c.kind === "expense" && (
                <span className="shrink-0 text-sm text-muted-foreground tabular">
                  <span className="font-semibold text-foreground">{formatMoney(s, currency)}</span>
                  {c.monthlyLimit !== null && ` of ${formatMoney(c.monthlyLimit, currency)}`}
                </span>
              )}
            </div>
            {c.monthlyLimit !== null && (
              <>
                <PaceBar spent={s} limit={c.monthlyLimit} className="mt-2" />
                {(state === "near" || state === "over") && (
                  <p className={cn("mt-1.5 text-xs font-medium", state === "over" ? "text-destructive" : "text-warning")}>
                    {STATE_TEXT[state]}
                  </p>
                )}
              </>
            )}
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </li>
    );
  };

  const section = (title: string, list: Category[], hint?: string) =>
    list.length > 0 && (
      <section className="mt-6">
        <h2 className="px-1 font-display text-lg font-semibold">{title}</h2>
        {hint && <p className="px-1 text-sm text-muted-foreground">{hint}</p>}
        <ul className="mt-2 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">{list.map(row)}</ul>
      </section>
    );

  return (
    <div className="h-full overflow-y-auto px-4 pb-8 pt-2">
      <section className="px-1">
        <p className="text-sm text-muted-foreground">Left to spend in {format(new Date(), "MMMM")}</p>
        <p className={cn("font-display text-5xl font-semibold tracking-tight tabular", left < 0 && "text-destructive")}>
          {formatMoney(left, currency)}
        </p>
        {totalLimit > 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {left > 0 ? (
              <>
                About <span className="font-semibold text-foreground tabular">{formatMoney(perDay, currency)}</span> a day for
                the {daysLeft} {daysLeft === 1 ? "day" : "days"} left.
                {aheadOfPace && " You're spending faster than the month is passing."}
              </>
            ) : (
              "You've used all your limits for this month."
            )}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Set a monthly limit on a category to see what's left.</p>
        )}
        {totalLimit > 0 && <PaceBar spent={totalSpent} limit={totalLimit} className="mt-4 h-3" />}
      </section>

      {section("With a limit", limited)}
      {section("No limit", unlimited, "Tap one to give it a monthly limit.")}
      {section("Income", income)}
      {section("Archived", archived, "Hidden from logging. Past entries keep them.")}

      <div className="mt-6 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setAdding("expense")}
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3.5 text-sm font-semibold text-primary active:bg-muted"
        >
          <Plus className="h-4 w-4" aria-hidden /> Spending category
        </button>
        <button
          type="button"
          onClick={() => setAdding("income")}
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3.5 text-sm font-semibold text-primary active:bg-muted"
        >
          <Plus className="h-4 w-4" aria-hidden /> Income category
        </button>
      </div>

      <CategorySheet
        open={editing !== null || adding !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setAdding(null);
          }
        }}
        category={editing}
        kind={adding ?? "expense"}
      />
    </div>
  );
};
