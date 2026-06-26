REVOKE EXECUTE ON FUNCTION public.startup_impact_aggregates() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.startup_impact_aggregates() TO authenticated, service_role;