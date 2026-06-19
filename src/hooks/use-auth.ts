import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { getMyRoles } from "@/lib/curation/curation.functions";

export function useSession(): { session: Session | null; user: User | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export function useRoles() {
  const { session, loading } = useSession();
  const query = useQuery({
    queryKey: ["my-roles", session?.user?.id],
    queryFn: () => getMyRoles(),
    enabled: !!session,
    staleTime: 60_000,
  });
  const roles = query.data?.roles ?? [];
  return {
    roles,
    isAdmin: roles.includes("admin"),
    isJudge: roles.includes("judge"),
    loading: loading || (!!session && query.isLoading),
  };
}
