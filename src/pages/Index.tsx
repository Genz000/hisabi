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
    <div className="min-h-screen bg-gradient-to-br from-secondary/30 via-background to-accent/10">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Finance Tracker</h1>
              <p className="text-muted-foreground">Track your expenses and grow your wealth</p>
            </div>
            <Button
              onClick={() => setShowForm(!showForm)}
              size="lg"
              className="gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="h-5 w-5" />
              Add Transaction
            </Button>
          </div>
        </header>

        {showForm && (
          <Card className="mb-8 border-primary/20 shadow-xl">
            <CardHeader>
              <CardTitle>New Transaction</CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionForm
                onSubmit={handleAddTransaction}
                onCancel={() => setShowForm(false)}
              />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current Balance
              </CardTitle>
              <Wallet className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">${currentBalance.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                From ${startingBalance.toLocaleString()} starting
              </p>
            </CardContent>
          </Card>

          <Card className="border-destructive/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Expenses
              </CardTitle>
              <TrendingDown className="h-5 w-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">${totalExpenses.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {transactions.filter((t) => t.type === "expense").length} transactions
              </p>
            </CardContent>
          </Card>

          <Card className="border-success/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Income
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">${totalIncome.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {transactions.filter((t) => t.type === "income").length} transactions
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
