import {
  BUSINESS_CATEGORIES,
  CATEGORIES,
  STRATEGIC_CATEGORIES,
  getCategory,
} from "./rubric";
import { getArchetype } from "./archetypes";
import type {
  ArchetypeId,
  CategoryId,
  CategoryScores,
  RecommendationId,
  ScoreResult,
  ScoreValue,
} from "./types";

function pct(score: number): number {
  return Math.round((score / 5) * 100);
}

function weightedPercent(scores: CategoryScores, ids: CategoryId[]): number {
  let totalWeight = 0;
  let acc = 0;
  for (const id of ids) {
    const w = getCategory(id).weight;
    totalWeight += w;
    acc += (scores[id] / 5) * w;
  }
  if (totalWeight === 0) return 0;
  return Math.round((acc / totalWeight) * 100);
}

export function computeFinalScore(scores: CategoryScores): number {
  let acc = 0;
  for (const cat of CATEGORIES) {
    acc += (scores[cat.id] / 5) * cat.weight;
  }
  return Math.round(acc);
}

export function computeAverage(scores: CategoryScores): number {
  const vals = CATEGORIES.map((c) => scores[c.id]);
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  return Math.round(avg * 10) / 10;
}

function archetypeScorePercent(archetypeScores: Record<string, ScoreValue>): number {
  const vals = Object.values(archetypeScores);
  if (vals.length === 0) return 0;
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  return pct(avg);
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

  // Decision matrix refinements.
  if (bizHigh && stratHigh) rec = finalScore >= 86 ? "fast_track" : "pilot";
  if (bizHigh && !stratHigh && rec !== "fast_track") rec = "pilot"; // commercial pilot
  if (bizMed && stratHigh) rec = "incubation";
  if (bizLow && stratHigh && (rec === "reject" || rec === "watchlist")) rec = "watchlist";
  if (bizLow && !stratHigh && finalScore < 45) rec = "reject";

  // Strategic override: medium business but high strategic should not be rejected.
  if ((rec === "reject" || rec === "watchlist") && bizMed && stratHigh) rec = "incubation";

  return rec;
}

const NEXT_ACTIONS: Record<RecommendationId, string> = {
  fast_track:
    "Fast-track to the AIGN investment committee and prepare term-sheet and pilot-integration discussions.",
  pilot:
    "Run a controlled commercial pilot within one AIGN business unit to validate ROI before scaling.",
  incubation:
    "Place into strategic incubation with mentoring, ecosystem distribution, and milestone-based support.",
  watchlist:
    "Add to the watchlist, assign mentoring on the weak areas, and re-evaluate after key milestones.",
  reject: "Decline for now and revisit if traction, defensibility, and AI relevance materially improve.",
};

export function generateReport(
  startupName: string,
  archetype: ArchetypeId,
  scores: CategoryScores,
  result: Omit<ScoreResult, "strengths" | "weaknesses" | "risks" | "nextAction" | "summary">,
): Pick<ScoreResult, "strengths" | "weaknesses" | "risks" | "nextAction" | "summary"> {
  const ranked = [...CATEGORIES].sort((a, b) => scores[b.id] - scores[a.id]);

  const strengths = ranked
    .filter((c) => scores[c.id] >= 4)
    .slice(0, 4)
    .map((c) => `${c.label}: ${c.anchors[5]}`);

  const weaknesses = ranked
    .filter((c) => scores[c.id] <= 2)
    .reverse()
    .slice(0, 4)
    .map((c) => `${c.label}: ${c.anchors[1]}`);

  // Risk signals derived from low category scores.
  const risks: string[] = [];
  if (scores.moat <= 3) risks.push("Defensibility risk — the moat can be copied without proprietary data or lock-in.");
  if (scores.businessModel <= 3) risks.push("Commercial risk — monetization and unit economics are not yet validated.");
  if (scores.aiRelevance <= 2) risks.push("Technical risk — AI may be a thin wrapper rather than core to the product.");
  if (scores.founderExecution <= 2) risks.push("Execution risk — founder-market fit and delivery capability need validation.");
  if (scores.problemMarket <= 2) risks.push("Market risk — problem urgency and addressable market are unproven.");
  if (risks.length === 0) risks.push("No critical risks flagged by the rubric. Confirm regulatory and capital-intensity assumptions during diligence.");

  const arch = getArchetype(archetype);
  const topStrength = ranked[0];
  const topWeakness = ranked[ranked.length - 1];

  const summary =
    `This startup shows ${result.businessScore >= 70 ? "strong" : result.businessScore >= 50 ? "moderate" : "early"} fit as ${arch.name === "AI Foundation / Infrastructure" ? "an" : "a"} ${arch.name} company. ` +
    `Its main strength is ${topStrength.label.toLowerCase()} (${scores[topStrength.id]}/5). ` +
    `${topWeakness.id !== topStrength.id ? `Its ${topWeakness.label.toLowerCase()} (${scores[topWeakness.id]}/5) needs further validation before scale. ` : ""}` +
    `Recommended action: ${NEXT_ACTIONS[result.recommendation].charAt(0).toLowerCase()}${NEXT_ACTIONS[result.recommendation].slice(1)}`;

  return {
    strengths: strengths.length ? strengths : ["No standout strengths yet — most categories scored at or below validation level."],
    weaknesses: weaknesses.length ? weaknesses : ["No critical weaknesses — all categories scored at validation level or above."],
    risks,
    nextAction: NEXT_ACTIONS[result.recommendation],
    summary,
  };
}

export function evaluateScores(
  startupName: string,
  archetype: ArchetypeId,
  scores: CategoryScores,
  archetypeScores: Record<string, ScoreValue>,
): ScoreResult {
  const finalScore = computeFinalScore(scores);
  const averageOutOf5 = computeAverage(scores);
  const businessScore = weightedPercent(scores, BUSINESS_CATEGORIES);
  const strategicScore = weightedPercent(scores, STRATEGIC_CATEGORIES);
  const ecosystemFitScore = pct(scores.ecosystemFit);
  const archetypeScore = archetypeScorePercent(archetypeScores);
  const recommendation = deriveRecommendation(finalScore, businessScore, strategicScore);

  const base = {
    finalScore,
    averageOutOf5,
    businessScore,
    strategicScore,
    ecosystemFitScore,
    archetypeScore,
    recommendation,
  };

  const report = generateReport(startupName, archetype, scores, base);

  return { ...base, ...report };
}
