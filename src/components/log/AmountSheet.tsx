import { useEffect, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { CalendarDays, NotebookPen } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { CategoryBadge } from "@/components/CategoryIcon";
import { NumberPad, applyKey, type PadKey } from "./NumberPad";
import { catStyle } from "@/lib/colors";
import { formatMoney, formatNumber, todayISO, toISODate, type Category } from "@/lib/hisabi";
import { cn } from "@/lib/utils";

export interface AmountEntry {
  amount: number;
  date: string;
  note: string;
}

const dayLabel = (iso: string) => {
  if (iso === todayISO()) return "Today";
  if (iso === toISODate(subDays(new Date(), 1))) return "Yesterday";
  return format(parseISO(iso), "EEE d MMM");
};

/** Slides up after picking a category: amount on a number pad, optional note and date, then Save. */
export const AmountSheet = ({
  category,
  left,
  currency,
  initialAmount,
  onSave,
  onClose,
}: {
  category: Category | null;
  left: number | null; // what's left in this category this month, before this entry
  currency: string;
  initialAmount?: string;
  onSave: (entry: AmountEntry) => void;
  onClose: () => void;
}) => {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [showNote, setShowNote] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [nudge, setNudge] = useState(0);

  useEffect(() => {
    if (!category) return;
    setAmount(initialAmount ?? "");
    setNote("");
    setDate(todayISO());
    setShowNote(false);
    setShowDate(false);
  }, [category, initialAmount]);

  const value = Number(amount || "0");
  const after = left !== null ? left - value : null;

  const save = () => {
    if (!(value > 0)) {
      setNudge((n) => n + 1);
      return;
    }
    onSave({ amount: value, date, note: note.trim() });
  };

  const onKey = (key: PadKey) => setAmount((a) => applyKey(a, key));

  return (
    <Drawer open={!!category} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="pb-safe" style={category ? catStyle(category.id) : undefined}>
        {category && (
          <div className="px-4 pb-4 pt-2">
            <div className="flex items-center gap-3">
              <CategoryBadge id={category.id} icon={category.icon} size="lg" />
              <div className="min-w-0 flex-1">
                <DrawerTitle className="truncate font-display text-xl font-semibold">{category.name}</DrawerTitle>
                {left !== null && (
                  <p className={cn("text-sm tabular", after !== null && after < 0 ? "text-destructive" : "text-muted-foreground")}>
                    {after !== null && after < 0
                      ? `${formatMoney(-after, currency)} over this month`
                      : `${formatMoney(after ?? left, currency)} left this month`}
                  </p>
                )}
              </div>
            </div>

            <p
              key={nudge}
              className={cn(
                "mt-5 text-center font-display text-[clamp(3.25rem,16vw,4.75rem)] font-semibold leading-none tabular",
                amount ? "text-foreground" : "text-muted-foreground/40",
                nudge > 0 && "animate-nudge",
              )}
              aria-live="polite"
            >
              {amount ? (amount.endsWith(".") ? formatNumber(value) + "." : formatNumber(value)) : "0"}
              <span className="ml-2 text-[0.32em] font-medium text-muted-foreground">{currency}</span>
            </p>

            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setShowNote((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium",
                  note ? "cat-soft cat-text" : "bg-muted text-muted-foreground",
                )}
              >
                <NotebookPen className="h-4 w-4" aria-hidden />
                {note ? "Note added" : "Note"}
              </button>
              <button
                type="button"
                onClick={() => setShowDate((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium",
                  date !== todayISO() ? "cat-soft cat-text" : "bg-muted text-muted-foreground",
                )}
              >
                <CalendarDays className="h-4 w-4" aria-hidden />
                {dayLabel(date)}
              </button>
            </div>

            {showNote && (
              <Input
                autoFocus
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What was it for?"
                className="mt-3 h-11 rounded-xl"
              />
            )}
            {showDate && (
              <div className="mt-3 flex gap-2">
                {[todayISO(), toISODate(subDays(new Date(), 1))].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDate(d)}
                    className={cn(
                      "rounded-xl border px-3 text-sm font-medium",
                      date === d ? "border-transparent cat-soft cat-text" : "border-border",
                    )}
                  >
                    {dayLabel(d)}
                  </button>
                ))}
                <Input
                  type="date"
                  value={date}
                  max={todayISO()}
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                  className="h-11 flex-1 rounded-xl"
                  aria-label="Pick a date"
                />
              </div>
            )}

            <div className="mt-4">
              <NumberPad onKey={onKey} />
            </div>

            <button
              type="button"
              onClick={save}
              className="mt-3 h-14 w-full rounded-2xl font-display text-lg font-semibold text-white transition-transform cat-bg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {value > 0 ? `Save ${formatMoney(value, currency)}` : "Enter an amount"}
            </button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};
