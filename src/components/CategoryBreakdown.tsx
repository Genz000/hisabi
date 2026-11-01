import { useState } from "react";
import { parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, type Transaction } from "@/lib/hisabi";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
interface CategoryBreakdownProps {
  transactions: Transaction[];
  currency: string;
}
type ViewMode = "daily" | "monthly";
const COLORS = ["hsl(246, 90%, 63%)", "hsl(4, 92%, 62%)", "hsl(36, 95%, 52%)", "hsl(152, 60%, 44%)", "hsl(204, 88%, 56%)", "hsl(330, 82%, 62%)", "hsl(174, 72%, 40%)", "hsl(262, 83%, 66%)"];
export const CategoryBreakdown = ({
  transactions,
  currency
}: CategoryBreakdownProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("daily");

  // Filter transactions for current month if in daily mode
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const filteredTransactions = viewMode === "daily" ? transactions.filter(t => {
    const transactionDate = parseISO(t.date);
    return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
  }) : transactions;

  // Group expenses by category
  const expensesByCategory = filteredTransactions.filter(t => t.type === "expense").reduce((acc, transaction) => {
    if (!acc[transaction.category]) {
      acc[transaction.category] = 0;
    }
    acc[transaction.category] += transaction.amount;
    return acc;
  }, {} as Record<string, number>);
  const chartData = Object.entries(expensesByCategory).map(([name, value]) => ({
    name,
    value
  })).sort((a, b) => b.value - a.value);
  const totalExpenses = chartData.reduce((sum, item) => sum + item.value, 0);
  return <Card className="rounded-3xl border-0 shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.12)]">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <CardTitle className="font-display text-lg">Spending by Category</CardTitle>
          <RadioGroup value={viewMode} onValueChange={value => setViewMode(value as ViewMode)} className="flex gap-3">
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="daily" id="daily-category" />
              <Label htmlFor="daily-category" className="text-xs cursor-pointer">This month</Label>
            </div>
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="monthly" id="monthly-category" />
              <Label htmlFor="monthly-category" className="text-xs cursor-pointer">All time</Label>
            </div>
          </RadioGroup>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            No expense data available
          </div> : <>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart className="pt-0 mt-[20px]">
                <Pie data={chartData} cx="50%" cy="50%" labelLine={false} label={({
              name,
              percent
            }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={60} fill="#8884d8" dataKey="value">
                  {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px"
            }} formatter={(value: number) => formatMoney(value, currency)} />
                
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-6 space-y-1.5">
              {chartData.map((item, index) => <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{
                backgroundColor: COLORS[index % COLORS.length]
              }} />
                    <span className="text-foreground">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-foreground">
                      {formatMoney(item.value, currency)}
                    </span>
                    <span className="text-muted-foreground ml-1.5">
                      ({(item.value / totalExpenses * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>)}
            </div>
          </>}
      </CardContent>
    </Card>;
};