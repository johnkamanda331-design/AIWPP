import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { Zap } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    
    setIsLoading(true);
    try {
      await login({ username, password });
      setLocation("/");
    } catch (err) {
      toast({
        title: "Authentication Failed",
        description: "Invalid username or password.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background items-center justify-center p-4">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-secondary via-background to-background opacity-50" />
      
      <Card className="w-full max-w-md z-10 border-border/60 shadow-2xl bg-card/80 backdrop-blur-md">
        <CardHeader className="space-y-3 pb-6">
          <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center text-primary-foreground mb-2 shadow-lg mx-auto">
            <Zap className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold text-center tracking-tight">AIPPMCS</CardTitle>
          <CardDescription className="text-center font-medium">
            Adaptive Intelligent Water Pump Protection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="operator"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="bg-background"
              />
            </div>
            <Button className="w-full mt-6" type="submit" disabled={isLoading}>
              {isLoading ? "Authenticating..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-xs text-muted-foreground pt-4 border-t border-border/40 mt-4">
          Authorized personnel only. All access is logged.
        </CardFooter>
      </Card>
    </div>
  );
}
