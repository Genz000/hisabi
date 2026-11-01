import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryIcon } from "@/components/CategoryIcon";
import { useHisabi } from "@/data/HisabiStore";
import { todayISO, type Transaction } from "@/lib/hisabi";
import { cn } from "@/lib/utils";

/** Edit or delete a past transaction. */
export const TransactionSheet = ({ transaction, onClose }: { transaction: Transaction | null; onClose: () => void }) => {
  const { data, updateTransaction, deleteTransaction } = useHisabi();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!transaction) return;
    setAmount(String(transaction.amount));
    setCategory(transaction.category);
    setDate(transaction.date);
    setNote(transaction.description);
  }, [transaction]);

  const t = transaction;
  const options = t
    ? data.categories.filter((c) => c.kind === t.type && (!c.archived || c.name === t.category))
    : [];
  const value = Number(amount);
  const valid = value > 0 && !!category && !!date;

  const save = async () => {
    if (!t || !valid) return;
    setBusy(true);
    try {
      await updateTransaction(t.id, { amount: value, category, date, description: note.trim() });
      toast.success("Changes saved");
      onClose();
    } catch {
      toast.error("Couldn't save changes. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!t) return;
    setBusy(true);
    try {
      await deleteTransaction(t.id);
      toast.success(t.type === "expense" ? "Expense deleted" : "Income deleted");
      onClose();
    } catch {
      toast.error("Couldn't delete. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={!!t} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[92dvh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>{t?.type === "income" ? "Edit income" : "Edit expense"}</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-5 overflow-y-auto px-4 pb-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tx-amount">Amount ({data.profile.currency})</Label>
              <Input
                id="tx-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(",", "."))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-date">Date</Label>
              <Input id="tx-date" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Category</legend>
            <div className="flex flex-wrap gap-1.5">
              {options.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.name)}
                  aria-pressed={category === c.name}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm",
                    category === c.name ? "border-primary bg-secondary text-primary" : "border-border",
                  )}
                >
                  <CategoryIcon icon={c.icon} className="h-4 w-4" />
                  {c.name}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="tx-note">Note</Label>
            <Input id="tx-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <DrawerFooter className="pb-safe">
          <Button onClick={save} disabled={busy || !valid}>
            Save changes
          </Button>
          <Button variant="ghost" className="text-destructive" onClick={remove} disabled={busy}>
            {t?.type === "income" ? "Delete income" : "Delete expense"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
