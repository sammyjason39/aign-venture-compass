import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "../ui/button";
import { useSession, useRoles } from "../../hooks/use-auth";
import venturisLogo from "../../assets/venturis-logo.png";

function Logo() {
  return (
    <Link to="/" className="group flex items-center gap-2.5">
      <img src={venturisLogo} alt="Venturis" className="h-7 w-auto" />
    </Link>
  );
}

export function TopNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const { isAdmin } = useRoles();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const nav = session
    ? [
        { to: "/dashboard", label: "Pipeline" },
        ...(isAdmin ? [{ to: "/admin/judges", label: "Judges" }] : []),
      ]
    : [];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => {
              const active = pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <>
              {isAdmin && (
                <span className="mono-label hidden items-center gap-1 text-primary sm:inline-flex">
                  <Users className="h-3 w-3" /> Admin
                </span>
              )}
              <span className="hidden max-w-[160px] truncate text-sm text-muted-foreground sm:inline">
                {session.user.email}
              </span>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
