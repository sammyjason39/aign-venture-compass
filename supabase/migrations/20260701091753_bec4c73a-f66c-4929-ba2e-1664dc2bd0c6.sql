ALTER TABLE public.startups
  ADD COLUMN IF NOT EXISTS progress text NOT NULL DEFAULT 'get_to_know',
  ADD COLUMN IF NOT EXISTS progress_notes text;

ALTER TABLE public.startups
  DROP CONSTRAINT IF EXISTS startups_progress_check;

ALTER TABLE public.startups
  ADD CONSTRAINT startups_progress_check
  CHECK (progress IN ('get_to_know', 'deep_dive', 'investment_plan'));