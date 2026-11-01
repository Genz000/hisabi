import { useCallback, useMemo, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { Check, NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryIcon } from "@/components/CategoryIcon";
import { NumberPad, applyKey, type PadKey } from "./NumberPad";
import { ReceiptSlip, type SlipInfo } from "./ReceiptSlip";
import { useHisabi } from "@/data/HisabiStore";
import {
  balanceOf,
  formatNumber,
  isActiveToday,
  limitState,
  sortByUsage,
  todayISO,
  toISODate,
  totalsThisMonth,
  type Category,
  type Kind,
} from "@/lib/hisabi";
import { cn } from "@/lib/utils";

const dayLabel = (iso: string) => {
  if (iso === todayISO()) return "Today";
  if (iso === toISODate(subDays(new Date(), 1))) return "Yesterday";
  return format(parseISO(iso), "EEE d MMM");
};

export const QuickAdd = () => {
  const { data, addTransaction, deleteTransaction, retryPending, checkIn } = useHisabi();
  const { currency, startingBalance } = data.profile;

  const [kind, setKind] = useState<Kind>("expense");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [moreOpen, setMoreOpen] = useState(false);
  const [nudge, setNudge] = useState(0);
  const [slip, setSlip] = useState<SlipInfo | null>(null);

  const categories = useMemo(() => sortByUsage(data.categories, data.transactions, kind), [data, kind]);
  const totals = useMemo(() => totalsThisMonth(data.transactions, kind), [data.transactions, kind]);
  const value = Number(amount || "0");
  const activeToday = isActiveToday(data.transactions, data.checkIns);

  const onKey = (key: PadKey) => setAmount((a) => applyKey(a, key));

  const save = async (category: Category) => {
    if (!(value > 0)) {
      setNudge((n) => n + 1);
      return;
    }
    const saved = await addTransaction({
      amount: value,
      category: category.name,
      type: kind,
      date,
      description: note.trim(),
    });
    const isThisMonth = saved.date.slice(0, 7) === todayISO().slice(0, 7);
    setSlip({
      transaction: saved,
      category,
      spentThisMonth: (totals.get(category.name) ?? 0) + (isThisMonth ? saved.amount : 0),
      balance: balanceOf(data.transactions, startingBalance) + (kind === "income" ? value : -value),
    });
    setAmount("");
    setNote("");
    setDate(todayISO());
    navigator.vibrate?.(12);
  };

  const undo = async () => {
    if (!slip) return;
    const t = slip.transaction;
    setSlip(null);
    setAmount(String(t.amount));
    try {
      await deleteTransaction(t.id);
    } catch {
      toast.error("Couldn't undo. Delete it from History instead.");
    }
  };

  const retry = async () => {
    const saved = await retryPending();
    if (saved > 0) {
      toast.success(saved === 1 ? "Synced" : `${saved} expenses synced`);
      setSlip((s) => s && { ...s, transaction: { ...s.transaction, pending: undefined } });
    } else {
      toast.error("Still offline. It stays saved on this phone.");
    }
  };

  const closeSlip = useCallback(() => setSlip(null), []);

  const nothingToday = async () => {
    try {
      await checkIn();
      toast.success("Today counts. No spending logged.");
    } catch {
      toast.error("Couldn't save that. Check your connection.");
    }
  };

  const extras = [note.trim() && "Note", date !== todayISO() && dayLabel(date)].filter(Boolean).join(", ");

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* Amount */}
      <section className="flex flex-col items-center px-5 pb-3 pt-2">
        <div className="flex w-full items-center justify-between">
          <div className="flex rounded-full bg-muted p-0.5 text-sm" role="tablist" aria-label="Type">
            {(["expense", "income"] as const).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={kind === k}
                onClick={() => setKind(k)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 font-medium transition-colors",
                  kind === k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                {k === "expense" ? "Spent" : "Received"}
              </button>
            ))}
          </div>
          {!activeToday && kind === "expense" && (
            <button
              type="button"
              onClick={nothingToday}
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground active:bg-muted"
            >
              <Check className="h-4 w-4" aria-hidden />
              Nothing spent today
            </button>
          )}
        </div>

        <p
          key={nudge}
          className={cn(
            "mt-6 font-display text-[clamp(3.5rem,18vw,5.5rem)] font-semibold leading-none tracking-tight tabular",
            amount ? "text-foreground" : "text-muted-foreground/45",
            nudge > 0 && "animate-nudge",
          )}
          aria-live="polite"
        >
          {amount ? (amount.endsWith(".") ? formatNumber(value) + "." : formatNumber(value)) : "0"}
          <span className="ml-2 text-[0.3em] font-medium tracking-normal text-muted-foreground">{currency}</span>
        </p>
        <p className="mt-2 h-5 text-sm text-muted-foreground">
          {amount ? "Now tap a category" : kind === "expense" ? "How much did you spend?" : "How much came in?"}
        </p>
      </section>

      {/* Categories: tapping one saves */}
      <section className="min-h-0 flex-1 overflow-y-auto px-4" aria-label="Categories">
        <div className="grid grid-cols-3 gap-2 pb-2">
          {categories.map((c) => {
            const spent = totals.get(c.name) ?? 0;
            const state = limitState(spent, c.monthlyLimit);
            const left = c.monthlyLimit !== null ? c.monthlyLimit - spent : null;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => save(c)}
                className={cn(
                  "flex min-h-[76px] flex-col items-start justify-between rounded-2xl border bg-card p-3 text-left transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  amount ? "border-primary/25" : "border-border",
                )}
              >
                <CategoryIcon icon={c.icon} className="h-5 w-5 text-primary" />
                <span className="w-full">
                  <span className="line-clamp-2 hyphens-auto text-sm font-semibold leading-tight" lang="en">
                    {c.name}
                  </span>
                  {left !== null && (
                    <span
                      className={cn(
                        "block truncate text-xs tabular",
                        state === "over" ? "text-destructive" : state === "near" ? "text-warning" : "text-muted-foreground",
                      )}
                    >
                      {left < 0 ? `${formatNumber(-left)} over` : `${formatNumber(left)} left`}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Keypad */}
      <section className="border-t border-border bg-background px-4 pb-2 pt-2">
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="mb-1 flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-muted-foreground active:bg-muted"
        >
          <NotebookPen className="h-4 w-4" aria-hidden />
          {extras || "Add note or change date"}
        </button>
        <NumberPad onKey={onKey} />
      </section>

      {slip && <ReceiptSlip slip={slip} currency={currency} onUndo={undo} onRetry={retry} onDone={closeSlip} />}

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Note and date</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <div className="flex gap-2">
                {[todayISO(), toISODate(subDays(new Date(), 1))].map((d) => (
                  <Button key={d} variant={date === d ? "default" : "outline"} size="sm" onClick={() => setDate(d)}>
                    {dayLabel(d)}
                  </Button>
                ))}
                <Input
                  type="date"
                  value={date}
                  max={todayISO()}
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                  className="h-9 flex-1"
                  aria-label="Pick a date"
                />
              </div>
            </div>
          </div>
          <DrawerFooter>
            <Button onClick={() => setMoreOpen(false)}>Done</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};
