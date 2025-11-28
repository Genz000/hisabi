import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowUpRight, ArrowDownRight, Pencil } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Transaction } from "@/pages/Index";
interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
}
export const TransactionList = ({
  transactions,
  onDelete,
  onEdit
}: TransactionListProps) => {
  const [typeFilter, setTypeFilter] = useState<"all" | "expense" | "income">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  // Filter transactions
  const filteredTransactions = transactions.filter(transaction => {
    const matchesType = typeFilter === "all" || transaction.type === typeFilter;
    const matchesCategory = categoryFilter === "all" || transaction.category === categoryFilter;
    return matchesType && matchesCategory;
  });
  
  // Get unique categories from all transactions
  const allCategories = Array.from(new Set(transactions.map(t => t.category))).sort();
  
  return <Card className="px-[10px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg mb-3">Recent Transactions</CardTitle>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <Tabs value={typeFilter} onValueChange={(value) => setTypeFilter(value as "all" | "expense" | "income")}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="expense">Expenses</TabsTrigger>
                <TabsTrigger value="income">Income</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex-1">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {allCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {filteredTransactions.length === 0 ? <p className="text-center text-muted-foreground py-8">
              No transactions found. {transactions.length === 0 ? "Add your first transaction to get started!" : "Try adjusting your filters."}
            </p> : filteredTransactions.map(transaction => <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`p-1.5 rounded-full shrink-0 ${transaction.type === "expense" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
                    {transaction.type === "expense" ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {transaction.description || "No description"}
                    </p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>{transaction.category}</span>
                      <span>•</span>
                      <span>{new Date(transaction.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-base font-bold ${transaction.type === "expense" ? "text-destructive" : "text-success"}`}>
                      {transaction.type === "expense" ? "-" : "+"}$
                      {transaction.amount.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 ml-2 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(transaction)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(transaction.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>)}
        </div>
      </CardContent>
    </Card>;
};