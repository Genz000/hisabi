import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import { SpendingChart } from "@/components/SpendingChart";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  type: "expense" | "income";
}

const Index = () => {
  const [showForm, setShowForm] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "1",
      date: "2024-11-21",
      amount: 30,
      description: "taxi fnideq",
      category: "Transportation",
      type: "expense",
    },
    {
      id: "2",
      date: "2024-11-22",
      amount: 40,
      description: "Danon + Ptata",
      category: "Food",
      type: "expense",
    },
    {
      id: "3",
      date: "2024-11-22",
      amount: 10,
      description: "",
      category: "Nader",
      type: "expense",
    },
    {
      id: "4",
      date: "2024-11-23",
      amount: 60,
      description: "Filet dajaj",
      category: "Food",
      type: "expense",
    },
    {
      id: "5",
      date: "2024-11-23",
      amount: 90,
      description: "Kharja - Sed Smir",
      category: "Nader",
      type: "expense",
    },
  ]);

  const startingBalance = 99080;
  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const currentBalance = startingBalance + totalIncome - totalExpenses;

  const handleAddTransaction = (transaction: Omit<Transaction, "id">) => {
    const newTransaction = {
      ...transaction,
      id: Date.now().toString(),
    };
    setTransactions([newTransaction, ...transactions]);
    setShowForm(false);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(transactions.filter((t) => t.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        <header className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">Finance Tracker</h1>
              <p className="text-sm text-muted-foreground">Track your expenses and grow your wealth</p>
            </div>
            <Button
              onClick={() => setShowForm(!showForm)}
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Transaction
            </Button>
          </div>
        </header>

        {showForm && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">New Transaction</CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionForm
                onSubmit={handleAddTransaction}
                onCancel={() => setShowForm(false)}
              />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Current Balance
              </CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl font-bold text-foreground">${currentBalance.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                From ${startingBalance.toLocaleString()} starting
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total Expenses
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl font-bold text-destructive">${totalExpenses.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {transactions.filter((t) => t.type === "expense").length} transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total Income
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl font-bold text-success">${totalIncome.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {transactions.filter((t) => t.type === "income").length} transactions
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          <SpendingChart transactions={transactions} />
          <CategoryBreakdown transactions={transactions} />
        </div>

        <TransactionList
          transactions={transactions}
          onDelete={handleDeleteTransaction}
        />
      </div>
    </div>
  );
};

export default Index;
