# Add deck download for judges

## Goal
On the startup detail page, judges (and admins) get a **Download deck** button so they can read the same deck file the super admin uploaded. The deck file lives in the private `startup-files` storage bucket, so a button must request a short-lived signed URL.

## What the user sees
- A clear **Download deck** button at the top of the startup detail page, next to the startup title/badges.
- It appears only when a deck was actually uploaded for that startup.
- Clicking it opens the deck in a new tab (PDF/PPTX) so the judge can read it.
- If the startup also has a transcript file, an optional secondary **Transcript** download link appears too.

## How it works (technical)

### 1. New server function — `getStartupFileUrl`
In `src/lib/curation/curation.functions.ts`:
- `createServerFn({ method: "GET" })` with `.middleware([requireSupabaseAuth])` (every account in this app is an allowlisted judge/admin, so any authenticated user may read the deck).
- Input: `{ id: string (uuid), kind: "deck" | "transcript" }`.
- Look up the startup row, read `deck_path` / `transcript_path`.
- Generate a signed URL valid ~5 minutes via the storage API on the authenticated context client: `context.supabase.storage.from("startup-files").createSignedUrl(path, 300)`.
- Return `{ url }` (or `{ url: null }` when no file is set).

### 2. Storage access
The bucket is private. Confirm a SELECT policy on `storage.objects` lets authenticated users read objects in `startup-files`. If signed-URL creation fails under the current policies, switch the function to mint the signed URL with the admin client inside the handler (`await import("@/integrations/supabase/client.server")`) after `requireSupabaseAuth` has already proven the caller is a logged-in member. This keeps the file private (no public bucket) while letting judges read it.

### 3. UI button — `src/routes/_authenticated/startups.$id.tsx`
- Add a small `DownloadDeck` action (button using the existing `Button` component + a `Download`/`FileText` lucide icon).
- On click: call `getStartupFileUrl({ data: { id, kind: "deck" } })`, then `window.open(url, "_blank")`; show a toast on error or when no file exists.
- Render it in the header area, visible to both judges and admins, only when `startup.deckPath` is set.
- Optionally render a lighter transcript link when `startup.transcriptPath` is set.

## Notes
- No schema/migration changes needed; `deck_path` already exists and is already returned as `deckPath` in `getStartupDetail`.
- Scope is frontend + one server function; no change to scoring or AI logic.
