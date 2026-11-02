import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryBadge } from "@/components/CategoryIcon";
import { useHisabi } from "@/data/HisabiStore";
import { catStyle } from "@/lib/colors";
import { itemCountsThisMonth, monthOf, sortByUsage, todayISO, type Item } from "@/lib/hisabi";
import { cn } from "@/lib/utils";

/** Add or edit a monthly item. `item` null means a new one. */
export const ItemSheet = ({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
}) => {
  const { data, saveItem, deleteItem, unlogItem } = useHisabi();
  const { currency } = data.profile;
  const categories = useMemo(() => sortByUsage(data.categories, data.transactions, "expense"), [data.categories, data.transactions]);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [target, setTarget] = useState(4);
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(item?.name ?? "");
    setCategoryId(item?.categoryId ?? categories[0]?.id ?? null);
    setTarget(item?.monthlyTarget ?? 4);
    setPrice(item?.price != null ? String(item.price) : "");
    setConfirmDelete(false);
    // categories only seeds the default pick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item]);

  const trimmed = name.trim();
  const priceValue = price.trim() === "" ? null : Number(price);
  const priceInvalid = priceValue !== null && !(priceValue >= 0);
  const used = item ? itemCountsThisMonth(data.itemLogs).get(item.id) ?? 0 : 0;
  const lastLog = item
    ? data.itemLogs.find((l) => l.itemId === item.id && monthOf(l.date) === monthOf(todayISO()))
    : undefined;

  const submit = async () => {
    if (!trimmed || priceInvalid) return;
    setBusy(true);
    try {
      await saveItem({
        id: item?.id ?? crypto.randomUUID(),
        name: trimmed,
        categoryId,
        monthlyTarget: target,
        price: priceValue,
        sortOrder: item?.sortOrder ?? Math.max(0, ...data.items.map((i) => i.sortOrder)) + 1,
      });
      toast.success(item ? "Item saved" : "Item added");
      onOpenChange(false);
    } catch {
      toast.error("Couldn't save the item. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!item) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    try {
      await deleteItem(item.id);
      toast.success("Item deleted. Expenses it logged stay in History.");
      onOpenChange(false);
    } catch {
      toast.error("Couldn't delete the item. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const untick = async () => {
    if (!lastLog) return;
    setBusy(true);
    try {
      await unlogItem(lastLog);
      toast.success(lastLog.transactionId ? "Removed one, and its expense" : "Removed one");
    } catch {
      toast.error("Couldn't remove it. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92dvh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>{item ? "Edit item" : "New monthly item"}</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-6 overflow-y-auto px-4 pb-2">
          <div className="space-y-2">
            <Label htmlFor="item-name">Name</Label>
            <Input id="item-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kinder Bueno" />
          </div>

          <div className="space-y-2">
            <Label id="item-target-label">How many a month</Label>
            <div className="flex items-center gap-3" role="group" aria-labelledby="item-target-label">
              <button
                type="button"
                onClick={() => setTarget((t) => Math.max(1, t - 1))}
                disabled={target <= 1}
                className="grid h-12 w-12 place-items-center rounded-full bg-muted text-foreground active:scale-95 disabled:opacity-40"
                aria-label="One less"
              >
                <Minus className="h-5 w-5" />
              </button>
              <span className="type-card w-14 text-center tabular" aria-live="polite">
                {target}
              </span>
              <button
                type="button"
                onClick={() => setTarget((t) => Math.min(999, t + 1))}
                className="grid h-12 w-12 place-items-center rounded-full bg-muted text-foreground active:scale-95"
                aria-label="One more"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Category</legend>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  aria-pressed={categoryId === c.id}
                  style={catStyle(c.id)}
                  className={cn(
                    "type-label flex items-center gap-1.5 rounded-full border-2 py-1 pl-1 pr-3 transition-colors",
                    categoryId === c.id ? "cat-soft border-[hsl(var(--cat))]" : "border-transparent bg-muted",
                  )}
                >
                  <CategoryBadge id={c.id} icon={c.icon} size="sm" className="h-7 w-7" />
                  {c.name}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="item-price">Price each ({currency}, optional)</Label>
            <Input
              id="item-price"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(",", "."))}
              placeholder="No price"
            />
            {priceInvalid ? (
              <p className="text-sm text-destructive">Enter a number, or leave it empty.</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                With a price, each tick is also logged as spending in its category.
              </p>
            )}
          </div>

          {item && used > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted px-4 py-3">
              <p className="text-sm">
                <span className="font-semibold tabular">
                  {used} of {item.monthlyTarget}
                </span>{" "}
                used this month
              </p>
              <Button variant="ghost" size="sm" onClick={untick} disabled={busy} className="text-primary">
                Remove one
              </Button>
            </div>
          )}
        </div>
        <DrawerFooter className="pb-safe">
          <Button onClick={submit} disabled={busy || !trimmed || priceInvalid}>
            {item ? "Save item" : "Add item"}
          </Button>
          {item && (
            <Button variant="ghost" onClick={remove} disabled={busy} className="text-destructive">
              {confirmDelete ? "Tap again to delete" : "Delete item"}
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
