import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Transaction } from "@/pages/Index";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface SpendingChartProps {
  transactions: Transaction[];
}

export const SpendingChart = ({ transactions }: SpendingChartProps) => {
  // Group transactions by date
  const dataByDate = transactions.reduce((acc, transaction) => {
    const date = new Date(transaction.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    
    if (!acc[date]) {
      acc[date] = { date, expenses: 0, income: 0 };
    }
    
    if (transaction.type === "expense") {
      acc[date].expenses += transaction.amount;
    } else {
      acc[date].income += transaction.amount;
    }
    
    return acc;
  }, {} as Record<string, { date: string; expenses: number; income: number }>);

  const chartData = Object.values(dataByDate).sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  return (
    <Card className="border-primary/20 shadow-lg">
      <CardHeader>
        <CardTitle>Daily Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Bar
              dataKey="expenses"
              fill="hsl(var(--destructive))"
              radius={[8, 8, 0, 0]}
              name="Expenses"
            />
            <Bar
              dataKey="income"
              fill="hsl(var(--success))"
              radius={[8, 8, 0, 0]}
              name="Income"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
