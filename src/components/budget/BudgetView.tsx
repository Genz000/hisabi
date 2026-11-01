import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronRight, Plus } from "lucide-react";
import { CategoryBadge } from "@/components/CategoryIcon";
import { MonthRing } from "@/components/MonthScore";
import { PaceBar } from "@/components/PaceBar";
import { CategorySheet } from "./CategorySheet";
import { useHisabi } from "@/data/HisabiStore";
import {
  formatMoney,
  limitState,
  monthStatus,
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

  const month = monthStatus(data.categories, data.transactions);

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
          <CategoryBadge id={c.id} icon={c.icon} />
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
                <PaceBar spent={s} limit={c.monthlyLimit} catId={c.id} className="mt-2" />
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
        <ul className="mt-2 divide-y divide-border overflow-hidden rounded-3xl bg-card shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.12)]">{list.map(row)}</ul>
      </section>
    );

  return (
    <div className="h-full overflow-y-auto px-4 pb-8 pt-2">
      <section className="flex items-center gap-4 rounded-3xl bg-card p-5 shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.12)]">
        <MonthRing limit={month.limit} spent={month.spent} pace={month.pace} size={96} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">Left to spend in {format(new Date(), "MMMM")}</p>
          <p className={cn("font-display text-3xl font-semibold leading-tight tabular", month.left < 0 && "text-destructive")}>
            {formatMoney(month.left, currency)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {month.limit === 0 ? (
              "Give a category a monthly limit to start."
            ) : month.left > 0 ? (
              <>
                About <span className="font-semibold text-foreground tabular">{formatMoney(month.perDay, currency)}</span> a day
                for {month.daysLeft} {month.daysLeft === 1 ? "day" : "days"}.
                {month.pace === "fast" && " A bit faster than the month."}
              </>
            ) : (
              "All limits used for this month."
            )}
          </p>
        </div>
      </section>

      {section("With a limit", limited)}
      {section("No limit", unlimited, "Tap one to give it a monthly limit.")}
      {section("Income", income)}
      {section("Archived", archived, "Hidden from logging. Past entries keep them.")}

      <div className="mt-6 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setAdding("expense")}
          className="flex items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-border py-4 text-sm font-semibold text-primary active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" aria-hidden /> Spending category
        </button>
        <button
          type="button"
          onClick={() => setAdding("income")}
          className="flex items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-border py-4 text-sm font-semibold text-primary active:scale-[0.98]"
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
