import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, FileText, Loader2, Sparkles, Upload, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { createStartup } from "../../lib/curation/curation.functions";
import { useRoles } from "../../hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/new")({
  head: () => ({ meta: [{ title: "Add startup — AIGN Curation" }] }),
  component: AddStartup,
});

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

function FilePicker({
  label,
  accept,
  file,
  onPick,
  hint,
}: {
  label: string;
  accept: string;
  file: File | null;
  onPick: (f: File | null) => void;
  hint: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      {file ? (
        <div className="mt-2 flex items-center justify-between rounded-xl border border-border bg-mist px-4 py-3">
          <span className="flex items-center gap-2 text-sm text-foreground">
            <FileText className="h-4 w-4 text-primary" />
            {file.name}
          </span>
          <button type="button" onClick={() => onPick(null)} className="text-muted-foreground hover:text-destructive">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-background px-4 py-3 text-sm text-muted-foreground hover:border-primary/40">
          <Upload className="h-4 w-4" />
          Choose file
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
        </label>
      )}
    </div>
  );
}

function AddStartup() {
  const navigate = useNavigate();
  const { isAdmin, loading } = useRoles();

  const [name, setName] = useState("");
  const [oneLiner, setOneLiner] = useState("");
  const [sector, setSector] = useState("");
  const [description, setDescription] = useState("");
  const [deck, setDeck] = useState<File | null>(null);
  const [transcript, setTranscript] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Admins only.");
      navigate({ to: "/dashboard" });
    }
  }, [loading, isAdmin, navigate]);

  async function uploadFile(file: File): Promise<string> {
    const path = `${crypto.randomUUID()}-${sanitize(file.name)}`;
    const { error } = await supabase.storage.from("startup-files").upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
    if (error) throw new Error(error.message);
    return path;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Startup name is required.");
      return;
    }
    if (!description.trim() && !deck && !transcript) {
      toast.error("Add a description, a deck, or a transcript so the AI has something to evaluate.");
      return;
    }
    setBusy(true);
    try {
      let deckPath: string | null = null;
      let transcriptPath: string | null = null;
      if (deck) {
        setStage("Uploading deck…");
        deckPath = await uploadFile(deck);
      }
      if (transcript) {
        setStage("Uploading transcript…");
        transcriptPath = await uploadFile(transcript);
      }
      setStage("AI is evaluating the startup…");
      const { id } = await createStartup({
        data: {
          name: name.trim(),
          oneLiner: oneLiner.trim(),
          sector: sector.trim(),
          description: description.trim(),
          deckPath,
          transcriptPath,
        },
      });
      toast.success("Startup added and evaluated.");
      navigate({ to: "/startups/$id", params: { id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create startup");
      setBusy(false);
      setStage("");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Link to="/dashboard" className="mono-label inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Pipeline
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Add a startup</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Paste a description and optionally attach a deck or transcript. The AI scores it on submit.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-clean">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Startup name *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lindra AI" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="sector">Sector</Label>
              <Input id="sector" value={sector} onChange={(e) => setSector(e.target.value)} placeholder="e.g. Healthcare" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="oneLiner">One-liner</Label>
              <Input id="oneLiner" value={oneLiner} onChange={(e) => setOneLiner(e.target.value)} placeholder="We help X do Y using Z." className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the startup: problem, product, AI usage, traction, business model, team…"
                rows={8}
                className="mt-1.5"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-clean">
          <h3 className="text-base font-bold tracking-tight text-foreground">Attachments (optional)</h3>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <FilePicker
              label="Pitch deck"
              accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              file={deck}
              onPick={setDeck}
              hint="PDF or PowerPoint (.pptx)."
            />
            <FilePicker
              label="Meeting transcript"
              accept=".txt,.md,.vtt,.srt,.pdf,text/plain"
              file={transcript}
              onPick={setTranscript}
              hint="Text or PDF transcript."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          {busy && stage && (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" /> {stage}
            </span>
          )}
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Evaluate startup
          </Button>
        </div>
      </form>
    </div>
  );
}
