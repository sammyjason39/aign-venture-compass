import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  BarChart3,
  Plus,
  Rocket,
  Search,
  CheckCircle2,
  Clock,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

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
import { listStartups, reorderStartups } from "../../lib/curation/curation.functions";
import { getMyProfile } from "../../lib/curation/admin.functions";
import { useRoles, useSession } from "../../hooks/use-auth";
import { WelcomeOverlay } from "../../components/WelcomeOverlay";
import { cn } from "../../lib/utils";
import type { ArchetypeId, Startup } from "../../lib/curation/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Pipeline — Venturis Curation" }] }),
  component: Dashboard,
});

function StartupRow({
  startup,
  isAdmin,
  submitted,
  draggable,
  onOpen,
}: {
  startup: Startup;
  isAdmin: boolean;
  submitted: boolean | undefined;
  draggable: boolean;
  onOpen: () => void;
}) {
  const sortable = useSortable({ id: startup.id, disabled: !draggable });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

  const aiVals = Object.values(startup.aiScores ?? {});
  const aiAvg = aiVals.length
    ? (aiVals.reduce((x, y) => x + (y as number), 0) / aiVals.length).toFixed(1)
    : "—";

  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "cursor-pointer border-border",
        isDragging && "relative z-10 bg-secondary shadow-clean",
      )}
      onClick={onOpen}
    >
      {draggable && (
        <TableCell className="w-8 pr-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            aria-label="Drag to reorder"
            className="flex h-7 w-6 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </TableCell>
      )}
      <TableCell className="font-semibold text-foreground">
        {startup.name}
        {startup.oneLiner && (
          <p className="text-xs font-normal text-muted-foreground line-clamp-1">{startup.oneLiner}</p>
        )}
      </TableCell>
      <TableCell>
        {startup.archetype ? (
          <ArchetypeBadge
            id={startup.archetype as ArchetypeId}
            customLabel={startup.archetypeCustom}
            showIndex={false}
          />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <span className="mono-num font-semibold text-foreground">{aiAvg}</span>
        {aiAvg !== "—" && <span className="mono-num text-muted-foreground">/10</span>}
      </TableCell>
      <TableCell>
        {startup.aiRecommendation ? (
          <RecommendationBadge id={startup.aiRecommendation} size="sm" />
        ) : (
          <AiStatusBadge status={startup.aiStatus} />
        )}
      </TableCell>
      <TableCell>
        {isAdmin ? (
          <StatusBadge status={startup.status} />
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
}

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin } = useRoles();
  const { user } = useSession();
  const [query, setQuery] = useState("");
  const [archetypeFilter, setArchetypeFilter] = useState("all");

  // Interactive welcome splash, shown once per browser session after sign-in.
  const firstName = useMemo(() => {
    const meta = user?.user_metadata ?? {};
    const full = (meta.full_name || meta.name || "") as string;
    const fromName = full.trim().split(/\s+/)[0];
    if (fromName) return fromName;
    const emailPrefix = user?.email?.split("@")[0] ?? "";
    return emailPrefix ? emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1) : "there";
  }, [user]);

  const { data: myProfile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: () => getMyProfile(),
    enabled: !!user,
    staleTime: 60_000,
  });

  // Use the salutation set by the super admin; fall back to generic while loading.
  const salutationLabel =
    myProfile === undefined
      ? "Bapak/Ibu"
      : myProfile.salutation === "bapak"
        ? "Bapak"
        : myProfile.salutation === "ibu"
          ? "Ibu"
          : "";

  const [showWelcome, setShowWelcome] = useState(false);
  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("venturis_welcomed")) return;
    sessionStorage.setItem("venturis_welcomed", "1");
    setShowWelcome(true);
  }, [user]);

  const { data, isLoading } = useQuery({
    queryKey: ["startups"],
    queryFn: () => listStartups(),
    enabled: !!user,
  });

  const mySubmissions = data?.mySubmissions ?? {};
  const reorder = useServerFn(reorderStartups);

  // Local, reorderable copy of the pipeline kept in sync with the server.
  const [order, setOrder] = useState<Startup[]>([]);
  useEffect(() => {
    if (data?.startups) setOrder(data.startups);
  }, [data?.startups]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const stats = useMemo(() => {
    const total = order.length;
    const scored = order.filter((s) => s.aiStatus === "done");
    const avgAi =
      scored.length === 0
        ? 0
        : scored.reduce((sum, s) => {
            const vals = Object.values(s.aiScores ?? {});
            const a = vals.length ? vals.reduce((x, y) => x + (y as number), 0) / vals.length : 0;
            return sum + a;
          }, 0) / scored.length;
    const open = order.filter((s) => s.status === "open").length;
    const fastTrack = order.filter((s) => s.aiRecommendation === "fast_track").length;
    return { total, avgAi, open, fastTrack };
  }, [order]);

  const filtered = useMemo(() => {
    return order.filter((s) => {
      if (archetypeFilter !== "all" && s.archetype !== archetypeFilter) return false;
      if (query && !s.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [order, archetypeFilter, query]);

  // Reordering is only meaningful on the full, unfiltered list.
  const canReorder = isAdmin && archetypeFilter === "all" && !query;
  const colCount = canReorder ? 6 : 5;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id);
      const newIndex = prev.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = arrayMove(prev, oldIndex, newIndex);
      reorder({ data: { ids: next.map((s) => s.id) } })
        .then(() => queryClient.invalidateQueries({ queryKey: ["startups"] }))
        .catch((err) => {
          toast.error(err instanceof Error ? err.message : "Failed to save order");
          if (data?.startups) setOrder(data.startups);
        });
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      {showWelcome && (
        <WelcomeOverlay name={firstName} salutation={salutationLabel} onDone={() => setShowWelcome(false)} />
      )}
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
        {isAdmin && !canReorder && (
          <span className="text-xs text-muted-foreground">
            Clear search & filters to reorder
          </span>
        )}
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-clean">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                {canReorder && <TableHead className="w-8" />}
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
                  <TableCell colSpan={colCount} className="py-14 text-center text-sm text-muted-foreground">
                    Loading pipeline…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={colCount} className="py-14 text-center text-sm text-muted-foreground">
                    No startups yet.
                  </TableCell>
                </TableRow>
              )}
              <SortableContext
                items={filtered.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {filtered.map((s) => (
                  <StartupRow
                    key={s.id}
                    startup={s}
                    isAdmin={isAdmin}
                    submitted={mySubmissions[s.id]}
                    draggable={canReorder}
                    onOpen={() => navigate({ to: "/startups/$id", params: { id: s.id } })}
                  />
                ))}
              </SortableContext>
            </TableBody>
          </Table>
        </DndContext>
      </div>
    </div>
  );
}
