import { getArchetype } from "./archetypes";
import { CATEGORIES, RECOMMENDATIONS } from "./rubric";
import { evaluationResult } from "./storage";
import type { Evaluation } from "./types";

/** Build a plain-text strategic report and trigger a download. */
export function exportReport(ev: Evaluation): void {
  if (typeof window === "undefined") return;
  const result = evaluationResult(ev);
  const arch = getArchetype(ev.archetype);
  const rec = RECOMMENDATIONS[result.recommendation];
  const line = "=".repeat(64);

  const body = [
    line,
    "AIGN STARTUP CURATION SYSTEM — EVALUATION REPORT",
    "AI Startup Ecosystem Framework",
    line,
    "",
    `Startup:          ${ev.startupName}`,
    `Archetype:        ${arch.name}`,
    `Inspired by:      ${arch.inspiredBy}`,
    `Date:             ${new Date(ev.createdAt).toLocaleDateString()}`,
    "",
    `FINAL SCORE:      ${result.finalScore} / 100`,
    `AVERAGE:          ${result.averageOutOf5.toFixed(1)} / 5`,
    `RECOMMENDATION:   ${rec.label} (${rec.range})`,
    "",
    "COMPOSITE SCORES",
    "-".repeat(64),
    `Business viability:    ${result.businessScore}/100`,
    `Strategic value:       ${result.strategicScore}/100`,
    `Archetype-specific:    ${result.archetypeScore}/100`,
    `AIGN ecosystem fit:    ${result.ecosystemFitScore}/100`,
    "",
    "CATEGORY SCORES (1–5)",
    "-".repeat(64),
    ...CATEGORIES.map(
      (c) => `${c.label.padEnd(30)} ${ev.scores[c.id]}/5   (${c.weight}%)`,
    ),
    "",
    "SUMMARY",
    "-".repeat(64),
    result.summary,
    "",
    "KEY STRENGTHS",
    "-".repeat(64),
    ...result.strengths.map((s) => `• ${s}`),
    "",
    "KEY WEAKNESSES",
    "-".repeat(64),
    ...result.weaknesses.map((s) => `• ${s}`),
    "",
    "MAIN RISKS",
    "-".repeat(64),
    ...result.risks.map((s) => `• ${s}`),
    "",
    "SUGGESTED NEXT ACTION FOR AIGN",
    "-".repeat(64),
    result.nextAction,
    "",
    line,
    "AIGN · AI Startup Ecosystem Framework",
    line,
  ].join("\n");

  const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `AIGN-Evaluation-${ev.startupName.replace(/[^a-z0-9]+/gi, "-")}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
