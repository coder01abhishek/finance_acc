import { useState } from "react";
import { useCategories, useCreateCategory } from "@/hooks/use-finance";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Tag, Users, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

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

export default function SettingsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: appUsers, isLoading: usersLoading } = useAppUsers();
  const createCategoryMutation = useCreateCategory();

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
                          <Switch checked={cat.isEnabled} disabled={cat.isSystem} />
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
                    <div key={user.id} className="flex items-center justify-between py-3">
                      <div>
                        <div className="font-medium">{user.name || "Unknown User"}</div>
                        <div className="text-sm text-muted-foreground">{user.email || "No email"}</div>
                      </div>
                      <Badge 
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {user.role.replace('_', ' ')}
                      </Badge>
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
