CREATE OR REPLACE FUNCTION public.startup_impact_aggregates()
 RETURNS TABLE(startup_id uuid, impact_sum numeric, impact_count integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    js.startup_id,
    COALESCE(SUM(ji.impact), 0)::numeric AS impact_sum,
    COUNT(*)::integer AS impact_count
  FROM public.judge_scores js
  CROSS JOIN LATERAL (
    SELECT AVG((e.value)::numeric) AS impact
    FROM jsonb_each_text(js.scores) AS e(key, value)
    WHERE e.key IN ('prestige', 'socialImpact')
      AND e.value ~ '^[0-9]+(\.[0-9]+)?$'
  ) ji
  WHERE js.submitted = true AND ji.impact IS NOT NULL
  GROUP BY js.startup_id;
$function$;