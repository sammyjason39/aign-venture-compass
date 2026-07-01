// Core domain types for the AIGN Startup Curation System.

export type ArchetypeId =
  | "super_app"
  | "vertical"
  | "foundation"
  | "agent"
  | "creative"
  | "enterprise"
  | "consumer"
  | "custom";

/** How far a startup has been explored by the AIGN team. */
export type ProgressStage = "get_to_know" | "deep_dive" | "investment_plan";

export type CategoryId =
  | "problemMarket"
  | "aiRelevance"
  | "businessModel"
  | "moat"
  | "founderExecution"
  | "ecosystemFit"
  | "prestige"
  | "socialImpact"
  | "transformational";

export type RecommendationId =
  | "fast_track"
  | "pilot"
  | "incubation"
  | "watchlist"
  | "reject";

/** Scores run on a 1–10 scale across the platform. */
export type ScoreValue = number;

export type CategoryScores = Record<CategoryId, ScoreValue>;

export type StartupStatus = "draft" | "open" | "closed";
export type AiStatus = "pending" | "processing" | "done" | "error";

/** Structured output produced by the AI evaluator. */
export interface AiEvaluation {
  archetype: ArchetypeId;
  archetypeConfidence: number; // 0–100
  scores: CategoryScores; // each 1–10
  summary: string;
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  recommendation: RecommendationId;
}

export interface Startup {
  id: string;
  name: string;
  oneLiner: string | null;
  sector: string | null;
  description: string;
  valuation: string | null;
  deckPath: string | null;
  transcriptPath: string | null;
  financialReportPath: string | null;
  archetype: ArchetypeId | null;
  archetypeCustom: string | null;
  archetypeConfidence: number | null;
  status: StartupStatus;
  progress: ProgressStage;
  progressNotes: string | null;
  aiStatus: AiStatus;
  aiScores: CategoryScores | null;
  aiSummary: string | null;
  aiStrengths: string[] | null;
  aiWeaknesses: string[] | null;
  aiRisks: string[] | null;
  aiRecommendation: RecommendationId | null;
  aiError: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JudgeScore {
  id: string;
  startupId: string;
  judgeId: string;
  judgeName: string | null;
  scores: Partial<CategoryScores>;
  justification: string | null;
  submitted: boolean;
  updatedAt: string;
}

/** Aggregate of all submitted judge scores for a startup. */
export interface AggregateResult {
  judgeCount: number;
  averages: Partial<CategoryScores>; // per category, 1–10
  finalScore: number; // 0–100
  businessScore: number; // 0–100
  strategicScore: number; // 0–100
  recommendation: RecommendationId | null;
}

// ---------------- Financial dashboard ----------------

export type FinancialCurrency = "IDR" | "USD";
/** Magnitude the numeric series are expressed in. */
export type FinancialUnit = "juta" | "ribu" | "penuh";

export interface FinancialPeriod {
  label: string; // e.g. "2024" or "Y1"
  kind: "actual" | "projected";
}

/** All numeric series share the same length as `periods`. null = unknown. */
export interface FinancialSeries {
  revenue: (number | null)[];
  ebitda: (number | null)[];
  netIncome: (number | null)[];
  grossMarginPct: (number | null)[];
  ebitdaMarginPct: (number | null)[];
  ocf: (number | null)[]; // operating cash flow
  icf: (number | null)[]; // investing cash flow
  fcf: (number | null)[]; // financing cash flow
}

export interface FinancialKpis {
  revenueCagrPct: number | null;
  grossMarginLatestPct: number | null;
  ebitdaLatest: number | null;
  ruleOf40: number | null;
  burnMultiple: number | null;
  paybackMonths: number | null;
  endingCash: number | null;
  totalFunding: number | null;
  capitalEfficiency: number | null;
}

/** Free-form metric card (unit economics or admin custom insight). */
export interface FinancialCard {
  id: string;
  label: string;
  value: string;
  unit?: string;
  note?: string;
}

export interface FinancialVerdict {
  score: number; // 0–100
  headline: string;
  narrative: string;
  risks: string[];
}

export interface FinancialModel {
  currency: FinancialCurrency;
  unit: FinancialUnit;
  periods: FinancialPeriod[];
  series: FinancialSeries;
  kpis: FinancialKpis;
  unitEconomics: FinancialCard[];
  customCards: FinancialCard[];
  verdict: FinancialVerdict;
  insights: string[];
}

export type FinancialStatus = "pending" | "processing" | "done" | "error";
