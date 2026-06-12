import { Sparkles, Check } from "lucide-react";

import { ARCHETYPES, getArchetype } from "../../../lib/curation/archetypes";
import type { ArchetypeId } from "../../../lib/curation/types";
import { cn } from "../../../lib/utils";

export function ArchetypeStep({
  recommended,
  confidence,
  rationale,
  alternative,
  selected,
  onSelect,
}: {
  recommended: ArchetypeId;
  confidence: number;
  rationale: string;
  alternative?: ArchetypeId;
  selected: ArchetypeId;
  onSelect: (id: ArchetypeId) => void;
}) {
  const rec = getArchetype(recommended);

  return (
    <div className="space-y-6">
      {/* Recommendation banner */}
      <div className="overflow-hidden rounded-2xl border border-primary/20 bg-accent/40 p-6 shadow-clean">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="mono-label text-primary">Recommended Archetype</p>
              <h3 className="mt-1 text-xl font-bold tracking-tight text-foreground">{rec.name}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {rationale}
              </p>
              {alternative && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Alternative:{" "}
                  <button
                    type="button"
                    onClick={() => onSelect(alternative)}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {getArchetype(alternative).name}
                  </button>
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="mono-label text-primary">Confidence</p>
            <p className="mono-num text-3xl font-bold text-foreground">{confidence}%</p>
          </div>
        </div>
      </div>

      <div>
        <p className="mono-label text-muted-foreground">Manual override</p>
        <h3 className="mt-1 text-lg font-bold tracking-tight text-foreground">
          Confirm or change the archetype
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          The classifier is a starting point. The committee can override based on judgment.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {ARCHETYPES.map((a) => {
          const active = selected === a.id;
          const isRecommended = recommended === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(a.id)}
              className={cn(
                "group relative flex flex-col rounded-2xl border p-5 text-left transition-all",
                active
                  ? "border-primary bg-card shadow-lift"
                  : "border-border bg-card shadow-clean hover:border-primary/40",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="mono-label text-primary">{a.index}</span>
                <div className="flex items-center gap-2">
                  {isRecommended && (
                    <span className="mono-label rounded-full bg-accent px-2 py-0.5 text-accent-foreground">
                      Suggested
                    </span>
                  )}
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border transition-colors",
                      active ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    )}
                  >
                    {active && <Check className="h-3 w-3" />}
                  </span>
                </div>
              </div>
              <h4 className="mt-3 text-base font-bold text-foreground">{a.name}</h4>
              <p className="mono-label mt-1 text-muted-foreground">{a.inspiredBy}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
