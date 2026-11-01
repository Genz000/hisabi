import { lazy, Suspense, useState } from "react";
import { Flame, History, PenLine, PieChart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { QuickAdd } from "@/components/log/QuickAdd";
import { BudgetView } from "@/components/budget/BudgetView";
import { SettingsSheet } from "@/components/SettingsSheet";
import { useHisabi } from "@/data/HisabiStore";
import { currentStreak, isActiveToday } from "@/lib/hisabi";
import { cn } from "@/lib/utils";

// History pulls in the chart library, so it loads only when opened.
const HistoryView = lazy(() => import("@/components/history/HistoryView").then((m) => ({ default: m.HistoryView })));

const TABS = [
  { id: "log", label: "Log", icon: PenLine },
  { id: "budget", label: "Budget", icon: PieChart },
  { id: "history", label: "History", icon: History },
] as const;

type Tab = (typeof TABS)[number]["id"];


export const AppShell = () => {
  const { data } = useHisabi();
  // Always open on Log: logging is the reason to open the app.
  const [tab, setTab] = useState<Tab>("log");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const streak = currentStreak(data.transactions, data.checkIns);
  const doneToday = isActiveToday(data.transactions, data.checkIns);

  return (
    <div className="mx-auto flex h-[100dvh] max-w-md flex-col bg-background pt-safe">
      <header className="flex h-14 shrink-0 items-center justify-between px-4">
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold",
            doneToday ? "bg-warning/15 text-foreground" : "bg-muted text-muted-foreground",
          )}
          title={doneToday ? "Today is counted" : "Log something or tap “Nothing spent today” to keep your streak"}
        >
          <Flame className={cn("h-4 w-4", doneToday ? "fill-warning text-warning" : "")} aria-hidden />
          <span className="tabular">
            {streak} {streak === 1 ? "day" : "days"}
          </span>
          <span className="sr-only">{doneToday ? "logged in a row, today included" : "in a row; today not logged yet"}</span>
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Settings"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={data.profile.avatarUrl ?? undefined} alt="" />
            <AvatarFallback className="bg-secondary font-display text-sm text-primary">
              {(data.email ?? "?").slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
      </header>

      <main className="min-h-0 flex-1">
        {tab === "log" && <QuickAdd onOpenBudget={() => setTab("budget")} />}
        {tab === "budget" && <BudgetView />}
        {tab === "history" && (
          <Suspense fallback={null}>
            <HistoryView />
          </Suspense>
        )}
      </main>

      <nav className="shrink-0 bg-card pb-safe shadow-[0_-4px_16px_-8px_hsl(var(--foreground)/0.12)]" aria-label="Main">
        <ul className="grid grid-cols-3">
          {TABS.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => setTab(id)}
                aria-current={tab === id ? "page" : undefined}
                className={cn(
                  "flex h-16 w-full flex-col items-center justify-center gap-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  tab === id ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span className={cn("grid h-8 w-14 place-items-center rounded-full transition-colors", tab === id && "bg-secondary")}>
                  <Icon className="h-5 w-5" strokeWidth={tab === id ? 2.25 : 1.75} aria-hidden />
                </span>
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};
