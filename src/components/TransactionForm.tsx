import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Transaction } from "@/pages/Index";

interface TransactionFormProps {
  onSubmit: (transaction: Omit<Transaction, "id">) => void;
  onCancel: () => void;
}

const EXPENSE_CATEGORIES = [
  "Food",
  "Sport",
  "Health/medical",
  "Home",
  "Transportation",
  "Hajar",
  "Gifts",
  "Utilities",
  "Travel",
  "Others",
  "Nader",
];

const INCOME_CATEGORIES = [
  "Savings",
  "Paycheck",
  "Bonus",
  "Freelancing",
  "Other",
];

export const TransactionForm = ({ onSubmit, onCancel }: TransactionFormProps) => {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;

    onSubmit({
      type,
      amount: parseFloat(amount),
      description,
      category,
      date,
    });

    // Reset form
    setAmount("");
    setDescription("");
    setCategory("");
    setDate(new Date().toISOString().split("T")[0]);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="type" className="text-sm">Type</Label>
          <Select value={type} onValueChange={(value: "expense" | "income") => {
            setType(value);
            setCategory("");
          }}>
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="amount" className="text-sm">Amount ($)</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="category" className="text-sm">Category</Label>
          <Select value={category} onValueChange={setCategory} required>
            <SelectTrigger id="category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="date" className="text-sm">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="h-9"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-sm">Description</Label>
        <Input
          id="description"
          placeholder="Enter description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-9"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} size="sm">
          Cancel
        </Button>
        <Button type="submit" size="sm">Add Transaction</Button>
      </div>
    </form>
  );
};
