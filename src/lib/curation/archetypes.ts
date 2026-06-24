import type { ArchetypeId } from "./types";

export interface ArchetypeCriterion {
  id: string;
  label: string;
}

export interface ArchetypeDef {
  id: ArchetypeId;
  index: string; // "01"..
  name: string;
  inspiredBy: string;
  description: string;
  /** Unique archetype-specific criteria (scored 1–5). */
  criteria: ArchetypeCriterion[];
  /** Keywords used by the lightweight auto-classifier. */
  keywords: string[];
}

const crit = (label: string): ArchetypeCriterion => ({
  id: label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, ""),
  label,
});

export const ARCHETYPES: ArchetypeDef[] = [
  {
    id: "super_app",
    index: "01",
    name: "AI Super App / Ecosystem Platform",
    inspiredBy: "Gojek · Grab · WeChat",
    description:
      "A platform that connects multiple services, users, providers, and transactions into one ecosystem.",
    criteria: [
      crit("Supply-Demand Clarity"),
      crit("Network Effect"),
      crit("Transaction Frequency"),
      crit("Multi-Service Potential"),
      crit("Ecosystem Lock-in"),
      crit("AIGN Distribution Leverage"),
    ],
    keywords: ["super app", "ecosystem", "marketplace", "platform", "multi-service", "providers", "two-sided", "network"],
  },
  {
    id: "vertical",
    index: "02",
    name: "AI Vertical Platform",
    inspiredBy: "Traveloka · Halodoc · tiket.com",
    description:
      "A focused platform for one major industry vertical such as health, finance, property, education, travel, logistics, agriculture, or hospitality.",
    criteria: [
      crit("Vertical Focus"),
      crit("Pain Point Severity"),
      crit("Inventory / Partner Access"),
      crit("Repeat Transaction"),
      crit("AI Impact on Industry Workflow"),
      crit("AIGN Vertical Fit"),
    ],
    keywords: ["vertical", "health", "finance", "property", "education", "travel", "logistics", "agriculture", "hospitality", "industry"],
  },
  {
    id: "foundation",
    index: "03",
    name: "AI Foundation / Infrastructure",
    inspiredBy: "OpenAI · Anthropic · Mistral",
    description:
      "A deep-tech AI infrastructure company building models, APIs, agents, data infrastructure, deployment systems, or enterprise AI infrastructure.",
    criteria: [
      crit("Technical Depth"),
      crit("Data Advantage"),
      crit("Benchmark / Performance"),
      crit("Scalability Cost"),
      crit("Enterprise Readiness"),
      crit("Defensibility"),
    ],
    keywords: ["model", "infrastructure", "api", "foundation", "deep-tech", "deployment", "inference", "data infrastructure", "llm", "training"],
  },
  {
    id: "agent",
    index: "04",
    name: "AI Agent / Workflow Automation",
    inspiredBy: "Lindy · Zapier AI · Glean · Sierra",
    description:
      "A startup that automates specific business workflows using AI agents, integrations, and human-in-the-loop systems.",
    criteria: [
      crit("Workflow Clarity"),
      crit("ROI Measurement"),
      crit("System Integration"),
      crit("Human-in-the-loop"),
      crit("Deployment Readiness"),
      crit("Cross-Division Usage"),
    ],
    keywords: ["agent", "workflow", "automation", "integration", "rpa", "human-in-the-loop", "automate", "ops", "back office"],
  },
  {
    id: "creative",
    index: "05",
    name: "AI Creative / Prosumer Tool",
    inspiredBy: "Higgsfield · Runway · Canva AI · CapCut AI",
    description:
      "A creator or prosumer product that helps users generate, edit, design, produce, or scale creative output using AI.",
    criteria: [
      crit("Output Quality"),
      crit("Workflow Simplicity"),
      crit("Template / Style System"),
      crit("Viral Potential"),
      crit("Creator / Brand Use Case"),
      crit("Monetization"),
    ],
    keywords: ["creative", "creator", "design", "video", "image", "generate", "edit", "content", "prosumer", "brand"],
  },
  {
    id: "enterprise",
    index: "06",
    name: "AI Enterprise SaaS",
    inspiredBy: "Salesforce AI · Notion AI · Microsoft Copilot",
    description:
      "A B2B software product that helps companies improve productivity, decision-making, operations, sales, HR, finance, or data workflows.",
    criteria: [
      crit("Buyer Clarity"),
      crit("Budget Availability"),
      crit("Sales Cycle"),
      crit("Security & Compliance"),
      crit("Implementation Complexity"),
      crit("AIGN Pilot Potential"),
    ],
    keywords: ["enterprise", "b2b", "saas", "productivity", "sales", "hr", "finance", "operations", "decision", "team"],
  },
  {
    id: "consumer",
    index: "07",
    name: "AI Consumer App",
    inspiredBy: "ChatGPT · Character AI · Duolingo AI",
    description:
      "A mass-market AI application designed for individual users with strong habit, retention, and consumer adoption potential.",
    criteria: [
      crit("User Habit"),
      crit("Emotional Hook"),
      crit("Retention"),
      crit("Growth Channel"),
      crit("Monetization"),
      crit("Mass Market Potential"),
    ],
    keywords: ["consumer", "mass-market", "individual", "habit", "retention", "app", "personal", "daily", "subscription"],
  },
  {
    id: "custom",
    index: "08",
    name: "Custom Archetype",
    inspiredBy: "Manually defined",
    description:
      "A manually defined archetype for startups that do not fit the preset AI categories.",
    criteria: [],
    keywords: [],
  },
];

export function getArchetype(id: ArchetypeId): ArchetypeDef {
  return ARCHETYPES.find((a) => a.id === id)!;
}

export interface ClassificationResult {
  archetype: ArchetypeId;
  confidence: number; // 0–100
  rationale: string;
  alternative?: ArchetypeId;
}

/**
 * Lightweight heuristic auto-classifier based on keyword frequency across the
 * full form text. Deterministic and explainable — no external model required.
 */
export function classifyStartup(form: Record<string, string>): ClassificationResult {
  const text = Object.values(form).join(" \n ").toLowerCase();

  const scored = ARCHETYPES.map((a) => {
    let hits = 0;
    const matched: string[] = [];
    for (const kw of a.keywords) {
      if (text.includes(kw)) {
        hits += 1;
        matched.push(kw);
      }
    }
    return { id: a.id, name: a.name, hits, matched };
  }).sort((x, y) => y.hits - x.hits);

  const top = scored[0];
  const second = scored[1];

  // Default to Enterprise SaaS when nothing is detected (most common B2B case).
  if (!top || top.hits === 0) {
    return {
      archetype: "enterprise",
      confidence: 40,
      rationale:
        "No strong signal detected in the input yet. Defaulting to AI Enterprise SaaS — the most common pattern for B2B AI products. Refine the description or override manually.",
      alternative: "agent",
    };
  }

  const totalHits = scored.reduce((s, x) => s + x.hits, 0);
  const confidence = Math.min(92, Math.round(45 + (top.hits / Math.max(totalHits, 1)) * 55));
  const arch = ARCHETYPES.find((a) => a.id === top.id)!;

  const rationale = `Matched ${top.hits} signal${top.hits === 1 ? "" : "s"} (${top.matched
    .slice(0, 4)
    .join(", ")}) pointing to ${arch.name}. Distribution, AI usage, and market behavior align with this archetype.`;

  return {
    archetype: top.id,
    confidence,
    rationale,
    alternative: second && second.hits > 0 ? second.id : undefined,
  };
}
