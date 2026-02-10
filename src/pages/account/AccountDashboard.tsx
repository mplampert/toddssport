import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { supabase } from "@/integrations/supabase/client";
import { Package, User, LogOut, ShoppingBag } from "lucide-react";

export default function AccountDashboard() {
  const { user, profile } = useCustomerAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email
    : user?.email || "";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow py-12 px-4 bg-secondary/30">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">My Account</h1>
              <p className="text-muted-foreground mt-1">Welcome back, {displayName}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Link to="/account/orders">
              <Card className="hover:border-accent transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <Package className="w-5 h-5 text-accent" />
                  </div>
                  <CardTitle className="text-lg">My Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">View and track all your orders</p>
                </CardContent>
              </Card>
            </Link>

            <Card className="h-full">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-accent" />
                </div>
                <CardTitle className="text-lg">Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Email:</span> {user?.email}</p>
                  {profile?.phone && <p><span className="text-muted-foreground">Phone:</span> {profile.phone}</p>}
                </div>
              </CardContent>
            </Card>

            <Link to="/team-stores/browse">
              <Card className="hover:border-accent transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-accent" />
                  </div>
                  <CardTitle className="text-lg">Browse Stores</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Shop team stores and spirit wear</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
