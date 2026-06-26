import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Slider } from "../ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  generateFinancialModel,
  saveFinancialModel,
} from "../../lib/curation/financial.functions";
import {
  currencyPrefix,
  formatMoney,
  formatNum,
  formatPct,
  formatX,
  unitSuffix,
} from "../../lib/curation/financial-format";
import type {
  FinancialCard,
  FinancialCurrency,
  FinancialModel,
  FinancialStatus,
  FinancialUnit,
} from "../../lib/curation/types";

const CHART_BLUE = "var(--primary)";
const CHART_INK = "var(--foreground)";
const CHART_MUTED = "var(--muted-foreground)";
const CHART_RED = "var(--destructive)";
const CHART_GREEN = "#16a34a";
const CHART_AMBER = "#d97706";
const CHART_GRID = "var(--border)";

interface Props {
  startupId: string;
  model: FinancialModel | null;
  status: FinancialStatus | null;
  error: string | null;
  generatedAt: string | null;
  hasReport: boolean;
  isAdmin: boolean;
  onRefresh: () => void;
}

// ---------------- small presentational bits ----------------

function Kpi({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "up" | "down";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-clean">
      <p className="mono-label text-muted-foreground">{label}</p>
      <p
        className={
          "mono-num mt-3 text-2xl font-bold tracking-tight " +
          (tone === "up" ? "text-primary" : tone === "down" ? "text-destructive" : "text-foreground")
        }
      >
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function MetricCard({ card }: { card: FinancialCard }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-clean">
      <p className="mono-label text-muted-foreground">{card.label}</p>
      <p className="mono-num mt-3 text-xl font-bold tracking-tight text-foreground">
        {card.value || "—"}
        {card.unit && <span className="ml-1 text-sm font-semibold text-muted-foreground">{card.unit}</span>}
      </p>
      {card.note && <p className="mt-2 text-xs text-muted-foreground">{card.note}</p>}
    </div>
  );
}

function ChartCard({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-clean">
      <h4 className="text-sm font-bold tracking-tight text-foreground">{title}</h4>
      {note && <p className="mono-label mt-1 text-muted-foreground">{note}</p>}
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
  fontSize: 12,
};

// ---------------- view mode ----------------

function FinancialView({ model }: { model: FinancialModel }) {
  const { currency, unit } = model;

  const growthData = model.periods.map((p, i) => ({
    period: p.label,
    Revenue: model.series.revenue[i] ?? null,
    EBITDA: model.series.ebitda[i] ?? null,
    "Net income": model.series.netIncome[i] ?? null,
  }));
  const marginData = model.periods.map((p, i) => ({
    period: p.label,
    "Gross %": model.series.grossMarginPct[i] ?? null,
    "EBITDA %": model.series.ebitdaMarginPct[i] ?? null,
  }));
  const cashData = model.periods.map((p, i) => ({
    period: p.label,
    Operating: model.series.ocf[i] ?? null,
    Investing: model.series.icf[i] ?? null,
    Financing: model.series.fcf[i] ?? null,
  }));

  const hasCash = model.series.ocf.some((v) => v != null) ||
    model.series.icf.some((v) => v != null) ||
    model.series.fcf.some((v) => v != null);
  const hasMargin =
    model.series.grossMarginPct.some((v) => v != null) ||
    model.series.ebitdaMarginPct.some((v) => v != null);

  const k = model.kpis;

  return (
    <div className="space-y-8">
      {/* Hero KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi label="Revenue (latest)" value={formatMoney(lastNonNull(model.series.revenue), currency, unit)} hint="Most recent period" />
        <Kpi label="Revenue CAGR" value={formatPct(k.revenueCagrPct)} hint="First → last period" tone={k.revenueCagrPct && k.revenueCagrPct > 0 ? "up" : "default"} />
        <Kpi label="Gross margin" value={formatPct(k.grossMarginLatestPct)} hint="Latest period" />
        <Kpi label="EBITDA (latest)" value={formatMoney(k.ebitdaLatest, currency, unit)} tone={k.ebitdaLatest != null && k.ebitdaLatest >= 0 ? "up" : "down"} />
        <Kpi label="Rule of 40" value={formatNum(k.ruleOf40)} hint="≥40 = healthy" tone={k.ruleOf40 != null && k.ruleOf40 >= 40 ? "up" : "default"} />
        <Kpi label="Burn multiple" value={formatX(k.burnMultiple)} hint="<1 = efficient" tone={k.burnMultiple != null && k.burnMultiple < 1 ? "up" : "default"} />
      </div>

      {/* Growth chart */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Revenue, EBITDA & Net income" note={`${currencyPrefix(currency)} ${unitSuffix(unit)} · per period`}>
          <ComposedChart data={growthData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="period" stroke={CHART_MUTED} fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke={CHART_MUTED} fontSize={11} tickLine={false} axisLine={false} width={48} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Revenue" fill={CHART_BLUE} radius={[4, 4, 0, 0]} maxBarSize={42} />
            <Line dataKey="EBITDA" stroke={CHART_INK} strokeWidth={2} dot={{ r: 3 }} />
            <Line dataKey="Net income" stroke={CHART_RED} strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ChartCard>

        {hasMargin && (
          <ChartCard title="Margin expansion" note="% · gross & EBITDA margin">
            <LineChart data={marginData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="period" stroke={CHART_MUTED} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke={CHART_MUTED} fontSize={11} tickLine={false} axisLine={false} width={40} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line dataKey="Gross %" stroke={CHART_BLUE} strokeWidth={2} dot={{ r: 3 }} />
              <Line dataKey="EBITDA %" stroke={CHART_INK} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ChartCard>
        )}
      </div>

      {/* Cash health */}
      {hasCash && (
        <div>
          <h3 className="text-lg font-bold tracking-tight text-foreground">Cash health</h3>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ChartCard title="Cash flow: operating, investing & financing" note={`${currencyPrefix(currency)} ${unitSuffix(unit)} · per period`}>
                <ComposedChart data={cashData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="period" stroke={CHART_MUTED} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke={CHART_MUTED} fontSize={11} tickLine={false} axisLine={false} width={48} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Operating" fill={CHART_BLUE} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="Investing" fill={CHART_MUTED} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="Financing" fill={CHART_INK} radius={[4, 4, 0, 0]} maxBarSize={28} />
                </ComposedChart>
              </ChartCard>
            </div>
            <div className="grid gap-4">
              <Kpi label="Ending cash" value={formatMoney(k.endingCash, currency, unit)} />
              <Kpi label="Total funding" value={formatMoney(k.totalFunding, currency, unit)} />
              <Kpi label="Capital efficiency" value={formatX(k.capitalEfficiency)} hint="Revenue / funding" />
            </div>
          </div>
        </div>
      )}

      {/* Unit economics */}
      {(model.unitEconomics.length > 0 || model.customCards.length > 0) && (
        <div>
          <h3 className="text-lg font-bold tracking-tight text-foreground">Unit economics</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {model.unitEconomics.map((c) => (
              <MetricCard key={c.id} card={c} />
            ))}
            {model.customCards.map((c) => (
              <MetricCard key={c.id} card={c} />
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {model.insights.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-clean">
          <h4 className="mono-label text-muted-foreground">Analyst notes</h4>
          <ul className="mt-3 space-y-2">
            {model.insights.map((it, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                {it}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Verdict — dark moment */}
      <div className="rounded-3xl bg-foreground p-6 text-background sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[200px_1fr] lg:items-center">
          <div>
            <p className="mono-label text-background/50">Financial score</p>
            <p className="mono-num mt-2 text-6xl font-bold leading-none tracking-tight text-primary">
              {model.verdict.score}
              <span className="text-2xl text-background/40">/100</span>
            </p>
          </div>
          <div>
            {model.verdict.headline && (
              <h3 className="text-xl font-bold tracking-tight">{model.verdict.headline}</h3>
            )}
            {model.verdict.narrative && (
              <p className="mt-2 text-sm leading-relaxed text-background/70">{model.verdict.narrative}</p>
            )}
            {model.verdict.risks.length > 0 && (
              <div className="mt-5">
                <p className="mono-label flex items-center gap-2 text-background">
                  <AlertTriangle className="h-3.5 w-3.5 text-primary" /> Due diligence risks
                </p>
                <ul className="mt-3 space-y-2">
                  {model.verdict.risks.map((r, i) => (
                    <li key={i} className="flex gap-2 text-sm text-background/75">
                      <span className="text-primary">›</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function lastNonNull(arr: (number | null)[]): number | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] != null) return arr[i];
  }
  return null;
}

// ---------------- edit mode ----------------

const SERIES_ROWS: { key: keyof FinancialModel["series"]; label: string }[] = [
  { key: "revenue", label: "Revenue" },
  { key: "ebitda", label: "EBITDA" },
  { key: "netIncome", label: "Net income" },
  { key: "grossMarginPct", label: "Gross margin %" },
  { key: "ebitdaMarginPct", label: "EBITDA margin %" },
  { key: "ocf", label: "Operating CF" },
  { key: "icf", label: "Investing CF" },
  { key: "fcf", label: "Financing CF" },
];

const KPI_ROWS: { key: keyof FinancialModel["kpis"]; label: string }[] = [
  { key: "revenueCagrPct", label: "Revenue CAGR %" },
  { key: "grossMarginLatestPct", label: "Gross margin %" },
  { key: "ebitdaLatest", label: "EBITDA (latest)" },
  { key: "ruleOf40", label: "Rule of 40" },
  { key: "burnMultiple", label: "Burn multiple" },
  { key: "paybackMonths", label: "Payback (months)" },
  { key: "endingCash", label: "Ending cash" },
  { key: "totalFunding", label: "Total funding" },
  { key: "capitalEfficiency", label: "Capital efficiency" },
];

function numInput(value: number | null): string {
  return value == null ? "" : String(value);
}
function parseNum(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function FinancialEditor({
  startupId,
  initial,
  onCancel,
  onSaved,
}: {
  startupId: string;
  initial: FinancialModel;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [m, setM] = useState<FinancialModel>(structuredClone(initial));
  const [saving, setSaving] = useState(false);

  function setSeries(key: keyof FinancialModel["series"], idx: number, val: string) {
    setM((prev) => {
      const arr = [...prev.series[key]];
      arr[idx] = parseNum(val);
      return { ...prev, series: { ...prev.series, [key]: arr } };
    });
  }
  function setKpi(key: keyof FinancialModel["kpis"], val: string) {
    setM((prev) => ({ ...prev, kpis: { ...prev.kpis, [key]: parseNum(val) } }));
  }
  function setPeriod(idx: number, patch: Partial<FinancialModel["periods"][number]>) {
    setM((prev) => {
      const periods = prev.periods.map((p, i) => (i === idx ? { ...p, ...patch } : p));
      return { ...prev, periods };
    });
  }
  function addPeriod() {
    setM((prev) => {
      if (prev.periods.length >= 5) return prev;
      const periods = [...prev.periods, { label: `Y${prev.periods.length + 1}`, kind: "projected" as const }];
      const grow = (a: (number | null)[]) => [...a, null];
      return {
        ...prev,
        periods,
        series: {
          revenue: grow(prev.series.revenue),
          ebitda: grow(prev.series.ebitda),
          netIncome: grow(prev.series.netIncome),
          grossMarginPct: grow(prev.series.grossMarginPct),
          ebitdaMarginPct: grow(prev.series.ebitdaMarginPct),
          ocf: grow(prev.series.ocf),
          icf: grow(prev.series.icf),
          fcf: grow(prev.series.fcf),
        },
      };
    });
  }
  function removePeriod(idx: number) {
    setM((prev) => {
      if (prev.periods.length <= 1) return prev;
      const drop = (a: (number | null)[]) => a.filter((_, i) => i !== idx);
      return {
        ...prev,
        periods: prev.periods.filter((_, i) => i !== idx),
        series: {
          revenue: drop(prev.series.revenue),
          ebitda: drop(prev.series.ebitda),
          netIncome: drop(prev.series.netIncome),
          grossMarginPct: drop(prev.series.grossMarginPct),
          ebitdaMarginPct: drop(prev.series.ebitdaMarginPct),
          ocf: drop(prev.series.ocf),
          icf: drop(prev.series.icf),
          fcf: drop(prev.series.fcf),
        },
      };
    });
  }

  function updateCard(
    kind: "unitEconomics" | "customCards",
    id: string,
    patch: Partial<FinancialCard>,
  ) {
    setM((prev) => ({
      ...prev,
      [kind]: prev[kind].map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }
  function addCard(kind: "unitEconomics" | "customCards") {
    setM((prev) => ({
      ...prev,
      [kind]: [...prev[kind], { id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, label: "", value: "", unit: "", note: "" }],
    }));
  }
  function removeCard(kind: "unitEconomics" | "customCards", id: string) {
    setM((prev) => ({ ...prev, [kind]: prev[kind].filter((c) => c.id !== id) }));
  }

  async function save() {
    setSaving(true);
    try {
      const cleaned: FinancialModel = {
        ...m,
        unitEconomics: m.unitEconomics.filter((c) => c.label.trim()),
        customCards: m.customCards.filter((c) => c.label.trim()),
        insights: m.insights.map((s) => s.trim()).filter(Boolean),
        verdict: { ...m.verdict, risks: m.verdict.risks.map((s) => s.trim()).filter(Boolean) },
      };
      await saveFinancialModel({ data: { id: startupId, model: cleaned } });
      toast.success("Financial dashboard saved.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* currency + unit */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-5 shadow-clean">
        <div>
          <label className="mono-label text-muted-foreground">Currency</label>
          <Select value={m.currency} onValueChange={(v) => setM((p) => ({ ...p, currency: v as FinancialCurrency }))}>
            <SelectTrigger className="mt-1.5 h-9 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="IDR">IDR (Rp)</SelectItem>
              <SelectItem value="USD">USD ($)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mono-label text-muted-foreground">Magnitude</label>
          <Select value={m.unit} onValueChange={(v) => setM((p) => ({ ...p, unit: v as FinancialUnit }))}>
            <SelectTrigger className="mt-1.5 h-9 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="juta">Juta (millions)</SelectItem>
              <SelectItem value="ribu">Ribu (thousands)</SelectItem>
              <SelectItem value="penuh">Penuh (full)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* periods + series table */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card p-5 shadow-clean">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold tracking-tight text-foreground">Periods & series</h4>
          <Button variant="outline" size="sm" onClick={addPeriod} disabled={m.periods.length >= 5}>
            <Plus className="h-4 w-4" /> Add period
          </Button>
        </div>
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-40" />
              {m.periods.map((p, i) => (
                <th key={i} className="px-1 pb-2 align-bottom">
                  <div className="space-y-1.5">
                    <Input
                      value={p.label}
                      onChange={(e) => setPeriod(i, { label: e.target.value })}
                      className="h-8 w-24 text-center"
                    />
                    <div className="flex items-center gap-1">
                      <Select value={p.kind} onValueChange={(v) => setPeriod(i, { kind: v as "actual" | "projected" })}>
                        <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="actual">Actual</SelectItem>
                          <SelectItem value="projected">Projected</SelectItem>
                        </SelectContent>
                      </Select>
                      {m.periods.length > 1 && (
                        <button type="button" onClick={() => removePeriod(i)} className="text-muted-foreground hover:text-destructive">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SERIES_ROWS.map((row) => (
              <tr key={row.key} className="border-t border-border">
                <td className="py-1.5 pr-2 text-muted-foreground">{row.label}</td>
                {m.periods.map((_, i) => (
                  <td key={i} className="px-1 py-1.5">
                    <Input
                      value={numInput(m.series[row.key][i] ?? null)}
                      onChange={(e) => setSeries(row.key, i, e.target.value)}
                      inputMode="decimal"
                      className="mono-num h-8 w-24 text-right"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* KPIs */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-clean">
        <h4 className="text-sm font-bold tracking-tight text-foreground">Key metrics</h4>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {KPI_ROWS.map((row) => (
            <div key={row.key}>
              <label className="mono-label text-muted-foreground">{row.label}</label>
              <Input
                value={numInput(m.kpis[row.key])}
                onChange={(e) => setKpi(row.key, e.target.value)}
                inputMode="decimal"
                className="mono-num mt-1.5 h-9"
              />
            </div>
          ))}
        </div>
      </div>

      {/* unit economics + custom cards */}
      {(["unitEconomics", "customCards"] as const).map((kind) => (
        <div key={kind} className="rounded-2xl border border-border bg-card p-5 shadow-clean">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold tracking-tight text-foreground">
              {kind === "unitEconomics" ? "Unit economics" : "Custom cards"}
            </h4>
            <Button variant="outline" size="sm" onClick={() => addCard(kind)}>
              <Plus className="h-4 w-4" /> Add card
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {m[kind].length === 0 && (
              <p className="text-sm text-muted-foreground">No cards yet.</p>
            )}
            {m[kind].map((c) => (
              <div key={c.id} className="grid gap-2 rounded-xl border border-border bg-mist p-3 sm:grid-cols-[1.4fr_1fr_0.7fr_1.6fr_auto]">
                <Input placeholder="Label" value={c.label} onChange={(e) => updateCard(kind, c.id, { label: e.target.value })} className="h-9" />
                <Input placeholder="Value" value={c.value} onChange={(e) => updateCard(kind, c.id, { value: e.target.value })} className="h-9" />
                <Input placeholder="Unit" value={c.unit ?? ""} onChange={(e) => updateCard(kind, c.id, { unit: e.target.value })} className="h-9" />
                <Input placeholder="Note" value={c.note ?? ""} onChange={(e) => updateCard(kind, c.id, { note: e.target.value })} className="h-9" />
                <button type="button" onClick={() => removeCard(kind, c.id)} className="flex items-center justify-center text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* verdict */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-clean">
        <h4 className="text-sm font-bold tracking-tight text-foreground">Verdict</h4>
        <div className="mt-4 space-y-4">
          <div>
            <div className="flex items-baseline justify-between">
              <label className="mono-label text-muted-foreground">Financial score</label>
              <span className="mono-num text-sm font-semibold text-foreground">{m.verdict.score}/100</span>
            </div>
            <Slider
              className="mt-3"
              min={0}
              max={100}
              step={1}
              value={[m.verdict.score]}
              onValueChange={(v) => setM((p) => ({ ...p, verdict: { ...p.verdict, score: v[0] } }))}
            />
          </div>
          <div>
            <label className="mono-label text-muted-foreground">Headline</label>
            <Input
              value={m.verdict.headline}
              onChange={(e) => setM((p) => ({ ...p, verdict: { ...p.verdict, headline: e.target.value } }))}
              className="mt-1.5 h-9"
              maxLength={160}
            />
          </div>
          <div>
            <label className="mono-label text-muted-foreground">Narrative</label>
            <Textarea
              value={m.verdict.narrative}
              onChange={(e) => setM((p) => ({ ...p, verdict: { ...p.verdict, narrative: e.target.value } }))}
              className="mt-1.5 min-h-20"
              maxLength={800}
            />
          </div>
          <div>
            <label className="mono-label text-muted-foreground">Risks (one per line)</label>
            <Textarea
              value={m.verdict.risks.join("\n")}
              onChange={(e) => setM((p) => ({ ...p, verdict: { ...p.verdict, risks: e.target.value.split("\n") } }))}
              className="mt-1.5 min-h-24"
            />
          </div>
          <div>
            <label className="mono-label text-muted-foreground">Analyst notes (one per line)</label>
            <Textarea
              value={m.insights.join("\n")}
              onChange={(e) => setM((p) => ({ ...p, insights: e.target.value.split("\n") }))}
              className="mt-1.5 min-h-20"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save dashboard
        </Button>
      </div>
    </div>
  );
}

// ---------------- empty model factory ----------------

function emptyModel(): FinancialModel {
  const periods = [
    { label: "Y1", kind: "actual" as const },
    { label: "Y2", kind: "actual" as const },
    { label: "Y3", kind: "projected" as const },
  ];
  const blank = () => periods.map(() => null);
  return {
    currency: "IDR",
    unit: "juta",
    periods,
    series: {
      revenue: blank(),
      ebitda: blank(),
      netIncome: blank(),
      grossMarginPct: blank(),
      ebitdaMarginPct: blank(),
      ocf: blank(),
      icf: blank(),
      fcf: blank(),
    },
    kpis: {
      revenueCagrPct: null,
      grossMarginLatestPct: null,
      ebitdaLatest: null,
      ruleOf40: null,
      burnMultiple: null,
      paybackMonths: null,
      endingCash: null,
      totalFunding: null,
      capitalEfficiency: null,
    },
    unitEconomics: [],
    customCards: [],
    verdict: { score: 0, headline: "", narrative: "", risks: [] },
    insights: [],
  };
}

// ---------------- container ----------------

export function FinancialDashboard({
  startupId,
  model,
  status,
  error,
  generatedAt,
  hasReport,
  isAdmin,
  onRefresh,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genCurrency, setGenCurrency] = useState<FinancialCurrency>(model?.currency ?? "IDR");
  const [genUnit, setGenUnit] = useState<FinancialUnit>(model?.unit ?? "juta");

  const generatedLabel = useMemo(() => {
    if (!generatedAt) return null;
    try {
      return new Date(generatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return null;
    }
  }, [generatedAt]);

  async function generate() {
    setGenerating(true);
    try {
      await generateFinancialModel({ data: { id: startupId, currency: genCurrency, unit: genUnit } });
      toast.success("Financial dashboard generated.");
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate dashboard");
    } finally {
      setGenerating(false);
    }
  }

  if (editing) {
    return (
      <FinancialEditor
        startupId={startupId}
        initial={model ?? emptyModel()}
        onCancel={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          onRefresh();
        }}
      />
    );
  }

  // Empty state.
  if (!model) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-clean">
        <Sparkles className="mx-auto h-7 w-7 text-primary" />
        <h3 className="mt-3 text-lg font-bold tracking-tight text-foreground">No financial dashboard yet</h3>
        {isAdmin ? (
          <>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {hasReport
                ? "Generate the dashboard from the uploaded financial report, then fine-tune the numbers."
                : "Upload a financial report (Excel/CSV/PDF) in the header above, then generate the dashboard."}
            </p>
            {status === "error" && error && (
              <p className="mx-auto mt-3 max-w-md text-sm text-destructive">{error}</p>
            )}
            <div className="mt-5 flex flex-wrap items-end justify-center gap-3">
              <div className="text-left">
                <label className="mono-label text-muted-foreground">Currency</label>
                <Select value={genCurrency} onValueChange={(v) => setGenCurrency(v as FinancialCurrency)}>
                  <SelectTrigger className="mt-1.5 h-9 w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IDR">IDR (Rp)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-left">
                <label className="mono-label text-muted-foreground">Magnitude</label>
                <Select value={genUnit} onValueChange={(v) => setGenUnit(v as FinancialUnit)}>
                  <SelectTrigger className="mt-1.5 h-9 w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="juta">Juta</SelectItem>
                    <SelectItem value="ribu">Ribu</SelectItem>
                    <SelectItem value="penuh">Penuh</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={generate} disabled={generating || !hasReport}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate with AI
              </Button>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> Enter manually
              </Button>
            </div>
          </>
        ) : (
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            The financial dashboard for this startup has not been published yet.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="mono-label text-muted-foreground">
            {generatedLabel ? `Last updated ${generatedLabel}` : "Financial dashboard"}
          </p>
          <div className="flex items-center gap-2">
            {hasReport && (
              <Button variant="outline" size="sm" onClick={generate} disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Re-run AI
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          </div>
        </div>
      )}
      {status === "error" && error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <FinancialView model={model} />
    </div>
  );
}
