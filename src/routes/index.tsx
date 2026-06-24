import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Bot, Users, FileText } from "lucide-react";

import { Button } from "../components/ui/button";
import { ARCHETYPES } from "../lib/curation/archetypes";
import { CATEGORIES } from "../lib/curation/rubric";
import heroImage from "../assets/venturis-hero.webp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Venturis — Score & curate AI ventures" },
      {
        name: "description",
        content:
          "Venturis is the venture curation scoreboard. AI scores every startup first across nine factors; your judges add the human verdict.",
      },
      { property: "og:title", content: "Venturis — Score & curate AI ventures" },
      {
        property: "og:description",
        content: "AI scores every startup first; your judges add the human verdict. One shared scoreboard.",
      },
      { property: "og:url", content: "https://venturis.live/" },
    ],
    links: [{ rel: "canonical", href: "https://venturis.live/" }],
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
    body: "Venturis classifies the archetype and scores all nine factors 1–10 with a written rationale.",
  },
  {
    icon: Users,
    title: "Judges decide",
    body: "Invited judges review the AI baseline, then score 1–10 with their own justification. The average is the verdict.",
  },
];

const QUOTES = ["Every venture, one scoreboard.", "AI scores first. Judges decide."];

function Landing() {
  return (
    <div>
      {/* Hero — split screen */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-2 lg:gap-16">
          {/* Left: copy */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3.5 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="mono-label text-muted-foreground">AI-scored venture curation</span>
            </span>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.04] tracking-tight text-foreground sm:text-6xl">
              Welcome to
              <br />
              <span className="text-primary">Venturis AIGN.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Venturis is your venture evaluation scoreboard. AI scores every startup first across nine
              factors&nbsp; business viability, AI relevance, ecosystem fit and more&nbsp; then your
              judges add the human verdict.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-lg px-6 text-sm">
                <Link to="/auth">
                  Get started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-lg px-6 text-sm">
                <Link to="/auth">Sign in</Link>
              </Button>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              For committees that want less guessing and sharper decisions.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {QUOTES.map((q) => (
                <div
                  key={q}
                  className="rounded-2xl border border-border bg-card px-5 py-4 text-sm font-medium text-foreground shadow-clean"
                >
                  “{q}”
                </div>
              ))}
            </div>
          </div>

          {/* Right: product image */}
          <div className="relative">
            <div className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-blue-soft/60 via-mist to-transparent blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              <img
                src={heroImage}
                alt="Venturis startup scoreboard showing AI scores alongside judge verdicts"
                width={1280}
                height={1024}
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
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
              {ARCHETYPES.length} archetypes · {CATEGORIES.length}-factor weighted rubric. Sign in to
              review startups, see AI baselines, and submit your verdict.
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
