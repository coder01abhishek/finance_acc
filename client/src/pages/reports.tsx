import { useState } from "react";
import { useDashboardStats, useTransactions, useCategories } from "@/hooks/use-finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format, subMonths } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, TrendingDown, Calendar, FileText } from "lucide-react";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ReportsPage() {
  const currentMonth = format(new Date(), "yyyy-MM");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  
  const { data: stats, isLoading: statsLoading } = useDashboardStats(selectedMonth);
  const { data: transactions } = useTransactions({ month: selectedMonth, status: "approved" });
  const { data: categories } = useCategories();

  // Generate last 6 months for dropdown
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), i);
    return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") };
  });

  // Calculate category breakdown using amountInInr (base currency)
  const categoryBreakdown = categories?.map(cat => {
    const total = transactions
      ?.filter(tx => tx.categoryId === cat.id && tx.type === 'expense')
      .reduce((sum, tx) => sum + Number(tx.amountInInr), 0) || 0;
    return { name: cat.name, value: total };
  }).filter(c => c.value > 0) || [];

  const incomeBreakdown = categories?.map(cat => {
    const total = transactions
      ?.filter(tx => tx.categoryId === cat.id && tx.type === 'income')
      .reduce((sum, tx) => sum + Number(tx.amountInInr), 0) || 0;
    return { name: cat.name, value: total };
  }).filter(c => c.value > 0) || [];

  // All calculations use amountInInr (base currency INR)
  const totalIncome = transactions?.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + Number(tx.amountInInr), 0) || 0;
  const totalExpense = transactions?.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + Number(tx.amountInInr), 0) || 0;

  const summaryData = [
    { name: 'Income', value: totalIncome, fill: '#10b981' },
    { name: 'Expense', value: totalExpense, fill: '#ef4444' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground mt-1">Monthly financial summaries and insights.</p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px]" data-testid="select-month">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {months.map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">₹{totalIncome.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">₹{totalExpense.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit/Loss</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(totalIncome - totalExpense) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {(totalIncome - totalExpense) >= 0 ? '+' : ''}₹{(totalIncome - totalExpense).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summaryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `₹${v.toLocaleString()}`} />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {categoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {categoryBreakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No expense data for this period
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category-wise Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Category-wise Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Income</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Expense</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {categories?.map(cat => {
                  const income = transactions?.filter(tx => tx.categoryId === cat.id && tx.type === 'income').reduce((sum, tx) => sum + Number(tx.amountInInr), 0) || 0;
                  const expense = transactions?.filter(tx => tx.categoryId === cat.id && tx.type === 'expense').reduce((sum, tx) => sum + Number(tx.amountInInr), 0) || 0;
                  if (income === 0 && expense === 0) return null;
                  return (
                    <tr key={cat.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{cat.name}</td>
                      <td className="px-4 py-3 text-right text-emerald-600">₹{income.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-rose-600">₹{expense.toLocaleString()}</td>
                      <td className={`px-4 py-3 text-right font-medium ${(income - expense) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ₹{(income - expense).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
