import { TrendingDown, TrendingUp, X } from "lucide-react";
import { formatMoney, weekStats, type Transaction } from "@/lib/hisabi";
import { cn } from "@/lib/utils";

/** Last 7 days at a glance: spent, change vs the week before, days logged, top category. */
export const WeeklyRecap = ({
  transactions,
  checkIns,
  currency,
  onDismiss,
}: {
  transactions: Transaction[];
  checkIns: string[];
  currency: string;
  onDismiss?: () => void;
}) => {
  const w = weekStats(transactions, checkIns);
  const down = w.change !== null && w.change < 0;
  return (
    <section className="relative overflow-hidden rounded-3xl bg-primary p-4 text-primary-foreground" aria-label="Your week">
      {/* soft shapes for a bit of play */}
      <span className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10" aria-hidden />
      <span className="pointer-events-none absolute -bottom-10 right-10 h-20 w-20 rounded-full bg-white/10" aria-hidden />

      <div className="relative flex items-start justify-between">
        <h2 className="font-display text-lg font-semibold">Your week</h2>
        {onDismiss && (
          <button type="button" onClick={onDismiss} className="-m-1 rounded-full p-1 text-white/80" aria-label="Hide weekly recap">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <p className="relative mt-1 font-display text-3xl font-semibold tabular">{formatMoney(w.spent, currency)}</p>
      <p className="relative text-sm text-white/80">spent in the last 7 days</p>

      <dl className="relative mt-3 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-2xl bg-white/15 px-3 py-2">
          <dt className="text-white/75">vs last week</dt>
          <dd className="mt-0.5 flex items-center gap-1 font-semibold tabular">
            {w.change === null ? (
              "–"
            ) : (
              <>
                {down ? <TrendingDown className="h-4 w-4" aria-hidden /> : <TrendingUp className="h-4 w-4" aria-hidden />}
                <span className={cn(down && "text-white")}>
                  {down ? "" : "+"}
                  {Math.round(w.change * 100)}%
                </span>
              </>
            )}
          </dd>
        </div>
        <div className="rounded-2xl bg-white/15 px-3 py-2">
          <dt className="text-white/75">Days logged</dt>
          <dd className="mt-0.5 font-semibold tabular">{w.activeDays} of 7</dd>
        </div>
        <div className="min-w-0 rounded-2xl bg-white/15 px-3 py-2">
          <dt className="text-white/75">Most on</dt>
          <dd className="mt-0.5 truncate font-semibold">{w.top?.name ?? "–"}</dd>
        </div>
      </dl>
    </section>
  );
};
