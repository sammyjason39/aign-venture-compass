import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BarChart3, Plus, Rocket, Search, Sprout, CheckCircle2, Clock } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { StatCard } from "../../components/curation/StatCard";
import { ArchetypeBadge } from "../../components/curation/ArchetypeBadge";
import { RecommendationBadge } from "../../components/curation/RecommendationBadge";
import { StatusBadge, AiStatusBadge } from "../../components/curation/StatusBadge";
import { ARCHETYPES } from "../../lib/curation/archetypes";
import { listStartups } from "../../lib/curation/curation.functions";
import { useRoles } from "../../hooks/use-auth";
import type { ArchetypeId } from "../../lib/curation/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Pipeline — AIGN Curation" }] }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const { isAdmin } = useRoles();
  const [query, setQuery] = useState("");
  const [archetypeFilter, setArchetypeFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["startups"],
    queryFn: () => listStartups(),
  });

  const startups = data?.startups ?? [];
  const mySubmissions = data?.mySubmissions ?? {};

  const stats = useMemo(() => {
    const total = startups.length;
    const scored = startups.filter((s) => s.aiStatus === "done");
    const avgAi =
      scored.length === 0
        ? 0
        : scored.reduce((sum, s) => {
            const vals = Object.values(s.aiScores ?? {});
            const a = vals.length ? vals.reduce((x, y) => x + (y as number), 0) / vals.length : 0;
            return sum + a;
          }, 0) / scored.length;
    const open = startups.filter((s) => s.status === "open").length;
    const fastTrack = startups.filter((s) => s.aiRecommendation === "fast_track").length;
    return { total, avgAi, open, fastTrack };
  }, [startups]);

  const filtered = useMemo(() => {
    return startups.filter((s) => {
      if (archetypeFilter !== "all" && s.archetype !== archetypeFilter) return false;
      if (query && !s.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [startups, archetypeFilter, query]);

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mono-label text-muted-foreground">Pipeline</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            Startup pipeline
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin
              ? "Manage submissions, AI baselines, and judge results."
              : "Review startups and submit your scores."}
          </p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link to="/admin/new">
              <Plus className="h-4 w-4" />
              Add startup
            </Link>
          </Button>
        )}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Startups" value={stats.total} hint="In the pipeline" icon={<BarChart3 className="h-4 w-4" />} />
        <StatCard label="Open for scoring" value={stats.open} hint="Awaiting judge input" icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Avg AI score" value={`${stats.avgAi.toFixed(1)}`} hint="Across scored / 10" icon={<BarChart3 className="h-4 w-4" />} />
        <StatCard label="AI Fast Track" value={stats.fastTrack} hint="AI flagged priority" icon={<Rocket className="h-4 w-4" />} accent />
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3">
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
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-clean">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="mono-label text-muted-foreground">Startup</TableHead>
              <TableHead className="mono-label text-muted-foreground">Archetype</TableHead>
              <TableHead className="mono-label text-right text-muted-foreground">AI score</TableHead>
              <TableHead className="mono-label text-muted-foreground">AI verdict</TableHead>
              <TableHead className="mono-label text-muted-foreground">{isAdmin ? "Status" : "Your score"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="py-14 text-center text-sm text-muted-foreground">
                  Loading pipeline…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-14 text-center text-sm text-muted-foreground">
                  No startups yet.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((s) => {
              const aiVals = Object.values(s.aiScores ?? {});
              const aiAvg = aiVals.length
                ? (aiVals.reduce((x, y) => x + (y as number), 0) / aiVals.length).toFixed(1)
                : "—";
              const submitted = mySubmissions[s.id];
              return (
                <TableRow
                  key={s.id}
                  className="cursor-pointer border-border"
                  onClick={() => navigate({ to: "/startups/$id", params: { id: s.id } })}
                >
                  <TableCell className="font-semibold text-foreground">
                    {s.name}
                    {s.oneLiner && (
                      <p className="text-xs font-normal text-muted-foreground line-clamp-1">{s.oneLiner}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {s.archetype ? <ArchetypeBadge id={s.archetype as ArchetypeId} showIndex={false} /> : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="mono-num font-semibold text-foreground">{aiAvg}</span>
                    {aiAvg !== "—" && <span className="mono-num text-muted-foreground">/10</span>}
                  </TableCell>
                  <TableCell>
                    {s.aiRecommendation ? (
                      <RecommendationBadge id={s.aiRecommendation} size="sm" />
                    ) : (
                      <AiStatusBadge status={s.aiStatus} />
                    )}
                  </TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <StatusBadge status={s.status} />
                    ) : submitted ? (
                      <span className="mono-label inline-flex items-center gap-1.5 text-primary">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Submitted
                      </span>
                    ) : (
                      <span className="mono-label inline-flex items-center gap-1.5 text-muted-foreground">
                        <ArrowRight className="h-3.5 w-3.5" /> Score now
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
