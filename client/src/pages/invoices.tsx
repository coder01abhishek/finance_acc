import { useInvoices, useClients, useCreateInvoice, useCreateClient } from "@/hooks/use-finance";
import { useAuth } from "@/hooks/use-simple-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Mail, Calendar, User, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertInvoiceSchema, insertInvoiceItemSchema, insertClientSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

// Complex form schema for invoice + items
const invoiceFormSchema = z.object({
  invoice: insertInvoiceSchema.extend({
    invoiceNumber: z.string().min(1, "Required"),
    totalAmount: z.string().default("0"),
    clientId: z.string().min(1, "Client required"),
  }),
  items: z.array(insertInvoiceItemSchema.extend({
    quantity: z.string().min(1),
    price: z.string().min(1),
    amount: z.string(),
  })).min(1, "Add at least one item")
});

export default function InvoicesPage() {
  const { data: invoices, isLoading } = useInvoices();
  const { data: clients } = useClients();
  const [isOpen, setIsOpen] = useState(false);
  const [isClientOpen, setIsClientOpen] = useState(false);
  const { user } = useAuth();
  
  // Only admin and manager can create invoices/clients
  const canCreate = ['admin', 'manager'].includes(user?.role || '');
  
  const createInvoiceMutation = useCreateInvoice();
  const createClientMutation = useCreateClient();

  // Invoice Form
  const form = useForm<z.infer<typeof invoiceFormSchema>>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoice: {
        date: format(new Date(), 'yyyy-MM-dd'),
        dueDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        status: "draft",
        totalAmount: "0"
      },
      items: [{ description: "", quantity: "1", price: "0", amount: "0" } as any]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  // Calculate totals when items change
  const watchItems = form.watch("items");
  const calculateTotal = () => {
    const total = watchItems.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.price)), 0);
    return total.toFixed(2);
  };

  const onInvoiceSubmit = (values: z.infer<typeof invoiceFormSchema>) => {
    const total = calculateTotal();
    createInvoiceMutation.mutate({
      invoice: { ...values.invoice, clientId: parseInt(values.invoice.clientId as string), totalAmount: total },
      items: values.items.map(item => ({ 
        ...item, 
        amount: (Number(item.quantity) * Number(item.price)).toFixed(2) 
      })) as any
    }, {
      onSuccess: () => {
        setIsOpen(false);
        form.reset();
      }
    });
  };

  // Client Form
  const clientForm = useForm({
    resolver: zodResolver(insertClientSchema),
    defaultValues: { name: "", email: "", phone: "", address: "" }
  });

  const onClientSubmit = (values: any) => {
    createClientMutation.mutate(values, {
      onSuccess: () => {
        setIsClientOpen(false);
        clientForm.reset();
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">Invoices</h2>
          <p className="text-muted-foreground mt-1">Create and manage client invoices.</p>
        </div>
        
        {canCreate && (
          <div className="flex gap-2">
            <Dialog open={isClientOpen} onOpenChange={setIsClientOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2" data-testid="button-add-client">
                  <User className="w-4 h-4" /> Add Client
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add New Client</DialogTitle></DialogHeader>
                <Form {...clientForm}>
                  <form onSubmit={clientForm.handleSubmit(onClientSubmit)} className="space-y-4 py-4">
                    <FormField control={clientForm.control} name="name" render={({field}) => (
                      <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                    )}/>
                    <FormField control={clientForm.control} name="email" render={({field}) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                    )}/>
                    <DialogFooter>
                      <Button type="submit">Save Client</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" data-testid="button-create-invoice">
                  <Plus className="w-4 h-4" /> Create Invoice
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>New Invoice</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onInvoiceSubmit)} className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                     <FormField
                      control={form.control}
                      name="invoice.clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select client" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clients?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="invoice.invoiceNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice #</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="invoice.date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Issue Date</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="invoice.dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <Label>Line Items</Label>
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex gap-2 items-end">
                        <FormField
                          control={form.control}
                          name={`items.${index}.description`}
                          render={({ field }) => (
                             <FormItem className="flex-1">
                               <FormControl><Input placeholder="Description" {...field} /></FormControl>
                             </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                             <FormItem className="w-20">
                               <FormControl><Input type="number" placeholder="Qty" {...field} /></FormControl>
                             </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.price`}
                          render={({ field }) => (
                             <FormItem className="w-28">
                               <FormControl><Input type="number" step="0.01" placeholder="Price" {...field} /></FormControl>
                             </FormItem>
                          )}
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ description: "", quantity: "1", price: "0", amount: "0" }) as any}>
                      Add Item
                    </Button>
                  </div>

                  <div className="flex justify-end text-lg font-bold">
                    Total: ${calculateTotal()}
                  </div>

                  <DialogFooter>
                    <Button type="submit" disabled={createInvoiceMutation.isPending}>Create Invoice</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-semibold">Invoice #</th>
              <th className="px-6 py-4 font-semibold">Client</th>
              <th className="px-6 py-4 font-semibold">Date</th>
              <th className="px-6 py-4 font-semibold">Due Date</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Amount</th>
              <th className="px-6 py-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {isLoading && <tr><td colSpan={7} className="p-8 text-center">Loading...</td></tr>}
            {invoices?.map((inv) => (
              <tr key={inv.id} className="hover:bg-muted/30">
                <td className="px-6 py-4 font-medium">{inv.invoiceNumber}</td>
                <td className="px-6 py-4">{inv.client?.name}</td>
                <td className="px-6 py-4 text-muted-foreground">{inv.date}</td>
                <td className="px-6 py-4 text-muted-foreground">{inv.dueDate}</td>
                <td className="px-6 py-4"><InvoiceStatusBadge status={inv.status} /></td>
                <td className="px-6 py-4 text-right font-mono font-bold">${Number(inv.totalAmount).toLocaleString()}</td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="sm"><Mail className="w-4 h-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    sent: "bg-blue-100 text-blue-600",
    paid: "bg-emerald-100 text-emerald-600",
    overdue: "bg-rose-100 text-rose-600",
  };
  return <Badge variant="outline" className={`border-0 ${styles[status]}`}>{status}</Badge>;
}
