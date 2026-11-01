import { format } from "date-fns";
import { Money } from "@/components/Money";
import { formatMoney, monthProgress, type Pace } from "@/lib/hisabi";
import { cn } from "@/lib/utils";

const PACE = {
  good: { text: "On pace", ring: "stroke-success", chip: "bg-success/10 text-success" },
  fast: { text: "Spending a bit fast", ring: "stroke-warning", chip: "bg-warning/15 text-warning-ink" },
  over: { text: "Over your limits", ring: "stroke-destructive", chip: "bg-destructive/10 text-destructive" },
} as const;

/** Ring of what's left of this month's limits, with a tick for where the calendar is. */
export const MonthRing = ({ limit, spent, pace, size = 76 }: { limit: number; spent: number; pace: Pace; size?: number }) => {
  const r = 30;
  const c = 2 * Math.PI * r;
  const leftShare = limit > 0 ? Math.max(0, 1 - spent / limit) : 0;
  const tick = (1 - monthProgress()) * 360; // where "left" should be if spending evenly
  return (
    <svg viewBox="0 0 76 76" width={size} height={size} className="-rotate-90" aria-hidden>
      <circle cx="38" cy="38" r={r} fill="none" strokeWidth="9" className="stroke-muted" />
      <circle
        cx="38"
        cy="38"
        r={r}
        fill="none"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${leftShare * c} ${c}`}
        className={cn("transition-[stroke-dasharray] duration-700", pace === "none" ? "stroke-muted" : PACE[pace].ring)}
      />
      <line
        x1="38"
        y1="2"
        x2="38"
        y2="12"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="stroke-foreground/50"
        transform={`rotate(${tick} 38 38)`}
      />
    </svg>
  );
};

export const MonthScore = ({
  limit,
  spent,
  left,
  perDay,
  pace,
  currency,
  onClick,
}: {
  limit: number;
  spent: number;
  left: number;
  perDay: number;
  pace: Pace;
  currency: string;
  onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-4 rounded-3xl bg-card p-4 text-left shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.12)] transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <MonthRing limit={limit} spent={spent} pace={pace} />
    <div className="min-w-0 flex-1">
      {pace === "none" ? (
        <>
          <p className="type-title">Set your monthly limits</p>
          <p className="mt-1 text-sm text-muted-foreground">See what's left to spend and whether you're on pace.</p>
        </>
      ) : (
        <>
          <p className="type-meta">Left in {format(new Date(), "MMMM")}</p>
          <p className={cn("type-card mt-0.5", left < 0 && "text-destructive")}>
            <Money value={left} currency={currency} />
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={cn("type-chip rounded-full px-2.5 py-1", PACE[pace].chip)}>{PACE[pace].text}</span>
            {left > 0 && <span className="type-meta tabular">about {formatMoney(perDay, currency)} a day</span>}
          </div>
        </>
      )}
    </div>
  </button>
);
