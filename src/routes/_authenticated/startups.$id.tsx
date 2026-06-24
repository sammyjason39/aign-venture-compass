import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Pencil,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";


import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { ArchetypeBadge } from "../../components/curation/ArchetypeBadge";
import { RecommendationBadge } from "../../components/curation/RecommendationBadge";
import { StatusBadge, AiStatusBadge } from "../../components/curation/StatusBadge";
import { ScoreBar } from "../../components/curation/ScoreBar";
import { CategoryRadar } from "../../components/curation/CategoryRadar";
import { JudgeScoreForm } from "../../components/curation/JudgeScoreForm";
import { StatCard } from "../../components/curation/StatCard";
import { CATEGORIES } from "../../lib/curation/rubric";
import { aggregateJudgeScores } from "../../lib/curation/scoring";
import {
  deleteStartup,
  getStartupDetail,
  getStartupFileUrl,
  reEvaluateStartup,
  setStartupStatus,
  setStartupValuation,
} from "../../lib/curation/curation.functions";
import { useRoles } from "../../hooks/use-auth";
import type { ArchetypeId, StartupStatus } from "../../lib/curation/types";


export const Route = createFileRoute("/_authenticated/startups/$id")({
  head: () => ({ meta: [{ title: "Startup — AIGN Curation" }] }),
  component: StartupDetail,
  errorComponent: () => (
    <div className="mx-auto max-w-2xl px-5 py-20 text-center">
      <p className="text-sm text-muted-foreground">This startup could not be loaded.</p>
      <Button asChild variant="outline" className="mt-4">
        <Link to="/dashboard">Back to pipeline</Link>
      </Button>
    </div>
  ),
});

function ListBlock({
  title,
  items,
  icon,
  tone,
}: {
  title: string;
  items: string[] | null | undefined;
  icon: React.ReactNode;
  tone: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h4 className={`mono-label flex items-center gap-1.5 ${tone}`}>
        {icon}
        {title}
      </h4>
      <ul className="mt-2 space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm text-foreground">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-40" />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StartupDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  
  const queryClient = useQueryClient();
  const { isAdmin } = useRoles();
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState<"deck" | "transcript" | null>(null);
  const [valuationOpen, setValuationOpen] = useState(false);
  const [valuationDraft, setValuationDraft] = useState("");
  const [savingValuation, setSavingValuation] = useState(false);

  async function openFile(kind: "deck" | "transcript") {
    setDownloading(kind);
    try {
      const { url } = await getStartupFileUrl({ data: { id, kind } });
      if (!url) {
        toast.error(kind === "deck" ? "No deck was uploaded." : "No transcript was uploaded.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open file");
    } finally {
      setDownloading(null);
    }
  }


  const { data, isLoading } = useQuery({
    queryKey: ["startup", id],
    queryFn: () => getStartupDetail({ data: { id } }),
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["startup", id] });
    queryClient.invalidateQueries({ queryKey: ["startups"] });
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center text-sm text-muted-foreground">
        Loading startup…
      </div>
    );
  }

  const { startup, myScore, judgeScores } = data;
  const aggregate = aggregateJudgeScores(judgeScores);

  async function reEval() {
    setBusy(true);
    try {
      await reEvaluateStartup({ data: { id } });
      toast.success("AI evaluation refreshed.");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI evaluation failed");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(status: StartupStatus) {
    try {
      await setStartupStatus({ data: { id, status } });
      toast.success("Status updated.");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update status");
    }
  }

  async function remove() {
    try {
      await deleteStartup({ data: { id } });
      toast.success("Startup deleted.");
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    }
  }

  function openValuationDialog() {
    setValuationDraft(startup.valuation ?? "");
    setValuationOpen(true);
  }

  async function saveValuation() {
    setSavingValuation(true);
    try {
      await setStartupValuation({ data: { id, valuation: valuationDraft.trim() } });
      toast.success("Valuation updated.");
      setValuationOpen(false);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update valuation");
    } finally {
      setSavingValuation(false);
    }
  }



  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <Link to="/dashboard" className="mono-label inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Pipeline
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{startup.name}</h1>
            <StatusBadge status={startup.status} />
            <AiStatusBadge status={startup.aiStatus} />
          </div>
          {startup.oneLiner && <p className="mt-2 max-w-2xl text-muted-foreground">{startup.oneLiner}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {startup.archetype && <ArchetypeBadge id={startup.archetype as ArchetypeId} />}
            {startup.sector && (
              <span className="mono-label rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                {startup.sector}
              </span>
            )}
            {startup.archetypeConfidence != null && (
              <span className="mono-label text-muted-foreground">
                {startup.archetypeConfidence}% archetype confidence
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="mono-label text-muted-foreground">Valuation</span>
            <span className="mono-num text-sm font-semibold text-foreground">
              {startup.valuation && startup.valuation.trim() ? startup.valuation : "-"}
            </span>
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-muted-foreground"
                onClick={openValuationDialog}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </div>



          {(startup.deckPath || startup.transcriptPath) && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {startup.deckPath && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openFile("deck")}
                  disabled={downloading !== null}
                >
                  {downloading === "deck" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download deck
                </Button>
              )}
              {startup.transcriptPath && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openFile("transcript")}
                  disabled={downloading !== null}
                  className="text-muted-foreground"
                >
                  {downloading === "transcript" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  Transcript
                </Button>
              )}
            </div>
          )}
        </div>


        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={startup.status} onValueChange={(v) => changeStatus(v as StartupStatus)}>
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="open">Open for scoring</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={reEval} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Re-run AI
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {startup.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the startup and all judge scores.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={remove}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {startup.aiStatus === "error" && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">AI evaluation failed</p>
            <p>{startup.aiError ?? "Unknown error."} {isAdmin && "Try Re-run AI."}</p>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* AI panel */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-clean sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
                <Sparkles className="h-4 w-4 text-primary" /> AI baseline
              </h3>
              {startup.aiRecommendation && <RecommendationBadge id={startup.aiRecommendation} size="sm" />}
            </div>
            {startup.aiSummary ? (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{startup.aiSummary}</p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                {startup.aiStatus === "processing" ? "AI is evaluating this startup…" : "No AI evaluation yet."}
              </p>
            )}

            {startup.aiScores && (
              <div className="mt-5 space-y-3">
                {CATEGORIES.map((c) => (
                  <ScoreBar
                    key={c.id}
                    label={c.label}
                    score={startup.aiScores![c.id] ?? 0}
                    max={10}
                    weight={c.weight}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-clean sm:p-6">
            <CategoryRadar ai={startup.aiScores} judges={aggregate.judgeCount > 0 ? aggregate.averages : null} />
          </div>

          {(startup.aiStrengths || startup.aiWeaknesses || startup.aiRisks) && (
            <div className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-clean sm:p-6">
              <ListBlock title="Strengths" items={startup.aiStrengths} icon={<CheckCircle2 className="h-3.5 w-3.5" />} tone="text-primary" />
              <ListBlock title="Weaknesses" items={startup.aiWeaknesses} icon={<TriangleAlert className="h-3.5 w-3.5" />} tone="text-warning" />
              <ListBlock title="Risks" items={startup.aiRisks} icon={<AlertTriangle className="h-3.5 w-3.5" />} tone="text-destructive" />
            </div>
          )}

          {startup.description && (
            <details className="rounded-2xl border border-border bg-card p-5 shadow-clean">
              <summary className="cursor-pointer text-sm font-semibold text-foreground">Source material</summary>
              <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{startup.description}</p>
            </details>
          )}
        </div>

        {/* Right column: judge form OR admin results */}
        <div className="space-y-6">
          {isAdmin ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <StatCard label="Final score" value={aggregate.judgeCount ? aggregate.finalScore : "—"} hint="Avg of judges / 100" accent />
                <StatCard label="Judges submitted" value={aggregate.judgeCount} hint="Submitted verdicts" />
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-clean sm:p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold tracking-tight text-foreground">Judge results</h3>
                  {aggregate.recommendation && <RecommendationBadge id={aggregate.recommendation} size="sm" />}
                </div>
                {aggregate.judgeCount === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No judge has submitted a verdict yet.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {CATEGORIES.map((c) => (
                      <ScoreBar
                        key={c.id}
                        label={c.label}
                        score={aggregate.averages[c.id] ?? 0}
                        max={10}
                        weight={c.weight}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-clean sm:p-6">
                <h3 className="text-lg font-bold tracking-tight text-foreground">Per-judge breakdown</h3>
                {judgeScores.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No scores recorded yet.</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {judgeScores.map((j) => {
                      const vals = Object.values(j.scores).filter((v): v is number => v != null);
                      const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "—";
                      return (
                        <li key={j.id} className="rounded-xl border border-border bg-mist p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-foreground">
                              {j.judgeName ?? "Judge"}
                            </span>
                            <span className="flex items-center gap-2">
                              <span className="mono-num text-sm font-semibold text-foreground">{avg}/10</span>
                              {j.submitted ? (
                                <span className="mono-label text-primary">submitted</span>
                              ) : (
                                <span className="mono-label text-muted-foreground">draft</span>
                              )}
                            </span>
                          </div>
                          {j.justification && (
                            <p className="mt-2 text-sm text-muted-foreground">{j.justification}</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          ) : startup.status === "open" ? (
            <JudgeScoreForm
              startupId={id}
              existing={myScore}
              aiScores={startup.aiScores}
              onSaved={refresh}
            />
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-clean">
              <p className="text-sm text-muted-foreground">
                {startup.status === "closed"
                  ? "Scoring for this startup is closed."
                  : "This startup is not open for scoring yet."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
