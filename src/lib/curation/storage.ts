import { getArchetype } from "./archetypes";
import { emptyForm } from "./form";
import { evaluateScores } from "./scoring";
import type { ArchetypeId, CategoryScores, Evaluation, ScoreValue } from "./types";

const STORAGE_KEY = "aign.curation.evaluations.v1";
const SEED_KEY = "aign.curation.seeded.v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function uid(): string {
  return `ev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function archetypeCriteriaScores(
  archetype: ArchetypeId,
  values: ScoreValue[],
): Record<string, ScoreValue> {
  const arch = getArchetype(archetype);
  const out: Record<string, ScoreValue> = {};
  arch.criteria.forEach((c, i) => {
    out[c.id] = values[i % values.length];
  });
  return out;
}

function mockEvaluation(
  startupName: string,
  archetype: ArchetypeId,
  scores: CategoryScores,
  archetypeValues: ScoreValue[],
  daysAgo: number,
  form: Partial<Record<string, string>> = {},
): Evaluation {
  const created = new Date(Date.now() - daysAgo * 86400000).toISOString();
  return {
    id: uid(),
    startupName,
    createdAt: created,
    updatedAt: created,
    form: { ...emptyForm(), startupName, ...form },
    archetype,
    archetypeConfidence: 78,
    scores,
    archetypeScores: archetypeCriteriaScores(archetype, archetypeValues),
  };
}

const s = (
  problemMarket: ScoreValue,
  aiRelevance: ScoreValue,
  businessModel: ScoreValue,
  moat: ScoreValue,
  founderExecution: ScoreValue,
  ecosystemFit: ScoreValue,
  prestige: ScoreValue,
  socialImpact: ScoreValue,
  transformational: ScoreValue,
): CategoryScores => ({
  problemMarket,
  aiRelevance,
  businessModel,
  moat,
  founderExecution,
  ecosystemFit,
  prestige,
  socialImpact,
  transformational,
});

function seedData(): Evaluation[] {
  return [
    mockEvaluation("Lindra Agents", "agent", s(5, 5, 4, 4, 5, 5, 4, 4, 5), [5, 4, 5, 4, 4, 5], 2, {
      sector: "Enterprise operations",
      oneLiner: "AI agents that automate back-office finance workflows end to end.",
    }),
    mockEvaluation("Halora Health", "vertical", s(5, 4, 4, 4, 4, 5, 4, 5, 5), [5, 5, 4, 4, 4, 5], 6, {
      sector: "Healthcare",
      oneLiner: "An AI-first telehealth platform for Southeast Asia.",
    }),
    mockEvaluation("Mistralis Infra", "foundation", s(4, 5, 3, 5, 4, 3, 5, 3, 5), [5, 5, 4, 3, 4, 5], 9, {
      sector: "AI infrastructure",
      oneLiner: "Sovereign LLM inference infrastructure for regulated industries.",
    }),
    mockEvaluation("Kanva Studio", "creative", s(4, 4, 3, 2, 3, 3, 3, 3, 3), [4, 4, 3, 4, 3, 3], 12, {
      sector: "Creative tools",
      oneLiner: "AI brand-content studio for SME marketing teams.",
    }),
    mockEvaluation("Nuswa Super", "super_app", s(4, 3, 3, 4, 3, 5, 4, 4, 4), [4, 4, 3, 4, 4, 5], 15, {
      sector: "Consumer platform",
      oneLiner: "An AI super app bundling commerce, mobility, and payments.",
    }),
    mockEvaluation("Praja Copilot", "enterprise", s(4, 4, 4, 3, 4, 4, 3, 4, 3), [4, 4, 3, 4, 3, 4], 19, {
      sector: "Enterprise SaaS",
      oneLiner: "A compliance copilot for Indonesian financial institutions.",
    }),
    mockEvaluation("Tutorin", "consumer", s(3, 3, 2, 2, 3, 2, 2, 4, 3), [3, 3, 3, 3, 3, 3], 24, {
      sector: "Consumer education",
      oneLiner: "A personalized AI tutor for high-school students.",
    }),
    mockEvaluation("Verdex", "agent", s(2, 2, 2, 1, 2, 2, 1, 2, 1), [2, 2, 1, 2, 2, 1], 30, {
      sector: "Legal tech",
      oneLiner: "An AI wrapper for legal document drafting.",
    }),
  ];
}

function read(): Evaluation[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Evaluation[];
  } catch {
    return [];
  }
}

function write(list: Evaluation[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function ensureSeeded(): void {
  if (!isBrowser()) return;
  const seeded = window.localStorage.getItem(SEED_KEY);
  const existing = read();
  if (!seeded && existing.length === 0) {
    write(seedData());
    window.localStorage.setItem(SEED_KEY, "1");
  }
}

export function listEvaluations(): Evaluation[] {
  ensureSeeded();
  return read().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export function getEvaluation(id: string): Evaluation | undefined {
  return read().find((e) => e.id === id);
}

export function saveEvaluation(
  ev: Omit<Evaluation, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Evaluation {
  const list = read();
  const now = new Date().toISOString();
  if (ev.id) {
    const idx = list.findIndex((e) => e.id === ev.id);
    if (idx >= 0) {
      const updated: Evaluation = { ...list[idx], ...ev, id: ev.id, updatedAt: now };
      list[idx] = updated;
      write(list);
      return updated;
    }
  }
  const created: Evaluation = {
    ...ev,
    id: uid(),
    createdAt: now,
    updatedAt: now,
  };
  list.push(created);
  write(list);
  return created;
}

export function deleteEvaluation(id: string): void {
  write(read().filter((e) => e.id !== id));
}

export function evaluationResult(ev: Evaluation) {
  return evaluateScores(ev.startupName, ev.archetype, ev.scores, ev.archetypeScores);
}
