## Goal

Super admin can set each user's **panggilan** (salutation) in the user management page: **Bapak**, **Ibu**, or **Name only**. The welcome splash after login then greets accordingly:
- Bapak → "Welcome Bapak {First Name}"
- Ibu → "Welcome Ibu {First Name}"
- Name only → "Welcome {First Name}"

Currently the greeting is hardcoded to "Welcome Bapak/Ibu {name}".

## Behavior

- In **Judges & access** (user management), each member row gets a small **panggilan** control (a dropdown with Bapak / Ibu / Name only). Only the super admin sees and can change it.
- Changing it saves immediately and shows a confirmation toast.
- When that user logs in, the welcome overlay uses their saved panggilan. If none is set yet, it falls back to the current generic "Bapak/Ibu" wording so nothing looks broken.

## Technical details

**Database (migration)**
- Add a nullable `salutation` text column to `public.profiles` (allowed values `'bapak'` / `'ibu'` / `null` for name-only), validated via a CHECK or trigger. No new table, existing grants/RLS cover it.

**Server (`src/lib/curation/admin.functions.ts`)**
- Extend `listMembers` to also select `salutation` and include it on `MemberRow`.
- Add `setMemberSalutation` server function (admin-only, mirrors `setMemberRole`): input `{ userId, salutation: 'bapak' | 'ibu' | null }`. Because the profiles UPDATE policy only allows users to update their own row, this handler uses `supabaseAdmin` (loaded inside the handler, like `inviteJudge`) to update another user's profile.

**Server (greeting source)**
- Add a small `getMyProfile` server function (uses `requireSupabaseAuth`, reads the caller's own profile row) returning `{ salutation, fullName }`. The user can read their own profile under existing RLS.

**UI — user management (`src/routes/_authenticated/admin.judges.tsx`)**
- Add a panggilan `Select` (Bapak / Ibu / Name only) to each member row, wired to `setMemberSalutation` + query invalidation.

**UI — greeting (`src/routes/_authenticated/dashboard.tsx` + `src/components/WelcomeOverlay.tsx`)**
- Fetch the current user's `salutation` via `getMyProfile`.
- Compute a `salutationLabel`: `bapak` → "Bapak", `ibu` → "Ibu", null → "" (name only), and fall back to "Bapak/Ibu" if the profile fetch hasn't resolved.
- Pass it into `WelcomeOverlay`, which renders `Welcome {salutationLabel} {name}` (collapsing the extra space when the label is empty).

No changes to scoring, archetypes, or judging logic.