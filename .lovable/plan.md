# Super admin can edit AI baseline scores

Super admin gets the ability to override the AI's per-category scores (the 9 factors in the "AI baseline" panel) using sliders, after the AI has scored. Useful when the AI can't reliably judge things like Founder Execution.

## Behavior

- In the **AI baseline** panel, super admin sees an **Edit scores** button (next to the recommendation badge).
- Clicking it switches the 9 score bars into an editable mode: each category shows a **slider (1–10)** with the live value next to it.
- On **Save**, the new scores are stored and the AI recommendation badge automatically recalculates from the updated numbers (using the existing weighted scoring logic). **Cancel** discards changes.
- Judges and non-admins still see the read-only score bars exactly as today.
- Re-running the AI (existing "Re-run AI" button) will overwrite these manual edits — expected, since it's a fresh evaluation.

## Technical details

**Server (`src/lib/curation/curation.functions.ts`)**
- Add `setStartupAiScores` server function (admin-only, mirrors `setStartupArchetype`):
  - Input: `{ id: uuid, scores: Record<CategoryId, number 1–10> }` validated with zod (all 9 categories required, integers 1–10).
  - Recompute `ai_recommendation` server-side via `recommendationFor(scores)` from `scoring.ts`.
  - Update `ai_scores` and `ai_recommendation` on the row. No DB migration needed (`ai_scores` is already a JSON column).

**UI (`src/routes/_authenticated/startups.$id.tsx`)**
- Add state: `editingScores`, `scoreDraft` (CategoryScores), `savingScores`.
- In the AI baseline card, when `isAdmin`:
  - Show an "Edit scores" / Pencil button in the card header.
  - In edit mode, render a slider per category (using the existing shadcn `Slider` component) instead of `ScoreBar`, with the category label, weight, and current draft value.
  - Show Save / Cancel buttons; Save calls `setStartupAiScores` then `refresh()`.

**No business-logic changes** to the rubric or judge scoring — only a new admin override path for the AI baseline numbers.
