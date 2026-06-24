import { createFileRoute, Link } from "@tanstack/react-router";
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
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Upload,
  Wallet,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import {
  generateStartupFinancials,
  getStartupDetail,
  getStartupFileUrl,
} from "../../lib/curation/curation.functions";
import { useRoles, useSession } from "../../hooks/use-auth";
import type { FinancialData, FinancialMetric } from "../../lib/curation/types";

export const Route = createFileRoute("/_authenticated/startups/$id_/financial")({
  head: () => ({ meta: [{ title: "Financials — Venturis Curation" }] }),
  component: StartupFinancial,
  errorComponent: () => (
    <div className="mx-auto max-w-2xl px-5 py-20 text-center">
      <p className="text-sm text-muted-foreground">Financials could not be loaded.</p>
      <Button asChild variant="outline" className="mt-4">
        <Link to="/dashboard">Back to pipeline</Link>
      </Button>
    </div>
  ),
});

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

function MetricGrid({ items }: { items: FinancialMetric[] }) {
  return (
    <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
      {items.map((m, i) => (
        <div key={i} className="bg-card p-4">
          <p className="mono-label text-muted-foreground">{m.label}</p>
          <p className="mono-num mt-1.5 text-lg font-semibold text-foreground">{m.value || "-"}</p>
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-clean sm:p-6">
      <h3 className="text-lg font-bold tracking-tight text-foreground">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Dashboard({ fin }: { fin: FinancialData }) {
  const revenue: FinancialMetric[] = [
    { label: "ARR", value: fin.revenue.arr },
    { label: "MRR", value: fin.revenue.mrr },
    { label: "Latest revenue", value: fin.revenue.latestRevenue },
    { label: "Growth (YoY)", value: fin.revenue.growthYoY },
    { label: "Growth (MoM)", value: fin.revenue.growthMoM },
    { label: "Gross margin", value: fin.revenue.grossMargin },
    { label: "Burn rate / mo", value: fin.revenue.burnRate },
    { label: "Runway", value: fin.revenue.runwayMonths },
    { label: "Cash position", value: fin.revenue.cashPosition },
    { label: "Funding raised", value: fin.revenue.fundingRaised },
  ];
  const unit: FinancialMetric[] = [
    { label: "CAC", value: fin.unitEconomics.cac },
    { label: "LTV", value: fin.unitEconomics.ltv },
    { label: "LTV / CAC", value: fin.unitEconomics.ltvCacRatio },
    { label: "Payback", value: fin.unitEconomics.paybackMonths },
    { label: "Churn", value: fin.unitEconomics.churn },
  ];
  const pl: FinancialMetric[] = [
    { label: "Revenue", value: fin.profitability.revenue },
    { label: "COGS", value: fin.profitability.cogs },
    { label: "Gross profit", value: fin.profitability.grossProfit },
    { label: "Net profit / loss", value: fin.profitability.netProfit },
    { label: "EBITDA", value: fin.profitability.ebitda },
  ];

  return (
    <div className="space-y-6">
      {(fin.currency !== "-" || fin.asOf !== "-") && (
        <div className="flex flex-wrap items-center gap-2">
          {fin.currency !== "-" && (
            <span className="mono-label rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
              Currency · {fin.currency}
            </span>
          )}
          {fin.asOf !== "-" && (
            <span className="mono-label rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
              As of · {fin.asOf}
            </span>
          )}
        </div>
      )}

      <Section title="Revenue & growth">
        <MetricGrid items={revenue} />
      </Section>

      <Section title="Unit economics">
        <MetricGrid items={unit} />
      </Section>

      <Section title="Profitability & P&L">
        <MetricGrid items={pl} />
        {fin.profitability.expenseBreakdown.length > 0 && (
          <div className="mt-5">
            <h4 className="mono-label text-muted-foreground">Expense breakdown</h4>
            <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
              {fin.profitability.expenseBreakdown.map((e, i) => (
                <li key={i} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-foreground">{e.label}</span>
                  <span className="mono-num text-sm font-semibold text-foreground">{e.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {(fin.highlights.length > 0 || fin.redFlags.length > 0 || fin.notes) && (
        <Section title="Analyst read">
          {fin.notes && (
            <p className="text-sm leading-relaxed text-muted-foreground">{fin.notes}</p>
          )}
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            {fin.highlights.length > 0 && (
              <div>
                <h4 className="mono-label flex items-center gap-1.5 text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Highlights
                </h4>
                <ul className="mt-2 space-y-1.5">
                  {fin.highlights.map((h, i) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-40" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {fin.redFlags.length > 0 && (
              <div>
                <h4 className="mono-label flex items-center gap-1.5 text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" /> Red flags
                </h4>
                <ul className="mt-2 space-y-1.5">
                  {fin.redFlags.map((r, i) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-40" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

function StartupFinancial() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { isAdmin } = useRoles();
  const { session } = useSession();

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["startup", id],
    queryFn: () => getStartupDetail({ data: { id } }),
    enabled: !!session,
  });

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center text-sm text-muted-foreground">
        Loading financials…
      </div>
    );
  }

  const { startup } = data;
  const fin = startup.financialData;
  const status = startup.financialStatus;

  async function generate() {
    if (!file) {
      toast.error("Choose a financial report PDF first.");
      return;
    }
    setBusy(true);
    try {
      setStage("Uploading report…");
      const path = `${crypto.randomUUID()}-${sanitize(file.name)}`;
      const up = await supabase.storage.from("startup-files").upload(path, file, {
        contentType: file.type || "application/pdf",
        upsert: false,
      });
      if (up.error) throw new Error(up.error.message);

      setStage("AI is analyzing the financials…");
      await generateStartupFinancials({ data: { id, pdfPath: path } });
      toast.success("Financial dashboard generated.");
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ["startup", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate financials");
    } finally {
      setBusy(false);
      setStage("");
    }
  }

  async function downloadSource() {
    setDownloading(true);
    try {
      const { url } = await getStartupFileUrl({ data: { id, kind: "financial" } });
      if (!url) {
        toast.error("No source file is available.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open source");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <Link
        to="/startups/$id"
        params={{ id }}
        className="mono-label inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {startup.name}
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
            <Wallet className="h-6 w-6 text-primary" /> Company financials
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-generated financial dashboard for {startup.name}.
          </p>
        </div>
        {startup.financialPdfPath && (
          <Button variant="outline" size="sm" onClick={downloadSource} disabled={downloading}>
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download source
          </Button>
        )}
      </div>

      {status === "error" && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Financial generation failed</p>
            <p>{startup.financialError ?? "Unknown error."}</p>
          </div>
        </div>
      )}

      {/* Admin upload / generate panel */}
      {isAdmin && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-clean sm:p-6">
          <h3 className="text-base font-bold tracking-tight text-foreground">
            {fin ? "Replace financial report" : "Generate financial dashboard"}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Upload the company's financial report (PDF). The AI extracts the metrics below.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label>Financial report (PDF)</Label>
              {file ? (
                <div className="mt-1.5 flex items-center justify-between rounded-xl border border-border bg-mist px-4 py-3">
                  <span className="flex items-center gap-2 text-sm text-foreground">
                    <FileText className="h-4 w-4 text-primary" />
                    {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="mt-1.5 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-background px-4 py-3 text-sm text-muted-foreground hover:border-primary/40">
                  <Upload className="h-4 w-4" />
                  Choose PDF
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
            </div>
            <Button onClick={generate} disabled={busy || !file}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : fin ? (
                <RefreshCw className="h-4 w-4" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {fin ? "Regenerate" : "Generate"}
            </Button>
          </div>
          {busy && stage && (
            <span className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" /> {stage}
            </span>
          )}
        </div>
      )}

      <div className="mt-6">
        {fin ? (
          <Dashboard fin={fin} />
        ) : status === "processing" ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-clean">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">AI is analyzing the financials…</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Wallet className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-foreground">Not available</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAdmin
                ? "Upload a financial report PDF above to generate the dashboard."
                : "No financial dashboard has been generated for this startup yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
