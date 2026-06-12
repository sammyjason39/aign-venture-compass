import { cn } from "../../lib/utils";

export function ScoreBar({
  label,
  score,
  max = 5,
  weight,
  sublabel,
}: {
  label: string;
  score: number;
  max?: number;
  weight?: number;
  sublabel?: string;
}) {
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  const tone = pct >= 80 ? "bg-primary" : pct >= 50 ? "bg-slate" : "bg-muted-foreground";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {weight !== undefined && (
            <span className="mono-label text-muted-foreground">{weight}%</span>
          )}
        </div>
        <span className="mono-num text-sm font-semibold text-foreground">
          {max === 5 ? `${score}/5` : `${Math.round(score)}`}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${pct}%` }} />
      </div>
      {sublabel && <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>}
    </div>
  );
}
