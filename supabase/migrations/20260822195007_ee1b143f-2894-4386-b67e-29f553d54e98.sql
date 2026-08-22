-- helper for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- persons
CREATE TABLE public.persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  phone text,
  note text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.persons TO authenticated;
GRANT ALL ON public.persons TO service_role;
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "persons_all_authenticated" ON public.persons FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_persons_updated_at BEFORE UPDATE ON public.persons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- garments
CREATE TYPE public.garment_type AS ENUM ('hose', 'jacke');
CREATE TABLE public.garments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type public.garment_type NOT NULL,
  size text,
  note text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.garments TO authenticated;
GRANT ALL ON public.garments TO service_role;
ALTER TABLE public.garments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "garments_all_authenticated" ON public.garments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_garments_updated_at BEFORE UPDATE ON public.garments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- loans
CREATE TABLE public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  garment_id uuid NOT NULL REFERENCES public.garments(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  issued_at timestamptz NOT NULL DEFAULT now(),
  returned_at timestamptz,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX loans_one_open_per_garment ON public.loans (garment_id) WHERE returned_at IS NULL;
CREATE INDEX loans_person_idx ON public.loans (person_id);
CREATE INDEX loans_issued_at_idx ON public.loans (issued_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loans TO authenticated;
GRANT ALL ON public.loans TO service_role;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loans_all_authenticated" ON public.loans FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- seed data
INSERT INTO public.persons (id, full_name, email, phone, note) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Anna Berger', 'anna.berger@example.com', '0151 2345678', NULL),
  ('22222222-2222-4222-8222-222222222222', 'Tobias Krüger', 'tobias.krueger@example.com', NULL, 'Schichtleitung'),
  ('33333333-3333-4333-8333-333333333333', 'Sophie Lang', NULL, '0170 9876543', NULL),
  ('44444444-4444-4444-8444-444444444444', 'Markus Reiter', 'markus.reiter@example.com', NULL, NULL);

INSERT INTO public.garments (id, code, type, size, note) VALUES
  ('aaaaaaa1-0000-4000-8000-000000000001', 'H-001', 'hose', '50', 'Guter Zustand'),
  ('aaaaaaa1-0000-4000-8000-000000000002', 'H-002', 'hose', '52', NULL),
  ('aaaaaaa1-0000-4000-8000-000000000003', 'H-003', 'hose', '48', 'Kleiner Fleck am Saum'),
  ('aaaaaaa1-0000-4000-8000-000000000004', 'J-001', 'jacke', 'M', NULL),
  ('aaaaaaa1-0000-4000-8000-000000000005', 'J-002', 'jacke', 'L', 'Reißverschluss erneuert'),
  ('aaaaaaa1-0000-4000-8000-000000000006', 'J-003', 'jacke', 'XL', NULL);

INSERT INTO public.loans (garment_id, person_id, issued_at, returned_at, note) VALUES
  ('aaaaaaa1-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', now() - interval '12 days', NULL, 'Winterdienst'),
  ('aaaaaaa1-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', now() - interval '12 days', NULL, NULL),
  ('aaaaaaa1-0000-4000-8000-000000000005', '22222222-2222-4222-8222-222222222222', now() - interval '40 days', NULL, NULL),
  ('aaaaaaa1-0000-4000-8000-000000000002', '33333333-3333-4333-8333-333333333333', now() - interval '90 days', now() - interval '60 days', 'Zurück, gereinigt'),
  ('aaaaaaa1-0000-4000-8000-000000000006', '44444444-4444-4444-8444-444444444444', now() - interval '30 days', now() - interval '5 days', NULL);