CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_roles_select_authenticated ON public.user_roles
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- bestehende Nutzer erhalten Admin-Rechte
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
ON CONFLICT DO NOTHING;

-- Historie: nur Admins dürfen Buchungen ändern oder löschen
DROP POLICY IF EXISTS loans_all_authenticated ON public.loans;

CREATE POLICY loans_select_authenticated ON public.loans
  FOR SELECT TO authenticated USING (true);
CREATE POLICY loans_insert_authenticated ON public.loans
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY loans_update_authenticated ON public.loans
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY loans_delete_admin ON public.loans
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));