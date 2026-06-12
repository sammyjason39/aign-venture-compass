import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, Rocket, Sprout, Trash2, Search } from "lucide-react";

import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Input } from "../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
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
} from "../components/ui/alert-dialog";
import { StatCard } from "../components/curation/StatCard";
import { ArchetypeBadge } from "../components/curation/ArchetypeBadge";
import { RecommendationBadge } from "../components/curation/RecommendationBadge";
import { ARCHETYPES } from "../lib/curation/archetypes";
import { RECOMMENDATIONS } from "../lib/curation/rubric";
import {
  deleteEvaluation,
  evaluationResult,
  listEvaluations,
} from "../lib/curation/storage";
import type { Evaluation, ScoreResult } from "../lib/curation/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — AIGN Startup Curation System" },
      {
        name: "description",
        content:
          "Track every AI startup evaluated against the AIGN framework: scores, archetypes, and strategic recommendations in one venture committee dashboard.",
      },
      { property: "og:title", content: "AIGN Startup Curation System" },
      {
        property: "og:description",
        content: "Classify, score, and prioritize AI startups entering the AIGN ecosystem.",
      },
    ],
  }),
  component: Dashboard,
});

type Row = { ev: Evaluation; result: ScoreResult };

function Dashboard() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [archetypeFilter, setArchetypeFilter] = useState<string>("all");
  const [recFilter, setRecFilter] = useState<string>("all");
  const [scoreFilter, setScoreFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  function refresh() {
    const list = listEvaluations();
    setRows(list.map((ev) => ({ ev, result: evaluationResult(ev) })));
  }

  useEffect(() => {
    refresh();
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const avg =
      total === 0 ? 0 : rows.reduce((s, r) => s + r.result.finalScore, 0) / total;
    const fastTrack = rows.filter((r) => r.result.recommendation === "fast_track").length;
    const incubation = rows.filter((r) => r.result.recommendation === "incubation").length;
    return { total, avg, fastTrack, incubation };
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter(({ ev, result }) => {
      if (archetypeFilter !== "all" && ev.archetype !== archetypeFilter) return false;
      if (recFilter !== "all" && result.recommendation !== recFilter) return false;
      if (query && !ev.startupName.toLowerCase().includes(query.toLowerCase())) return false;
      if (scoreFilter !== "all") {
        const f = result.finalScore;
        if (scoreFilter === "86" && f < 86) return false;
        if (scoreFilter === "70" && (f < 70 || f >= 86)) return false;
        if (scoreFilter === "45" && (f < 45 || f >= 70)) return false;
        if (scoreFilter === "0" && f >= 45) return false;
      }
      return true;
    });
  }, [rows, archetypeFilter, recFilter, scoreFilter, query]);

  function handleDelete(id: string) {
    deleteEvaluation(id);
    refresh();
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-foreground text-background">
        <div className="grid-faint">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
            <p className="mono-label text-blue-soft">AIGN · AI Startup Ecosystem Framework</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Curate AI startups with clarity.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-background/70 sm:text-lg">
              AIGN evaluates every startup through business viability, AI relevance, ecosystem
              fit, prestige value, social impact, and transformational potential.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-lg px-6 text-sm">
                <Link to="/evaluate">
                  Start Evaluation
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <span className="mono-label text-background/50">
                {ARCHETYPES.length} archetypes · 9-factor weighted rubric
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Startups Evaluated"
            value={stats.total}
            hint="Total in the curation pipeline"
            icon={<BarChart3 className="h-4 w-4" />}
          />
          <StatCard
            label="Average Score"
            value={`${stats.avg.toFixed(0)}`}
            hint="Across all evaluations / 100"
            icon={<BarChart3 className="h-4 w-4" />}
          />
          <StatCard
            label="Fast Track Candidates"
            value={stats.fastTrack}
            hint="Priority startups (86–100)"
            icon={<Rocket className="h-4 w-4" />}
            accent
          />
          <StatCard
            label="Strategic Incubation"
            value={stats.incubation}
            hint="High strategic value (56–69)"
            icon={<Sprout className="h-4 w-4" />}
          />
        </div>

        {/* Recent evaluations */}
        <div className="mt-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mono-label text-muted-foreground">Pipeline</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                Recent evaluations
              </h2>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/evaluate">New evaluation</Link>
            </Button>
          </div>

          {/* Filters */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search startups"
                className="h-9 w-52 pl-9"
              />
            </div>
            <Select value={archetypeFilter} onValueChange={setArchetypeFilter}>
              <SelectTrigger className="h-9 w-[220px]">
                <SelectValue placeholder="Archetype" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All archetypes</SelectItem>
                {ARCHETYPES.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={recFilter} onValueChange={setRecFilter}>
              <SelectTrigger className="h-9 w-[200px]">
                <SelectValue placeholder="Recommendation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All recommendations</SelectItem>
                {Object.values(RECOMMENDATIONS).map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={scoreFilter} onValueChange={setScoreFilter}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Score range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All scores</SelectItem>
                <SelectItem value="86">86–100</SelectItem>
                <SelectItem value="70">70–85</SelectItem>
                <SelectItem value="45">45–69</SelectItem>
                <SelectItem value="0">Below 45</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-clean">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="mono-label text-muted-foreground">Startup</TableHead>
                  <TableHead className="mono-label text-muted-foreground">Archetype</TableHead>
                  <TableHead className="mono-label text-right text-muted-foreground">Score</TableHead>
                  <TableHead className="mono-label text-muted-foreground">Recommendation</TableHead>
                  <TableHead className="mono-label text-muted-foreground">Date</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-14 text-center text-sm text-muted-foreground">
                      No evaluations match these filters.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(({ ev, result }) => (
                  <TableRow
                    key={ev.id}
                    className="cursor-pointer border-border"
                    onClick={() => navigate({ to: "/evaluation/$id", params: { id: ev.id } })}
                  >
                    <TableCell className="font-semibold text-foreground">{ev.startupName}</TableCell>
                    <TableCell>
                      <ArchetypeBadge id={ev.archetype} />
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="mono-num font-semibold text-foreground">{result.finalScore}</span>
                      <span className="mono-num text-muted-foreground">/100</span>
                    </TableCell>
                    <TableCell>
                      <RecommendationBadge id={result.recommendation} size="sm" />
                    </TableCell>
                    <TableCell className="mono-num text-sm text-muted-foreground">
                      {new Date(ev.createdAt).toLocaleDateString(undefined, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete evaluation?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently removes the evaluation for {ev.startupName}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(ev.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
