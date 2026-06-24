## Redesign Home Page — Venturis

Rebuild `src/routes/index.tsx` into a split-screen landing page in the style of the reference (Finishit), branded **Venturis** and adapted to the AIGN curation product. Scope is the home page only — navbar/footer/other pages keep AIGN branding.

### Layout (two columns on desktop, stacked on mobile)

```text
┌───────────────────────────────┬───────────────────────────────┐
│  • EYEBROW CHIP (mono label)  │                               │
│                               │                               │
│  Stop Guessing,               │     [ hero product image ]    │
│  Start Curating!  (blue)      │     rounded-2xl card with     │
│                               │     soft shadow / glass feel  │
│  Sub-paragraph (1–2 lines)    │                               │
│                               │                               │
│  [Get started →] [Sign in]    │                               │
│  small supporting note        │                               │
│                               │                               │
│  [ quote card ] [ quote card ]│                               │
└───────────────────────────────┴───────────────────────────────┘
```

- **Eyebrow chip**: rounded pill, thin border, mono-label text with a small blue dot — e.g. `AI-SCORED VENTURE CURATION`.
- **Heading**: two lines, first line in ink/foreground, second line in `text-primary` (blue) — e.g. "Score every venture, / Curate with clarity." Big, extrabold, tight tracking.
- **Sub-paragraph**: short description of Venturis (AI scores startups first, judges add the human verdict).
- **CTAs**: primary `Get started →` (links to `/auth`), secondary `Sign in` outline button (links to `/auth`).
- **Supporting note**: one muted line under the buttons.
- **Two quote/feature cards**: rounded cards with thin borders containing short phrases (e.g. "Every venture, one scoreboard." / "AI first. Judges decide.").
- **Right column**: the hero image in a rounded card with `shadow-card`/`shadow-lift`, light gradient backdrop. This uses a generated placeholder mockup now; easy to swap when the real photo arrives.

Below the hero, keep a condensed version of the existing **"How it works" 3-step section** so the page still explains the product (Submit → AI evaluates → Judges decide), restyled to match.

### Branding
- Use the name **Venturis** in the home page hero copy and meta title/description for this route only (`head()` in `index.tsx`).
- Keep TopNav, footer, and all other routes as AIGN (per your choice).

### Hero image
- Generate a clean, on-brand product mockup (white-first dashboard UI showing startup scoring cards / scoreboard, blue accents) saved to `src/assets/` and imported into the hero. Sized ~1024×1024 / 4:3, placed in the rounded card. Swappable later with your real photo.

### Technical notes
- Single file edit: `src/routes/index.tsx` (plus the generated asset + import).
- Uses existing semantic tokens (`primary`, `foreground`, `muted-foreground`, `border`, `card`, `mist`, `blue-soft`) and utilities (`mono-label`, `shadow-card`, `shadow-lift`) — no hardcoded colors.
- Buttons via existing `Button` + `Link to="/auth"`.
- Responsive: `grid lg:grid-cols-2`, image stacks below text on mobile.
- No dark-mode toggle added.
