# Highest Impact = Prestige + Social Impact only

Right now both dashboard cards ("Highest score" and "Highest impact startup") use the exact same combined score, so they always point to the same startup — that's why the ranking looks identical. We'll give "Highest impact startup" its own ranking driven only by two categories: **Prestige** and **Social Impact**, combining AI and judge input.

## How the impact score is calculated

For each startup:
- **AI impact** = average of the AI scores for Prestige and Social Impact (includes any super-admin slider overrides, since those are saved into the AI scores).
- **Each judge's impact** = average of that judge's Prestige and Social Impact scores.
- **Combined impact** = (AI impact + sum of every submitted judge's impact) / (1 + number of judges).

This mirrors how "Highest score" already combines AI + judges, but restricted to the two impact categories. The startup with the highest combined impact wins the "Highest impact startup" card — independent of the overall "Highest score" winner.

## Changes

1. **Database** — add a security-definer aggregate function `startup_impact_aggregates()` that, per startup, returns the sum and count of each submitted judge's average of just the `prestige` and `socialImpact` scores. Individual judge entries stay private (same pattern as the existing `startup_judge_aggregates`).

2. **`listStartups` server function** — call the new function and return an `impactAggregates` map (`{ startupId: { impactSum, impactCount } }`) alongside the existing data.

3. **Dashboard** — add a separate calculation for `highestImpactName` / `highestImpactScore` using the AI Prestige+Social-Impact average plus the judge impact aggregates. Wire the "Highest impact startup" card to these new values. "Highest score" (blue card) stays exactly as it is.

The card layout stays the same as the current design: label "HIGHEST IMPACT STARTUP", the startup name in large mono type, and "Score X.X / 10" underneath.

## Note on the build error

The reported failure (`dist upload ... ServiceUnavailable: Reduce your concurrent request rate`) is a transient deploy/storage hiccup, not a code problem — no code change fixes it; a re-publish clears it.

## Technical details

- `startup_impact_aggregates()`: `LANGUAGE sql STABLE SECURITY DEFINER`, iterates submitted `judge_scores`, computes per-row `AVG` over only the `prestige` and `socialImpact` keys in the `scores` jsonb (guarding for numeric values and missing keys), then `SUM`/`COUNT` grouped by `startup_id`.
- Category keys are `prestige` and `socialImpact` (from `src/lib/curation/types.ts` / `rubric.ts`).
- Dashboard impact loop: `aiImpact = avg(aiScores.prestige, aiScores.socialImpact)` when present; `combined = (aiImpact + impactSum) / (1 + impactCount)`; track max.
