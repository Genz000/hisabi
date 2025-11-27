import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Transaction } from "@/pages/Index";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
interface SpendingChartProps {
  transactions: Transaction[];
}
type ViewMode = "daily" | "monthly";
export const SpendingChart = ({
  transactions
}: SpendingChartProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  // Filter transactions for current month if in daily mode
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const filteredTransactions = viewMode === "daily" ? transactions.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
  }) : transactions;

  // Group transactions by date or month
  const dataByPeriod = filteredTransactions.reduce((acc, transaction) => {
    const date = new Date(transaction.date);
    const key = viewMode === "daily" ? date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    }) : date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric"
    });
    if (!acc[key]) {
      acc[key] = {
        date: key,
        expenses: 0,
        income: 0
      };
    }
    if (transaction.type === "expense") {
      acc[key].expenses += transaction.amount;
    } else {
      acc[key].income += transaction.amount;
    }
    return acc;
  }, {} as Record<string, {
    date: string;
    expenses: number;
    income: number;
  }>);
  const chartData = Object.values(dataByPeriod).sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  return <Card className="px-[10px]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Spending Overview</CardTitle>
          <RadioGroup value={viewMode} onValueChange={value => setViewMode(value as ViewMode)} className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="daily" id="daily-spending" />
              <Label htmlFor="daily-spending" className="text-xs cursor-pointer">Daily</Label>
            </div>
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="monthly" id="monthly-spending" />
              <Label htmlFor="monthly-spending" className="text-xs cursor-pointer">Monthly</Label>
            </div>
          </RadioGroup>
        </div>
      </CardHeader>
      <CardContent className="flex justify-center">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" className="text-xs" tick={{
            fill: "hsl(var(--muted-foreground))"
          }} />
            <YAxis className="text-xs" tick={{
            fill: "hsl(var(--muted-foreground))"
          }} />
            <Tooltip contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px"
          }} />
            <Legend wrapperStyle={{ maxWidth: "300px", margin: "0 auto" }} />
            <Line dataKey="expenses" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 4 }} name="Expenses" />
            <Line dataKey="income" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 4 }} name="Income" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>;
};