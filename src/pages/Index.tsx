import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown, Wallet, LogOut, ArrowUpDown, User as UserIcon, Settings, Image, PiggyBank } from "lucide-react";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import { SpendingChart } from "@/components/SpendingChart";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { ExpenseLimitModal } from "@/components/ExpenseLimitModal";
import { AvatarCropperModal } from "@/components/AvatarCropperModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
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
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<string>("$");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showExpenseLimitModal, setShowExpenseLimitModal] = useState(false);
  const [showCropperModal, setShowCropperModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [totalExpenseLimit, setTotalExpenseLimit] = useState<number>(0);
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
      fetchProfile();
      fetchExpenseLimits();
    }
  }, [user]);

  const fetchExpenseLimits = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("expense_limits")
        .select("limit_amount")
        .eq("user_id", user.id);
      
      if (error) throw error;
      const total = (data || []).reduce((sum, item) => sum + Number(item.limit_amount), 0);
      setTotalExpenseLimit(total);
    } catch (error: any) {
      console.error("Failed to fetch expense limits:", error);
    }
  };

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setAvatarUrl(data?.avatar_url || null);
    } catch (error: any) {
      console.error("Failed to fetch profile:", error);
    }
  };
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
  const now = new Date();
  
  // All-time calculations for Balance cards
  const allTimeExpenses = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const allTimeIncome = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const currentBalance = startingBalance + allTimeIncome - allTimeExpenses;
  const balanceChange = currentBalance - startingBalance;
  
  // Current month calculations for Income, Expenses, Savings cards
  const isCurrentMonth = (date: string) => {
    const txDate = new Date(date);
    return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
  };
  
  const monthlyExpenses = transactions
    .filter(t => t.type === "expense" && isCurrentMonth(t.date))
    .reduce((sum, t) => sum + t.amount, 0);
  
  const monthlyIncome = transactions
    .filter(t => t.type === "income" && isCurrentMonth(t.date))
    .reduce((sum, t) => sum + t.amount, 0);
  
  const monthlySavings = totalExpenseLimit - monthlyExpenses;
  const handleAddTransaction = async (transaction: Omit<Transaction, "id">) => {
    if (!user) return;
    
    if (editingTransaction) {
      // Update existing transaction
      try {
        const { error } = await supabase
          .from("transactions")
          .update({
            ...transaction,
            user_id: user.id
          })
          .eq("id", editingTransaction.id);
        
        if (error) throw error;
        
        setTransactions(transactions.map(t => 
          t.id === editingTransaction.id 
            ? { ...transaction, id: editingTransaction.id } 
            : t
        ));
        setShowForm(false);
        setEditingTransaction(null);
        toast.success("Transaction updated!");
      } catch (error: any) {
        toast.error("Failed to update transaction");
        console.error(error);
      }
    } else {
      // Add new transaction
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
  
  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowForm(true);
  };
  
  const handleCancelForm = () => {
    setShowForm(false);
    setEditingTransaction(null);
  };
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setShowCropperModal(true);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleCroppedUpload = async (croppedBlob: Blob) => {
    if (!user) return;

    try {
      const timestamp = Date.now();
      const filePath = `${user.id}/avatar-${timestamp}.jpg`;

      // Delete old avatar if exists
      if (avatarUrl) {
        try {
          const oldPathMatch = avatarUrl.match(/avatars\/(.+)\?/);
          if (oldPathMatch) {
            await supabase.storage.from("avatars").remove([oldPathMatch[1]]);
          }
        } catch (e) {
          console.log("Could not delete old avatar:", e);
        }
      }

      // Upload cropped avatar
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, croppedBlob, { upsert: true, contentType: "image/jpeg" });

      if (uploadError) throw uploadError;

      // Get public URL with cache busting
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const urlWithCacheBust = `${publicUrl}?t=${timestamp}`;

      // Update or insert profile
      const { error: updateError } = await supabase
        .from("profiles")
        .upsert(
          { user_id: user.id, avatar_url: urlWithCacheBust },
          { onConflict: "user_id" }
        );

      if (updateError) throw updateError;

      setAvatarUrl(urlWithCacheBust);
      toast.success("Profile picture updated!");
    } catch (error: any) {
      toast.error("Failed to upload avatar");
      console.error(error);
    }
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
              <img src={logo} alt="Finance Tracker Logo" className="h-12 w-30 object-fill" />
              
            </div>
            <div className="flex gap-2 items-center">
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-[80px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="$">USD</SelectItem>
                  <SelectItem value="€">EUR</SelectItem>
                  <SelectItem value="MAD">MAD</SelectItem>
                  <SelectItem value="£">GBP</SelectItem>
                  <SelectItem value="¥">JPY</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={showForm} onOpenChange={(open) => {
                setShowForm(open);
                if (!open) setEditingTransaction(null);
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Transaction
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingTransaction ? "Edit Transaction" : "New Transaction"}
                    </DialogTitle>
                  </DialogHeader>
                  <TransactionForm 
                    onSubmit={handleAddTransaction} 
                    onCancel={handleCancelForm}
                    initialData={editingTransaction || undefined}
                  />
                </DialogContent>
              </Dialog>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={avatarUrl || undefined} alt="User avatar" />
                      <AvatarFallback>
                        <UserIcon className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setShowExpenseLimitModal(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Expenses Limit
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <label className="cursor-pointer flex items-center">
                      <Image className="mr-2 h-4 w-4" />
                      Edit Profile Picture
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                    </label>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        <Separator className="mb-4" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-4 mt-[30px]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Current Balance
              </CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl font-bold text-foreground">{currency}{currentBalance.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                From {currency}{startingBalance.toLocaleString()} starting
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Monthly Expenses
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl font-bold text-destructive">{currency}{monthlyExpenses.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {transactions.filter(t => t.type === "expense" && isCurrentMonth(t.date)).length} transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Monthly Income
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl font-bold text-success">{currency}{monthlyIncome.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {transactions.filter(t => t.type === "income" && isCurrentMonth(t.date)).length} transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Balance Change
              </CardTitle>
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-4">
              <div className={`text-2xl font-bold ${balanceChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                {balanceChange >= 0 ? '+' : ''}{currency}{balanceChange.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Net change from start
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Monthly Savings
              </CardTitle>
              <PiggyBank className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="pb-4">
              <div className={`text-2xl font-bold ${monthlySavings >= 0 ? 'text-success' : 'text-destructive'}`}>
                {monthlySavings >= 0 ? '+' : ''}{currency}{monthlySavings.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {totalExpenseLimit > 0 ? 'vs budget limits' : 'Set limits first'}
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
          onEdit={handleEditTransaction}
        />
      </div>

      <ExpenseLimitModal
        open={showExpenseLimitModal}
        onOpenChange={setShowExpenseLimitModal}
        userId={user.id}
        onSave={fetchExpenseLimits}
      />

      {imageToCrop && (
        <AvatarCropperModal
          open={showCropperModal}
          onOpenChange={(open) => {
            setShowCropperModal(open);
            if (!open) setImageToCrop(null);
          }}
          imageSrc={imageToCrop}
          onCropComplete={handleCroppedUpload}
        />
      )}
    </div>;
};
export default Index;