import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Target, TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useDashboardStats } from "@/hooks/use-finance";
import { useToast } from "@/hooks/use-toast";

function useGoals() {
  return useQuery({
    queryKey: [api.goals.list.path],
    queryFn: async () => {
      const res = await fetch(api.goals.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch goals");
      return api.goals.list.responses[200].parse(await res.json());
    },
  });
}

function useCreateGoal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(api.goals.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create goal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.goals.list.path] });
      toast({ title: "Goal created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
}

export default function GoalsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: goals, isLoading } = useGoals();
  const { data: stats } = useDashboardStats();
  const createMutation = useCreateGoal();

  const [formData, setFormData] = useState({
    type: "revenue",
    targetAmount: "",
    period: "monthly",
    startDate: format(new Date(), "yyyy-MM-01"),
    endDate: format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), "yyyy-MM-dd"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData, {
      onSuccess: () => {
        setIsOpen(false);
        setFormData({
          type: "revenue",
          targetAmount: "",
          period: "monthly",
          startDate: format(new Date(), "yyyy-MM-01"),
          endDate: format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), "yyyy-MM-dd"),
        });
      }
    });
  };

  // Calculate progress for each goal
  const getProgress = (goal: any) => {
    if (!stats) return 0;
    const target = Number(goal.targetAmount);
    if (goal.type === 'revenue') {
      const current = stats.currentMonthProfitLoss > 0 ? stats.currentMonthProfitLoss : 0;
      return Math.min(100, (current / target) * 100);
    } else {
      // Expense goal - lower is better
      const topExpenses = stats.topExpenses.reduce((sum: number, e: any) => sum + e.amount, 0);
      if (topExpenses <= target) return 100;
      return Math.max(0, 100 - ((topExpenses - target) / target) * 100);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">Goals & Targets</h2>
          <p className="text-muted-foreground mt-1">Set and track your financial objectives.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-add-goal">
              <Plus className="w-4 h-4" /> Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Goal Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Revenue Target</SelectItem>
                    <SelectItem value="expense">Expense Cap</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target Amount</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                  required
                  data-testid="input-goal-amount"
                />
              </div>

              <div className="space-y-2">
                <Label>Period</Label>
                <Select value={formData.period} onValueChange={(v) => setFormData({ ...formData, period: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                    data-testid="input-goal-start"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                    data-testid="input-goal-end"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-goal">
                  {createMutation.isPending ? "Creating..." : "Create Goal"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading goals...</div>
      ) : goals?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No goals set yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first goal to start tracking your financial targets.
            </p>
            <Button onClick={() => setIsOpen(true)} data-testid="button-create-first-goal">
              <Plus className="w-4 h-4 mr-2" /> Create Goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals?.map((goal) => {
            const progress = getProgress(goal);
            const isRevenue = goal.type === 'revenue';
            
            return (
              <Card key={goal.id} className="relative overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={isRevenue ? "default" : "secondary"}>
                      {isRevenue ? "Revenue" : "Expense Cap"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {goal.period}
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl font-bold mt-2">
                    ${Number(goal.targetAmount).toLocaleString()}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(goal.startDate), "MMM d")} - {format(new Date(goal.endDate), "MMM d, yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    {isRevenue && stats && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Current: ${Math.max(0, stats.currentMonthProfitLoss).toLocaleString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
