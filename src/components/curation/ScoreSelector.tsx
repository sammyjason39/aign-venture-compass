import { cn } from "../../lib/utils";
import type { ScoreValue } from "../../lib/curation/types";

interface ScoreSelectorProps {
  label: string;
  helper?: string;
  weight?: number;
  value?: ScoreValue;
  onChange: (value: ScoreValue) => void;
  /** Optional rubric anchors for 1 / 3 / 5. */
  anchors?: { 1: string; 3: string; 5: string };
  indexLabel?: string;
}

const VALUES: ScoreValue[] = [1, 2, 3, 4, 5];

export function ScoreSelector({
  label,
  helper,
  weight,
  value,
  onChange,
  anchors,
  indexLabel,
}: ScoreSelectorProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-clean">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {indexLabel && (
              <span className="mono-label text-muted-foreground">{indexLabel}</span>
            )}
            <h3 className="text-base font-semibold text-foreground">{label}</h3>
          </div>
          {helper && <p className="mt-1 text-sm text-muted-foreground">{helper}</p>}
        </div>
        {weight !== undefined && (
          <span className="mono-label shrink-0 rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
            {weight}% weight
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2">
        {VALUES.map((v) => {
          const active = value === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              aria-pressed={active}
              className={cn(
                "flex flex-col items-center justify-center rounded-xl border py-3 transition-all",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-lift"
                  : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-accent/40",
              )}
            >
              <span className="mono-num text-lg font-bold">{v}</span>
            </button>
          );
        })}
      </div>

      {anchors && (
        <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
          <RubricHint num={1} active={value === 1 || value === 2} text={anchors[1]} />
          <RubricHint num={3} active={value === 3} text={anchors[3]} />
          <RubricHint num={5} active={value === 4 || value === 5} text={anchors[5]} />
        </div>
      )}
    </div>
  );
}

function RubricHint({ num, text, active }: { num: number; text: string; active: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border px-2.5 py-2 text-xs transition-colors",
        active ? "border-primary/30 bg-accent/50 text-foreground" : "border-border bg-mist text-muted-foreground",
      )}
    >
      <span className="mono-label mr-1 text-primary">{num}</span>
      {text}
    </div>
  );
}
