import { useAccounts, useCreateAccount, useDeleteAccount } from "@/hooks/use-finance";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Wallet, CreditCard, Banknote, Landmark, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertAccountSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = insertAccountSchema.extend({
  openingBalance: z.string().default("0"),
});

export default function AccountsPage() {
  const { data: accounts, isLoading } = useAccounts();
  const [isOpen, setIsOpen] = useState(false);
  const createMutation = useCreateAccount();
  const deleteMutation = useDeleteAccount();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "current",
      openingBalance: "0",
    }
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        setIsOpen(false);
        form.reset();
      }
    });
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'current': return Landmark;
      case 'od_cc': return CreditCard;
      case 'cash': return Banknote;
      default: return Wallet;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">Accounts</h2>
          <p className="text-muted-foreground mt-1">Manage your bank accounts, cash, and credit lines.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Account</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Chase Business Checking" {...field} />
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
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent position="popper" className="z-[100]">
                          <SelectItem value="current">Current/Checking</SelectItem>
                          <SelectItem value="od_cc">Credit Card / Overdraft</SelectItem>
                          <SelectItem value="cash">Cash in Hand</SelectItem>
                          <SelectItem value="upi">UPI / Digital Wallet</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="openingBalance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opening Balance</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Account"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && [1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        
        {accounts?.map((account) => {
          const Icon = getIcon(account.type);
          return (
            <Card key={account.id} className="card-hover overflow-hidden relative">
              {/* Decorative background circle */}
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/5 rounded-full" />
              
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="bg-primary/10 p-2 rounded-lg text-primary">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${account.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                    {account.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <CardTitle className="mt-4 text-xl">{account.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                   <p className="text-sm text-muted-foreground">Current Balance</p>
                   <p className="text-2xl font-mono font-bold tracking-tight text-foreground">
                     ₹{Number(account.currentBalance).toLocaleString('en-IN')}
                   </p>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 pt-4 text-xs text-muted-foreground flex items-center justify-between gap-2">
                <span>Type: <span className="uppercase ml-1 font-medium">{account.type.replace('_', ' ')}</span></span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      data-testid={`button-delete-account-${account.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Account</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{account.name}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deleteMutation.mutate(account.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
