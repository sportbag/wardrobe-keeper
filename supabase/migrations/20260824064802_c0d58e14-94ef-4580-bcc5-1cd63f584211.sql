ALTER TABLE public.persons
  ADD COLUMN birth_date date,
  ADD COLUMN guardian_name text,
  ADD COLUMN membership_start date,
  ADD COLUMN membership_end date;