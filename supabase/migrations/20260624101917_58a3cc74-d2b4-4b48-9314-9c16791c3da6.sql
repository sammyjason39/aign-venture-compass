ALTER TABLE public.startups ADD COLUMN IF NOT EXISTS sort_order integer;

-- Backfill existing rows so newest stays on top (matching current default ordering)
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at DESC) - 1 AS rn
  FROM public.startups
)
UPDATE public.startups s
SET sort_order = ordered.rn
FROM ordered
WHERE s.id = ordered.id AND s.sort_order IS NULL;