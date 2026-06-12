import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

export interface Step {
  id: string;
  label: string;
}

export function Stepper({
  steps,
  current,
  onStepClick,
}: {
  steps: Step[];
  current: number;
  onStepClick?: (index: number) => void;
}) {
  return (
    <div className="flex w-full items-center">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const clickable = onStepClick && i <= current;
        return (
          <div key={step.id} className="flex flex-1 items-center last:flex-none">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick?.(i)}
              className={cn("flex items-center gap-2.5", clickable && "cursor-pointer")}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-semibold transition-colors",
                  done && "border-transparent bg-primary text-primary-foreground",
                  active && "border-primary bg-accent text-primary",
                  !done && !active && "border-border bg-background text-muted-foreground",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={cn(
                  "hidden text-sm font-medium lg:inline",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <span
                className={cn(
                  "mx-3 h-px flex-1 transition-colors",
                  done ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
