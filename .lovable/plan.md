## Goal

Rework the bottom two stat cards on the Pipeline dashboard:

1. **"AVG AI score"** → **"Highest score"** — the single highest *combined* score across all startups, where each startup's combined score = the average of its AI overall score and every submitted judge's overall score: `(AI + juri1 + juri2 + …) / count`.
2. **"AI Fast Track"** (the black card) → **"Highest impact startup"** — shows the **name of the top startup plus its score** (the same startup that produced the Highest score).
3. Tidy up the supporting label/hint wording ("benerin aja bahasanya") so it reads cleanly in English.

Judges may see these aggregate numbers (confirmed). The aggregate exposes only the combined number, never another judge's individual score.

## Scoring definition

Per startup:
- `aiOverall` = average of the 9 AI category values (`ai_scores`), if present.
- `judgeOverall` (per submitted judge) = average of that judge's 9 category values.
- `combined = (aiOverall + sum(judgeOverall)) / (1 + judgeCount)`.
  - If a startup has no submitted judges, combined = aiOverall.
  - Startups with no AI score and no judges are ignored.

"Highest score" = the max `combined` across all startups. "Highest impact startup" = that startup's name + its `combined` value.

## Why a database change is needed

Judges can only read their *own* `judge_scores` rows under the current row-level security. To compute "AI + all judges" for every startup without leaking individual judge scores, the aggregation must happen server-side with elevated read access that returns only safe aggregate numbers.

```text
┌──────────────┐   RPC (security definer)   ┌──────────────────────────┐
│ listStartups │ ─────────────────────────▶ │ startup_judge_aggregates │
│ server fn    │ ◀───────────────────────── │ → {startup_id, judge_sum, │
└──────────────┘   per-startup aggregates    │    judge_count}          │
                                             └──────────────────────────┘
```

## Technical changes

### 1. Migration — aggregate function
Add a `SECURITY DEFINER` SQL function `public.startup_judge_aggregates()` that returns, per startup, the sum of each submitted judge's overall (average of their `scores` jsonb values) and the judge count. Grant `EXECUTE` to `authenticated`. It returns only aggregate numbers, no per-judge breakdown.

### 2. `src/lib/curation/curation.functions.ts` — `listStartups`
- Call the new RPC and build a map of `{ startupId → { judgeSum, judgeCount } }`.
- Return that map alongside `startups` and `mySubmissions` (e.g. `judgeAggregates`).

### 3. `src/routes/_authenticated/dashboard.tsx`
- Compute each startup's `combined` score in the existing `stats` memo using `aiScores` (already present) + the new `judgeAggregates`.
- Derive `highest` = `{ score, name }` of the top startup.
- Replace the two cards:
  - Card 3: label **"Highest score"**, value = `highest.score` formatted to one decimal (e.g. `8.3`), hint **"Combined AI + judges"**.
  - Card 4 (accent/black): label **"Highest impact startup"**, value = `highest.name`, hint = its score e.g. **"Score 8.3 / 10"**. Keep the `Rocket` icon and accent styling.
  - Show `—` when no startup qualifies.
- Light wording cleanup on these cards only; the other two cards (Startups, Open for scoring) stay unchanged.

## Out of scope
No change to scoring logic elsewhere, the table rows, judge detail visibility, or the recommendation engine.
