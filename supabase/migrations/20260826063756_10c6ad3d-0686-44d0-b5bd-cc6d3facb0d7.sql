ALTER TABLE public.persons ADD COLUMN annual_fee numeric(10,2);

CREATE TABLE public.fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  year integer NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  paid_on date NOT NULL DEFAULT current_date,
  note text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (person_id, year)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_payments TO authenticated;
GRANT ALL ON public.fee_payments TO service_role;

ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY fee_payments_all_authenticated ON public.fee_payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_fee_payments_updated_at
  BEFORE UPDATE ON public.fee_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX fee_payments_person_idx ON public.fee_payments(person_id);