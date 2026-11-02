import { useMemo, useState } from "react";
import { format, subDays, subMonths } from "date-fns";
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Segmented } from "@/components/Segmented";
import { formatMoney, monthOf, todayISO, toISODate, type Transaction } from "@/lib/hisabi";

type View = "days" | "months";

const ChartTip = ({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: { value: number; name: string; color: string; payload: { label: string } }[];
  currency: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl bg-foreground px-3 py-2 text-background shadow-lg">
      <p className="text-xs font-medium opacity-75">{payload[0].payload.label}</p>
      {payload.map((p) => (
        <p key={p.name} className="type-label tabular">
          {payload.length > 1 && `${p.name} `}
          {formatMoney(p.value, currency)}
        </p>
      ))}
    </div>
  );
};

const DAYS = 30;

/** Spending per day for the last 30 days, or spent and received for the last six months. */
export const SpendingChart = ({
  transactions,
  currency,
  dailyBudget,
}: {
  transactions: Transaction[];
  currency: string;
  /** Daily share of the monthly limits, drawn as a guide line. */
  dailyBudget: number | null;
}) => {
  const [view, setView] = useState<View>("days");
  const today = todayISO();

  // A rolling window, so the chart is never empty at the start of a month
  const days = useMemo(() => {
    const now = new Date();
    const list = Array.from({ length: DAYS }, (_, i) => {
      const d = subDays(now, DAYS - 1 - i);
      return { key: toISODate(d), tick: format(d, "d MMM"), label: format(d, "EEEE d MMMM"), spent: 0, today: i === DAYS - 1 };
    });
    const byKey = new Map(list.map((d) => [d.key, d]));
    for (const t of transactions) {
      const d = t.type === "expense" ? byKey.get(t.date) : undefined;
      if (d) d.spent += t.amount;
    }
    return list;
  }, [transactions, today]);

  const months = useMemo(() => {
    const list = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      return { key: format(d, "yyyy-MM"), tick: format(d, "MMM"), label: format(d, "MMMM yyyy"), spent: 0, received: 0 };
    });
    const byKey = new Map(list.map((m) => [m.key, m]));
    for (const t of transactions) {
      const m = byKey.get(monthOf(t.date));
      if (!m) continue;
      if (t.type === "expense") m.spent += t.amount;
      else m.received += t.amount;
    }
    return list;
  }, [transactions]);

  const average = days.reduce((s, d) => s + d.spent, 0) / DAYS;
  const sixMonthSpent = months.reduce((s, m) => s + m.spent, 0);
  const activeMonths = months.filter((m) => m.spent > 0).length || 1;

  return (
    <section className="rounded-3xl bg-card p-4 shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.12)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="type-title">{view === "days" ? "Day by day" : "Month by month"}</h3>
          <p className="type-meta mt-1">
            {view === "days" ? (
              <>
                About <span className="font-semibold text-foreground tabular">{formatMoney(Math.round(average), currency)}</span> a day
              </>
            ) : (
              <>
                About <span className="font-semibold text-foreground tabular">{formatMoney(Math.round(sixMonthSpent / activeMonths), currency)}</span> a month
              </>
            )}
          </p>
        </div>
        <Segmented<View>
          label="Chart period"
          value={view}
          onChange={setView}
          options={[
            ["days", "30 days"],
            ["months", "6 months"],
          ]}
          className="shrink-0"
        />
      </div>

      <div className="-mx-1 mt-4 h-48">
        <ResponsiveContainer width="100%" height="100%">
          {view === "days" ? (
            <BarChart data={days} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barCategoryGap="22%">
              <XAxis
                dataKey="key"
                tickLine={false}
                axisLine={false}
                interval={0}
                tick={({ x, y, index }) =>
                  (DAYS - 1 - index) % 7 === 0 ? (
                    <text
                      x={x}
                      y={y + 12}
                      textAnchor={index === DAYS - 1 ? "end" : "middle"}
                      className="fill-muted-foreground text-[11px] font-medium"
                    >
                      {index === DAYS - 1 ? "Today" : days[index].tick}
                    </text>
                  ) : (
                    <g />
                  )
                }
              />
              <YAxis hide domain={[0, (max: number) => Math.max(max, dailyBudget ?? 0) * 1.1]} />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", radius: 6 }}
                content={<ChartTip currency={currency} />}
              />
              {dailyBudget !== null && dailyBudget > 0 && (
                <ReferenceLine
                  y={dailyBudget}
                  stroke="hsl(var(--foreground) / 0.35)"
                  strokeDasharray="4 4"
                />
              )}
              <Bar dataKey="spent" name="Spent" radius={[6, 6, 6, 6]} minPointSize={3}>
                {days.map((d) => (
                  <Cell
                    key={d.key}
                    fill={
                      dailyBudget && d.spent > dailyBudget
                          ? "hsl(var(--warning))"
                          : d.today
                            ? "hsl(var(--primary))"
                            : "hsl(var(--primary) / 0.55)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <BarChart data={months} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barGap={3} barCategoryGap="24%">
              <XAxis dataKey="tick" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontWeight: 500 }} />
              <YAxis hide />
              <Tooltip cursor={{ fill: "hsl(var(--muted))", radius: 8 }} content={<ChartTip currency={currency} />} />
              <Bar dataKey="spent" name="Spent" fill="hsl(var(--primary))" radius={[6, 6, 6, 6]} minPointSize={3} />
              <Bar dataKey="received" name="Received" fill="hsl(var(--success))" radius={[6, 6, 6, 6]} minPointSize={3} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <ul className="type-meta mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {view === "days" ? (
          <>
            <li className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-primary/55" aria-hidden /> Spent
            </li>
            {dailyBudget !== null && dailyBudget > 0 && (
              <>
                <li className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-warning" aria-hidden /> Above your daily share
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-3 border-t-2 border-dashed border-foreground/35" aria-hidden />
                  Daily share, {formatMoney(Math.round(dailyBudget), currency)}
                </li>
              </>
            )}
          </>
        ) : (
          <>
            <li className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden /> Spent
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-success" aria-hidden /> Received
            </li>
          </>
        )}
      </ul>
    </section>
  );
};
