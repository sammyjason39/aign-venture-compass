import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Send } from "lucide-react";

import { CATEGORIES } from "../../lib/curation/rubric";
import {
  computeFinalScore,
  recommendationFor,
} from "../../lib/curation/scoring";
import type { CategoryScores, JudgeScore } from "../../lib/curation/types";
import { submitJudgeScore } from "../../lib/curation/curation.functions";
import { ScoreInput } from "./ScoreInput";
import { RecommendationBadge } from "./RecommendationBadge";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

export function JudgeScoreForm({
  startupId,
  existing,
  aiScores,
  onSaved,
}: {
  startupId: string;
  existing: JudgeScore | null;
  aiScores?: Partial<CategoryScores> | null;
  onSaved: () => void;
}) {
  const [scores, setScores] = useState<Partial<CategoryScores>>(existing?.scores ?? {});
  const [justification, setJustification] = useState(existing?.justification ?? "");
  const [busy, setBusy] = useState(false);

  const complete = CATEGORIES.every((c) => scores[c.id] != null);
  const finalScore = computeFinalScore(scores);
  const recommendation = complete ? recommendationFor(scores) : null;

  function set(id: keyof CategoryScores, v: number) {
    setScores((prev) => ({ ...prev, [id]: v }));
  }

  async function save(submit: boolean) {
    if (submit && !complete) {
      toast.error("Score all nine factors before submitting.");
      return;
    }
    setBusy(true);
    try {
      await submitJudgeScore({
        data: {
          startupId,
          scores: scores as Record<string, number>,
          justification,
          submitted: submit,
        },
      });
      toast.success(submit ? "Verdict submitted." : "Draft saved.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save score");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-clean sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-foreground">Your evaluation</h3>
          <p className="text-sm text-muted-foreground">
            Score each factor 1–10. The AI baseline is shown for reference.
          </p>
        </div>
        {existing?.submitted && (
          <span className="mono-label rounded-full bg-primary/10 px-2.5 py-1 text-primary">
            Submitted
          </span>
        )}
      </div>

      <div className="mt-5 space-y-5">
        {CATEGORIES.map((c) => (
          <div key={c.id} className="border-b border-border pb-5 last:border-0 last:pb-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{c.label}</span>
                <span className="mono-label text-muted-foreground">{c.weight}%</span>
              </div>
              {aiScores?.[c.id] != null && (
                <span className="mono-label text-muted-foreground">
                  AI: <span className="text-foreground">{aiScores[c.id]}</span>/10
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{c.helper}</p>
            <div className="mt-3">
              <ScoreInput value={scores[c.id]} onChange={(v) => set(c.id, v)} disabled={busy} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <label className="text-sm font-medium text-foreground">Justification</label>
        <Textarea
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          placeholder="Explain your reasoning, key concerns, and conditions…"
          rows={4}
          className="mt-1.5"
          disabled={busy}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-mist p-4">
        <div className="flex items-center gap-3">
          <div>
            <p className="mono-label text-muted-foreground">Your weighted score</p>
            <p className="mono-num text-2xl font-bold text-foreground">
              {complete ? finalScore : "—"}
              <span className="text-sm text-muted-foreground">/100</span>
            </p>
          </div>
          {recommendation && <RecommendationBadge id={recommendation} size="sm" />}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => save(false)} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save draft
          </Button>
          <Button onClick={() => save(true)} disabled={busy || !complete}>
            <Send className="h-4 w-4" />
            Submit verdict
          </Button>
        </div>
      </div>
    </div>
  );
}
