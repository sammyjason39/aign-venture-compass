// Server-only: call Lovable AI Gateway to read a financial-report PDF and
// produce a structured financial dashboard for a startup.
import type { FinancialData, FinancialMetric } from "./types";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

interface FinancialEvalInput {
  /** Financial-report PDF as base64 for multimodal reading. */
  pdf: { base64: string; name: string; mime: string };
}

const RESPONSE_SHAPE = `{
  "currency": "ISO currency code or '-'",
  "asOf": "reporting period the figures relate to, e.g. 'FY2024' or '-'",
  "revenue": {
    "arr": "Annual Recurring Revenue or '-'",
    "mrr": "Monthly Recurring Revenue or '-'",
    "latestRevenue": "most recent period revenue or '-'",
    "growthYoY": "year-over-year revenue growth, e.g. '+120%' or '-'",
    "growthMoM": "month-over-month revenue growth or '-'",
    "burnRate": "monthly net burn or '-'",
    "runwayMonths": "cash runway in months, e.g. '14 months' or '-'",
    "grossMargin": "gross margin percent or '-'",
    "cashPosition": "cash on hand or '-'",
    "fundingRaised": "total funding raised to date or '-'"
  },
  "unitEconomics": {
    "cac": "customer acquisition cost or '-'",
    "ltv": "customer lifetime value or '-'",
    "ltvCacRatio": "LTV to CAC ratio, e.g. '3.2x' or '-'",
    "paybackMonths": "CAC payback period in months or '-'",
    "churn": "churn rate or '-'"
  },
  "profitability": {
    "revenue": "total revenue or '-'",
    "cogs": "cost of goods sold or '-'",
    "grossProfit": "gross profit or '-'",
    "netProfit": "net profit/loss or '-'",
    "ebitda": "EBITDA or '-'",
    "expenseBreakdown": [{ "label": "expense category", "value": "amount" }]
  },
  "highlights": ["3-5 concise financial highlights"],
  "redFlags": ["2-4 financial red flags or concerns"],
  "notes": "1-3 sentence analyst note on the company's financial health"
}`;

function buildSystemPrompt(): string {
  return `You are a senior venture finance analyst for AIGN / Arta Graha. You are given a startup's financial report (PDF).

Extract a precise, structured financial dashboard from the document. Rules:
- Only use figures that are actually present in or directly derivable from the document.
- Never invent or estimate numbers. If a value is not available, return exactly "-".
- Keep monetary values formatted with their currency/units as they appear (e.g. "$1.2M", "Rp 4.5B").
- Be concise. Respond ONLY with a single JSON object — no markdown, no commentary.`;
}

function str(v: unknown): string {
  if (v == null) return "-";
  const s = String(v).trim();
  return s.length ? s : "-";
}

function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
}

function breakdown(v: unknown): FinancialMetric[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((row) => {
      const r = (row ?? {}) as Record<string, unknown>;
      return { label: str(r.label), value: str(r.value) };
    })
    .filter((m) => m.label !== "-" || m.value !== "-");
}

function coerce(raw: Record<string, unknown>): FinancialData {
  const rev = (raw.revenue ?? {}) as Record<string, unknown>;
  const ue = (raw.unitEconomics ?? {}) as Record<string, unknown>;
  const pl = (raw.profitability ?? {}) as Record<string, unknown>;

  return {
    currency: str(raw.currency),
    asOf: str(raw.asOf),
    revenue: {
      arr: str(rev.arr),
      mrr: str(rev.mrr),
      latestRevenue: str(rev.latestRevenue),
      growthYoY: str(rev.growthYoY),
      growthMoM: str(rev.growthMoM),
      burnRate: str(rev.burnRate),
      runwayMonths: str(rev.runwayMonths),
      grossMargin: str(rev.grossMargin),
      cashPosition: str(rev.cashPosition),
      fundingRaised: str(rev.fundingRaised),
    },
    unitEconomics: {
      cac: str(ue.cac),
      ltv: str(ue.ltv),
      ltvCacRatio: str(ue.ltvCacRatio),
      paybackMonths: str(ue.paybackMonths),
      churn: str(ue.churn),
    },
    profitability: {
      revenue: str(pl.revenue),
      cogs: str(pl.cogs),
      grossProfit: str(pl.grossProfit),
      netProfit: str(pl.netProfit),
      ebitda: str(pl.ebitda),
      expenseBreakdown: breakdown(pl.expenseBreakdown),
    },
    highlights: arr(raw.highlights),
    redFlags: arr(raw.redFlags),
    notes: str(raw.notes) === "-" ? "" : str(raw.notes),
  };
}

export async function evaluateFinancialsWithAi(
  input: FinancialEvalInput,
): Promise<{ data: FinancialData; summary: string }> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

  const mime = input.pdf.mime || "application/pdf";
  const userContent: unknown[] = [
    {
      type: "text",
      text: `Read the attached financial report and return JSON in exactly this shape:\n${RESPONSE_SHAPE}`,
    },
    {
      type: "file",
      file: {
        filename: input.pdf.name,
        file_data: `data:${mime};base64,${input.pdf.base64}`,
      },
    },
  ];

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) {
    throw new Error("AI rate limit reached. Please try again in a moment.");
  }
  if (res.status === 402) {
    throw new Error("AI credits exhausted. Add credits in workspace settings to continue.");
  }
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`AI gateway error ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content ?? "";
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI returned an unparseable response.");
    parsed = JSON.parse(match[0]);
  }
  const financial = coerce(parsed);
  return { data: financial, summary: financial.notes };
}
