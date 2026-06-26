import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = false,
  tone = "default",
  name,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  accent?: boolean;
  tone?: "default" | "blue";
  name?: string;
}) {
  const isBlue = tone === "blue";
  const isDark = accent && !isBlue;
  const isFilled = isBlue || isDark;

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 shadow-clean transition-shadow hover:shadow-card",
        isBlue
          ? "border-transparent bg-primary text-primary-foreground"
          : isDark
            ? "border-transparent bg-foreground text-background"
            : "border-border bg-card",
      )}
    >
      <div className="flex items-start justify-between">
        <p
          className={cn(
            "mono-label",
            isFilled ? "text-current/60" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        {icon && (
          <span className={cn(isFilled ? "text-current/70" : "text-primary")}>{icon}</span>
        )}
      </div>
      <p className="mono-num mt-4 text-3xl font-bold tracking-tight">{value}</p>
      {name && (
        <p className="mt-1 truncate text-base font-semibold tracking-tight">{name}</p>
      )}
      {hint && (
        <p className={cn("mt-1 text-xs", isFilled ? "text-current/60" : "text-muted-foreground")}>
          {hint}
        </p>
      )}
    </div>
  );
}
