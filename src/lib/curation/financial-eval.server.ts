// Server-only: call Lovable AI Gateway to translate a financial workbook into a
// structured FinancialModel (KPIs, YoY series, unit economics, verdict).
import type {
  FinancialCard,
  FinancialCurrency,
  FinancialModel,
  FinancialPeriod,
  FinancialUnit,
  FinancialVerdict,
} from "./types";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

interface FinancialEvalInput {
  name: string;
  sector?: string | null;
  description?: string | null;
  /** Plain text extracted from the spreadsheet. */
  spreadsheetText?: string;
  /** Optional PDF (base64) when the report is a PDF rather than a workbook. */
  pdf?: { base64: string; name: string };
  /** Currency hint chosen by the admin. */
  currency?: FinancialCurrency;
  unit?: FinancialUnit;
}

const RESPONSE_SHAPE = `{
  "currency": "IDR" | "USD",
  "unit": "juta" | "ribu" | "penuh",   // magnitude ALL numeric series use
  "periods": [{ "label": "2024", "kind": "actual" | "projected" }],  // 2 to 5 entries, chronological
  "series": {
    "revenue": [number|null, ...],      // same length & order as periods
    "ebitda": [number|null, ...],
    "netIncome": [number|null, ...],
    "grossMarginPct": [number|null, ...],   // percentages 0-100
    "ebitdaMarginPct": [number|null, ...],
    "ocf": [number|null, ...],          // operating cash flow
    "icf": [number|null, ...],          // investing cash flow (usually negative)
    "fcf": [number|null, ...]           // financing cash flow
  },
  "kpis": {
    "revenueCagrPct": number|null,
    "grossMarginLatestPct": number|null,
    "ebitdaLatest": number|null,
    "ruleOf40": number|null,
    "burnMultiple": number|null,
    "paybackMonths": number|null,
    "endingCash": number|null,
    "totalFunding": number|null,
    "capitalEfficiency": number|null
  },
  "unitEconomics": [{ "label": "Revenue / unit", "value": "79.1", "unit": "jt", "note": "per cycle" }],
  "verdict": { "score": 0-100 integer, "headline": "short verdict", "narrative": "2-3 sentences", "risks": ["due diligence risks"] },
  "insights": ["short extra observations"]
}`;

function buildSystemPrompt(currency: FinancialCurrency): string {
  const unitGuidance =
    currency === "USD"
      ? `- Currency is USD. Use English short suffixes for the "unit" field on cards: "K" (thousand), "M" (million), "x" (multiple), "mo" (months), "%". NEVER use Indonesian words like "ribu" or "juta".`
      : `- Currency is IDR. Use Indonesian short suffixes for the "unit" field on cards: "rb" (ribu/thousand), "jt" (juta/million), "x", "bln", "%". Do not spell out full words.`;
  return `You are a senior venture / investment analyst translating a startup's financial statements into an investor-grade dashboard model.

Rules:
- Read the income statement, cash flow and balance sheet data provided.
- Output 2 to 5 periods (years), chronological (oldest first). Mark each period actual or projected based on the data.
- ALL numeric series must use the SAME magnitude/unit. Prefer "juta" (millions) for IDR. Keep the chosen "unit" consistent.
- Compute metrics yourself when derivable: revenue CAGR (first->last), gross & EBITDA margins, Rule of 40 (latest YoY revenue growth % + latest EBITDA margin %), burn multiple (net burn / net new revenue), payback months, capital efficiency (total revenue / total funding).
- Use null for any value that cannot be derived from the data. NEVER invent precise numbers that aren't supported.
- unitEconomics: 3-6 cards that fit the startup's sector (e.g. agritech: per greenhouse/cycle; SaaS: CAC, LTV, ARPU). value is a string number, unit is a short suffix.
${unitGuidance}
- verdict: a 0-100 financial attractiveness score, a short headline, a 2-3 sentence narrative, and concrete due-diligence risks.
- Respond ONLY with a single JSON object, no markdown, no commentary.`;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function numArray(v: unknown, len: number): (number | null)[] {
  const arr = Array.isArray(v) ? v.map(num) : [];
  const out = arr.slice(0, len);
  while (out.length < len) out.push(null);
  return out;
}

function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
}

let cardSeq = 0;
function coerceCards(v: unknown): FinancialCard[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((raw): FinancialCard | null => {
      const r = (raw ?? {}) as Record<string, unknown>;
      const label = String(r.label ?? "").trim();
      if (!label) return null;
      return {
        id: `ue-${Date.now()}-${cardSeq++}`,
        label: label.slice(0, 60),
        value: String(r.value ?? "").trim().slice(0, 40),
        unit: r.unit ? String(r.unit).trim().slice(0, 16) : undefined,
        note: r.note ? String(r.note).trim().slice(0, 120) : undefined,
      };
    })
    .filter((c): c is FinancialCard => c !== null)
    .slice(0, 8);
}

function coerce(
  raw: Record<string, unknown>,
  fallback: { currency: FinancialCurrency; unit: FinancialUnit },
): FinancialModel {
  const currency: FinancialCurrency = raw.currency === "USD" ? "USD" : raw.currency === "IDR" ? "IDR" : fallback.currency;
  const unit: FinancialUnit =
    raw.unit === "juta" || raw.unit === "ribu" || raw.unit === "penuh"
      ? (raw.unit as FinancialUnit)
      : fallback.unit;

  const rawPeriods = Array.isArray(raw.periods) ? raw.periods : [];
  let periods: FinancialPeriod[] = rawPeriods
    .map((p): FinancialPeriod | null => {
      const r = (p ?? {}) as Record<string, unknown>;
      const label = String(r.label ?? "").trim();
      if (!label) return null;
      return { label: label.slice(0, 24), kind: r.kind === "projected" ? "projected" : "actual" };
    })
    .filter((p): p is FinancialPeriod => p !== null)
    .slice(0, 5);
  if (periods.length === 0) periods = [{ label: "Y1", kind: "actual" }];
  const len = periods.length;

  const s = (raw.series ?? {}) as Record<string, unknown>;
  const k = (raw.kpis ?? {}) as Record<string, unknown>;
  const v = (raw.verdict ?? {}) as Record<string, unknown>;

  let score = Math.round(Number(v.score));
  if (!Number.isFinite(score)) score = 0;
  score = Math.min(100, Math.max(0, score));

  const verdict: FinancialVerdict = {
    score,
    headline: String(v.headline ?? "").trim().slice(0, 160),
    narrative: String(v.narrative ?? "").trim().slice(0, 800),
    risks: strArray(v.risks).slice(0, 8),
  };

  return {
    currency,
    unit,
    periods,
    series: {
      revenue: numArray(s.revenue, len),
      ebitda: numArray(s.ebitda, len),
      netIncome: numArray(s.netIncome, len),
      grossMarginPct: numArray(s.grossMarginPct, len),
      ebitdaMarginPct: numArray(s.ebitdaMarginPct, len),
      ocf: numArray(s.ocf, len),
      icf: numArray(s.icf, len),
      fcf: numArray(s.fcf, len),
    },
    kpis: {
      revenueCagrPct: num(k.revenueCagrPct),
      grossMarginLatestPct: num(k.grossMarginLatestPct),
      ebitdaLatest: num(k.ebitdaLatest),
      ruleOf40: num(k.ruleOf40),
      burnMultiple: num(k.burnMultiple),
      paybackMonths: num(k.paybackMonths),
      endingCash: num(k.endingCash),
      totalFunding: num(k.totalFunding),
      capitalEfficiency: num(k.capitalEfficiency),
    },
    unitEconomics: coerceCards(raw.unitEconomics),
    customCards: [],
    verdict,
    insights: strArray(raw.insights).slice(0, 8),
  };
}

import { callAi } from "./ai-client.server";

export async function buildFinancialModel(input: FinancialEvalInput, supabase?: any): Promise<FinancialModel> {
  const fallback = {
    currency: input.currency ?? "IDR",
    unit: input.unit ?? ("juta" as FinancialUnit),
  };

  const parts = [
    `Startup: ${input.name}`,
    input.sector ? `Sector: ${input.sector}` : "",
    fallback.currency ? `Preferred currency: ${fallback.currency}` : "",
    input.description ? `\nContext:\n${input.description}` : "",
    input.spreadsheetText ? `\nFinancial workbook (extracted):\n${input.spreadsheetText}` : "",
    "",
    `Return JSON in exactly this shape:\n${RESPONSE_SHAPE}`,
  ].filter(Boolean);

  const messages = [
    { role: "user", content: parts.join("\n") }
  ];

  const content = await callAi({
    supabase,
    messages,
    systemPrompt: buildSystemPrompt(fallback.currency),
    pdf: input.pdf,
  });

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI returned an unparseable response.");
    parsed = JSON.parse(match[0]);
  }
  return coerce(parsed, fallback);
}
