import { RECOMMENDATIONS } from "../../lib/curation/rubric";
import type { RecommendationId } from "../../lib/curation/types";
import { cn } from "../../lib/utils";

const TONE_CLASSES: Record<string, string> = {
  fast: "bg-foreground text-background border-transparent",
  pilot: "bg-primary text-primary-foreground border-transparent",
  incubation: "bg-accent text-accent-foreground border-transparent",
  watch: "bg-warning/10 text-warning border-warning/25",
  reject: "bg-destructive/10 text-destructive border-destructive/25",
};

export function RecommendationBadge({
  id,
  size = "md",
  className,
}: {
  id: RecommendationId;
  size?: "sm" | "md";
  className?: string;
}) {
  const rec = RECOMMENDATIONS[id];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-mono font-medium uppercase tracking-wide",
        TONE_CLASSES[rec.tone],
        size === "sm" ? "px-2.5 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {rec.label}
    </span>
  );
}
