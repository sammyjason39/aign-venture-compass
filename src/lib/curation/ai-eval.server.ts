// Server-only: call Lovable AI Gateway to evaluate a startup against the rubric.
import { CATEGORIES, RECOMMENDATIONS } from "./rubric";
import { ARCHETYPES } from "./archetypes";
import type { AiEvaluation, ArchetypeId, CategoryId, RecommendationId } from "./types";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

interface EvalInput {
  name: string;
  oneLiner?: string | null;
  sector?: string | null;
  description: string;
  /** Extra extracted text (deck slides, transcript). */
  extraText?: string;
  /** Optional PDF deck as base64 for multimodal reading. */
  pdf?: { base64: string; name: string };
}

const VALID_ARCHETYPES = ARCHETYPES.map((a) => a.id);
const VALID_RECS = Object.keys(RECOMMENDATIONS) as RecommendationId[];
const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

function buildSystemPrompt(): string {
  const rubric = CATEGORIES.map(
    (c) => `- ${c.id} ("${c.label}", weight ${c.weight}%): ${c.helper}`,
  ).join("\n");
  const archetypes = ARCHETYPES.map((a) => `- ${a.id}: ${a.name} — ${a.description}`).join("\n");
  const recs = Object.values(RECOMMENDATIONS)
    .map((r) => `- ${r.id}: ${r.label} (${r.range}) — ${r.description}`)
    .join("\n");

  return `You are a senior venture analyst for AIGN, evaluating AI startups entering the AIGN / Arta Graha ecosystem.

Classify the startup into exactly one archetype:
${archetypes}

Score each of these nine factors on an integer scale from 1 (very weak) to 10 (exceptional):
${rubric}

Map the overall fit to one recommendation:
${recs}

Be rigorous and evidence-based. When information is missing, score conservatively and note it. Respond ONLY with a single JSON object — no markdown, no commentary.`;
}

const RESPONSE_SHAPE = `{
  "archetype": "one of the archetype ids",
  "archetypeConfidence": 0-100 integer,
  "scores": { ${CATEGORY_IDS.map((id) => `"${id}": 1-10`).join(", ")} },
  "summary": "3-5 sentence executive summary of the venture and its fit with AIGN",
  "strengths": ["3-5 concise strengths"],
  "weaknesses": ["2-4 concise weaknesses"],
  "risks": ["2-4 concrete risks"],
  "recommendation": "one of the recommendation ids"
}`;

function clampScore(v: unknown): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 5;
  return Math.min(10, Math.max(1, n));
}

function coerce(raw: Record<string, unknown>): AiEvaluation {
  const archetype = (VALID_ARCHETYPES as string[]).includes(String(raw.archetype))
    ? (raw.archetype as ArchetypeId)
    : "enterprise";
  const recommendation = (VALID_RECS as string[]).includes(String(raw.recommendation))
    ? (raw.recommendation as RecommendationId)
    : "watchlist";

  const rawScores = (raw.scores ?? {}) as Record<string, unknown>;
  const scores = {} as Record<CategoryId, number>;
  for (const id of CATEGORY_IDS) scores[id] = clampScore(rawScores[id]);

  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];

  let conf = Math.round(Number(raw.archetypeConfidence));
  if (!Number.isFinite(conf)) conf = 60;
  conf = Math.min(100, Math.max(0, conf));

  return {
    archetype,
    archetypeConfidence: conf,
    scores,
    summary: String(raw.summary ?? "").trim(),
    strengths: arr(raw.strengths),
    weaknesses: arr(raw.weaknesses),
    risks: arr(raw.risks),
    recommendation,
  };
}

export async function evaluateWithAi(input: EvalInput): Promise<AiEvaluation> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

  const parts = [
    `Startup name: ${input.name}`,
    input.oneLiner ? `One-liner: ${input.oneLiner}` : "",
    input.sector ? `Sector: ${input.sector}` : "",
    "",
    "Description and notes:",
    input.description || "(none provided)",
    input.extraText ? `\nAdditional extracted material:\n${input.extraText}` : "",
    "",
    `Return JSON in exactly this shape:\n${RESPONSE_SHAPE}`,
  ].filter(Boolean);

  const userContent: unknown[] = [{ type: "text", text: parts.join("\n") }];
  if (input.pdf) {
    userContent.push({
      type: "file",
      file: {
        filename: input.pdf.name,
        file_data: `data:application/pdf;base64,${input.pdf.base64}`,
      },
    });
  }

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
  return coerce(parsed);
}
