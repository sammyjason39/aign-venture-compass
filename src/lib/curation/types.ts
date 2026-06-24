// Core domain types for the AIGN Startup Curation System.

export type ArchetypeId =
  | "super_app"
  | "vertical"
  | "foundation"
  | "agent"
  | "creative"
  | "enterprise"
  | "consumer";

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
  archetype: ArchetypeId | null;
  archetypeConfidence: number | null;
  status: StartupStatus;
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
