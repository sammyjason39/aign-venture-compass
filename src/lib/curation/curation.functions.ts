import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  AiStatus,
  ArchetypeId,
  CategoryScores,
  JudgeScore,
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
    deckPath: row.deck_path,
    transcriptPath: row.transcript_path,
    archetype: row.archetype as ArchetypeId | null,
    archetypeConfidence: row.archetype_confidence,
    status: row.status as StartupStatus,
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
    });

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
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: myScores } = await context.supabase
      .from("judge_scores")
      .select("startup_id, submitted")
      .eq("judge_id", context.userId);

    const mySubmissions: Record<string, boolean> = {};
    for (const s of myScores ?? []) mySubmissions[s.startup_id] = s.submitted;

    return {
      startups: (rows ?? []).map(mapStartup),
      mySubmissions,
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
      .object({ id: z.string().uuid(), kind: z.enum(["deck", "transcript"]) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("startups")
      .select("deck_path, transcript_path")
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error(error?.message ?? "Startup not found");

    const path = data.kind === "deck" ? row.deck_path : row.transcript_path;
    if (!path) return { url: null as string | null };

    const { data: signed, error: signErr } = await context.supabase.storage
      .from("startup-files")
      .createSignedUrl(path, 300);
    if (signErr || !signed?.signedUrl) {
      throw new Error(signErr?.message ?? "Could not create download link");
    }
    return { url: signed.signedUrl as string };
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
