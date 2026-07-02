import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  AiStatus,
  ArchetypeId,
  CategoryScores,
  JudgeScore,
  ProgressStage,
  RecommendationId,
  Startup,
  StartupStatus,
} from "./types";

type SupabaseCtx = { supabase: any; userId: string };

async function isAdmin(ctx: SupabaseCtx): Promise<boolean> {
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  return data === true;
}

function mapStartup(row: any): Startup {
  return {
    id: row.id,
    name: row.name,
    oneLiner: row.one_liner,
    sector: row.sector,
    description: row.description ?? "",
    valuation: row.valuation ?? null,
    deckPath: row.deck_path,
    transcriptPath: row.transcript_path,
    financialReportPath: row.financial_report_path ?? null,
    archetype: row.archetype as ArchetypeId | null,
    archetypeCustom: row.archetype_custom ?? null,
    archetypeConfidence: row.archetype_confidence,
    status: row.status as StartupStatus,
    progress: (row.progress ?? "get_to_know") as ProgressStage,
    progressNotes: row.progress_notes ?? null,
    aiStatus: row.ai_status as AiStatus,
    aiScores: row.ai_scores as CategoryScores | null,
    aiSummary: row.ai_summary,
    aiStrengths: row.ai_strengths,
    aiWeaknesses: row.ai_weaknesses,
    aiRisks: row.ai_risks,
    aiRecommendation: row.ai_recommendation as RecommendationId | null,
    aiError: row.ai_error,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapJudgeScore(row: any, judgeName?: string | null): JudgeScore {
  return {
    id: row.id,
    startupId: row.startup_id,
    judgeId: row.judge_id,
    judgeName: judgeName ?? null,
    scores: (row.scores ?? {}) as Partial<CategoryScores>,
    justification: row.justification,
    submitted: row.submitted,
    updatedAt: row.updated_at,
  };
}

// ---------------- roles ----------------

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { roles: (data ?? []).map((r: any) => r.role as string) };
  });

// ---------------- AI evaluation (internal) ----------------

async function runEvaluation(ctx: SupabaseCtx, startupId: string): Promise<void> {
  const { extractFromBytes } = await import("./extract.server");
  const { evaluateWithAi } = await import("./ai-eval.server");

  await ctx.supabase
    .from("startups")
    .update({ ai_status: "processing", ai_error: null })
    .eq("id", startupId);

  const { data: row, error } = await ctx.supabase
    .from("startups")
    .select("*")
    .eq("id", startupId)
    .single();
  if (error || !row) throw new Error(error?.message ?? "Startup not found");

  try {
    let extraText = "";
    let pdf: { base64: string; name: string } | undefined;

    for (const path of [row.deck_path, row.transcript_path]) {
      if (!path) continue;
      const dl = await ctx.supabase.storage.from("startup-files").download(path);
      if (dl.error || !dl.data) continue;
      const bytes = new Uint8Array(await dl.data.arrayBuffer());
      const name = path.split("/").pop() ?? path;
      const mime = (dl.data as Blob).type ?? "";
      const extracted = extractFromBytes(bytes, name, mime);
      if (extracted.text) extraText += `\n\n[${name}]\n${extracted.text}`;
      if (extracted.pdfBase64 && !pdf) {
        pdf = { base64: extracted.pdfBase64, name: extracted.pdfName ?? name };
      }
    }

    const result = await evaluateWithAi({
      name: row.name,
      oneLiner: row.one_liner,
      sector: row.sector,
      description: row.description ?? "",
      extraText: extraText.trim() || undefined,
      pdf,
    }, ctx.supabase);

    await ctx.supabase
      .from("startups")
      .update({
        archetype: result.archetype,
        archetype_confidence: result.archetypeConfidence,
        ai_scores: result.scores,
        ai_summary: result.summary,
        ai_strengths: result.strengths,
        ai_weaknesses: result.weaknesses,
        ai_risks: result.risks,
        ai_recommendation: result.recommendation,
        ai_status: "done",
        ai_error: null,
        status: row.status === "draft" ? "open" : row.status,
      })
      .eq("id", startupId);
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI evaluation failed";
    await ctx.supabase
      .from("startups")
      .update({ ai_status: "error", ai_error: message })
      .eq("id", startupId);
    throw new Error(message);
  }
}

// ---------------- startups ----------------

const createSchema = z.object({
  name: z.string().trim().min(1).max(160),
  oneLiner: z.string().trim().max(280).optional().default(""),
  sector: z.string().trim().max(120).optional().default(""),
  description: z.string().trim().max(40000).optional().default(""),
  deckPath: z.string().trim().max(512).optional().nullable(),
  transcriptPath: z.string().trim().max(512).optional().nullable(),
  financialReportPath: z.string().trim().max(512).optional().nullable(),
});

export const createStartup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Forbidden: admin only");

    const { data: inserted, error } = await context.supabase
      .from("startups")
      .insert({
        name: data.name,
        one_liner: data.oneLiner || null,
        sector: data.sector || null,
        description: data.description || "",
        deck_path: data.deckPath || null,
        transcript_path: data.transcriptPath || null,
        financial_report_path: data.financialReportPath || null,
        status: "draft",
        ai_status: "pending",
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    try {
      await runEvaluation(context, inserted.id);
    } catch {
      // Row is marked ai_status=error; surface via detail view.
    }
    return { id: inserted.id as string };
  });

export const reEvaluateStartup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Forbidden: admin only");
    await runEvaluation(context, data.id);
    return { ok: true };
  });

export const setStartupValuation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ id: z.string().uuid(), valuation: z.string().trim().max(120) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Forbidden: admin only");
    const { error } = await context.supabase
      .from("startups")
      .update({ valuation: data.valuation || null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setStartupProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        progress: z.enum(["get_to_know", "deep_dive", "investment_plan"]),
        notes: z.string().trim().max(4000).optional().default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Forbidden: admin only");
    const { error } = await context.supabase
      .from("startups")
      .update({ progress: data.progress, progress_notes: data.notes || null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setStartupArchetype = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        archetype: z.enum([
          "super_app",
          "vertical",
          "foundation",
          "agent",
          "creative",
          "enterprise",
          "consumer",
          "custom",
        ]),
        customLabel: z.string().trim().max(80).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Forbidden: admin only");
    if (data.archetype === "custom" && !data.customLabel?.trim()) {
      throw new Error("Custom archetype label is required");
    }
    const { error } = await context.supabase
      .from("startups")
      .update({
        archetype: data.archetype,
        archetype_custom: data.archetype === "custom" ? data.customLabel!.trim() : null,
        archetype_confidence: 100,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderStartups = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).min(1) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Forbidden: admin only");
    for (let i = 0; i < data.ids.length; i++) {
      const { error } = await context.supabase
        .from("startups")
        .update({ sort_order: i })
        .eq("id", data.ids[i]);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });






const CATEGORY_IDS = [
  "problemMarket",
  "aiRelevance",
  "businessModel",
  "moat",
  "founderExecution",
  "ecosystemFit",
  "prestige",
  "socialImpact",
  "transformational",
] as const;

export const setStartupAiScores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        scores: z.object(
          Object.fromEntries(
            CATEGORY_IDS.map((id) => [id, z.number().int().min(1).max(10)]),
          ) as Record<(typeof CATEGORY_IDS)[number], z.ZodNumber>,
        ),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Forbidden: admin only");
    const { recommendationFor } = await import("./scoring");
    const scores = data.scores as CategoryScores;
    const recommendation = recommendationFor(scores);
    const { error } = await context.supabase
      .from("startups")
      .update({ ai_scores: scores, ai_recommendation: recommendation })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, recommendation };
  });

export const setStartupStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["draft", "open", "closed"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Forbidden: admin only");
    const { error } = await context.supabase
      .from("startups")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteStartup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Forbidden: admin only");
    const { error } = await context.supabase.from("startups").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listStartups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows, error } = await context.supabase
      .from("startups")
      .select("*")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: myScores } = await context.supabase
      .from("judge_scores")
      .select("startup_id, submitted")
      .eq("judge_id", context.userId);

    const mySubmissions: Record<string, boolean> = {};
    for (const s of myScores ?? []) mySubmissions[s.startup_id] = s.submitted;

    // Aggregate judge scores across all judges (safe aggregate numbers only).
    const { data: aggRows } = await context.supabase.rpc("startup_judge_aggregates");
    const judgeAggregates: Record<string, { judgeSum: number; judgeCount: number }> = {};
    for (const a of (aggRows ?? []) as Array<{
      startup_id: string;
      judge_sum: number | string;
      judge_count: number;
    }>) {
      judgeAggregates[a.startup_id] = {
        judgeSum: Number(a.judge_sum) || 0,
        judgeCount: a.judge_count ?? 0,
      };
    }

    // Aggregate judge impact (Prestige + Social Impact only).
    const { data: impactRows } = await context.supabase.rpc("startup_impact_aggregates");
    const impactAggregates: Record<string, { impactSum: number; impactCount: number }> = {};
    for (const a of (impactRows ?? []) as Array<{
      startup_id: string;
      impact_sum: number | string;
      impact_count: number;
    }>) {
      impactAggregates[a.startup_id] = {
        impactSum: Number(a.impact_sum) || 0,
        impactCount: a.impact_count ?? 0,
      };
    }

    return {
      startups: (rows ?? []).map(mapStartup),
      mySubmissions,
      judgeAggregates,
      impactAggregates,
      admin: await isAdmin(context),
    };
  });


export const getStartupDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await isAdmin(context);

    const { data: row, error } = await context.supabase
      .from("startups")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error(error?.message ?? "Startup not found");

    const { data: mine } = await context.supabase
      .from("judge_scores")
      .select("*")
      .eq("startup_id", data.id)
      .eq("judge_id", context.userId)
      .maybeSingle();

    let judgeScores: JudgeScore[] = [];
    if (admin) {
      const { data: all } = await context.supabase
        .from("judge_scores")
        .select("*")
        .eq("startup_id", data.id);
      const ids = [...new Set((all ?? []).map((j: any) => j.judge_id))];
      const nameMap: Record<string, string | null> = {};
      if (ids.length) {
        const { data: profs } = await context.supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", ids);
        for (const p of profs ?? []) nameMap[p.id] = p.full_name || p.email;
      }
      judgeScores = (all ?? []).map((j: any) => mapJudgeScore(j, nameMap[j.judge_id]));
    }

    return {
      startup: mapStartup(row),
      myScore: mine ? mapJudgeScore(mine) : null,
      judgeScores,
      admin,
    };
  });

// ---------------- startup file downloads ----------------

export const getStartupFileUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        kind: z.enum(["deck", "transcript", "financial_report"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("startups")
      .select("deck_path, transcript_path, financial_report_path")
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error(error?.message ?? "Startup not found");

    const path =
      data.kind === "deck"
        ? row.deck_path
        : data.kind === "transcript"
          ? row.transcript_path
          : row.financial_report_path;
    if (!path) return { url: null as string | null };

    const { data: signed, error: signErr } = await context.supabase.storage
      .from("startup-files")
      .createSignedUrl(path, 300);
    if (signErr || !signed?.signedUrl) {
      throw new Error(signErr?.message ?? "Could not create download link");
    }
    return { url: signed.signedUrl as string };
  });

// Streams the file bytes through our own domain so ad blockers that block
// *.supabase.co cannot break downloads for judges.
export const downloadStartupFile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        kind: z.enum(["deck", "transcript", "financial_report"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("startups")
      .select("deck_path, transcript_path, financial_report_path")
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error(error?.message ?? "Startup not found");

    const path =
      data.kind === "deck"
        ? row.deck_path
        : data.kind === "transcript"
          ? row.transcript_path
          : row.financial_report_path;
    if (!path) {
      return { base64: null as string | null, filename: null as string | null, contentType: null as string | null };
    }

    const { data: blob, error: dlErr } = await context.supabase.storage
      .from("startup-files")
      .download(path);
    if (dlErr || !blob) {
      throw new Error(dlErr?.message ?? "Could not download file");
    }

    const buf = Buffer.from(await blob.arrayBuffer());
    const filename = path.split("/").pop() || `${data.kind}`;
    return {
      base64: buf.toString("base64"),
      filename,
      contentType: blob.type || "application/octet-stream",
    };
  });


export const setStartupFinancialReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        path: z.string().trim().max(512).nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Forbidden: admin only");
    const { error } = await context.supabase
      .from("startups")
      .update({ financial_report_path: data.path || null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- judge scoring ----------------


const submitSchema = z.object({
  startupId: z.string().uuid(),
  scores: z.record(z.string(), z.number().min(1).max(10)),
  justification: z.string().trim().max(5000).optional().default(""),
  submitted: z.boolean().default(false),
});

export const submitJudgeScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => submitSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("judge_scores")
      .upsert(
        {
          startup_id: data.startupId,
          judge_id: context.userId,
          scores: data.scores,
          justification: data.justification || null,
          submitted: data.submitted,
        },
        { onConflict: "startup_id,judge_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- AI settings ----------------

export const getAiSettingsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ai_settings")
      .select("*")
      .eq("id", 1)
      .single();
    if (error && error.code !== "PGRST116") throw new Error(error.message);
    return { settings: data || null };
  });

const sanitizeUrl = (url: string) => {
  let trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = "http://" + trimmed;
  }
  return trimmed;
};

const aiSettingsSchema = z.object({
  mode: z.enum(["local_only", "local_cloud", "full_cloud"]),
  ollamaUrl: z.string().trim().transform(sanitizeUrl).pipe(z.string().url().max(512)),
  ollamaModel: z.string().trim().min(1).max(256),
  openrouterUrl: z.string().trim().transform(sanitizeUrl).pipe(z.string().url().max(512)),
  openrouterKey: z.string().trim().max(512).nullable(),
  openrouterModel: z.string().trim().min(1).max(256),
});

export const updateAiSettingsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => aiSettingsSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Forbidden: admin only");
    const { error } = await context.supabase
      .from("ai_settings")
      .upsert({
        id: 1,
        mode: data.mode,
        ollama_url: data.ollamaUrl,
        ollama_model: data.ollamaModel,
        openrouter_url: data.openrouterUrl,
        openrouter_key: data.openrouterKey || null,
        openrouter_model: data.openrouterModel,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getOllamaModelsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ollamaUrl: z.string().trim().transform(sanitizeUrl).pipe(z.string().url()) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${data.ollamaUrl.replace(/\/$/, "")}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(id);
      
      if (!res.ok) {
        throw new Error(`Ollama returned status ${res.status}`);
      }
      const json = (await res.json()) as { models?: Array<{ name: string }> };
      const models = (json.models || []).map((m) => m.name);
      return { models };
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to connect to Ollama");
    }
  });

