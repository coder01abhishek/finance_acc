import { Link, useLocation } from "wouter";
import { useAuth, useLogout } from "@/hooks/use-simple-auth";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Receipt, 
  Wallet, 
  FileText, 
  PieChart, 
  Target, 
  Settings, 
  LogOut,
  Menu,
  X,
  Key
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";

// Navigation items with role-based access
// roles: which roles can see this item (empty = all roles)
const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ['admin', 'hr', 'manager'] }, // Not Data Entry
  { href: "/transactions", label: "Transactions", icon: Receipt, roles: ['admin', 'hr', 'data_entry'] },
  { href: "/accounts", label: "Accounts", icon: Wallet, roles: ['admin', 'hr'] },
  { href: "/invoices", label: "Invoicing", icon: FileText, roles: ['admin', 'manager'] },
  { href: "/reports", label: "Reports", icon: PieChart, roles: ['admin', 'manager'] },
  { href: "/goals", label: "Goals", icon: Target, roles: ['admin', 'manager'] },
];

function useChangePassword() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await fetch(api.auth.changePassword.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to change password");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password changed", description: "Your password has been updated successfully." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const logoutMutation = useLogout();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const changePasswordMutation = useChangePassword();

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-display font-bold text-primary tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            F
          </div>
          FinOps
        </h1>
      </div>
      
      <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => item.roles.length === 0 || item.roles.includes(user?.role || ''))
          .map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/25" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        
        {/* Settings at the bottom of list - Admin only */}
        {user?.role === 'admin' && (
          <Link href="/settings">
            <div className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer mt-8",
              location === "/settings"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}>
              <Settings className="w-5 h-5" />
              Settings
            </div>
          </Link>
        )}
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-4 px-2">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarFallback>{user?.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <div className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2"
            onClick={() => setIsPasswordDialogOpen(true)}
            data-testid="button-change-password"
          >
            <Key className="w-4 h-4" />
            Change Password
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
          </Button>
        </div>
      </div>
    </div>
  );

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword }, {
      onSuccess: () => {
        setIsPasswordDialogOpen(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    });
  };

  return (
    <>
      <div className="min-h-screen bg-muted/30 flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 bg-background border-r border-border fixed inset-y-0 z-30">
          <NavContent />
        </aside>

        {/* Mobile Sidebar */}
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetContent side="left" className="p-0 w-72">
            <NavContent />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 min-h-screen flex flex-col">
          {/* Mobile Header */}
          <header className="lg:hidden h-16 border-b border-border bg-background/80 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-2 font-display font-bold text-lg">
               <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-sm">
                  F
               </div>
               FinOps
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
          </header>

          <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full animate-enter">
            {children}
          </div>
        </main>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input 
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                data-testid="input-current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input 
                id="newPassword"
                type="password"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input 
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                data-testid="input-confirm-password"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-destructive">Passwords do not match</p>
              )}
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={changePasswordMutation.isPending || newPassword !== confirmPassword || newPassword.length < 6}
                data-testid="button-submit-change-password"
              >
                {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
