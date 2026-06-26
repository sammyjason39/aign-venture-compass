ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS salutation text;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_salutation_check
  CHECK (salutation IS NULL OR salutation IN ('bapak', 'ibu'));