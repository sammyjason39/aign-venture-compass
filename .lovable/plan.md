# Company's Financial Dashboard

Add a financial report feature to each startup. The super admin uploads a financial-report PDF; AI reads it and generates a detailed financial dashboard shown on its own page. Judges can view the dashboard and download the source PDF, but cannot generate or change it. When nothing has been generated yet, the startup page shows "Financial — Not available" next to the Download deck button.

## User-facing behavior

- On the startup detail page, beside **Download deck / Transcript**, add a **Company's financial** control.
  - If a dashboard exists → button opens the financial page.
  - If not generated yet → shows muted **"Financial — Not available"**. Super admin can still open the page to upload/generate; judges just see "Not available".
- Financial page (`/startups/{id}/financial`) shows:
  - **Revenue & growth**: ARR, MRR, latest revenue, YoY / MoM growth, burn rate, runway, gross margin, cash position, funding raised.
  - **Unit economics**: CAC, LTV, LTV/CAC ratio, payback period, churn.
  - **Profitability & P&L**: revenue, COGS, gross profit, net profit, EBITDA, expense breakdown.
  - **AI highlights & red flags** plus a short narrative summary.
  - **Download source** button (the original PDF the admin uploaded).
  - Any value the PDF doesn't contain renders as "-".
- Super admin only: upload a PDF + **Generate financial dashboard**, and **Regenerate** later. Judges see a read-only view.

## Technical plan

### 1. Database migration (startups table)
Add columns: `financial_pdf_path` (text), `financial_data` (jsonb), `financial_status` (text: pending/processing/done/error, nullable), `financial_summary` (text), `financial_error` (text), `financial_generated_at` (timestamptz). No new RLS needed — existing startups policies and the private `startup-files` bucket are reused.

### 2. Types (`src/lib/curation/types.ts`)
Add a `FinancialData` interface (string-valued metric fields grouped into `revenue`, `unitEconomics`, `profitability` with an `expenseBreakdown` array, plus `currency`/`asOf`), and `highlights`/`redFlags` string arrays. Add the new fields to the `Startup` interface.

### 3. AI evaluator (`src/lib/curation/financial-eval.server.ts`, new)
Server-only function `evaluateFinancialsWithAi({ pdf })` calling the Lovable AI Gateway (gemini-2.5-flash, JSON response) with the PDF as a multimodal `file` part. A strict prompt instructs it to extract the metrics above, use "-" when missing, and never invent numbers. Output is coerced/validated into `FinancialData` (same defensive parsing pattern as `ai-eval.server.ts`).

### 4. Server functions (`src/lib/curation/curation.functions.ts`)
- Extend `mapStartup` to map the new financial columns.
- Extend `getStartupFileUrl` to accept `kind: "financial"` (signed URL for `financial_pdf_path`).
- New `generateStartupFinancials` (admin-only): accepts `{ id, pdfPath }`, saves the path, sets `financial_status = processing`, downloads the PDF from storage, runs `evaluateFinancialsWithAi`, then stores `financial_data` + `financial_summary` + `financial_status = done` (or `error` + `financial_error` on failure).
- `getStartupDetail` already returns the full mapped startup, so the financial fields flow through automatically.

### 5. Financial page (`src/routes/_authenticated/startups.$id.financial.tsx`, new)
- Loads the startup via `getStartupDetail` (judges + admins allowed; the route lives under `_authenticated`).
- Renders the dashboard sections using existing `StatCard`-style cards and the project's design tokens (rounded-2xl cards, mono-num figures, hairline borders).
- Super-admin-only panel: PDF `FilePicker` (reusing the upload-to-`startup-files` pattern from `admin.new.tsx`), Generate/Regenerate button wired to `generateStartupFinancials`, and processing/error states.
- "Download source" button using `getStartupFileUrl({ kind: "financial" })`.
- `errorComponent` + back link, consistent with the existing detail route.

### 6. Startup detail page (`src/routes/_authenticated/startups.$id.tsx`)
Add the **Company's financial** control in the deck/transcript button row: a `Link` to the financial page when `financial_status === "done"`, otherwise the muted "Financial — Not available" label (admins still get a link to go generate).

## Notes
- Reuses the existing private `startup-files` bucket and signed-URL download flow.
- All generation is gated by the existing `isAdmin` check; judges are strictly read-only.
- AI cost: one Lovable AI request per generate/regenerate. Rate-limit/credit errors are surfaced in the UI like the existing evaluator.