import { useState, useEffect } from "react";
import { useTransactions, useCategories, useAccounts, useCreateTransaction, useApproveTransaction } from "@/hooks/use-finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Plus, Filter, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD"];

const formSchema = z.object({
  dateStr: z.string().min(1, "Date is required"),
  type: z.enum(["income", "expense", "transfer", "opening_balance"]),
  originalAmount: z.string().min(1, "Amount is required"),
  originalCurrency: z.string().default("INR"),
  exchangeRateToInr: z.string().default("1"),
  accountId: z.string().min(1, "Account is required"),
  categoryId: z.string().optional(),
  toAccountId: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["draft", "submitted", "approved", "rejected"]).default("draft"),
});

export default function TransactionsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [filterMonth, setFilterMonth] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  
  const { data: transactions, isLoading } = useTransactions({ 
    month: filterMonth || undefined,
    status: filterStatus || undefined
  });
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  
  const createMutation = useCreateTransaction();
  const approveMutation = useApproveTransaction();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dateStr: format(new Date(), "yyyy-MM-dd"),
      type: "expense",
      status: "draft",
      originalAmount: "",
      originalCurrency: "INR",
      exchangeRateToInr: "1",
      accountId: "",
      categoryId: "",
      description: "",
      notes: "",
    }
  });

  const watchCurrency = form.watch("originalCurrency");
  const watchAmount = form.watch("originalAmount");
  const watchRate = form.watch("exchangeRateToInr");

  const calculatedInr = watchAmount && watchRate 
    ? (parseFloat(watchAmount) * parseFloat(watchRate)).toFixed(2) 
    : "0.00";

  const fetchExchangeRate = async (currency: string) => {
    if (currency === "INR") {
      form.setValue("exchangeRateToInr", "1");
      return;
    }
    
    setIsFetchingRate(true);
    try {
      const res = await fetch(`/api/exchange-rate/${currency}`);
      if (res.ok) {
        const data = await res.json();
        form.setValue("exchangeRateToInr", data.rate.toString());
      }
    } catch (err) {
      console.error("Failed to fetch exchange rate");
    } finally {
      setIsFetchingRate(false);
    }
  };

  useEffect(() => {
    if (watchCurrency) {
      fetchExchangeRate(watchCurrency);
    }
  }, [watchCurrency]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createMutation.mutate({
      ...values,
      date: new Date(values.dateStr),
      originalAmount: values.originalAmount,
      originalCurrency: values.originalCurrency,
      exchangeRateToInr: values.exchangeRateToInr,
      accountId: parseInt(values.accountId as string),
      categoryId: values.categoryId ? parseInt(values.categoryId as string) : undefined,
      toAccountId: values.toAccountId ? parseInt(values.toAccountId as string) : undefined,
    }, {
      onSuccess: () => {
        setIsOpen(false);
        form.reset();
      }
    });
  };

  const formatCurrency = (amount: string | number, currency: string = "INR") => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">Transactions</h2>
          <p className="text-muted-foreground mt-1">Manage and track all financial movements. All values in INR.</p>
        </div>
        <div className="flex gap-2">
          <Select onValueChange={setFilterStatus} value={filterStatus}>
             <SelectTrigger className="w-[140px]">
               <Filter className="w-4 h-4 mr-2" />
               <SelectValue placeholder="Status" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All Status</SelectItem>
               <SelectItem value="draft">Draft</SelectItem>
               <SelectItem value="submitted">Submitted</SelectItem>
               <SelectItem value="approved">Approved</SelectItem>
             </SelectContent>
          </Select>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-add-transaction">
                <Plus className="w-4 h-4" /> Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>New Transaction</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dateStr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-tx-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-tx-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="income">Income</SelectItem>
                              <SelectItem value="expense">Expense</SelectItem>
                              <SelectItem value="transfer">Transfer</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="originalAmount"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-tx-amount" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="originalCurrency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-tx-currency">
                                <SelectValue placeholder="Currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CURRENCIES.map(c => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {watchCurrency !== "INR" && (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Exchange Rate (1 {watchCurrency} = INR)</span>
                        <div className="flex items-center gap-2">
                          <FormField
                            control={form.control}
                            name="exchangeRateToInr"
                            render={({ field }) => (
                              <Input 
                                type="number" 
                                step="0.0001" 
                                className="w-28 h-8 text-right" 
                                {...field}
                                data-testid="input-exchange-rate"
                              />
                            )}
                          />
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={() => fetchExchangeRate(watchCurrency)}
                            disabled={isFetchingRate}
                          >
                            <RefreshCw className={`w-4 h-4 ${isFetchingRate ? 'animate-spin' : ''}`} />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <span className="text-sm font-medium">Amount in INR</span>
                        <span className="text-lg font-bold text-primary" data-testid="text-amount-inr">
                          {formatCurrency(calculatedInr, "INR")}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                     <FormField
                      control={form.control}
                      name="accountId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger data-testid="select-tx-account">
                                <SelectValue placeholder="Select account" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {accounts?.map(acc => (
                                <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch("type") !== "transfer" && (
                      <FormField
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger data-testid="select-tx-category">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories?.map(cat => (
                                  <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {form.watch("type") === "transfer" && (
                      <FormField
                        control={form.control}
                        name="toAccountId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>To Account</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Destination" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {accounts?.map(acc => (
                                  <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="What was this for?" {...field} value={field.value || ''} data-testid="input-tx-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional details..." {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-transaction">
                      {createMutation.isPending ? "Creating..." : "Create Transaction"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Description</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">Account</th>
                <th className="px-6 py-4 font-semibold text-right">Original</th>
                <th className="px-6 py-4 font-semibold text-right">Amount (INR)</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">Loading transactions...</td>
                </tr>
              )}
              {transactions?.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">No transactions found.</td>
                </tr>
              )}
              {transactions?.map((tx) => (
                <tr key={tx.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-transaction-${tx.id}`}>
                  <td className="px-6 py-4 font-medium">{format(new Date(tx.date), 'MMM d, yyyy')}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{tx.description || '-'}</div>
                    {tx.type === 'transfer' && <span className="text-xs text-muted-foreground">Transfer to {tx.toAccount?.name}</span>}
                  </td>
                  <td className="px-6 py-4">
                    {tx.category ? (
                       <Badge variant="outline" className="font-normal">{tx.category.name}</Badge>
                    ) : (
                       <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{tx.account?.name}</td>
                  <td className="px-6 py-4 text-right">
                    {tx.originalCurrency !== "INR" ? (
                      <div className="text-muted-foreground text-xs">
                        {formatCurrency(tx.originalAmount, tx.originalCurrency)}
                        <div className="text-[10px]">@ {tx.exchangeRateToInr}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className={`px-6 py-4 text-right font-mono font-medium ${tx.type === 'income' ? 'text-emerald-600' : tx.type === 'expense' ? 'text-rose-600' : 'text-foreground'}`}>
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}{formatCurrency(tx.amountInInr, "INR")}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <StatusBadge status={tx.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    {tx.status === 'submitted' && (
                      <div className="flex justify-end gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={() => approveMutation.mutate(tx.id)}
                          disabled={approveMutation.isPending}
                          data-testid={`button-approve-${tx.id}`}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600 border-slate-200",
    submitted: "bg-blue-100 text-blue-600 border-blue-200",
    approved: "bg-emerald-100 text-emerald-600 border-emerald-200",
    rejected: "bg-rose-100 text-rose-600 border-rose-200",
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.draft}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
