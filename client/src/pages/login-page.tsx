import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    setIsLoading(true);
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="grid lg:grid-cols-2 gap-8 w-full max-w-5xl bg-background rounded-2xl shadow-xl overflow-hidden border border-border">
        
        {/* Left Side - Hero */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(45deg,rgba(0,0,0,0.1),rgba(255,255,255,0.1))]" />
          <div className="z-10">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-8 backdrop-blur-md">
              <span className="text-2xl font-bold">F</span>
            </div>
            <h1 className="text-4xl font-display font-bold mb-4">
              Financial Clarity for Modern Business
            </h1>
            <p className="text-primary-foreground/80 text-lg">
              Manage cash flow, track expenses, and forecast growth with professional precision.
            </p>
          </div>
          
          <div className="z-10 text-sm text-primary-foreground/60">
            © 2024 FinOps Inc. Internal Tooling.
          </div>
        </div>

        {/* Right Side - Login */}
        <div className="flex flex-col justify-center p-8 lg:p-12">
          <div className="mx-auto w-full max-w-sm space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-semibold tracking-tight">Welcome Back</h2>
              <p className="text-sm text-muted-foreground">
                Sign in to access your financial dashboard
              </p>
            </div>
            
            <Button 
              className="w-full h-12 text-base" 
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Sign In with Replit"
              )}
            </Button>
            
            <p className="px-8 text-center text-xs text-muted-foreground">
              By clicking continue, you agree to our internal data handling policies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
