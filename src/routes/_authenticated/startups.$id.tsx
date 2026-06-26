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
  Upload,
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
import { Slider } from "../../components/ui/slider";
import { ArchetypeBadge } from "../../components/curation/ArchetypeBadge";
import { ARCHETYPES } from "../../lib/curation/archetypes";
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
  setStartupArchetype,
  setStartupAiScores,
  setStartupFinancialReport,
} from "../../lib/curation/curation.functions";
import { supabase } from "../../integrations/supabase/client";
import { useRoles, useSession } from "../../hooks/use-auth";
import type { ArchetypeId, CategoryId, CategoryScores, StartupStatus } from "../../lib/curation/types";


export const Route = createFileRoute("/_authenticated/startups/$id")({
  head: () => ({ meta: [{ title: "Startup — Venturis Curation" }] }),
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
  const { session } = useSession();
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState<"deck" | "transcript" | "financial_report" | null>(null);
  const [uploadingFinancial, setUploadingFinancial] = useState(false);
  const [valuationOpen, setValuationOpen] = useState(false);
  const [valuationDraft, setValuationDraft] = useState("");
  const [savingValuation, setSavingValuation] = useState(false);
  const [archetypeOpen, setArchetypeOpen] = useState(false);
  const [archetypeDraft, setArchetypeDraft] = useState<ArchetypeId | "">("");
  const [archetypeCustomDraft, setArchetypeCustomDraft] = useState("");
  const [savingArchetype, setSavingArchetype] = useState(false);
  const [editingScores, setEditingScores] = useState(false);
  const [scoreDraft, setScoreDraft] = useState<CategoryScores | null>(null);
  const [savingScores, setSavingScores] = useState(false);

  async function openFile(kind: "deck" | "transcript" | "financial_report") {
    setDownloading(kind);
    try {
      const { base64, filename, contentType } = await downloadStartupFile({
        data: { id, kind },
      });
      if (!base64) {
        toast.error(
          kind === "deck"
            ? "No deck was uploaded."
            : kind === "financial_report"
              ? "No financial report was uploaded."
              : "No transcript was uploaded.",
        );
        return;
      }
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], {
        type: contentType || "application/octet-stream",
      });
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename || kind;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open file");
    } finally {
      setDownloading(null);
    }
  }


  async function uploadFinancialReport(file: File) {
    setUploadingFinancial(true);
    try {
      const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
      const { error } = await supabase.storage
        .from("startup-files")
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (error) throw new Error(error.message);
      await setStartupFinancialReport({ data: { id, path } });
      toast.success("Financial report uploaded.");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload financial report");
    } finally {
      setUploadingFinancial(false);
    }
  }


  const { data, isLoading } = useQuery({
    queryKey: ["startup", id],
    queryFn: () => getStartupDetail({ data: { id } }),
    enabled: !!session,
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

  function openArchetypeDialog() {
    setArchetypeDraft((startup.archetype as ArchetypeId) ?? "");
    setArchetypeCustomDraft(startup.archetypeCustom ?? "");
    setArchetypeOpen(true);
  }

  async function saveArchetype() {
    if (!archetypeDraft) return;
    if (archetypeDraft === "custom" && !archetypeCustomDraft.trim()) {
      toast.error("Please type a custom archetype name.");
      return;
    }
    setSavingArchetype(true);
    try {
      await setStartupArchetype({
        data: {
          id,
          archetype: archetypeDraft,
          customLabel: archetypeDraft === "custom" ? archetypeCustomDraft.trim() : undefined,
        },
      });
      toast.success("Archetype updated.");
      setArchetypeOpen(false);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update archetype");
    } finally {
      setSavingArchetype(false);
    }
  }


  function startEditingScores() {
    const base = startup.aiScores ?? ({} as Partial<CategoryScores>);
    const draft = {} as CategoryScores;
    for (const c of CATEGORIES) {
      draft[c.id] = base[c.id] ?? 5;
    }
    setScoreDraft(draft);
    setEditingScores(true);
  }

  function cancelEditingScores() {
    setEditingScores(false);
    setScoreDraft(null);
  }

  async function saveScores() {
    if (!scoreDraft) return;
    setSavingScores(true);
    try {
      await setStartupAiScores({ data: { id, scores: scoreDraft } });
      toast.success("AI scores updated.");
      setEditingScores(false);
      setScoreDraft(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update scores");
    } finally {
      setSavingScores(false);
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
            {startup.archetype && (
              <ArchetypeBadge
                id={startup.archetype as ArchetypeId}
                customLabel={startup.archetypeCustom}
              />
            )}
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-muted-foreground"
                onClick={openArchetypeDialog}
              >
                <Pencil className="h-3.5 w-3.5" />
                {startup.archetype ? "Edit" : "Set archetype"}
              </Button>
            )}
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



          {(startup.deckPath || startup.transcriptPath || startup.financialReportPath || isAdmin) && (
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
              {startup.financialReportPath && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openFile("financial_report")}
                  disabled={downloading !== null}
                >
                  {downloading === "financial_report" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download financial report
                </Button>
              )}
              {isAdmin && (
                <label
                  className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-muted-foreground hover:border-primary/40 ${
                    uploadingFinancial ? "pointer-events-none opacity-60" : ""
                  }`}
                >
                  {uploadingFinancial ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {startup.financialReportPath ? "Replace financial report" : "Upload financial report"}
                  <input
                    type="file"
                    accept=".pdf,.xlsx,.xls,.csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                    className="hidden"
                    disabled={uploadingFinancial}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadFinancialReport(f);
                      e.target.value = "";
                    }}
                  />
                </label>
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
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
                <Sparkles className="h-4 w-4 text-primary" /> AI baseline
              </h3>
              <div className="flex items-center gap-2">
                {startup.aiRecommendation && !editingScores && (
                  <RecommendationBadge id={startup.aiRecommendation} size="sm" />
                )}
                {isAdmin && startup.aiScores && !editingScores && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-muted-foreground"
                    onClick={startEditingScores}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit scores
                  </Button>
                )}
              </div>
            </div>
            {startup.aiSummary ? (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{startup.aiSummary}</p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                {startup.aiStatus === "processing" ? "AI is evaluating this startup…" : "No AI evaluation yet."}
              </p>
            )}

            {editingScores && scoreDraft ? (
              <div className="mt-5 space-y-5">
                {CATEGORIES.map((c) => (
                  <div key={c.id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{c.label}</span>
                        <span className="mono-label text-muted-foreground">{c.weight}%</span>
                      </div>
                      <span className="mono-num text-sm font-semibold text-foreground">
                        {scoreDraft[c.id]}
                      </span>
                    </div>
                    <Slider
                      className="mt-3"
                      min={1}
                      max={10}
                      step={1}
                      value={[scoreDraft[c.id]]}
                      onValueChange={(v) =>
                        setScoreDraft((prev) =>
                          prev ? { ...prev, [c.id]: v[0] } : prev,
                        )
                      }
                    />
                  </div>
                ))}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelEditingScores}
                    disabled={savingScores}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveScores} disabled={savingScores}>
                    {savingScores && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save scores
                  </Button>
                </div>
              </div>
            ) : (
              startup.aiScores && (
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
              )
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

      <Dialog open={valuationOpen} onOpenChange={setValuationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit valuation</DialogTitle>
            <DialogDescription>
              Set the valuation for {startup.name}. Leave empty to clear it.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={valuationDraft}
            onChange={(e) => setValuationDraft(e.target.value)}
            placeholder="e.g. $5M pre-money"
            maxLength={120}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !savingValuation) saveValuation();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setValuationOpen(false)} disabled={savingValuation}>
              Cancel
            </Button>
            <Button onClick={saveValuation} disabled={savingValuation}>
              {savingValuation && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={archetypeOpen} onOpenChange={setArchetypeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit archetype</DialogTitle>
            <DialogDescription>
              Manually set the archetype for {startup.name}. This overrides the AI classification (confidence becomes 100%).
            </DialogDescription>
          </DialogHeader>
          <Select
            value={archetypeDraft || undefined}
            onValueChange={(v) => setArchetypeDraft(v as ArchetypeId)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an archetype" />
            </SelectTrigger>
            <SelectContent>
              {ARCHETYPES.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.index} · {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {archetypeDraft === "custom" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Custom archetype name
              </label>
              <Input
                value={archetypeCustomDraft}
                onChange={(e) => setArchetypeCustomDraft(e.target.value)}
                placeholder="e.g. Climate Hardware, Biotech Platform…"
                maxLength={80}
              />
              <p className="text-xs text-muted-foreground">
                Type your own label for startups that aren't AI-related.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchetypeOpen(false)} disabled={savingArchetype}>
              Cancel
            </Button>
            <Button onClick={saveArchetype} disabled={savingArchetype || !archetypeDraft}>
              {savingArchetype && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
