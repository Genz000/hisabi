import { useMemo, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { CloudOff } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { SpendingChart } from "@/components/SpendingChart";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { TransactionSheet } from "./TransactionSheet";
import { useHisabi } from "@/data/HisabiStore";
import { balanceOf, formatMoney, monthOf, todayISO, toISODate, type Transaction } from "@/lib/hisabi";
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

  const icons = useMemo(() => new Map(data.categories.map((c) => [`${c.kind}:${c.name}`, c.icon])), [data.categories]);

  const month = monthOf(todayISO());
  const thisMonth = data.transactions.filter((t) => monthOf(t.date) === month);
  const out = thisMonth.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const inc = thisMonth.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const balance = balanceOf(data.transactions, startingBalance);

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
      <section className="px-1">
        <p className="text-sm text-muted-foreground">Balance</p>
        <p className={cn("font-display text-5xl font-semibold tracking-tight tabular", balance < 0 && "text-destructive")}>
          {formatMoney(balance, currency)}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-card px-4 py-3">
            <dt className="text-sm text-muted-foreground">Spent in {format(new Date(), "MMMM")}</dt>
            <dd className="font-display text-xl font-semibold tabular">{formatMoney(out, currency)}</dd>
          </div>
          <div className="rounded-2xl bg-card px-4 py-3">
            <dt className="text-sm text-muted-foreground">Received</dt>
            <dd className="font-display text-xl font-semibold text-success tabular">{formatMoney(inc, currency)}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-6 flex rounded-full bg-muted p-0.5 text-sm" role="tablist" aria-label="Show">
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
              "flex-1 rounded-full py-1.5 font-medium transition-colors",
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
              <h2 className="font-semibold">{dayTitle(day.date)}</h2>
              {day.total > 0 && (
                <span className="text-sm text-muted-foreground tabular">{formatMoney(day.total, currency)}</span>
              )}
            </div>
            <ul className="mt-2 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {day.items.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setEditing(t)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <CategoryIcon
                      icon={icons.get(`${t.type}:${t.category}`) ?? null}
                      className={cn("h-5 w-5 shrink-0", t.type === "income" ? "text-success" : "text-primary")}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{t.category}</p>
                      {t.description && <p className="truncate text-sm text-muted-foreground">{t.description}</p>}
                    </div>
                    {t.pending && <CloudOff className="h-4 w-4 shrink-0 text-warning" aria-label="Not synced yet" />}
                    <span className={cn("shrink-0 font-semibold tabular", t.type === "income" && "text-success")}>
                      {t.type === "income" ? "+" : "−"}
                      {formatMoney(t.amount, currency)}
                    </span>
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
          className="mt-5 w-full rounded-2xl border border-border py-3 text-sm font-semibold text-primary active:bg-muted"
        >
          Show older
        </button>
      )}

      {data.transactions.length > 0 && (
        <section className="mt-8 space-y-3">
          <h2 className="px-1 font-display text-lg font-semibold">Trends</h2>
          <SpendingChart transactions={data.transactions} currency={currency} />
          <CategoryBreakdown transactions={data.transactions} currency={currency} />
        </section>
      )}

      <TransactionSheet transaction={editing} onClose={() => setEditing(null)} />
    </div>
  );
};
