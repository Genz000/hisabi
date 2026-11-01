import { useState } from "react";
import { parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, type Transaction } from "@/lib/hisabi";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
interface SpendingChartProps {
  transactions: Transaction[];
  currency: string;
}
type ViewMode = "daily" | "monthly";
export const SpendingChart = ({
  transactions,
  currency
}: SpendingChartProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  // Filter transactions for current month if in daily mode
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const filteredTransactions = viewMode === "daily" ? transactions.filter(t => {
    const transactionDate = parseISO(t.date);
    return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
  }) : transactions;

  // Group transactions by date or month
  const dataByPeriod = filteredTransactions.reduce((acc, transaction) => {
    const date = parseISO(transaction.date);
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
  return <Card className="rounded-3xl border-0 shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.12)]">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <CardTitle className="type-title">Spending Overview</CardTitle>
          <RadioGroup value={viewMode} onValueChange={value => setViewMode(value as ViewMode)} className="flex gap-3">
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="daily" id="daily-spending" />
              <Label htmlFor="daily-spending" className="cursor-pointer text-[0.8125rem] font-medium">This month</Label>
            </div>
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="monthly" id="monthly-spending" />
              <Label htmlFor="monthly-spending" className="cursor-pointer text-[0.8125rem] font-medium">All time</Label>
            </div>
          </RadioGroup>
        </div>
      </CardHeader>
      <CardContent className="flex-row my-0 flex items-center justify-start py-4">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} className="mr-0 pl-0 pr-[30px] pt-[10px]">
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
          }} formatter={(value: number) => formatMoney(value, currency)} />
            
            <Line dataKey="expenses" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{
            r: 4
          }} name="Expenses" />
            <Line dataKey="income" stroke="hsl(var(--success))" strokeWidth={2} dot={{
            r: 4
          }} name="Income" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>;
};