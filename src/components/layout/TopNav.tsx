import { Link, useRouterState } from "@tanstack/react-router";
import { Button } from "../ui/button";

function Logo() {
  return (
    <Link to="/" className="group flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background">
        <span className="font-mono text-[15px] font-bold tracking-tight">A</span>
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-sm font-bold tracking-tight text-foreground">AIGN</span>
        <span className="mono-label text-[9px] text-muted-foreground">Curation System</span>
      </span>
    </Link>
  );
}

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/evaluate", label: "Evaluate" },
];

export function TopNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active =
                item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="mono-label hidden text-muted-foreground sm:inline">
            AI Startup Ecosystem Framework
          </span>
          <Button asChild size="sm">
            <Link to="/evaluate">Evaluate Startup</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
