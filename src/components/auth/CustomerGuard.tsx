import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { Loader2 } from "lucide-react";

export function CustomerGuard({ children }: { children: ReactNode }) {
  const { user, loading, isEmployee } = useCustomerAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/account/login?returnTo=/account" replace />;
  }

  // Employees should use admin, not customer portal
  if (isEmployee) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
