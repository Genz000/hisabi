import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Money } from "@/components/Money";
import { Segmented } from "@/components/Segmented";
import { useHisabi } from "@/data/HisabiStore";
import { debtRemaining, formatMoney, todayISO, type Debt, type DebtDirection } from "@/lib/hisabi";
import { cn } from "@/lib/utils";

const parseAmount = (v: string) => (v.trim() === "" ? null : Number(v));

/** Add a debt, or see one: what's left, record a repayment, edit or delete it. */
export const DebtSheet = ({
  open,
  onOpenChange,
  debt,
  direction: initialDirection,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt: Debt | null;
  direction: DebtDirection;
}) => {
  const { data, saveDebt, deleteDebt, addDebtPayment, deleteDebtPayment } = useHisabi();
  const { currency } = data.profile;

  const [person, setPerson] = useState("");
  const [direction, setDirection] = useState<DebtDirection>("borrowed");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [affectsBalance, setAffectsBalance] = useState(true);
  const [payment, setPayment] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPerson(debt?.person ?? "");
    setDirection(debt?.direction ?? initialDirection);
    setAmount(debt ? String(debt.amount) : "");
    setDate(debt?.date ?? todayISO());
    setDueDate(debt?.dueDate ?? "");
    setNote(debt?.note ?? "");
    setAffectsBalance(debt?.affectsBalance ?? true);
    setPayment("");
    setConfirmDelete(false);
  }, [open, debt, initialDirection]);

  const live = debt ? data.debts.find((d) => d.id === debt.id) ?? debt : null;
  const remaining = live ? debtRemaining([live], data.debtPayments).get(live.id) ?? 0 : 0;
  const payments = live ? data.debtPayments.filter((p) => p.debtId === live.id) : [];
  const paid = live ? live.amount - remaining : 0;

  const amountValue = parseAmount(amount);
  const amountInvalid = amountValue === null || !(amountValue > 0) || (live !== null && amountValue < paid);
  const paymentValue = parseAmount(payment);
  const paymentInvalid = paymentValue === null || !(paymentValue > 0) || paymentValue > remaining + 0.001;
  const borrowed = direction === "borrowed";

  const submit = async () => {
    if (!person.trim() || amountInvalid || amountValue === null) return;
    setBusy(true);
    try {
      await saveDebt({
        id: live?.id ?? crypto.randomUUID(),
        person: person.trim(),
        direction,
        amount: amountValue,
        note: note.trim(),
        date,
        dueDate: dueDate || null,
        affectsBalance,
      });
      toast.success(live ? "Debt saved" : borrowed ? `Added: you owe ${person.trim()}` : `Added: ${person.trim()} owes you`);
      onOpenChange(false);
    } catch {
      toast.error("Couldn't save the debt. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const pay = async () => {
    if (!live || paymentInvalid || paymentValue === null) return;
    setBusy(true);
    try {
      await addDebtPayment(live.id, paymentValue);
      setPayment("");
      const done = remaining - paymentValue <= 0.001;
      toast.success(
        done
          ? live.direction === "borrowed"
            ? `All paid back to ${live.person}`
            : `${live.person} paid you back in full`
          : `${formatMoney(remaining - paymentValue, currency)} left`,
      );
      if (done) onOpenChange(false);
    } catch {
      toast.error("Couldn't save the payment. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const removePayment = async (id: string) => {
    try {
      await deleteDebtPayment(id);
    } catch {
      toast.error("Couldn't remove the payment. Try again.");
    }
  };

  const remove = async () => {
    if (!live) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    try {
      await deleteDebt(live.id);
      toast.success("Debt deleted");
      onOpenChange(false);
    } catch {
      toast.error("Couldn't delete the debt. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92dvh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>
            {live ? (live.direction === "borrowed" ? `You owe ${live.person}` : `${live.person} owes you`) : "New debt"}
          </DrawerTitle>
        </DrawerHeader>

        <div className="space-y-6 overflow-y-auto px-4 pb-2">
          {live && (
            <section className="rounded-3xl bg-muted p-4">
              <p className="type-meta">{remaining > 0 ? "Left to pay back" : "Paid back in full"}</p>
              <p className={cn("type-card mt-1", remaining === 0 && "text-success")}>
                <Money value={remaining} currency={currency} />
              </p>
              <p className="type-meta mt-1">
                {formatMoney(paid, currency)} of {formatMoney(live.amount, currency)} paid back
              </p>

              {remaining > 0 && (
                <div className="mt-4 space-y-2">
                  <Label htmlFor="debt-payment">
                    {live.direction === "borrowed" ? "You paid back" : "They paid you back"}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="debt-payment"
                      inputMode="decimal"
                      value={payment}
                      onChange={(e) => setPayment(e.target.value.replace(",", "."))}
                      placeholder={formatMoney(remaining, currency)}
                      className="bg-card"
                    />
                    <Button onClick={pay} disabled={busy || paymentInvalid} className="shrink-0">
                      Add payment
                    </Button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPayment(String(remaining))}
                    className="type-label text-primary"
                  >
                    All of it ({formatMoney(remaining, currency)})
                  </button>
                </div>
              )}

              {payments.length > 0 && (
                <ul className="mt-4 divide-y divide-border border-t border-border">
                  {payments.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 py-2.5">
                      <span className="type-meta flex-1">{format(parseISO(p.date), "d MMMM yyyy")}</span>
                      <Money value={p.amount} currency={currency} className="type-label" />
                      <button
                        type="button"
                        onClick={() => removePayment(p.id)}
                        className="-m-1 rounded-full p-1 text-muted-foreground"
                        aria-label={`Remove payment of ${formatMoney(p.amount, currency)}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {!live && (
            <Segmented<DebtDirection>
              label="Who owes"
              value={direction}
              onChange={setDirection}
              options={[
                ["borrowed", "I borrowed"],
                ["lent", "I lent"],
              ]}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="debt-person">{borrowed ? "Borrowed from" : "Lent to"}</Label>
            <Input id="debt-person" value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Name" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="debt-amount">Amount ({currency})</Label>
            <Input
              id="debt-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(",", "."))}
              placeholder="0"
            />
            {live && amountValue !== null && amountValue < paid && (
              <p className="text-sm text-destructive">Can't be less than what's already paid back.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="debt-date">{borrowed ? "Borrowed on" : "Lent on"}</Label>
              <Input id="debt-date" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value || todayISO())} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="debt-due">Pay back by</Label>
              <Input id="debt-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="debt-note">Note</Label>
            <Input id="debt-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
          </div>

          <label className="flex items-start justify-between gap-4 rounded-2xl bg-muted px-4 py-3">
            <span>
              <span className="type-label block">Count it in my balance</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                {borrowed
                  ? "The money came to me, and paying it back takes it out."
                  : "The money left my balance, and getting it back adds it."}{" "}
                It never counts as spending or income.
              </span>
            </span>
            <Switch checked={affectsBalance} onCheckedChange={setAffectsBalance} className="mt-0.5 shrink-0" />
          </label>
        </div>

        <DrawerFooter className="pb-safe">
          <Button onClick={submit} disabled={busy || !person.trim() || amountInvalid}>
            {live ? "Save changes" : borrowed ? "Add what I owe" : "Add what I'm owed"}
          </Button>
          {live && (
            <Button variant="ghost" onClick={remove} disabled={busy} className="text-destructive">
              {confirmDelete ? "Tap again to delete" : "Delete debt"}
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
