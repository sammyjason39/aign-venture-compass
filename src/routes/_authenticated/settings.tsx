import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, Settings, Eye, EyeOff } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { getAiSettingsFn, updateAiSettingsFn } from "../../lib/curation/curation.functions";
import { useRoles } from "../../hooks/use-auth";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "AI Settings — Venturis Curation" }] }),
  component: AiSettingsPage,
});

function AiSettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, loading } = useRoles();

  const [mode, setMode] = useState<"local_only" | "local_cloud" | "full_cloud">("full_cloud");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState("llama3");
  const [openrouterUrl, setOpenrouterUrl] = useState("https://openrouter.ai/api/v1");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [openrouterModel, setOpenrouterModel] = useState("google/gemini-2.5-flash");
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Admins only.");
      navigate({ to: "/dashboard" });
    }
  }, [loading, isAdmin, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["ai_settings"],
    queryFn: () => getAiSettingsFn(),
    enabled: isAdmin,
  });

  useEffect(() => {
    if (data?.settings) {
      const s = data.settings;
      setMode(s.mode as any);
      setOllamaUrl(s.ollama_url || "http://localhost:11434");
      setOllamaModel(s.ollama_model || "llama3");
      setOpenrouterUrl(s.openrouter_url || "https://openrouter.ai/api/v1");
      setOpenrouterKey(s.openrouter_key || "");
      setOpenrouterModel(s.openrouter_model || "google/gemini-2.5-flash");
    }
  }, [data]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateAiSettingsFn({
        data: {
          mode,
          ollamaUrl: ollamaUrl.trim(),
          ollamaModel: ollamaModel.trim(),
          openrouterUrl: openrouterUrl.trim(),
          openrouterKey: openrouterKey.trim() || null,
          openrouterModel: openrouterModel.trim(),
        },
      });
      toast.success("AI settings saved successfully.");
      queryClient.invalidateQueries({ queryKey: ["ai_settings"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save AI settings.");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Link to="/dashboard" className="mono-label inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Pipeline
      </Link>
      
      <div className="mt-4 flex items-center gap-2.5">
        <Settings className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">AI Evaluation Settings</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Configure the AI models and endpoints used to evaluate startups and analyze financial reports.
      </p>

      <form onSubmit={handleSave} className="mt-8 space-y-8">
        {/* AI Deployment Mode */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">AI Deployment Mode</h2>
          <p className="text-xs text-muted-foreground mt-0.5 mb-4">
            Choose where the AI evaluations are executed.
          </p>
          
          <RadioGroup
            value={mode}
            onValueChange={(val: any) => setMode(val)}
            className="grid gap-4 sm:grid-cols-3"
          >
            <Label
              htmlFor="mode-local"
              className={`flex flex-col justify-between rounded-lg border p-4 hover:bg-accent/50 cursor-pointer transition-colors ${
                mode === "local_only" ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="local_only" id="mode-local" />
                <span className="font-semibold">Local Only</span>
              </div>
              <span className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Run evaluations entirely on your local machine using Ollama. No data is sent to the cloud.
              </span>
            </Label>

            <Label
              htmlFor="mode-hybrid"
              className={`flex flex-col justify-between rounded-lg border p-4 hover:bg-accent/50 cursor-pointer transition-colors ${
                mode === "local_cloud" ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="local_cloud" id="mode-hybrid" />
                <span className="font-semibold">Local + Cloud</span>
              </div>
              <span className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Try local Ollama first. If it is offline or fails, automatically fallback to OpenRouter cloud.
              </span>
            </Label>

            <Label
              htmlFor="mode-cloud"
              className={`flex flex-col justify-between rounded-lg border p-4 hover:bg-accent/50 cursor-pointer transition-colors ${
                mode === "full_cloud" ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="full_cloud" id="mode-cloud" />
                <span className="font-semibold">Full Cloud</span>
              </div>
              <span className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Use OpenRouter cloud models directly for maximum accuracy, speed, and multimodal support.
              </span>
            </Label>
          </RadioGroup>
        </div>

        {/* Ollama Configuration */}
        {(mode === "local_only" || mode === "local_cloud") && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Local AI (Ollama)</h2>
            <p className="text-xs text-muted-foreground -mt-3 mb-2">
              Ensure Ollama is running locally and the model is pulled before running evaluations.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ollamaUrl">Ollama API URL</Label>
                <Input
                  id="ollamaUrl"
                  type="url"
                  placeholder="http://localhost:11434"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ollamaModel">Ollama Model Name</Label>
                <Input
                  id="ollamaModel"
                  type="text"
                  placeholder="llama3"
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                  required
                />
                <p className="text-[10px] text-muted-foreground">
                  E.g., <code className="bg-muted px-1 py-0.5 rounded">llama3</code>, <code className="bg-muted px-1 py-0.5 rounded">mistral</code>, or <code className="bg-muted px-1 py-0.5 rounded">phi3</code>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* OpenRouter Configuration */}
        {(mode === "full_cloud" || mode === "local_cloud") && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Cloud AI (OpenRouter)</h2>
            <p className="text-xs text-muted-foreground -mt-3 mb-2">
              OpenRouter provides access to top tier models like Gemini, Claude, and GPT.
            </p>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="openrouterUrl">OpenRouter API URL</Label>
                  <Input
                    id="openrouterUrl"
                    type="url"
                    placeholder="https://openrouter.ai/api/v1"
                    value={openrouterUrl}
                    onChange={(e) => setOpenrouterUrl(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="openrouterModel">OpenRouter Model Name</Label>
                  <Input
                    id="openrouterModel"
                    type="text"
                    placeholder="google/gemini-2.5-flash"
                    value={openrouterModel}
                    onChange={(e) => setOpenrouterModel(e.target.value)}
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">
                    E.g., <code className="bg-muted px-1 py-0.5 rounded">google/gemini-2.5-flash</code> or <code className="bg-muted px-1 py-0.5 rounded">anthropic/claude-3-haiku</code>.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="openrouterKey">OpenRouter API Key</Label>
                <div className="relative">
                  <Input
                    id="openrouterKey"
                    type={showKey ? "text" : "password"}
                    placeholder="sk-or-..."
                    value={openrouterKey}
                    onChange={(e) => setOpenrouterKey(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Get your key from <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-primary underline">OpenRouter Keys</a>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
