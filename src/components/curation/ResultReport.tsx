import type { ReactNode } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { CheckCircle2, AlertTriangle, ShieldAlert, ArrowRight } from "lucide-react";

import { CATEGORIES } from "../../lib/curation/rubric";
import { getArchetype } from "../../lib/curation/archetypes";
import type { Evaluation, ScoreResult } from "../../lib/curation/types";
import { RecommendationBadge } from "./RecommendationBadge";
import { ScoreBar } from "./ScoreBar";

export function ResultReport({
  evaluation,
  result,
  actions,
}: {
  evaluation: Evaluation;
  result: ScoreResult;
  actions?: ReactNode;
}) {
  const arch = getArchetype(evaluation.archetype);
  const radarData = CATEGORIES.map((c) => ({
    cat: c.short,
    value: evaluation.scores[c.id],
  }));

  return (
    <div className="space-y-6">
      {/* Hero score card */}
      <div className="overflow-hidden rounded-3xl border border-transparent bg-foreground text-background shadow-card">
        <div className="grid-faint">
          <div className="grid gap-8 p-7 sm:p-10 lg:grid-cols-[1.1fr_1fr]">
            <div className="flex flex-col justify-between gap-6">
              <div>
                <p className="mono-label text-background/60">Evaluation Result</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                  {evaluation.startupName}
                </h2>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-background/15 bg-background/5 px-3 py-1 text-xs font-medium">
                    <span className="font-mono text-[10px] text-blue-soft">{arch.index}</span>
                    {arch.name}
                  </span>
                  <RecommendationBadge id={result.recommendation} />
                </div>
              </div>
              <p className="max-w-md text-sm leading-relaxed text-background/70">
                {result.summary}
              </p>
            </div>

            <div className="flex flex-col justify-center gap-4 rounded-2xl border border-background/10 bg-background/5 p-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="mono-label text-background/60">Final Score</p>
                  <p className="mono-num text-6xl font-bold leading-none">
                    {result.finalScore}
                    <span className="text-2xl text-background/50">/100</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="mono-label text-background/60">Avg</p>
                  <p className="mono-num text-3xl font-bold leading-none">
                    {result.averageOutOf5.toFixed(1)}
                    <span className="text-base text-background/50">/5</span>
                  </p>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-background/15">
                <div
                  className="h-full rounded-full bg-blue-soft"
                  style={{ width: `${result.finalScore}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts + breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-clean">
          <p className="mono-label text-muted-foreground">Category Profile</p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">Scoring radar</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke="var(--hairline)" />
                <PolarAngleAxis
                  dataKey="cat"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }}
                />
                <Radar
                  dataKey="value"
                  stroke="var(--primary)"
                  fill="var(--primary)"
                  fillOpacity={0.18}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-clean">
          <p className="mono-label text-muted-foreground">Composite Scores</p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">Score breakdown</h3>
          <div className="mt-5 space-y-4">
            <ScoreBar label="Business viability" score={result.businessScore} max={100} sublabel="Problem · AI · model · moat · founder" />
            <ScoreBar label="Strategic value" score={result.strategicScore} max={100} sublabel="Prestige · social impact · transformation" />
            <ScoreBar label="Archetype-specific" score={result.archetypeScore} max={100} sublabel={`${arch.name} criteria`} />
            <ScoreBar label="AIGN ecosystem fit" score={result.ecosystemFitScore} max={100} sublabel="Usability across AIGN / Arta Graha units" />
          </div>
        </div>
      </div>

      {/* Per-category rubric */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-clean">
        <p className="mono-label text-muted-foreground">Weighted Rubric</p>
        <h3 className="mt-1 text-lg font-semibold text-foreground">Category scores</h3>
        <div className="mt-5 grid gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => (
            <ScoreBar key={c.id} label={c.label} score={evaluation.scores[c.id]} weight={c.weight} />
          ))}
        </div>
      </div>

      {/* Strengths / weaknesses / risks */}
      <div className="grid gap-6 lg:grid-cols-3">
        <InsightCard
          title="Key strengths"
          icon={<CheckCircle2 className="h-4 w-4 text-success" />}
          items={result.strengths}
          tone="success"
        />
        <InsightCard
          title="Key weaknesses"
          icon={<AlertTriangle className="h-4 w-4 text-warning" />}
          items={result.weaknesses}
          tone="warning"
        />
        <InsightCard
          title="Main risks"
          icon={<ShieldAlert className="h-4 w-4 text-destructive" />}
          items={result.risks}
          tone="destructive"
        />
      </div>

      {/* Next action */}
      <div className="rounded-2xl border border-primary/20 bg-accent/40 p-6 shadow-clean">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ArrowRight className="h-4 w-4" />
          </span>
          <div>
            <p className="mono-label text-primary">Suggested next action for AIGN</p>
            <p className="mt-1.5 text-base font-medium text-foreground">{result.nextAction}</p>
          </div>
        </div>
      </div>

      {actions && <div className="flex flex-wrap items-center gap-3 pt-1">{actions}</div>}
    </div>
  );
}

function InsightCard({
  title,
  icon,
  items,
  tone,
}: {
  title: string;
  icon: ReactNode;
  items: string[];
  tone: "success" | "warning" | "destructive";
}) {
  const dot =
    tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-destructive";
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-clean">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
