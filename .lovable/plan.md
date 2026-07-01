# Progress tracking in the pipeline

Replace the **AI verdict** column in the pipeline table with a **Progress** column that tracks how far each startup has been explored, with editable notes.

## Stages

Three ordered stages, every startup starts at stage 1:

```text
1. Get to know      (default)
2. Deep Dive
3. Investment Plan
```

## Behavior

- The Progress column shows a colored badge with the current stage for every startup.
- Clicking the badge opens a **popover on the pipeline row** (does not open the startup page).
  - **Super admin:** can change the stage (dropdown of the 3 stages) and edit the notes ("seberapa jauh sudah dijajaki"), then save.
  - **Judges:** see the current stage and the notes, read-only.
- The "AI verdict" column is removed from the pipeline. (The AI recommendation still remains available on the startup detail page — only the pipeline column changes.)

## Layout / visual

- Badges use the existing semantic tokens (no hardcoded colors), styled like the other pipeline badges:
  - Get to know — neutral/mist tone
  - Deep Dive — blue (primary) tone
  - Investment Plan — dark (foreground) tone, signalling furthest along
- The popover reuses the existing card styling (rounded, thin border, clean shadow) and mono labels, consistent with the rest of the app.

---

## Technical detail

### Database (migration)
- Add two columns to `public.startups`:
  - `progress` — text, `NOT NULL DEFAULT 'get_to_know'`, checked against `('get_to_know','deep_dive','investment_plan')`.
  - `progress_notes` — text, nullable.
- No new table, so existing GRANTs/RLS on `startups` already apply. Existing rows backfill to `get_to_know` via the default.

### Types
- Add `ProgressStage = "get_to_know" | "deep_dive" | "investment_plan"` to `src/lib/curation/types.ts`.
- Add `progress` and `progressNotes` to the `Startup` interface, and map them in `mapStartup` (`curation.functions.ts`).

### Server function
- New `setStartupProgress` in `curation.functions.ts`:
  - `.middleware([requireSupabaseAuth])`, admin-only guard (same pattern as `setStartupValuation`).
  - Input: `{ id: uuid, progress: enum, notes: string (max ~4000) }`.
  - Updates `progress` + `progress_notes`.
- `listStartups` already does `select("*")`, so the new columns come through automatically.

### UI (`dashboard.tsx`)
- Add a `PROGRESS_STAGES` config (id → label + tone class).
- Replace the "AI verdict" `<TableHead>` and its `<TableCell>` with a Progress cell rendering a badge inside a Popover (shadcn `popover` is already available).
  - Popover content: stage label + notes for judges; a stage `Select` + notes `Textarea` + Save button for admins.
  - Stop row-click navigation when interacting with the popover (`onClick` stopPropagation on the cell, as done for the drag handle).
  - On save: call `setStartupProgress`, then invalidate the `["startups"]` query; optimistic local update to `order`.

### Scope
- Purely additive: no scoring logic, archetype, or financial code touched. AI recommendation data stays intact and still shows on the detail page.