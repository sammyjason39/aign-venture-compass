CREATE OR REPLACE FUNCTION public.startup_judge_aggregates()
RETURNS TABLE (startup_id uuid, judge_sum numeric, judge_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    js.startup_id,
    COALESCE(SUM(jo.overall), 0)::numeric AS judge_sum,
    COUNT(*)::integer AS judge_count
  FROM public.judge_scores js
  CROSS JOIN LATERAL (
    SELECT AVG((e.value)::numeric) AS overall
    FROM jsonb_each_text(js.scores) AS e(key, value)
    WHERE e.value ~ '^[0-9]+(\.[0-9]+)?$'
  ) jo
  WHERE js.submitted = true AND jo.overall IS NOT NULL
  GROUP BY js.startup_id;
$$;

GRANT EXECUTE ON FUNCTION public.startup_judge_aggregates() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.startup_judge_aggregates() FROM anon;