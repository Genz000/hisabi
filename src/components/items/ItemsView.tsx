import { useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { CategoryBadge } from "@/components/CategoryIcon";
import { ItemSheet } from "./ItemSheet";
import { useHisabi } from "@/data/HisabiStore";
import { catStyle } from "@/lib/colors";
import { daysLeftInMonth, formatMoney, itemCountsThisMonth, itemState, type Category, type Item } from "@/lib/hisabi";
import { cn } from "@/lib/utils";

const STATE_TEXT = (used: number, target: number) => {
  const state = itemState(used, target);
  if (state === "over") return { text: `${used - target} over`, className: "text-destructive" };
  if (state === "done") return { text: "All used", className: "text-warning-ink" };
  if (state === "ahead") return { text: `${target - used} left, ahead of the month`, className: "font-semibold text-warning-ink" };
  return { text: `${target - used} left`, className: "font-semibold text-info" };
};

/** Dots for small allowances (4 Kinder Bueno), a bar for big ones. */
const Usage = ({ used, target }: { used: number; target: number }) =>
  target <= 12 ? (
    <span className="mt-2 flex flex-wrap gap-1" aria-hidden>
      {Array.from({ length: Math.max(target, used) }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-2.5 w-2.5 rounded-full",
            i >= target ? "bg-destructive" : i < used ? "cat-bg" : "bg-[hsl(var(--cat)/0.2)]",
          )}
        />
      ))}
    </span>
  ) : (
    <span className="mt-2 block h-2 overflow-hidden rounded-full bg-[hsl(var(--cat)/0.2)]" aria-hidden>
      <span
        className={cn("block h-full rounded-full", used > target ? "bg-destructive" : "cat-bg")}
        style={{ width: `${Math.min(100, (used / target) * 100)}%` }}
      />
    </span>
  );

export const ItemsView = () => {
  const { data, logItem, unlogItem } = useHisabi();
  const { currency } = data.profile;
  const [editing, setEditing] = useState<Item | null>(null);
  const [adding, setAdding] = useState(false);
  const [bumped, setBumped] = useState<string | null>(null);

  const counts = useMemo(() => itemCountsThisMonth(data.itemLogs), [data.itemLogs]);
  // Read after saving, so quick repeated taps report the right count
  const countsRef = useRef(counts);
  countsRef.current = counts;

  const groups = useMemo(() => {
    const byId = new Map(data.categories.map((c) => [c.id, c]));
    const map = new Map<string, { category: Category | null; items: Item[] }>();
    for (const i of [...data.items].sort((a, b) => a.sortOrder - b.sortOrder)) {
      const category = (i.categoryId && byId.get(i.categoryId)) || null;
      const key = category?.id ?? "none";
      if (!map.has(key)) map.set(key, { category, items: [] });
      map.get(key)!.items.push(i);
    }
    return [...map.values()].sort(
      (a, b) => (a.category ? a.category.sortOrder : 1e9) - (b.category ? b.category.sortOrder : 1e9),
    );
  }, [data.items, data.categories]);

  const totalUsed = data.items.reduce((s, i) => s + Math.min(counts.get(i.id) ?? 0, i.monthlyTarget), 0);
  const totalTarget = data.items.reduce((s, i) => s + i.monthlyTarget, 0);
  const daysLeft = daysLeftInMonth();

  const tick = async (item: Item) => {
    setBumped(item.id);
    navigator.vibrate?.(12);
    try {
      const log = await logItem(item);
      const used = countsRef.current.get(item.id) ?? 0;
      const message =
        used > item.monthlyTarget
          ? `${item.name}: ${used} of ${item.monthlyTarget}. That's over this month.`
          : used === item.monthlyTarget
            ? `${item.name}: ${used} of ${item.monthlyTarget}. That was the last one this month.`
            : `${item.name}: ${used} of ${item.monthlyTarget}`;
      const show = used > item.monthlyTarget ? toast.warning : toast.success;
      show(message, {
        description: item.price && log.transactionId ? `${formatMoney(item.price, currency)} logged as spending` : undefined,
        action: {
          label: "Undo",
          onClick: () => void unlogItem(log).catch(() => toast.error("Couldn't undo. Open the item to remove it.")),
        },
      });
    } catch {
      toast.error("Couldn't save that. Check your connection.");
    }
  };

  return (
    <div className="h-full overflow-y-auto px-4 pb-8 pt-2">
      <section className="rounded-3xl bg-card p-5 shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.12)]">
        <div className="flex items-center justify-between gap-3">
          <p className="type-meta">Monthly items in {format(new Date(), "MMMM")}</p>
          {data.items.length > 0 && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="type-label -my-1 flex shrink-0 items-center gap-1.5 rounded-full bg-primary py-2 pl-3 pr-4 text-primary-foreground shadow-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden /> Add item
            </button>
          )}
        </div>
        {data.items.length === 0 ? (
          <>
            <p className="type-card mt-1">Set an allowance</p>
            <p className="mt-2 text-sm text-muted-foreground">
              For things you buy often, like 4 Kinder Bueno a month. Tick one each time you buy it and see how many are
              left.
            </p>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="type-label mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-primary-foreground active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden /> Add your first item
            </button>
          </>
        ) : (
          <>
            <p className="type-screen mt-1 tabular">
              {totalUsed}
              <span className="text-muted-foreground">/{totalTarget}</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              used across {data.items.length} {data.items.length === 1 ? "item" : "items"}, {daysLeft}{" "}
              {daysLeft === 1 ? "day" : "days"} left in the month.
            </p>
          </>
        )}
      </section>

      {groups.map(({ category, items }) => (
        <section key={category?.id ?? "none"} className="mt-8">
          <h2 className="type-title flex items-center gap-2 px-1">
            {category && <CategoryBadge id={category.id} icon={category.icon} size="sm" />}
            {category?.name ?? "No category"}
          </h2>
          <ul className="mt-2 divide-y divide-border overflow-hidden rounded-3xl bg-card shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.12)]">
            {items.map((item) => {
              const used = counts.get(item.id) ?? 0;
              const status = STATE_TEXT(used, item.monthlyTarget);
              return (
                <li key={item.id} style={catStyle(category?.id ?? item.id)} className="flex items-center gap-2 pr-3">
                  <button
                    type="button"
                    onClick={() => setEditing(item)}
                    className="min-w-0 flex-1 py-3.5 pl-4 text-left active:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="type-item truncate">{item.name}</span>
                      <span
                        key={bumped === item.id ? used : undefined}
                        className={cn(
                          "type-stat shrink-0 tabular",
                          bumped === item.id && "animate-pop",
                          used > item.monthlyTarget && "text-destructive",
                        )}
                      >
                        {used}
                        <span className="text-base text-muted-foreground">/{item.monthlyTarget}</span>
                      </span>
                    </span>
                    <Usage used={used} target={item.monthlyTarget} />
                    <span className="type-meta mt-1.5 flex gap-2">
                      <span className={status.className}>{status.text}</span>
                      {item.price !== null && <span>{formatMoney(item.price, currency)} each</span>}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => tick(item)}
                    className="cat-bg grid h-12 w-12 shrink-0 place-items-center rounded-full text-white shadow-sm transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={`Bought one ${item.name}`}
                  >
                    <Plus className="h-6 w-6" strokeWidth={2.5} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}


      <ItemSheet
        open={editing !== null || adding}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setAdding(false);
          }
        }}
        item={editing}
      />
    </div>
  );
};
