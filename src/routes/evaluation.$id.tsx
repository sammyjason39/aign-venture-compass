import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, Pencil, Trash2 } from "lucide-react";

import { Button } from "../components/ui/button";
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
import { ResultReport } from "../components/curation/ResultReport";
import {
  deleteEvaluation,
  evaluationResult,
  getEvaluation,
} from "../lib/curation/storage";
import { exportReport } from "../lib/curation/export";
import type { Evaluation, ScoreResult } from "../lib/curation/types";

export const Route = createFileRoute("/evaluation/$id")({
  head: () => ({
    meta: [
      { title: "Evaluation — AIGN Startup Curation System" },
      {
        name: "description",
        content: "A saved AI startup evaluation: archetype, weighted score, and strategic recommendation.",
      },
    ],
  }),
  component: EvaluationView,
  notFoundComponent: NotFound,
});

function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-24 text-center">
      <h1 className="text-2xl font-bold text-foreground">Evaluation not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        It may have been deleted or never saved on this device.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}

function EvaluationView() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ev = getEvaluation(id);
    if (ev) {
      setEvaluation(ev);
      setResult(evaluationResult(ev));
    }
    setReady(true);
  }, [id]);

  if (!ready) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center text-sm text-muted-foreground">
        Loading evaluation…
      </div>
    );
  }

  if (!evaluation || !result) return <NotFound />;

  function handleDelete() {
    deleteEvaluation(id);
    navigate({ to: "/" });
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <p className="mono-label text-muted-foreground">
          Saved {new Date(evaluation.updatedAt).toLocaleDateString()}
        </p>
      </div>

      <div className="mt-6">
        <ResultReport
          evaluation={evaluation}
          result={result}
          actions={
            <>
              <Button onClick={() => router.navigate({ to: "/evaluate", search: { id } })}>
                <Pencil className="h-4 w-4" />
                Edit Evaluation
              </Button>
              <Button variant="outline" onClick={() => exportReport(evaluation)}>
                <Download className="h-4 w-4" />
                Export Report
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete evaluation?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes the evaluation for {evaluation.startupName}.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          }
        />
      </div>
    </div>
  );
}
