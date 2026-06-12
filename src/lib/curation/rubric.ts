import type { CategoryId, RecommendationId } from "./types";

export interface CategoryDef {
  id: CategoryId;
  label: string;
  short: string;
  weight: number; // percentage points, sums to 100
  helper: string;
  /** Rubric anchors for scores 1, 3, and 5. */
  anchors: { 1: string; 3: string; 5: string };
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: "problemMarket",
    label: "Problem & Market",
    short: "Problem",
    weight: 15,
    helper: "Urgency, frequency, cost of the problem and size of the addressable market.",
    anchors: {
      1: "Problem is unclear or not urgent.",
      3: "Problem is clear with early evidence of demand.",
      5: "Problem is urgent, frequent, expensive, and has a large addressable market.",
    },
  },
  {
    id: "aiRelevance",
    label: "AI Relevance",
    short: "AI",
    weight: 15,
    helper: "How central AI is to the product and the advantage it creates.",
    anchors: {
      1: "AI is mostly cosmetic or a wrapper.",
      3: "AI improves part of the workflow.",
      5: "AI is central and creates major performance, cost, personalization, or scalability advantage.",
    },
  },
  {
    id: "businessModel",
    label: "Business Model & ROI",
    short: "Business",
    weight: 15,
    helper: "Clarity of monetization, willingness to pay, and unit economics.",
    anchors: {
      1: "Monetization is unclear.",
      3: "Plausible revenue model with early willingness to pay.",
      5: "Validated revenue, measurable ROI, and unit economics that scale.",
    },
  },
  {
    id: "moat",
    label: "Moat / Defensibility",
    short: "Moat",
    weight: 15,
    helper: "Proprietary data, lock-in, technical depth, network effect, switching cost.",
    anchors: {
      1: "Easily copied.",
      3: "Some defensibility through workflow, data, or distribution.",
      5: "Strong moat: proprietary data, ecosystem lock-in, network effect, or switching cost.",
    },
  },
  {
    id: "founderExecution",
    label: "Founder Execution",
    short: "Founder",
    weight: 10,
    helper: "Founder-market fit, credibility, speed, and ability to build and sell.",
    anchors: {
      1: "Founder-market fit is weak.",
      3: "Relevant experience with early execution proof.",
      5: "Highly capable, credible, fast-moving founder who can sell, build, and lead.",
    },
  },
  {
    id: "ecosystemFit",
    label: "AIGN Ecosystem Fit",
    short: "Ecosystem",
    weight: 10,
    helper: "Usability, distribution, and scale across AIGN / Arta Graha business units.",
    anchors: {
      1: "No clear fit with AIGN.",
      3: "Can be piloted in one business unit.",
      5: "Can be used, distributed, or scaled across multiple AIGN / Arta Graha units.",
    },
  },
  {
    id: "prestige",
    label: "Prestige Value",
    short: "Prestige",
    weight: 7,
    helper: "Whether association improves AIGN's reputation and category standing.",
    anchors: {
      1: "Does not improve AIGN's reputation.",
      3: "Positions AIGN as a modern AI ecosystem supporter.",
      5: "Positions AIGN as a serious national AI ecosystem builder or category leader.",
    },
  },
  {
    id: "socialImpact",
    label: "Social Impact",
    short: "Impact",
    weight: 6,
    helper: "Meaningful access, productivity, education, employment, or inclusion.",
    anchors: {
      1: "Limited positive impact.",
      3: "Helps a specific group, community, industry, or workforce segment.",
      5: "Creates access, productivity, education, employment, or national-scale benefit.",
    },
  },
  {
    id: "transformational",
    label: "Transformational Potential",
    short: "Transform",
    weight: 7,
    helper: "Capacity to reshape how an industry, workforce, or market operates.",
    anchors: {
      1: "Only improves an existing process slightly.",
      3: "Changes a workflow or customer journey in a specific segment.",
      5: "Can reshape how an industry, workforce, or market operates.",
    },
  },
];

export const BUSINESS_CATEGORIES: CategoryId[] = [
  "problemMarket",
  "aiRelevance",
  "businessModel",
  "moat",
  "founderExecution",
];

export const STRATEGIC_CATEGORIES: CategoryId[] = [
  "prestige",
  "socialImpact",
  "transformational",
];

export const SCORE_LEGEND: { value: number; label: string }[] = [
  { value: 1, label: "Weak / unclear / mostly assumption" },
  { value: 2, label: "Early but not convincing" },
  { value: 3, label: "Some evidence / pilot-level" },
  { value: 4, label: "Strong / validated" },
  { value: 5, label: "Excellent / proven / scalable" },
];

export interface RecommendationDef {
  id: RecommendationId;
  label: string;
  range: string;
  description: string;
  tone: "fast" | "pilot" | "incubation" | "watch" | "reject";
}

export const RECOMMENDATIONS: Record<RecommendationId, RecommendationDef> = {
  fast_track: {
    id: "fast_track",
    label: "Fast Track",
    range: "86–100",
    description: "Priority startup. Move to investment committee.",
    tone: "fast",
  },
  pilot: {
    id: "pilot",
    label: "Pilot Candidate",
    range: "70–85",
    description: "Run a controlled commercial pilot to validate ROI.",
    tone: "pilot",
  },
  incubation: {
    id: "incubation",
    label: "Strategic Incubation",
    range: "56–69",
    description: "High strategic value. Incubate with ecosystem support.",
    tone: "incubation",
  },
  watchlist: {
    id: "watchlist",
    label: "Watchlist / Mentoring",
    range: "45–55",
    description: "Mentor and re-evaluate after key milestones.",
    tone: "watch",
  },
  reject: {
    id: "reject",
    label: "Reject / Revisit Later",
    range: "Below 45",
    description: "Decline for now; revisit if fundamentals improve.",
    tone: "reject",
  },
};

export function getCategory(id: CategoryId): CategoryDef {
  return CATEGORIES.find((c) => c.id === id)!;
}
