import { useState } from "react";
import { useCategories, useCreateCategory, useUpdateCategory } from "@/hooks/use-finance";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Tag, Users, Shield, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

function useAppUsers() {
  return useQuery({
    queryKey: [api.appUsers.list.path],
    queryFn: async () => {
      const res = await fetch(api.appUsers.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });
}

function useUpdateUserRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, role }: { id: number; role: string }) => {
      const res = await fetch(api.appUsers.updateRole.path.replace(':id', String(id)), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update role");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.appUsers.list.path] });
      toast({ title: "Role updated", variant: "default" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
}

function useDeleteUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(api.appUsers.delete.path.replace(':id', String(id)), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete user");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.appUsers.list.path] });
      toast({ title: "User deleted", variant: "default" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
}

export default function SettingsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: appUsers, isLoading: usersLoading } = useAppUsers();
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const updateRoleMutation = useUpdateUserRole();
  const deleteUserMutation = useDeleteUser();

  const handleToggleCategory = (id: number, currentEnabled: boolean) => {
    updateCategoryMutation.mutate({ id, data: { isEnabled: !currentEnabled } });
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    createCategoryMutation.mutate({ name: newCategoryName, isEnabled: true, isSystem: false }, {
      onSuccess: () => {
        setIsOpen(false);
        setNewCategoryName("");
      }
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1">Manage categories, users, and system preferences.</p>
      </div>

      <Tabs defaultValue="categories" className="w-full">
        <TabsList>
          <TabsTrigger value="categories" className="gap-2">
            <Tag className="w-4 h-4" /> Categories
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" /> Users & Roles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Transaction Categories</CardTitle>
                <CardDescription>Manage categories for income and expense tracking.</CardDescription>
              </div>
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2" data-testid="button-add-category">
                    <Plus className="w-4 h-4" /> Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Category</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateCategory} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Category Name</Label>
                      <Input
                        placeholder="e.g., Marketing, Utilities"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        required
                        data-testid="input-category-name"
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={createCategoryMutation.isPending} data-testid="button-submit-category">
                        {createCategoryMutation.isPending ? "Creating..." : "Create"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {categoriesLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading categories...</div>
              ) : (
                <div className="divide-y">
                  {categories?.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{cat.name}</span>
                        {cat.isSystem && (
                          <Badge variant="secondary" className="text-xs">System</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={cat.isEnabled} 
                            disabled={cat.isSystem || updateCategoryMutation.isPending}
                            onCheckedChange={() => handleToggleCategory(cat.id, cat.isEnabled)}
                            data-testid={`switch-category-${cat.id}`}
                          />
                          <span className="text-sm text-muted-foreground">
                            {cat.isEnabled ? "Active" : "Disabled"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage user roles and permissions.</CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading users...</div>
              ) : appUsers?.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No users found. Users appear here after they log in.
                </div>
              ) : (
                <div className="divide-y">
                  {appUsers?.map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between py-3 gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{user.name || "Unknown User"}</div>
                        <div className="text-sm text-muted-foreground truncate">{user.email || "No email"}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select 
                          value={user.role} 
                          onValueChange={(role) => updateRoleMutation.mutate({ id: user.id, role })}
                          disabled={updateRoleMutation.isPending}
                        >
                          <SelectTrigger className="w-[140px]" data-testid={`select-role-${user.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="hr">HR</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="data_entry">Data Entry</SelectItem>
                          </SelectContent>
                        </Select>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              data-testid={`button-delete-user-${user.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove "{user.name || user.email}" from the system? They can still log in again with their Replit account.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteUserMutation.mutate(user.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4" /> Role Permissions
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li><strong>Admin:</strong> Full access, approve/reject entries, manage users</li>
                  <li><strong>HR:</strong> Enter expenses, cannot approve or edit approved entries</li>
                  <li><strong>Manager:</strong> Create invoices, view reports, cannot change transactions</li>
                  <li><strong>Data Entry:</strong> Create draft entries only</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
