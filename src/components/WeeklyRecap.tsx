import { AlertCircle, CheckCircle2, Info, TrendingDown, TrendingUp, X } from "lucide-react";
import { Money } from "@/components/Money";
import type { Snapshot } from "@/data/backend";
import { formatNumber, weekInsights, type Insight, type Pace } from "@/lib/hisabi";
import { cn } from "@/lib/utils";

const VERDICT: Record<Pace, string> = {
  good: "Good week",
  fast: "A bit fast this week",
  over: "Over budget this week",
  none: "Your week",
};

const TONE_ICON: Record<Insight["tone"], typeof Info> = {
  good: CheckCircle2,
  warn: AlertCircle,
  info: Info,
};

/** Last 7 days: a verdict against the limits, the numbers, and a few notes to keep in mind. */
export const WeeklyRecap = ({
  data,
  currency,
  onDismiss,
}: {
  data: Snapshot;
  currency: string;
  onDismiss?: () => void;
}) => {
  const w = weekInsights(data, currency);
  const down = w.change !== null && w.change < 0;
  return (
    <section className="relative overflow-hidden rounded-3xl bg-primary p-4 text-primary-foreground" aria-label="Your week">
      {/* soft shapes for a bit of play */}
      <span className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10" aria-hidden />
      <span className="pointer-events-none absolute -bottom-10 right-10 h-20 w-20 rounded-full bg-white/10" aria-hidden />

      <div className="relative flex items-start justify-between">
        <div>
          <h2 className="type-title">{VERDICT[w.pace]}</h2>
          <p className="mt-0.5 text-sm text-white/85">The last 7 days</p>
        </div>
        {onDismiss && (
          <button type="button" onClick={onDismiss} className="-m-1 rounded-full p-1 text-white/80" aria-label="Hide weekly recap">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <p className="type-card relative mt-2">
        <Money value={w.spent} currency={currency} className="[&_.money-unit]:text-white/75" />
      </p>
      <p className="relative mt-0.5 text-sm text-white/85">
        spent
        {w.pace !== "none" && (
          <>
            , {formatNumber(w.limitedSpent)} of a {formatNumber(Math.round(w.weekBudget))} {currency} weekly share
          </>
        )}
      </p>

      <dl className="relative mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-white/15 px-3 py-2">
          <dt className="text-[0.8125rem] font-medium text-white/80">vs last week</dt>
          <dd className="type-label mt-1 flex items-center gap-1 tabular">
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
          <dt className="text-[0.8125rem] font-medium text-white/80">Days logged</dt>
          <dd className="type-label mt-1 tabular">{w.activeDays} of 7</dd>
        </div>
        <div className="min-w-0 rounded-2xl bg-white/15 px-3 py-2">
          <dt className="text-[0.8125rem] font-medium text-white/80">Most on</dt>
          <dd className="type-label mt-1 truncate">{w.top?.name ?? "–"}</dd>
        </div>
      </dl>

      {w.notes.length > 0 && (
        <ul className="relative mt-3 space-y-1.5" aria-label="Notes for this week">
          {w.notes.map((n) => {
            const Icon = TONE_ICON[n.tone];
            return (
              <li key={n.text} className="flex items-start gap-2 rounded-2xl bg-white/10 px-3 py-2 text-sm leading-snug">
                <Icon className={cn("mt-px h-4 w-4 shrink-0", n.tone === "warn" ? "text-warning" : "text-white/85")} aria-hidden />
                <span>{n.text}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
