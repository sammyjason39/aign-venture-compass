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

export type ScoreValue = 1 | 2 | 3 | 4 | 5;

export type CategoryScores = Record<CategoryId, ScoreValue>;

export interface Evaluation {
  id: string;
  startupName: string;
  createdAt: string;
  updatedAt: string;
  /** Raw form answers keyed by field id (sections A–I). */
  form: Record<string, string>;
  archetype: ArchetypeId;
  /** 0–100 confidence from the auto-classifier (informational). */
  archetypeConfidence: number;
  /** General weighted rubric, each category scored 1–5. */
  scores: CategoryScores;
  /** Archetype-specific criteria, keyed by criterion id, scored 1–5. */
  archetypeScores: Record<string, ScoreValue>;
}

export interface ScoreResult {
  finalScore: number; // 0–100
  averageOutOf5: number; // 0–5
  businessScore: number; // 0–100
  strategicScore: number; // 0–100
  ecosystemFitScore: number; // 0–100
  archetypeScore: number; // 0–100
  recommendation: RecommendationId;
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  nextAction: string;
  summary: string;
}
