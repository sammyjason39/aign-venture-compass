import { Link } from "@tanstack/react-router";
import venturisLogo from "../../assets/venturis-logo.png";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-mist">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-10 sm:flex-row sm:items-center sm:px-8">
        <div className="flex items-center gap-3">
          <img src={venturisLogo} alt="Venturis" className="h-7 w-auto" />
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
          Venturis · AI-scored venture curation
        </p>
      </div>
    </footer>
  );
}
