import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { FinancialModel, FinancialStatus } from "./types";

type SupabaseCtx = { supabase: any; userId: string };

async function isAdmin(ctx: SupabaseCtx): Promise<boolean> {
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  return data === true;
}

// ---------------- validation ----------------

const cardSchema = z.object({
  id: z.string().max(80),
  label: z.string().trim().min(1).max(60),
  value: z.string().trim().max(40),
  unit: z.string().trim().max(16).optional(),
  note: z.string().trim().max(120).optional(),
});

const numOrNull = z.number().finite().nullable();

const modelSchema = z.object({
  currency: z.enum(["IDR", "USD"]),
  unit: z.enum(["juta", "ribu", "penuh"]),
  periods: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(24),
        kind: z.enum(["actual", "projected"]),
      }),
    )
    .min(1)
    .max(5),
  series: z.object({
    revenue: z.array(numOrNull),
    ebitda: z.array(numOrNull),
    netIncome: z.array(numOrNull),
    grossMarginPct: z.array(numOrNull),
    ebitdaMarginPct: z.array(numOrNull),
    ocf: z.array(numOrNull),
    icf: z.array(numOrNull),
    fcf: z.array(numOrNull),
  }),
  kpis: z.object({
    revenueCagrPct: numOrNull,
    grossMarginLatestPct: numOrNull,
    ebitdaLatest: numOrNull,
    ruleOf40: numOrNull,
    burnMultiple: numOrNull,
    paybackMonths: numOrNull,
    endingCash: numOrNull,
    totalFunding: numOrNull,
    capitalEfficiency: numOrNull,
  }),
  unitEconomics: z.array(cardSchema).max(12),
  customCards: z.array(cardSchema).max(12),
  verdict: z.object({
    score: z.number().int().min(0).max(100),
    headline: z.string().trim().max(160),
    narrative: z.string().trim().max(800),
    risks: z.array(z.string().trim().max(400)).max(12),
  }),
  insights: z.array(z.string().trim().max(400)).max(12),
});

// ---------------- read ----------------

export const getFinancialModel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await isAdmin(context);
    const { data: row, error } = await context.supabase
      .from("startups")
      .select(
        "financial_data, financial_status, financial_summary, financial_error, financial_generated_at, financial_report_path",
      )
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error(error?.message ?? "Startup not found");

    const reportPath: string | null = row.financial_report_path ?? null;
    const reportIsSpreadsheet = !!reportPath && /\.(xlsx|xls|xlsm|csv)$/i.test(reportPath);

    return {
      model: (row.financial_data ?? null) as FinancialModel | null,
      status: (row.financial_status ?? null) as FinancialStatus | null,
      summary: (row.financial_summary ?? null) as string | null,
      error: (row.financial_error ?? null) as string | null,
      generatedAt: (row.financial_generated_at ?? null) as string | null,
      hasReport: !!reportPath,
      reportIsSpreadsheet,
      admin,
    };
  });

// ---------------- generate from uploaded report ----------------

export const generateFinancialModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        currency: z.enum(["IDR", "USD"]).optional(),
        unit: z.enum(["juta", "ribu", "penuh"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Forbidden: admin only");

    const { data: row, error } = await context.supabase
      .from("startups")
      .select("name, sector, description, financial_report_path")
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error(error?.message ?? "Startup not found");
    if (!row.financial_report_path) {
      throw new Error("Upload a financial report (Excel/CSV/PDF) first.");
    }

    await context.supabase
      .from("startups")
      .update({ financial_status: "processing", financial_error: null })
      .eq("id", data.id);

    try {
      const { isSpreadsheet, extractSpreadsheetText } = await import("./financial-extract.server");
      const { extractFromBytes } = await import("./extract.server");
      const { buildFinancialModel } = await import("./financial-eval.server");

      const dl = await context.supabase.storage
        .from("startup-files")
        .download(row.financial_report_path);
      if (dl.error || !dl.data) {
        throw new Error(dl.error?.message ?? "Could not download the financial report.");
      }
      const bytes = new Uint8Array(await dl.data.arrayBuffer());
      const name = row.financial_report_path.split("/").pop() ?? row.financial_report_path;
      const mime = (dl.data as Blob).type ?? "";

      let spreadsheetText = "";
      let pdf: { base64: string; name: string } | undefined;
      if (isSpreadsheet(name, mime)) {
        spreadsheetText = extractSpreadsheetText(bytes);
      } else {
        const extracted = extractFromBytes(bytes, name, mime);
        if (extracted.text) spreadsheetText = extracted.text;
        if (extracted.pdfBase64) {
          pdf = { base64: extracted.pdfBase64, name: extracted.pdfName ?? name };
        }
      }

      if (!spreadsheetText && !pdf) {
        throw new Error("Could not read any data from the uploaded report.");
      }

      const model = await buildFinancialModel({
        name: row.name,
        sector: row.sector,
        description: row.description,
        spreadsheetText: spreadsheetText || undefined,
        pdf,
        currency: data.currency,
        unit: data.unit,
      });

      await context.supabase
        .from("startups")
        .update({
          financial_data: model as any,
          financial_status: "done",
          financial_summary: model.verdict.headline || null,
          financial_error: null,
          financial_generated_at: new Date().toISOString(),
        })
        .eq("id", data.id);

      return { ok: true, model };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Financial analysis failed";
      await context.supabase
        .from("startups")
        .update({ financial_status: "error", financial_error: message })
        .eq("id", data.id);
      throw new Error(message);
    }
  });

// ---------------- save manual edits ----------------

export const saveFinancialModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), model: modelSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Forbidden: admin only");

    // Keep every numeric series aligned with the number of periods.
    const len = data.model.periods.length;
    const fix = (arr: (number | null)[]) => {
      const out = arr.slice(0, len);
      while (out.length < len) out.push(null);
      return out;
    };
    const model: FinancialModel = {
      ...data.model,
      series: {
        revenue: fix(data.model.series.revenue),
        ebitda: fix(data.model.series.ebitda),
        netIncome: fix(data.model.series.netIncome),
        grossMarginPct: fix(data.model.series.grossMarginPct),
        ebitdaMarginPct: fix(data.model.series.ebitdaMarginPct),
        ocf: fix(data.model.series.ocf),
        icf: fix(data.model.series.icf),
        fcf: fix(data.model.series.fcf),
      },
    };

    const { error } = await context.supabase
      .from("startups")
      .update({
        financial_data: model as any,
        financial_status: "done",
        financial_summary: model.verdict.headline || null,
        financial_error: null,
        financial_generated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- delete generated dashboard ----------------

export const deleteFinancialModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Forbidden: admin only");
    const { error } = await context.supabase
      .from("startups")
      .update({
        financial_data: null,
        financial_status: null,
        financial_summary: null,
        financial_error: null,
        financial_generated_at: null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
