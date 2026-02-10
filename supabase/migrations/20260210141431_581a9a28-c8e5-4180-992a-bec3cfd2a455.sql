
-- Add staff_role column to employee_profiles
ALTER TABLE public.employee_profiles
  ADD COLUMN IF NOT EXISTS staff_role text NOT NULL DEFAULT 'sales';

-- Update existing rows: map current 'admin' role to 'owner' staff_role, others to 'sales'
UPDATE public.employee_profiles SET staff_role = 'owner' WHERE role = 'admin';
UPDATE public.employee_profiles SET staff_role = 'sales' WHERE role != 'admin';

-- Create staff_permissions table for per-user sidebar tab overrides
CREATE TABLE public.staff_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
  tab_key text NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, tab_key)
);

ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

-- Only admins can manage staff permissions
CREATE POLICY "Admins can manage staff_permissions"
  ON public.staff_permissions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add invite_token and invite_status to employee_profiles for invite flow
ALTER TABLE public.employee_profiles
  ADD COLUMN IF NOT EXISTS invite_token uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS invite_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- Trigger for updated_at on staff_permissions
CREATE TRIGGER update_staff_permissions_updated_at
  BEFORE UPDATE ON public.staff_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
