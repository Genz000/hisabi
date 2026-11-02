import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { CategoryBadge } from "@/components/CategoryIcon";
import { Money } from "@/components/Money";
import { Segmented } from "@/components/Segmented";
import { categoryHue } from "@/lib/colors";
import { formatNumber, monthOf, todayISO, type Category, type Transaction } from "@/lib/hisabi";
import { cn } from "@/lib/utils";

type View = "month" | "all";

const SHOWN = 6;

/** Where the money went: a donut with the total in the middle and a ranked list in category colours. */
export const CategoryBreakdown = ({
  transactions,
  categories,
  currency,
}: {
  transactions: Transaction[];
  categories: Category[];
  currency: string;
}) => {
  const [view, setView] = useState<View>("month");
  const [expanded, setExpanded] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);

  const rows = useMemo(() => {
    const month = monthOf(todayISO());
    const byName = new Map(categories.filter((c) => c.kind === "expense").map((c) => [c.name, c]));
    const totals = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== "expense" || (view === "month" && monthOf(t.date) !== month)) continue;
      totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
    }
    return [...totals.entries()]
      .map(([name, value]) => {
        const c = byName.get(name);
        return { name, value, id: c?.id, icon: c?.icon ?? null, color: c ? `hsl(${categoryHue(c.id)})` : "hsl(var(--muted-foreground))" };
      })
      .sort((a, b) => b.value - a.value);
  }, [transactions, categories, view]);

  const total = rows.reduce((s, r) => s + r.value, 0);
  const focused = rows.find((r) => r.name === focus);
  const visible = expanded ? rows : rows.slice(0, SHOWN);

  return (
    <section className="rounded-3xl bg-card p-4 shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.12)]">
      <div className="flex items-start justify-between gap-3">
        <h3 className="type-title">Where it went</h3>
        <Segmented<View>
          label="Category period"
          value={view}
          onChange={(v) => {
            setView(v);
            setFocus(null);
          }}
          options={[
            ["month", format(new Date(), "MMMM")],
            ["all", "All time"],
          ]}
          className="shrink-0"
        />
      </div>

      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No spending here yet.</p>
      ) : (
        <>
          <div className="relative mx-auto mt-2 h-52 w-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rows}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="68%"
                  outerRadius="100%"
                  paddingAngle={rows.length > 1 ? 2 : 0}
                  cornerRadius={6}
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                  isAnimationActive={false}
                  onClick={(d: { name: string }) => setFocus((f) => (f === d.name ? null : d.name))}
                >
                  {rows.map((r) => (
                    <Cell
                      key={r.name}
                      fill={r.color}
                      className="cursor-pointer outline-none transition-opacity"
                      opacity={focus && focus !== r.name ? 0.25 : 1}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div className="max-w-[60%]">
                <p className="type-meta truncate">{focused ? focused.name : view === "month" ? "Spent" : "All time"}</p>
                <p className="type-stat mt-0.5 tabular">{formatNumber(Math.round(focused ? focused.value : total))}</p>
                <p className="type-meta">{focused ? `${Math.round((focused.value / total) * 100)}%` : currency}</p>
              </div>
            </div>
          </div>

          <ul className="mt-4 space-y-1">
            {visible.map((r) => {
              const share = r.value / total;
              return (
                <li key={r.name}>
                  <button
                    type="button"
                    onClick={() => setFocus((f) => (f === r.name ? null : r.name))}
                    aria-pressed={focus === r.name}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      focus === r.name && "bg-muted",
                    )}
                  >
                    <CategoryBadge id={r.id} icon={r.icon} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="type-label truncate">{r.name}</span>
                        <Money value={r.value} currency={currency} className="type-label shrink-0" />
                      </span>
                      <span className="mt-1.5 flex items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <span className="block h-full rounded-full" style={{ width: `${Math.max(share * 100, 2)}%`, background: r.color }} />
                        </span>
                        <span className="type-meta w-9 shrink-0 text-right tabular">{Math.round(share * 100)}%</span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {rows.length > SHOWN && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="type-label mt-2 w-full rounded-2xl py-2.5 text-primary active:bg-muted"
            >
              {expanded ? "Show less" : `Show all ${rows.length}`}
            </button>
          )}
        </>
      )}
    </section>
  );
};
