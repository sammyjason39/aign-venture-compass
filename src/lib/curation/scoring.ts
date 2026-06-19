import {
  BUSINESS_CATEGORIES,
  CATEGORIES,
  STRATEGIC_CATEGORIES,
  getCategory,
} from "./rubric";
import type {
  AggregateResult,
  CategoryId,
  CategoryScores,
  JudgeScore,
  RecommendationId,
} from "./types";

export const SCORE_MAX = 10;

/** Convert a 1–10 score to a 0–100 percentage. */
export function toPercent(score: number): number {
  return Math.round((score / SCORE_MAX) * 100);
}

function weightedPercent(
  scores: Partial<CategoryScores>,
  ids: CategoryId[],
): number {
  let totalWeight = 0;
  let acc = 0;
  for (const id of ids) {
    const v = scores[id];
    if (v == null) continue;
    const w = getCategory(id).weight;
    totalWeight += w;
    acc += (v / SCORE_MAX) * w;
  }
  if (totalWeight === 0) return 0;
  return Math.round((acc / totalWeight) * 100);
}

/** Final weighted score (0–100) using the full 9-factor rubric. */
export function computeFinalScore(scores: Partial<CategoryScores>): number {
  let totalWeight = 0;
  let acc = 0;
  for (const cat of CATEGORIES) {
    const v = scores[cat.id];
    if (v == null) continue;
    totalWeight += cat.weight;
    acc += (v / SCORE_MAX) * cat.weight;
  }
  if (totalWeight === 0) return 0;
  // Normalize by the weight actually scored so partial inputs still read 0–100.
  return Math.round((acc / totalWeight) * 100);
}

export function businessPercent(scores: Partial<CategoryScores>): number {
  return weightedPercent(scores, BUSINESS_CATEGORIES);
}

export function strategicPercent(scores: Partial<CategoryScores>): number {
  return weightedPercent(scores, STRATEGIC_CATEGORIES);
}

/**
 * Recommendation derived from the final score range, then adjusted with the
 * AIGN strategic-override + decision-matrix logic.
 */
export function deriveRecommendation(
  finalScore: number,
  businessScore: number,
  strategicScore: number,
): RecommendationId {
  let rec: RecommendationId;
  if (finalScore >= 86) rec = "fast_track";
  else if (finalScore >= 70) rec = "pilot";
  else if (finalScore >= 56) rec = "incubation";
  else if (finalScore >= 45) rec = "watchlist";
  else rec = "reject";

  const bizHigh = businessScore >= 70;
  const bizMed = businessScore >= 50 && businessScore < 70;
  const bizLow = businessScore < 50;
  const stratHigh = strategicScore >= 70;

  if (bizHigh && stratHigh) rec = finalScore >= 86 ? "fast_track" : "pilot";
  if (bizHigh && !stratHigh && rec !== "fast_track") rec = "pilot";
  if (bizMed && stratHigh) rec = "incubation";
  if (bizLow && stratHigh && (rec === "reject" || rec === "watchlist")) rec = "watchlist";
  if (bizLow && !stratHigh && finalScore < 45) rec = "reject";
  if ((rec === "reject" || rec === "watchlist") && bizMed && stratHigh) rec = "incubation";

  return rec;
}

export function recommendationFor(scores: Partial<CategoryScores>): RecommendationId {
  const final = computeFinalScore(scores);
  return deriveRecommendation(final, businessPercent(scores), strategicPercent(scores));
}

/** Aggregate all SUBMITTED judge scores into a final committee result. */
export function aggregateJudgeScores(judgeScores: JudgeScore[]): AggregateResult {
  const submitted = judgeScores.filter((j) => j.submitted);
  const judgeCount = submitted.length;

  const averages: Partial<CategoryScores> = {};
  for (const cat of CATEGORIES) {
    const vals = submitted
      .map((j) => j.scores[cat.id])
      .filter((v): v is number => v != null);
    if (vals.length > 0) {
      averages[cat.id] = vals.reduce((s, v) => s + v, 0) / vals.length;
    }
  }

  if (judgeCount === 0) {
    return {
      judgeCount: 0,
      averages: {},
      finalScore: 0,
      businessScore: 0,
      strategicScore: 0,
      recommendation: null,
    };
  }

  const finalScore = computeFinalScore(averages);
  const businessScore = businessPercent(averages);
  const strategicScore = strategicPercent(averages);
  return {
    judgeCount,
    averages,
    finalScore,
    businessScore,
    strategicScore,
    recommendation: deriveRecommendation(finalScore, businessScore, strategicScore),
  };
}
