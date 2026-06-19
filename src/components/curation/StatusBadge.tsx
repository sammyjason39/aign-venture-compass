import { cn } from "../../lib/utils";
import type { AiStatus, StartupStatus } from "../../lib/curation/types";

const STATUS_TONE: Record<StartupStatus, string> = {
  draft: "bg-secondary text-secondary-foreground border-border",
  open: "bg-accent text-accent-foreground border-transparent",
  closed: "bg-foreground text-background border-transparent",
};

const STATUS_LABEL: Record<StartupStatus, string> = {
  draft: "Draft",
  open: "Open for scoring",
  closed: "Closed",
};

export function StatusBadge({ status, className }: { status: StartupStatus; className?: string }) {
  return (
    <span
      className={cn(
        "mono-label inline-flex items-center rounded-full border px-2.5 py-1",
        STATUS_TONE[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

const AI_TONE: Record<AiStatus, string> = {
  pending: "bg-secondary text-muted-foreground border-border",
  processing: "bg-warning/10 text-warning border-warning/25",
  done: "bg-primary/10 text-primary border-primary/25",
  error: "bg-destructive/10 text-destructive border-destructive/25",
};

const AI_LABEL: Record<AiStatus, string> = {
  pending: "AI pending",
  processing: "AI scoring…",
  done: "AI scored",
  error: "AI failed",
};

export function AiStatusBadge({ status, className }: { status: AiStatus; className?: string }) {
  return (
    <span
      className={cn(
        "mono-label inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        AI_TONE[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {AI_LABEL[status]}
    </span>
  );
}
