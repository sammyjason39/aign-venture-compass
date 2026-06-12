import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5 shadow-clean transition-shadow hover:shadow-card",
        accent ? "border-transparent bg-foreground text-background" : "border-border bg-card",
      )}
    >
      <div className="flex items-start justify-between">
        <p
          className={cn(
            "mono-label",
            accent ? "text-background/60" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        {icon && (
          <span className={cn(accent ? "text-background/70" : "text-primary")}>{icon}</span>
        )}
      </div>
      <p className="mono-num mt-4 text-3xl font-bold tracking-tight">{value}</p>
      {hint && (
        <p className={cn("mt-1 text-xs", accent ? "text-background/60" : "text-muted-foreground")}>
          {hint}
        </p>
      )}
    </div>
  );
}
