ALTER TABLE public.startups
  ADD COLUMN IF NOT EXISTS financial_pdf_path text,
  ADD COLUMN IF NOT EXISTS financial_data jsonb,
  ADD COLUMN IF NOT EXISTS financial_status text,
  ADD COLUMN IF NOT EXISTS financial_summary text,
  ADD COLUMN IF NOT EXISTS financial_error text,
  ADD COLUMN IF NOT EXISTS financial_generated_at timestamptz;