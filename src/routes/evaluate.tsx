import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Download, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../components/ui/button";
import { Stepper } from "../components/curation/Stepper";
import { ResultReport } from "../components/curation/ResultReport";
import { FormStep } from "../components/curation/steps/FormStep";
import { ArchetypeStep } from "../components/curation/steps/ArchetypeStep";
import { ScoringStep } from "../components/curation/steps/ScoringStep";
import { ArchetypeRubricStep } from "../components/curation/steps/ArchetypeRubricStep";

import { classifyStartup, getArchetype } from "../lib/curation/archetypes";
import { CATEGORIES } from "../lib/curation/rubric";
import { emptyForm } from "../lib/curation/form";
import { evaluateScores } from "../lib/curation/scoring";
import { getEvaluation, saveEvaluation } from "../lib/curation/storage";
import { exportReport } from "../lib/curation/export";
import type {
  ArchetypeId,
  CategoryScores,
  Evaluation,
  ScoreValue,
} from "../lib/curation/types";

export const Route = createFileRoute("/evaluate")({
  validateSearch: (search: Record<string, unknown>): { id?: string } => ({
    id: typeof search.id === "string" ? search.id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Evaluate Startup — AIGN Startup Curation System" },
      {
        name: "description",
        content:
          "Input an AI startup, auto-classify its archetype, score it on a weighted rubric, and generate a strategic AIGN recommendation.",
      },
    ],
  }),
  component: EvaluatePage,
});

const STEPS = [
  { id: "details", label: "Startup Details" },
  { id: "archetype", label: "Archetype" },
  { id: "scoring", label: "Scoring Rubric" },
  { id: "specifics", label: "Archetype Rubric" },
  { id: "result", label: "Result" },
];

function defaultScores(): CategoryScores {
  return {
    problemMarket: 3,
    aiRelevance: 3,
    businessModel: 3,
    moat: 3,
    founderExecution: 3,
    ecosystemFit: 3,
    prestige: 3,
    socialImpact: 3,
    transformational: 3,
  };
}

function defaultArchetypeScores(
  id: ArchetypeId,
  prev: Record<string, ScoreValue> = {},
): Record<string, ScoreValue> {
  const out: Record<string, ScoreValue> = {};
  for (const c of getArchetype(id).criteria) out[c.id] = prev[c.id] ?? 3;
  return out;
}

function EvaluatePage() {
  const { id: editId } = Route.useSearch();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [archetype, setArchetype] = useState<ArchetypeId>("enterprise");
  const [confidence, setConfidence] = useState(0);
  const [rationale, setRationale] = useState("");
  const [alternative, setAlternative] = useState<ArchetypeId | undefined>();
  const [scores, setScores] = useState<CategoryScores>(defaultScores);
  const [archetypeScores, setArchetypeScores] = useState<Record<string, ScoreValue>>(() =>
    defaultArchetypeScores("enterprise"),
  );
  const [savedId, setSavedId] = useState<string | undefined>(editId);
  const loadedRef = useRef(false);

  // Load existing evaluation for editing.
  useEffect(() => {
    if (!editId || loadedRef.current) return;
    const ev = getEvaluation(editId);
    if (ev) {
      loadedRef.current = true;
      setForm({ ...emptyForm(), ...ev.form });
      setArchetype(ev.archetype);
      setConfidence(ev.archetypeConfidence);
      setScores(ev.scores);
      setArchetypeScores(ev.archetypeScores);
      setSavedId(ev.id);
    }
  }, [editId]);

  function setField(fieldId: string, value: string) {
    setForm((f) => ({ ...f, [fieldId]: value }));
  }

  function selectArchetype(id: ArchetypeId) {
    setArchetype(id);
    setArchetypeScores((prev) => defaultArchetypeScores(id, prev));
  }

  function runClassifier() {
    const result = classifyStartup(form);
    setConfidence(result.confidence);
    setRationale(result.rationale);
    setAlternative(result.alternative);
    // Only auto-pick when not editing / not manually chosen.
    if (!loadedRef.current) {
      setArchetype(result.archetype);
      setArchetypeScores((prev) => defaultArchetypeScores(result.archetype, prev));
    }
  }

  const startupName = (form.startupName || "").trim();

  const draft: Evaluation = useMemo(
    () => ({
      id: savedId ?? "draft",
      startupName: startupName || "Untitled Startup",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      form,
      archetype,
      archetypeConfidence: confidence,
      scores,
      archetypeScores,
    }),
    [savedId, startupName, form, archetype, confidence, scores, archetypeScores],
  );

  const result = useMemo(
    () => evaluateScores(draft.startupName, archetype, scores, archetypeScores),
    [draft.startupName, archetype, scores, archetypeScores],
  );

  function next() {
    if (step === 0) {
      if (!startupName) {
        toast.error("Add a startup name to continue.");
        return;
      }
      runClassifier();
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSave(navigateAfter = true) {
    const saved = saveEvaluation({
      id: savedId,
      startupName: startupName || "Untitled Startup",
      form,
      archetype,
      archetypeConfidence: confidence,
      scores,
      archetypeScores,
    });
    setSavedId(saved.id);
    loadedRef.current = true;
    toast.success("Evaluation saved.");
    if (navigateAfter) navigate({ to: "/evaluation/$id", params: { id: saved.id } });
    return saved;
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      {/* Header + stepper */}
      <div className="flex flex-col gap-2">
        <p className="mono-label text-primary">
          {editId ? "Editing Evaluation" : "New Evaluation"}
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          {step === 4 ? "Evaluation result" : "Evaluate a startup"}
        </h1>
      </div>

      <div className="sticky top-16 z-30 -mx-5 mt-6 border-b border-border bg-background/85 px-5 py-4 backdrop-blur-md sm:-mx-8 sm:px-8">
        <Stepper steps={STEPS} current={step} onStepClick={(i) => setStep(i)} />
      </div>

      <div className="mt-8">
        {step === 0 && <FormStep form={form} setField={setField} />}
        {step === 1 && (
          <ArchetypeStep
            recommended={archetype}
            confidence={confidence}
            rationale={rationale}
            alternative={alternative}
            selected={archetype}
            onSelect={selectArchetype}
          />
        )}
        {step === 2 && (
          <ScoringStep
            scores={scores}
            onChange={(id, v) => setScores((s) => ({ ...s, [id]: v }))}
          />
        )}
        {step === 3 && (
          <ArchetypeRubricStep
            archetype={archetype}
            scores={archetypeScores}
            onChange={(id, v) => setArchetypeScores((s) => ({ ...s, [id]: v }))}
          />
        )}
        {step === 4 && (
          <ResultReport
            evaluation={draft}
            result={result}
            actions={
              <>
                <Button onClick={() => handleSave(true)}>
                  <Save className="h-4 w-4" />
                  Save Evaluation
                </Button>
                <Button variant="outline" onClick={() => exportReport(draft)}>
                  <Download className="h-4 w-4" />
                  Export Report
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setForm(emptyForm());
                    setArchetype("enterprise");
                    setScores(defaultScores());
                    setArchetypeScores(defaultArchetypeScores("enterprise"));
                    setConfidence(0);
                    setSavedId(undefined);
                    loadedRef.current = false;
                    setStep(0);
                    window.scrollTo({ top: 0 });
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  Evaluate Another Startup
                </Button>
              </>
            }
          />
        )}
      </div>

      {/* Footer nav */}
      {step < 4 && (
        <div className="sticky bottom-0 z-30 -mx-5 mt-10 flex items-center justify-between border-t border-border bg-background/90 px-5 py-4 backdrop-blur-md sm:-mx-8 sm:px-8">
          <Button variant="outline" onClick={back} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            {step >= 2 && (
              <span className="mono-num hidden text-sm text-muted-foreground sm:inline">
                Live score {result.finalScore}/100
              </span>
            )}
            <Button onClick={next}>
              {step === 3 ? "View Result" : "Continue"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
