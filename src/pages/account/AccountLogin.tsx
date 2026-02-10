import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn } from "lucide-react";

export default function AccountLogin() {
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/account";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) navigate(returnTo);
      }
    );
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) navigate(returnTo);
    });
    return () => subscription.unsubscribe();
  }, [navigate, returnTo]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ variant: "destructive", title: "Login failed", description: error.message === "Invalid login credentials" ? "Invalid email or password." : error.message });
      } else {
        toast({ title: "Welcome back!", description: "You have been logged in successfully." });
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center py-16 px-4 bg-secondary/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-accent/10 flex items-center justify-center mb-3">
              <LogIn className="w-7 h-7 text-accent" />
            </div>
            <CardTitle className="text-2xl">Customer Login</CardTitle>
            <CardDescription>Sign in to view your orders and account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} required />
              </div>
              <Button type="submit" className="w-full btn-cta" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sign In
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to={`/account/register?returnTo=${encodeURIComponent(returnTo)}`} className="text-accent hover:underline">
                Create one
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
