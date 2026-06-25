import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Loader2, ShieldCheck, User } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useSession, useRoles } from "../../hooks/use-auth";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Venturis Curation" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useSession();
  const { isAdmin, isJudge } = useRoles();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const fullName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    null;

  const roleLabel = isAdmin ? "Super Admin" : isJudge ? "Judge" : "Member";

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated.");
      setPassword("");
      setConfirm("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
      <Link
        to="/dashboard"
        className="mono-label inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Pipeline
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your account details and security settings.
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-clean">
        <h3 className="flex items-center gap-2 text-base font-bold tracking-tight text-foreground">
          <User className="h-4 w-4 text-primary" /> Account
        </h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="mono-label text-muted-foreground">Full name</dt>
            <dd className="mt-1 text-sm font-semibold text-foreground">{fullName ?? "—"}</dd>
          </div>
          <div>
            <dt className="mono-label text-muted-foreground">Email</dt>
            <dd className="mt-1 text-sm font-semibold text-foreground">{user?.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="mono-label text-muted-foreground">Role</dt>
            <dd className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> {roleLabel}
            </dd>
          </div>
        </dl>
      </div>

      <form
        onSubmit={changePassword}
        className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-clean"
      >
        <h3 className="flex items-center gap-2 text-base font-bold tracking-tight text-foreground">
          <KeyRound className="h-4 w-4 text-primary" /> Change password
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Set a new password to replace your temporary one.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="min 8 chars"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="repeat password"
              className="mt-1.5"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Update password
          </Button>
        </div>
      </form>
    </div>
  );
}
