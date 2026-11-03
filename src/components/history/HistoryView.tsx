import { useMemo, useState } from "react";
import { format, getDaysInMonth, parseISO, subDays, subMonths } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, CloudOff } from "lucide-react";
import { CategoryBadge } from "@/components/CategoryIcon";
import { WeeklyRecap } from "@/components/WeeklyRecap";
import { Money } from "@/components/Money";
import { SpendingChart } from "@/components/SpendingChart";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { TransactionSheet } from "./TransactionSheet";
import { useHisabi } from "@/data/HisabiStore";
import { balanceOf, debtCashFlow, formatMoney, monthOf, monthStatus, todayISO, toISODate, type Transaction } from "@/lib/hisabi";
import { cn } from "@/lib/utils";

const PAGE = 60;

const dayTitle = (iso: string) => {
  if (iso === todayISO()) return "Today";
  if (iso === toISODate(subDays(new Date(), 1))) return "Yesterday";
  return format(parseISO(iso), "EEEE d MMMM");
};

export const HistoryView = () => {
  const { data } = useHisabi();
  const { currency, startingBalance } = data.profile;
  const [filter, setFilter] = useState<"all" | "expense" | "income">("all");
  const [shown, setShown] = useState(PAGE);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const cats = useMemo(() => new Map(data.categories.map((c) => [`${c.kind}:${c.name}`, c])), [data.categories]);

  const month = monthOf(todayISO());
  const thisMonth = data.transactions.filter((t) => monthOf(t.date) === month);
  const out = thisMonth.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const inc = thisMonth.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const balance = balanceOf(data.transactions, startingBalance, debtCashFlow(data.debts, data.debtPayments));
  const net = inc - out;

  // Last month up to the same day, so early-month numbers compare fairly
  const lastMonthDay = toISODate(subMonths(new Date(), 1));
  const lastMonthSoFar = data.transactions
    .filter((t) => t.type === "expense" && monthOf(t.date) === monthOf(lastMonthDay) && t.date <= lastMonthDay)
    .reduce((s, t) => s + t.amount, 0);
  const spentChange = lastMonthSoFar > 0 ? (out - lastMonthSoFar) / lastMonthSoFar : null;

  const limits = monthStatus(data.categories, data.transactions).limit;
  const dailyBudget = limits > 0 ? limits / getDaysInMonth(new Date()) : null;

  const list = data.transactions.filter((t) => filter === "all" || t.type === filter);
  const days = useMemo(() => {
    const groups: { date: string; items: Transaction[]; total: number }[] = [];
    for (const t of list.slice(0, shown)) {
      let g = groups[groups.length - 1];
      if (!g || g.date !== t.date) groups.push((g = { date: t.date, items: [], total: 0 }));
      g.items.push(t);
      g.total += t.type === "expense" ? t.amount : 0;
    }
    return groups;
  }, [list, shown]);

  return (
    <div className="h-full overflow-y-auto px-4 pb-8 pt-2">
      <section className="overflow-hidden rounded-3xl bg-card shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.12)]">
        <div className="px-5 pb-4 pt-5">
          <p className="type-meta">Balance</p>
          <p className={cn("type-screen mt-1", balance < 0 && "text-destructive")}>
            <Money value={balance} currency={currency} />
          </p>
          {(out > 0 || inc > 0) && (
            <p className="mt-2 text-sm text-muted-foreground">
              <span className={cn("font-semibold tabular", net >= 0 ? "text-success" : "text-foreground")}>
                {net >= 0 ? "+" : "−"}
                {formatMoney(Math.abs(net), currency)}
              </span>{" "}
              in {format(new Date(), "MMMM")} so far
            </p>
          )}
        </div>
        <dl className="grid grid-cols-2 divide-x divide-border border-t border-border">
          <div className="px-5 py-4">
            <dt className="type-meta flex items-center gap-1.5">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-primary/10 text-primary" aria-hidden>
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
              Spent
            </dt>
            <dd className="type-stat mt-2">
              <Money value={out} currency={currency} />
            </dd>
            {spentChange !== null && (
              <dd className={cn("type-meta mt-1", spentChange > 0.1 ? "text-warning-ink" : spentChange < 0 && "text-success")}>
                {Math.abs(Math.round(spentChange * 100))}% {spentChange > 0 ? "more" : "less"} than last month
              </dd>
            )}
          </div>
          <div className="px-5 py-4">
            <dt className="type-meta flex items-center gap-1.5">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-success/10 text-success" aria-hidden>
                <ArrowDownLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
              Received
            </dt>
            <dd className="type-stat mt-2 text-success">
              <Money value={inc} currency={currency} />
            </dd>
          </div>
        </dl>
      </section>

      {data.transactions.length > 0 && (
        <div className="mt-4">
          <WeeklyRecap data={data} currency={currency} />
        </div>
      )}

      <div className="mt-8 flex rounded-full bg-muted p-1" role="tablist" aria-label="Show">
        {(
          [
            ["all", "All"],
            ["expense", "Spent"],
            ["income", "Received"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={filter === key}
            onClick={() => {
              setFilter(key);
              setShown(PAGE);
            }}
            className={cn(
              "type-label flex-1 rounded-full py-2 transition-colors",
              filter === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {days.length === 0 ? (
        <p className="mt-10 text-center text-muted-foreground">
          {data.transactions.length === 0 ? "Nothing logged yet. Your first expense shows up here." : "Nothing here yet."}
        </p>
      ) : (
        days.map((day) => (
          <section key={day.date} className="mt-5">
            <div className="flex items-baseline justify-between px-1">
              <h2 className="type-label">{dayTitle(day.date)}</h2>
              {day.total > 0 && (
                <span className="type-meta tabular">{formatMoney(day.total, currency)}</span>
              )}
            </div>
            <ul className="mt-2 divide-y divide-border overflow-hidden rounded-3xl bg-card shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.12)]">
              {day.items.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setEditing(t)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <CategoryBadge
                      id={cats.get(`${t.type}:${t.category}`)?.id}
                      icon={cats.get(`${t.type}:${t.category}`)?.icon ?? null}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="type-item truncate">{t.category}</p>
                      {t.description && <p className="type-meta mt-0.5 truncate">{t.description}</p>}
                    </div>
                    {t.pending && <CloudOff className="h-4 w-4 shrink-0 text-warning" aria-label="Not synced yet" />}
                    <Money
                      value={t.amount}
                      currency={currency}
                      sign={t.type === "income" ? "+" : "−"}
                      className={cn("type-item shrink-0", t.type === "income" && "text-success")}
                    />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {list.length > shown && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE)}
          className="type-label mt-5 w-full rounded-3xl bg-secondary py-3.5 text-primary active:scale-[0.98]"
        >
          Show older
        </button>
      )}

      {data.transactions.length > 0 && (
        <section className="mt-8 space-y-3">
          <h2 className="type-title px-1">Trends</h2>
          <SpendingChart transactions={data.transactions} currency={currency} dailyBudget={dailyBudget} />
          <CategoryBreakdown transactions={data.transactions} categories={data.categories} currency={currency} />
        </section>
      )}

      <TransactionSheet transaction={editing} onClose={() => setEditing(null)} />
    </div>
  );
};
