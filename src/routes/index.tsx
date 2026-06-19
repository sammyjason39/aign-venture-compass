import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Bot, Users, FileText } from "lucide-react";

import { Button } from "../components/ui/button";
import { ARCHETYPES } from "../lib/curation/archetypes";
import { CATEGORIES } from "../lib/curation/rubric";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AIGN Startup Curation System" },
      {
        name: "description",
        content:
          "Classify, score, and prioritize AI startups entering the AIGN ecosystem. AI scores every venture first; judges add the human verdict.",
      },
      { property: "og:title", content: "AIGN Startup Curation System" },
      {
        property: "og:description",
        content: "Classify, score, and prioritize AI startups entering the AIGN ecosystem.",
      },
    ],
  }),
  component: Landing,
});

const STEPS = [
  {
    icon: FileText,
    title: "Submit the startup",
    body: "Paste a description or drop in a deck (PPT/PDF) and an optional meeting transcript. No long forms.",
  },
  {
    icon: Bot,
    title: "AI evaluates first",
    body: "Lovable AI classifies the archetype and scores all nine factors 1–10 with a written rationale.",
  },
  {
    icon: Users,
    title: "Judges decide",
    body: "Invited judges review the AI baseline, then score 1–10 with their own justification. The average is the verdict.",
  },
];

function Landing() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-border bg-foreground text-background">
        <div className="grid-faint">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
            <p className="mono-label text-blue-soft">AIGN · AI Startup Ecosystem Framework</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Curate AI startups with clarity.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-background/70 sm:text-lg">
              AIGN evaluates every startup through business viability, AI relevance, ecosystem fit,
              prestige value, social impact, and transformational potential — AI scores first, your
              judges decide.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-lg px-6 text-sm">
                <Link to="/auth">
                  Start Evaluation
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <span className="mono-label text-background/50">
                {ARCHETYPES.length} archetypes · {CATEGORIES.length}-factor weighted rubric
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
        <p className="mono-label text-muted-foreground">How it works</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight text-foreground">
          A shared scoreboard for the venture committee.
        </h2>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-clean"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">
                  <s.icon className="h-5 w-5" />
                </span>
                <span className="mono-label text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="mt-4 text-lg font-bold tracking-tight text-foreground">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-mist p-6 sm:p-8">
          <BarChart3 className="h-6 w-6 text-primary" />
          <div className="flex-1">
            <h3 className="text-base font-bold tracking-tight text-foreground">
              Ready to score the pipeline?
            </h3>
            <p className="text-sm text-muted-foreground">
              Sign in to review startups, see AI baselines, and submit your verdict.
            </p>
          </div>
          <Button asChild>
            <Link to="/auth">
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
