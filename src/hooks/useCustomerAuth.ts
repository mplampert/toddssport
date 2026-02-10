import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface CustomerProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

interface CustomerAuthState {
  user: User | null;
  session: Session | null;
  profile: CustomerProfile | null;
  isEmployee: boolean;
  loading: boolean;
}

export function useCustomerAuth(): CustomerAuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [isEmployee, setIsEmployee] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          setTimeout(() => loadProfile(currentSession.user.id), 0);
        } else {
          setProfile(null);
          setIsEmployee(false);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    try {
      // Check employee first
      const { data: emp } = await supabase
        .from("employee_profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (emp) {
        setIsEmployee(true);
        setProfile(null);
        setLoading(false);
        return;
      }

      // Load customer profile
      const { data: cp } = await supabase
        .from("customer_profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      setProfile(cp as CustomerProfile | null);
      setIsEmployee(false);
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  }

  return { user, session, profile, isEmployee, loading };
}
