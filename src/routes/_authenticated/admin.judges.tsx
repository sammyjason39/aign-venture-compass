import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2, ShieldCheck, UserPlus } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { listMembers, setMemberRole, inviteJudge } from "../../lib/curation/admin.functions";
import { getMyRoles } from "../../lib/curation/curation.functions";
import { useRoles } from "../../hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/judges")({
  head: () => ({ meta: [{ title: "Judges — Venturis Curation" }] }),
  beforeLoad: async () => {
    const { roles } = await getMyRoles();
    if (!roles.includes("admin")) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: JudgesAdmin,
});

function JudgesAdmin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, loading } = useRoles();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Admins only.");
      navigate({ to: "/dashboard" });
    }
  }, [loading, isAdmin, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: () => listMembers(),
    enabled: isAdmin,
  });

  async function toggleRole(userId: string, role: "admin" | "judge", grant: boolean) {
    try {
      await setMemberRole({ data: { userId, role, grant } });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Role updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update role");
    }
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setInviting(true);
    try {
      await inviteJudge({ data: { email: email.trim(), fullName: fullName.trim(), password } });
      toast.success("Judge account created.");
      setEmail("");
      setFullName("");
      setPassword("");
      queryClient.invalidateQueries({ queryKey: ["members"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create judge");
    } finally {
      setInviting(false);
    }
  }

  const members = data?.members ?? [];

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
      <Link to="/dashboard" className="mono-label inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Pipeline
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Judges & access</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Create judge accounts and manage who can administer the system.
      </p>

      <form onSubmit={invite} className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-clean">
        <h3 className="flex items-center gap-2 text-base font-bold tracking-tight text-foreground">
          <UserPlus className="h-4 w-4 text-primary" /> Create a judge
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="password">Temp password *</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="min 8 chars" className="mt-1.5" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={inviting}>
            {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Create judge
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Share the email and temporary password with the judge so they can sign in.
        </p>
      </form>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-clean">
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-base font-bold tracking-tight text-foreground">Members</h3>
        </div>
        {isLoading ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">Loading members…</p>
        ) : (
          <ul className="divide-y divide-border">
            {members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">{m.fullName ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <span className="mono-label text-muted-foreground">Judge</span>
                    <Switch
                      checked={m.roles.includes("judge")}
                      onCheckedChange={(v) => toggleRole(m.id, "judge", v)}
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="mono-label flex items-center gap-1 text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5" /> Admin
                    </span>
                    <Switch
                      checked={m.roles.includes("admin")}
                      onCheckedChange={(v) => toggleRole(m.id, "admin", v)}
                    />
                  </label>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
