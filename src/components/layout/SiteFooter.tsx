import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-mist">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-10 sm:flex-row sm:items-center sm:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background">
            <span className="font-mono text-[15px] font-bold tracking-tight">A</span>
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">AIGN</p>
            <p className="mono-label text-muted-foreground">AI Startup Ecosystem Framework</p>
          </div>
        </div>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link to="/" className="transition-colors hover:text-foreground">
            Home
          </Link>
          <Link to="/dashboard" className="transition-colors hover:text-foreground">
            Pipeline
          </Link>
        </nav>
        <p className="mono-label text-muted-foreground">
          AIGN · AI Startup Ecosystem Framework
        </p>
      </div>
    </footer>
  );
}
