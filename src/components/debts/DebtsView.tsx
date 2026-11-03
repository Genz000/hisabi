import { useMemo, useState } from "react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { Plus } from "lucide-react";
import { DebtSheet } from "./DebtSheet";
import { Money } from "@/components/Money";
import { Segmented } from "@/components/Segmented";
import { useHisabi } from "@/data/HisabiStore";
import { catStyle } from "@/lib/colors";
import { debtRemaining, formatMoney, type Debt, type DebtDirection } from "@/lib/hisabi";
import { cn } from "@/lib/utils";

const dueText = (due: string | null) => {
  if (!due) return null;
  const days = differenceInCalendarDays(parseISO(due), new Date());
  if (days < 0) return { text: `${-days} ${days === -1 ? "day" : "days"} late`, late: true };
  if (days === 0) return { text: "Due today", late: true };
  if (days <= 7) return { text: `Due in ${days} ${days === 1 ? "day" : "days"}`, late: false };
  return { text: `Due ${format(parseISO(due), "d MMM")}`, late: false };
};

export const DebtsView = () => {
  const { data } = useHisabi();
  const { currency } = data.profile;
  const [show, setShow] = useState<"open" | "done">("open");
  const [editing, setEditing] = useState<Debt | null>(null);
  const [adding, setAdding] = useState<DebtDirection | null>(null);

  const remaining = useMemo(() => debtRemaining(data.debts, data.debtPayments), [data.debts, data.debtPayments]);
  const isOpen = (d: Debt) => (remaining.get(d.id) ?? 0) > 0;
  const owe = data.debts.filter((d) => d.direction === "borrowed" && isOpen(d)).reduce((s, d) => s + (remaining.get(d.id) ?? 0), 0);
  const owed = data.debts.filter((d) => d.direction === "lent" && isOpen(d)).reduce((s, d) => s + (remaining.get(d.id) ?? 0), 0);

  const list = data.debts.filter((d) => (show === "open" ? isOpen(d) : !isOpen(d)));
  const groups: [DebtDirection, string][] = [
    ["borrowed", "You owe"],
    ["lent", "Owed to you"],
  ];

  const row = (d: Debt) => {
    const left = remaining.get(d.id) ?? 0;
    const paidShare = (d.amount - left) / d.amount;
    const due = isOpen(d) ? dueText(d.dueDate) : null;
    return (
      <li key={d.id}>
        <button
          type="button"
          onClick={() => setEditing(d)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-muted focus-visible:bg-muted focus-visible:outline-none"
        >
          <span
            style={catStyle(d.person.toLowerCase())}
            className="cat-soft cat-text grid h-10 w-10 shrink-0 place-items-center rounded-full font-display text-lg font-semibold"
            aria-hidden
          >
            {d.person.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-2">
              <span className="type-item truncate">{d.person}</span>
              <Money
                value={isOpen(d) ? left : d.amount}
                currency={currency}
                className={cn("type-item shrink-0", !isOpen(d) && "text-muted-foreground line-through decoration-1")}
              />
            </span>
            {isOpen(d) && (
              <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted">
                <span
                  className={cn("block h-full rounded-full", d.direction === "borrowed" ? "bg-primary" : "bg-success")}
                  style={{ width: `${paidShare * 100}%` }}
                />
              </span>
            )}
            <span className="type-meta mt-1.5 flex flex-wrap gap-x-2">
              {isOpen(d) ? (
                <span>
                  {paidShare > 0 ? `${formatMoney(d.amount - left, currency)} of ${formatMoney(d.amount, currency)} back` : "Nothing back yet"}
                </span>
              ) : (
                <span className="text-success">Paid back</span>
              )}
              {due && <span className={cn("font-semibold", due.late ? "text-destructive" : "text-info")}>{due.text}</span>}
              {d.note && <span className="truncate">{d.note}</span>}
            </span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className="h-full overflow-y-auto px-4 pb-8 pt-2">
      <section className="overflow-hidden rounded-3xl bg-card shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.12)]">
        <dl className="grid grid-cols-2 divide-x divide-border">
          <div className="px-5 pb-4 pt-5">
            <dt className="type-meta">You owe</dt>
            <dd className="type-stat mt-1">
              <Money value={owe} currency={currency} />
            </dd>
          </div>
          <div className="px-5 pb-4 pt-5">
            <dt className="type-meta">Owed to you</dt>
            <dd className="type-stat mt-1 text-success">
              <Money value={owed} currency={currency} />
            </dd>
          </div>
        </dl>
        <div className="grid grid-cols-2 gap-2 border-t border-border p-3">
          <button
            type="button"
            onClick={() => setAdding("borrowed")}
            className="type-label flex items-center justify-center gap-1.5 rounded-2xl bg-primary py-3 text-primary-foreground active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden /> I borrowed
          </button>
          <button
            type="button"
            onClick={() => setAdding("lent")}
            className="type-label flex items-center justify-center gap-1.5 rounded-2xl bg-secondary py-3 text-primary active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden /> I lent
          </button>
        </div>
      </section>

      {data.debts.length === 0 ? (
        <p className="mx-auto mt-10 max-w-[32ch] text-center text-muted-foreground">
          Keep track of money you borrowed or lent, and tick off repayments as they come.
        </p>
      ) : (
        <>
          <Segmented<"open" | "done">
            label="Show"
            value={show}
            onChange={setShow}
            options={[
              ["open", "Open"],
              ["done", "Paid back"],
            ]}
            className="mt-6"
          />
          {list.length === 0 && (
            <p className="mt-10 text-center text-muted-foreground">
              {show === "open" ? "No open debts. All settled." : "Nothing paid back yet."}
            </p>
          )}
          {groups.map(([dir, title]) => {
            const items = list.filter((d) => d.direction === dir);
            return (
              items.length > 0 && (
                <section key={dir} className="mt-6">
                  <h2 className="type-title px-1">{title}</h2>
                  <ul className="mt-2 divide-y divide-border overflow-hidden rounded-3xl bg-card shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.12)]">
                    {items.map(row)}
                  </ul>
                </section>
              )
            );
          })}
        </>
      )}

      <DebtSheet
        open={editing !== null || adding !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setAdding(null);
          }
        }}
        debt={editing}
        direction={adding ?? "borrowed"}
      />
    </div>
  );
};
