import { CATEGORIES, SCORE_LEGEND } from "../../../lib/curation/rubric";
import { computeFinalScore } from "../../../lib/curation/scoring";
import type { CategoryScores, ScoreValue } from "../../../lib/curation/types";
import { ScoreSelector } from "../ScoreSelector";

export function ScoringStep({
  scores,
  onChange,
}: {
  scores: CategoryScores;
  onChange: (id: keyof CategoryScores, value: ScoreValue) => void;
}) {
  const live = computeFinalScore(scores);

  return (
    <div className="space-y-6">
      {/* Legend + live score */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-mist p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {SCORE_LEGEND.map((l) => (
            <span key={l.value} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="mono-num flex h-5 w-5 items-center justify-center rounded bg-foreground text-[11px] font-bold text-background">
                {l.value}
              </span>
              {l.label}
            </span>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-background">
          <span className="mono-label text-background/60">Live</span>
          <span className="mono-num text-2xl font-bold">{live}</span>
          <span className="mono-num text-background/50">/100</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {CATEGORIES.map((c, i) => (
          <ScoreSelector
            key={c.id}
            indexLabel={String(i + 1).padStart(2, "0")}
            label={c.label}
            helper={c.helper}
            weight={c.weight}
            anchors={c.anchors}
            value={scores[c.id]}
            onChange={(v) => onChange(c.id, v)}
          />
        ))}
      </div>
    </div>
  );
}
