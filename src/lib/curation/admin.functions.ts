import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SupabaseCtx = { supabase: any; userId: string };

async function requireAdmin(ctx: SupabaseCtx): Promise<void> {
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (data !== true) throw new Error("Forbidden: admin only");
}

export interface MemberRow {
  id: string;
  fullName: string | null;
  email: string | null;
  roles: string[];
}

export const listMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data: profiles, error } = await context.supabase
      .from("profiles")
      .select("id, full_name, email, created_at")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[DB error]", error.message);
      throw new Error("An unexpected database error occurred.");
    }

    const { data: roleRows } = await context.supabase
      .from("user_roles")
      .select("user_id, role");
    const roleMap: Record<string, string[]> = {};
    for (const r of roleRows ?? []) {
      (roleMap[r.user_id] ??= []).push(r.role);
    }

    const members: MemberRow[] = (profiles ?? []).map((p: any) => ({
      id: p.id,
      fullName: p.full_name,
      email: p.email,
      roles: roleMap[p.id] ?? [],
    }));
    return { members };
  });

export const setMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["admin", "judge"]),
        grant: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (data.grant) {
      const { error } = await context.supabase
        .from("user_roles")
        .upsert(
          { user_id: data.userId, role: data.role },
          { onConflict: "user_id,role" },
        );
      if (error) {
      console.error("[DB error]", error.message);
      throw new Error("An unexpected database error occurred.");
    }
    } else {
      // Never let an admin strip their own admin role (avoid lockout).
      if (data.role === "admin" && data.userId === context.userId) {
        throw new Error("You cannot remove your own admin role.");
      }
      const { error } = await context.supabase
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) {
      console.error("[DB error]", error.message);
      throw new Error("An unexpected database error occurred.");
    }
    }
    return { ok: true };
  });

const inviteSchema = z.object({
  email: z.string().trim().email().max(255),
  fullName: z.string().trim().max(160).optional().default(""),
  password: z.string().min(8).max(72),
});

export const inviteJudge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inviteSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Keep the allowlist authoritative so the account survives any re-sync.
    await supabaseAdmin
      .from("allowed_users")
      .upsert({ email: data.email.toLowerCase(), role: "judge" }, { onConflict: "email" });

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName || null },
    });
    if (error) {
      console.error("[DB error]", error.message);
      throw new Error("An unexpected database error occurred.");
    }

    const newId = created.user?.id;
    if (newId) {
      // The signup trigger grants 'judge'; ensure it exists regardless.
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: newId, role: "judge" }, { onConflict: "user_id,role" });
    }
    return { ok: true, id: newId };
  });
