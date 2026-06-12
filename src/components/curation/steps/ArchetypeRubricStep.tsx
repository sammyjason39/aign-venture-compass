import { getArchetype } from "../../../lib/curation/archetypes";
import type { ArchetypeId, ScoreValue } from "../../../lib/curation/types";
import { ScoreSelector } from "../ScoreSelector";

export function ArchetypeRubricStep({
  archetype,
  scores,
  onChange,
}: {
  archetype: ArchetypeId;
  scores: Record<string, ScoreValue>;
  onChange: (id: string, value: ScoreValue) => void;
}) {
  const arch = getArchetype(archetype);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-mist p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mono-label text-primary">{arch.index}</span>
          <h3 className="text-lg font-bold tracking-tight text-foreground">{arch.name}</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Archetype-specific criteria scored 1–5. These sharpen the evaluation beyond the general
          rubric and feed the archetype-specific composite score.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {arch.criteria.map((c, i) => (
          <ScoreSelector
            key={c.id}
            indexLabel={String(i + 1).padStart(2, "0")}
            label={c.label}
            value={scores[c.id]}
            onChange={(v) => onChange(c.id, v)}
          />
        ))}
      </div>
    </div>
  );
}
