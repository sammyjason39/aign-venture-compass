export interface FormField {
  id: string;
  label: string;
  helper: string;
  type: "text" | "textarea" | "select";
  options?: string[];
  placeholder?: string;
}

export interface FormSection {
  id: string;
  letter: string;
  title: string;
  subtitle: string;
  fields: FormField[];
}

export const FORM_SECTIONS: FormSection[] = [
  {
    id: "identity",
    letter: "A",
    title: "Basic Identity",
    subtitle: "Who they are and what they do in one breath.",
    fields: [
      { id: "startupName", label: "Startup Name", helper: "The legal or operating name of the company.", type: "text", placeholder: "e.g. Lindra AI" },
      { id: "website", label: "Website / Deck Link", helper: "A link to the site or pitch deck for reference.", type: "text", placeholder: "https://" },
      { id: "founderName", label: "Founder Name", helper: "The primary founder or CEO.", type: "text" },
      { id: "founderBackground", label: "Founder Background", helper: "Relevant experience, prior exits, and domain expertise.", type: "textarea" },
      { id: "teamSize", label: "Team Size", helper: "Number of full-time people today.", type: "text", placeholder: "e.g. 12" },
      { id: "location", label: "Location", helper: "Headquarters and primary market.", type: "text" },
      { id: "sector", label: "Industry / Sector", helper: "The core industry or vertical they operate in.", type: "text" },
      { id: "oneLiner", label: "One-liner Description", helper: "The single sentence that explains the company.", type: "textarea", placeholder: "We help X do Y using Z." },
    ],
  },
  {
    id: "problem",
    letter: "B",
    title: "Problem & Market",
    subtitle: "The pain, the buyer, and how big the opportunity is.",
    fields: [
      { id: "problem", label: "What problem does this startup solve?", helper: "Describe the pain concretely, not in abstractions.", type: "textarea" },
      { id: "targetUser", label: "Who is the target user or customer?", helper: "The specific person or organization who pays or uses.", type: "textarea" },
      { id: "urgency", label: "How urgent is the problem?", helper: "Is it a painkiller or a vitamin?", type: "select", options: ["Critical — solved today, painfully", "High — actively seeking solutions", "Moderate — aware but not urgent", "Low — nice to have"] },
      { id: "marketSize", label: "How large is the market?", helper: "Order of magnitude of the addressable market.", type: "textarea" },
      { id: "budgeted", label: "Is this problem already budgeted?", helper: "Do companies or consumers already pay for this?", type: "select", options: ["Yes — existing budget line", "Partly — adjacent budget exists", "No — new budget required"] },
    ],
  },
  {
    id: "solution",
    letter: "C",
    title: "Solution & AI Relevance",
    subtitle: "What they built and how central AI really is.",
    fields: [
      { id: "solution", label: "Describe the product or solution.", helper: "What the product actually does for the user.", type: "textarea" },
      { id: "aiCapability", label: "What AI capability is used?", helper: "Models, agents, retrieval, vision, speech, etc.", type: "textarea" },
      { id: "aiCore", label: "Is AI core to the product or an add-on?", helper: "Would the product work without AI?", type: "select", options: ["Core — product cannot exist without AI", "Significant — AI drives the main value", "Add-on — AI improves an existing product", "Cosmetic — AI is mostly marketing"] },
      { id: "aiStack", label: "What model, agent, data, or workflow does it use?", helper: "The technical substance behind the AI claim.", type: "textarea" },
      { id: "aiAdvantage", label: "What becomes faster, cheaper, smarter, or more scalable?", helper: "The concrete advantage AI unlocks.", type: "textarea" },
    ],
  },
  {
    id: "business",
    letter: "D",
    title: "Business Model & ROI",
    subtitle: "How they make money and what customers get back.",
    fields: [
      { id: "revenueModel", label: "Revenue model", helper: "Subscription, usage, transaction, license, etc.", type: "textarea" },
      { id: "pricing", label: "Current pricing", helper: "Price points and packaging today.", type: "textarea" },
      { id: "revenue", label: "Current revenue / MRR / ARR", helper: "Actual numbers, or 'pre-revenue' if none.", type: "text" },
      { id: "acquisition", label: "Customer acquisition strategy", helper: "How they reach and convert customers.", type: "textarea" },
      { id: "unitEconomics", label: "Unit economics", helper: "CAC, LTV, gross margin, payback if known.", type: "textarea" },
      { id: "costStructure", label: "Main cost structure", helper: "Where the money goes — compute, people, GTM.", type: "textarea" },
      { id: "roi", label: "Expected ROI for users or customers", helper: "The measurable return the customer receives.", type: "textarea" },
    ],
  },
  {
    id: "traction",
    letter: "E",
    title: "Traction & Execution",
    subtitle: "Proof of demand and the team's ability to deliver.",
    fields: [
      { id: "users", label: "Current users / clients / pilots", helper: "Real adoption numbers and named logos.", type: "textarea" },
      { id: "partnerships", label: "Key partnerships", helper: "Distribution, data, or integration partners.", type: "textarea" },
      { id: "maturity", label: "Product maturity", helper: "Where the product is in its lifecycle.", type: "select", options: ["Idea / concept", "Prototype", "MVP in market", "Scaling", "Mature"] },
      { id: "founderExecution", label: "Founder execution strength", helper: "Evidence of speed, judgment, and delivery.", type: "textarea" },
      { id: "salesCapability", label: "Sales capability", helper: "Can they sell, and who is doing it?", type: "textarea" },
      { id: "technicalCapability", label: "Technical capability", helper: "Depth and credibility of the technical team.", type: "textarea" },
      { id: "demandEvidence", label: "Evidence of demand", helper: "Waitlists, retention, renewals, pull signals.", type: "textarea" },
    ],
  },
  {
    id: "moat",
    letter: "F",
    title: "Moat & Defensibility",
    subtitle: "What stops a well-funded competitor from copying this.",
    fields: [
      { id: "proprietaryData", label: "Proprietary data", helper: "Unique datasets that compound over time.", type: "textarea" },
      { id: "uniqueWorkflow", label: "Unique workflow", helper: "A process advantage that is hard to replicate.", type: "textarea" },
      { id: "distribution", label: "Distribution advantage", helper: "Privileged channels to reach customers.", type: "textarea" },
      { id: "technicalAdvantage", label: "Technical advantage", helper: "Hard engineering or research edge.", type: "textarea" },
      { id: "brandAdvantage", label: "Brand advantage", helper: "Trust, reputation, or category ownership.", type: "textarea" },
      { id: "networkEffect", label: "Network effect", helper: "Does value grow as more users join?", type: "textarea" },
      { id: "switchingCost", label: "Switching cost", helper: "What makes leaving painful for customers?", type: "textarea" },
    ],
  },
  {
    id: "ecosystem",
    letter: "G",
    title: "AIGN Ecosystem Fit",
    subtitle: "How this connects to the broader AIGN / Arta Graha ecosystem.",
    fields: [
      { id: "businessUnits", label: "Which AIGN / Arta Graha units can use this?", helper: "Name the specific business units or sectors.", type: "textarea" },
      { id: "internalPilot", label: "Can it be piloted inside the ecosystem?", helper: "A realistic first internal use case.", type: "textarea" },
      { id: "leverage", label: "Can AIGN provide distribution, data, customers, or funding leverage?", helper: "The unfair advantage AIGN can add.", type: "textarea" },
      { id: "strengthensEcosystem", label: "Can this strengthen the broader AIGN ecosystem?", helper: "Second-order benefits across the group.", type: "textarea" },
    ],
  },
  {
    id: "strategic",
    letter: "H",
    title: "Strategic Value",
    subtitle: "Prestige, impact, and transformational upside.",
    fields: [
      { id: "prestige", label: "Prestige value", helper: "Can this improve AIGN's reputation and standing?", type: "textarea" },
      { id: "socialImpact", label: "Social impact", helper: "Can this create meaningful positive impact?", type: "textarea" },
      { id: "transformational", label: "Transformational potential", helper: "Can this change how an industry works?", type: "textarea" },
      { id: "proudReason", label: "Why would AIGN be proud to be associated?", helper: "The narrative AIGN would tell publicly.", type: "textarea" },
    ],
  },
  {
    id: "risks",
    letter: "I",
    title: "Risks",
    subtitle: "Where this could fail or create exposure.",
    fields: [
      { id: "technicalRisk", label: "Technical risk", helper: "Feasibility, model reliability, scaling risk.", type: "textarea" },
      { id: "marketRisk", label: "Market risk", helper: "Timing, adoption, and demand risk.", type: "textarea" },
      { id: "regulatoryRisk", label: "Regulatory risk", helper: "Compliance, licensing, and policy exposure.", type: "textarea" },
      { id: "founderRisk", label: "Founder risk", helper: "Key-person, governance, and team risk.", type: "textarea" },
      { id: "capitalIntensity", label: "Capital intensity", helper: "How much capital is required to win.", type: "textarea" },
      { id: "competitionRisk", label: "Competition risk", helper: "Incumbents and well-funded challengers.", type: "textarea" },
      { id: "ethicalRisk", label: "Ethical / safety risk", helper: "Misuse, bias, safety, and reputational risk.", type: "textarea" },
    ],
  },
];

export function emptyForm(): Record<string, string> {
  const f: Record<string, string> = {};
  for (const section of FORM_SECTIONS) {
    for (const field of section.fields) f[field.id] = "";
  }
  return f;
}
