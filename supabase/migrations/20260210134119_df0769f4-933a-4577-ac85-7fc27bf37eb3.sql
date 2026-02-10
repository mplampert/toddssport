
-- =====================================================
-- 1. customer_profiles table
-- =====================================================
CREATE TABLE public.customer_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read own profile"
  ON public.customer_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Customers can update own profile"
  ON public.customer_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Customers can insert own profile"
  ON public.customer_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage all customer profiles"
  ON public.customer_profiles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 2. employee_profiles table
-- =====================================================
CREATE TABLE public.employee_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'admin', 'staff')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can read own profile"
  ON public.employee_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage all employee profiles"
  ON public.employee_profiles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 3. Seed existing admin users into employee_profiles
-- =====================================================
INSERT INTO public.employee_profiles (id, email, role)
SELECT ur.user_id, u.email, 'admin'
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin'
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. Auto-create customer_profiles on signup trigger
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_customer_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create customer profile if user is NOT an employee
  IF NOT EXISTS (SELECT 1 FROM public.employee_profiles WHERE id = NEW.id) THEN
    INSERT INTO public.customer_profiles (id, email, first_name, last_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 1)),
      COALESCE(NEW.raw_user_meta_data->>'last_name', NULLIF(split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 2), ''))
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      first_name = COALESCE(EXCLUDED.first_name, public.customer_profiles.first_name),
      last_name = COALESCE(EXCLUDED.last_name, public.customer_profiles.last_name),
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created_customer
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_customer_signup();

-- =====================================================
-- 5. Update team_store_orders RLS: customers see own orders
-- =====================================================
-- Drop the overly permissive "Anyone can read" policy
DROP POLICY IF EXISTS "Anyone can read team store orders" ON public.team_store_orders;

-- Customers can read their own orders
CREATE POLICY "Customers can read own orders"
  ON public.team_store_orders FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND customer_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- =====================================================
-- 6. updated_at triggers
-- =====================================================
CREATE TRIGGER update_customer_profiles_updated_at
  BEFORE UPDATE ON public.customer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_profiles_updated_at
  BEFORE UPDATE ON public.employee_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
