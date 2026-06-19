import { cn } from "../../lib/utils";

const VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function ScoreInput({
  value,
  onChange,
  disabled,
}: {
  value?: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {VALUES.map((v) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            disabled={disabled}
            onClick={() => onChange(v)}
            aria-pressed={active}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg border font-mono text-sm font-bold transition-all",
              active
                ? "border-primary bg-primary text-primary-foreground shadow-lift"
                : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-accent/40",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}
