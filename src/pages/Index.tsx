import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown, Wallet, LogOut } from "lucide-react";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import { SpendingChart } from "@/components/SpendingChart";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User, Session } from "@supabase/supabase-js";
import logo from "@/assets/logo.svg";
export interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  type: "expense" | "income";
}
const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    // Set up auth state listener
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);
  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);
  const fetchTransactions = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("transactions").select("*").order("date", {
        ascending: false
      });
      if (error) throw error;
      setTransactions((data || []).map(t => ({
        id: t.id,
        date: t.date,
        amount: Number(t.amount),
        description: t.description || "",
        category: t.category,
        type: t.type as "expense" | "income"
      })));
    } catch (error: any) {
      toast.error("Failed to load transactions");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  const startingBalance = 99080;
  const totalExpenses = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const currentBalance = startingBalance + totalIncome - totalExpenses;
  const handleAddTransaction = async (transaction: Omit<Transaction, "id">) => {
    if (!user) return;
    try {
      const {
        data,
        error
      } = await supabase.from("transactions").insert([{
        ...transaction,
        user_id: user.id
      }]).select().single();
      if (error) throw error;
      const newTransaction: Transaction = {
        id: data.id,
        date: data.date,
        amount: Number(data.amount),
        description: data.description || "",
        category: data.category,
        type: data.type as "expense" | "income"
      };
      setTransactions([newTransaction, ...transactions]);
      setShowForm(false);
      toast.success("Transaction added!");
    } catch (error: any) {
      toast.error("Failed to add transaction");
      console.error(error);
    }
  };
  const handleDeleteTransaction = async (id: string) => {
    try {
      const {
        error
      } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
      setTransactions(transactions.filter(t => t.id !== id));
      toast.success("Transaction deleted!");
    } catch (error: any) {
      toast.error("Failed to delete transaction");
      console.error(error);
    }
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Wallet className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>;
  }
  if (!user) {
    return null;
  }
  return <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 max-w-7xl xl:w-[70%]">
        <header className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Finance Tracker Logo" className="h-10 w-10" />
              <div className="text-gray-900">
                <h1 className="mb-1 text-xl text-gray-950 font-sans font-extrabold">Hisabi</h1>
                
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Transaction
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New Transaction</DialogTitle>
                  </DialogHeader>
                  <TransactionForm onSubmit={handleAddTransaction} onCancel={() => setShowForm(false)} />
                </DialogContent>
              </Dialog>
              <Button onClick={handleLogout} size="sm" variant="destructive">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>
        <Separator className="mb-4" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 mt-[30px]">
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
                {transactions.filter(t => t.type === "expense").length} transactions
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
                {transactions.filter(t => t.type === "income").length} transactions
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          <SpendingChart transactions={transactions} />
          <CategoryBreakdown transactions={transactions} />
        </div>

        <TransactionList transactions={transactions} onDelete={handleDeleteTransaction} />
      </div>
    </div>;
};
export default Index;