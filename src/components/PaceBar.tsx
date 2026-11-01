import { cn } from "@/lib/utils";
import { limitState, monthProgress } from "@/lib/hisabi";

const FILL = {
  none: "bg-muted-foreground/40",
  ok: "bg-success",
  near: "bg-warning",
  over: "bg-destructive",
} as const;

/** Spent vs limit, with a tick for where you'd be if you spent evenly through the month. */
export const PaceBar = ({ spent, limit, className }: { spent: number; limit: number; className?: string }) => {
  const state = limitState(spent, limit);
  const fill = Math.min(spent / limit, 1) * 100;
  const today = monthProgress() * 100;
  return (
    <div
      className={cn("relative h-2 rounded-full bg-muted", className)}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={limit}
      aria-valuenow={Math.min(spent, limit)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500", FILL[state])} style={{ width: `${fill}%` }} />
      <div
        className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-foreground/70"
        style={{ left: `${today}%` }}
        title="Today"
      />
    </div>
  );
};
