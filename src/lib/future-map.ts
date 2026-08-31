export type Actor = "you" | "agent" | "system";
export type RouteId = "ship" | "research" | "community";
export type ProofId = "delivered_project" | "public_collaboration" | "mentor_feedback";
export type Scenario = "baseline" | "take" | "miss" | "rerouted";
export type NodeKind = "opportunity" | "evidence" | "bridge" | "destination";
export type NodeStatus =
  | "available"
  | "ready"
  | "checking"
  | "future"
  | "locked"
  | "ineligible"
  | "expired"
  | "blocked"
  | "simulated"
  | "strengthened"
  | "destination";
export type EdgeType = "official" | "creates" | "signal" | "blocked";

export type WorkModePreference = "Remote first" | "Hybrid okay" | "On-site okay";
export type CompensationPreference = "Paid preferred" | "Paid only" | "Any compensation";
export type TimePreference = "Up to 10 hrs / week" | "Up to 20 hrs / week" | "Flexible time";
export type SchedulePreference = "During semester" | "Break only" | "Any schedule";
export type ParticipationPreference = "Solo or small team" | "Team okay" | "Solo only";

export type PathPreferences = {
  workMode: WorkModePreference;
  compensation: CompensationPreference;
  timeCommitment: TimePreference;
  schedule: SchedulePreference;
  participation: ParticipationPreference;
};

export type Profile = {
  name: string;
  age: number;
  goal: string;
  targetYear: number;
  graduationMonth: string;
  nationality: string;
  residence: string;
  universityLocation: string;
  studyStatus: string;
  fieldOfStudy: string;
  workAuthorization: string;
  strengths: string[];
  credentials: string[];
  gap: string;
  constraints: string[];
  preferences: PathPreferences;
};

export type PathNode = {
  id: string;
  routeId: RouteId;
  stage: number;
  kind: NodeKind;
  eyebrow: string;
  title: string;
  date: string;
  status: NodeStatus;
  description: string;
  sourceLabel?: string;
  sourceUrl?: string;
  sourceClause?: string;
  evidence: string[];
  edgeToNext?: { type: EdgeType; label: string };
};

export type Route = {
  id: RouteId;
  number: string;
  label: string;
  fit: number;
  eta: string;
  summary: string;
  accent: string;
  nodes: PathNode[];
};

export type RouteFit = {
  matches: number;
  total: number;
  reasons: string[];
};

export type CareerGoal = {
  id: string;
  title: string;
  shortLabel: string;
  targetYear: number;
  gap: string;
  supportedRoutes: RouteId[];
};

export type BridgeProposal = {
  state: "none" | "staged" | "approved";
  stagedBy: Actor;
  title: string;
  rationale: string;
  sourceLabel: string;
  sourceUrl: string;
  sourceClause: string;
  outputs: string[];
  eta: string;
};

export type OpportunityCandidate = {
  id: string;
  state: "review" | "connected";
  title: string;
  rationale: string;
  sourceLabel: string;
  sourceUrl: string;
  sourceClause: string;
  deadlineMonth: string;
  deadlineText: string;
  requirements: string[];
  missingFact?: string;
  prerequisite?: string;
  outputs: string[];
  checkedAt: string;
};

export type OpportunityReview = {
  status: "needs_fact" | "ready" | "saved_only" | "connected";
  label: string;
  canConnect: boolean;
  nextAction: string;
  pathAnswer: string;
};

export type Activity = {
  id: string;
  actor: Actor;
  label: string;
  detail: string;
  toolName?: string;
  source?: string;
  stateDiff?: string;
  timestamp?: string;
};

export type ProofReceipt = {
  proofId: ProofId;
  title: string;
  artifactUrl: string;
  sourceLabel: string;
  verificationNote: string;
  attachedAt: string;
};

export type FutureDoorsState = {
  profile: Profile;
  goals: CareerGoal[];
  selectedGoalId: string;
  selectedMonth: string;
  selectedRouteId: RouteId;
  selectedNodeId: string;
  scenario: Scenario;
  bridge: BridgeProposal;
  opportunities: OpportunityCandidate[];
  priorities: RouteId[];
  priorityProposal: {
    state: "none" | "staged";
    routeIds: RouteId[];
    rationale: string;
  };
  proofReceipts: ProofReceipt[];
  proofProposal: {
    state: "none" | "staged";
    proofId: ProofId | null;
    title: string;
    artifactUrl: string;
    sourceLabel: string;
    verificationNote: string;
  };
  pinnedConstraints: string[];
  activity: Activity[];
  replayToken: number;
};

export const PATH_START = "2026-08";
export const PATH_END = "2040-12";
export const ROUTE_IDS = ["ship", "community", "research"] as const;
export const PROOF_IDS = ["delivered_project", "public_collaboration", "mentor_feedback"] as const;
export const ROUTE_PROOF: Record<RouteId, ProofId> = { ship: "delivered_project", community: "public_collaboration", research: "mentor_feedback" };
export const DOOR_IDS = ["ship-challenge"] as const;

export class PathInputError extends Error {
  constructor(public readonly code: string, message: string) {
    super(`[${code}] ${message}`);
    this.name = "PathInputError";
  }
}

export function requireRouteId(value: unknown): RouteId {
  if (typeof value !== "string" || !ROUTE_IDS.includes(value as RouteId)) {
    throw new PathInputError("INVALID_ROUTE_ID", `Use one of: ${ROUTE_IDS.join(", ")}.`);
  }
  return value as RouteId;
}

export function requireProofId(value: unknown): ProofId {
  if (typeof value !== "string" || !PROOF_IDS.includes(value as ProofId)) {
    throw new PathInputError("INVALID_PROOF_ID", `Use one of: ${PROOF_IDS.join(", ")}.`);
  }
  return value as ProofId;
}

export function requireDoorId(value: unknown) {
  if (typeof value !== "string" || !DOOR_IDS.includes(value as (typeof DOOR_IDS)[number])) {
    throw new PathInputError("INVALID_DOOR_ID", `Use one of: ${DOOR_IDS.join(", ")}.`);
  }
  return value as (typeof DOOR_IDS)[number];
}

export function requirePathMonth(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw new PathInputError("INVALID_MONTH_FORMAT", "Use YYYY-MM, for example 2027-06.");
  }
  if (value < PATH_START || value > PATH_END) {
    throw new PathInputError("MONTH_OUT_OF_RANGE", `Choose a month from ${PATH_START} through ${PATH_END}.`);
  }
  return value;
}

export const statusLabels: Record<NodeStatus, string> = {
  available: "OPEN NOW",
  ready: "OPEN NEXT",
  checking: "CHECK FIRST",
  future: "OPENS LATER",
  locked: "NOT OPEN YET",
  ineligible: "NOT THIS COHORT",
  expired: "MISSED",
  blocked: "NEEDS ANOTHER WAY",
  simulated: "DONE IN TRY-OUT",
  strengthened: "CLOSER",
  destination: "GOAL",
};

export const edgeLabels: Record<EdgeType, string> = {
  official: "OPENS THE NEXT STEP",
  creates: "MAKES WHAT THE NEXT STEP NEEDS",
  signal: "HELPS — NEVER GUARANTEES",
  blocked: "THE NEXT STEP IS MISSING SOMETHING",
};

export const initialState: FutureDoorsState = {
  profile: {
    name: "Maya Park",
    age: 23,
    goal: "AI Product Builder",
    targetYear: 2030,
    graduationMonth: "2027-06",
    nationality: "South Korea",
    residence: "South Korea",
    universityLocation: "South Korea",
    studyStatus: "Undergraduate",
    fieldOfStudy: "Information Systems",
    workAuthorization: "Needs confirmation by country",
    strengths: ["Fast prototyping", "Product storytelling"],
    credentials: [],
    gap: "Public work and mentor feedback",
    constraints: ["≤ 10 hrs / week", "Low or no cost", "Remote-friendly"],
    preferences: {
      workMode: "Remote first",
      compensation: "Paid preferred",
      timeCommitment: "Up to 10 hrs / week",
      schedule: "During semester",
      participation: "Solo or small team",
    },
  },
  goals: [
    { id: "ai-product", title: "AI Product Builder", shortLabel: "AI products", targetYear: 2030, gap: "Public work and mentor feedback", supportedRoutes: ["ship", "community", "research"] },
    { id: "hardware-story", title: "Semiconductor Product Storyteller", shortLabel: "Hardware", targetYear: 2030, gap: "Technical proof people can understand", supportedRoutes: ["community", "research"] },
    { id: "learning-founder", title: "Global Learning Product Founder", shortLabel: "Learning", targetYear: 2030, gap: "A product case study with learner feedback", supportedRoutes: ["ship", "community"] },
  ],
  selectedGoalId: "ai-product",
  selectedMonth: "2026-08",
  selectedRouteId: "ship",
  selectedNodeId: "ship-challenge",
  scenario: "baseline",
  bridge: {
    state: "none",
    stagedBy: "system",
    title: "Open-source contribution sprint",
    rationale: "Make one bounded public contribution now, so the next application has real work and review history to use.",
    sourceLabel: "GitHub Docs · Contributing to open source",
    sourceUrl: "https://docs.github.com/en/get-started/exploring-projects-on-github/finding-ways-to-contribute-to-open-source-on-github",
    sourceClause: "GitHub documents issue labels, contribution guidelines, and bounded ways to begin contributing to an open-source repository.",
    outputs: ["Public contribution", "Review trail", "Maintainer feedback"],
    eta: "4–8 weeks",
  },
  opportunities: [],
  priorities: [],
  priorityProposal: { state: "none", routeIds: [], rationale: "" },
  proofReceipts: [],
  proofProposal: { state: "none", proofId: null, title: "", artifactUrl: "", sourceLabel: "", verificationNote: "" },
  pinnedConstraints: ["≤ 10 hrs / week", "Low or no cost", "Remote-friendly"],
  activity: [
    {
      id: "seed-route",
      actor: "system",
      label: "Three routes compiled",
      detail: "One official rule is ready to inspect.",
    },
  ],
  replayToken: 0,
};

export function monthNumber(date: string) {
  const [year, month] = date.split("-").map(Number);
  return year * 12 + month - 1;
}

export function monthFromNumber(value: number) {
  const year = Math.floor(value / 12);
  const month = (value % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function formatMonth(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}-01T00:00:00Z`));
}

const SHOWABLE_PRODUCT_WORK = [
  /\blive (app|site|product|demo)\b/i,
  /\bpublic (code|repo|repository|project|demo|case study|portfolio)\b/i,
  /\b(product|project) (demo|prototype|case study|launch|walkthrough)\b/i,
  /\bworking (app|site|prototype|product)\b/i,
  /\b(case study|portfolio|demo video|demo narrative|recorded demo)\b/i,
];

export function reviewOpportunity(candidate: OpportunityCandidate): OpportunityReview {
  if (candidate.state === "connected") {
    return {
      status: "connected",
      label: "ON YOUR PATH",
      canConnect: true,
      nextAction: "See it on your path",
      pathAnswer: "Yes — you chose to use this opportunity on the current path.",
    };
  }
  if (candidate.missingFact?.trim()) {
    return {
      status: "needs_fact",
      label: "1 DETAIL NEEDED",
      canConnect: false,
      nextAction: `Answer: ${candidate.missingFact}`,
      pathAnswer: "Not yet — one detail about you is still missing.",
    };
  }
  if (candidate.outputs.some((item) => SHOWABLE_PRODUCT_WORK.some((pattern) => pattern.test(item)))) {
    return {
      status: "ready",
      label: "READY TO ADD",
      canConnect: true,
      nextAction: "Review and add it to your path",
      pathAnswer: "Yes — it creates work you can show at the next step.",
    };
  }
  return {
    status: "saved_only",
    label: "SAVED FOR LATER",
    canConnect: false,
    nextAction: "Keep it saved, but do not add it to this path",
    pathAnswer: "Not on this path — its result does not support the next step.",
  };
}

export function getConnectedOpportunity(state: FutureDoorsState) {
  return state.opportunities.find((candidate) => candidate.state === "connected");
}

export function isDefaultOutreachyCohortMismatch(state: FutureDoorsState) {
  return !getConnectedOpportunity(state)
    && /undergraduate|student/i.test(state.profile.studyStatus)
    && state.profile.universityLocation.trim().toLowerCase() === "south korea";
}

function shipNodes(state: FutureDoorsState): PathNode[] {
  const missed = state.scenario === "miss";
  const rerouted = state.scenario === "rerouted";
  const taken = state.scenario === "take";
  const challengeMissed = missed || rerouted;
  const connected = getConnectedOpportunity(state);
  const imported = Boolean(connected);
  const deadlineMonth = connected?.deadlineMonth ?? "2026-08";
  const opportunityTitle = connected?.title ?? "Outreachy · Dec 2026";
  const opportunityOutputs = connected?.outputs ?? ["Public contribution", "Mentor feedback", "Project plan"];
  const challengeExpired = monthNumber(state.selectedMonth) > monthNumber(deadlineMonth) && !taken;
  const defaultCohortMismatch = isDefaultOutreachyCohortMismatch(state);
  const hasSimulatedResult = taken && !defaultCohortMismatch;

  return [
    {
      id: "ship-challenge",
      routeId: "ship",
      stage: 1,
      kind: "opportunity",
      eyebrow: "DOOR 01 · COMPETE",
      title: opportunityTitle,
      date: imported ? `Closes · ${formatMonth(deadlineMonth)}` : "Sep 1 · 1 AM KST",
      status: defaultCohortMismatch ? "ineligible" : taken ? "simulated" : challengeMissed || challengeExpired ? "expired" : imported ? "available" : "checking",
      description: defaultCohortMismatch
        ? "The official rule does not match this confirmed profile: Maya is an undergraduate at a university in South Korea, so the December cohort is not available to her."
        : taken
          ? "Simulated completion only. No real application fact was added to your profile."
        : challengeMissed || challengeExpired
          ? "The deadline passed, so this route no longer creates the work needed for the next step."
          : imported
            ? connected?.rationale ?? ""
            : "A paid remote open-source internship. Student calendar and 30-hour availability rules must be checked before it joins the path.",
      sourceLabel: imported ? connected?.sourceLabel : "Official Outreachy Applicant Guide",
      sourceUrl: imported ? connected?.sourceUrl : "https://www.outreachy.org/docs/applicant/",
      sourceClause: imported ? connected?.sourceClause : "Northern Hemisphere university students may only apply to the May–August cohort; the December 2026 initial application closes Aug 31 at 16:00 UTC.",
      evidence: opportunityOutputs,
      edgeToNext: {
        type: defaultCohortMismatch || (challengeMissed && !rerouted) ? "blocked" : "creates",
        label: defaultCohortMismatch
          ? "RULE DOES NOT MATCH — DO NOT TAKE"
          : challengeMissed && !rerouted
          ? "NEEDED WORK NOT CREATED"
          : challengeMissed && rerouted
            ? "A DIFFERENT PROOF PATH WAS APPROVED"
            : "CREATES 3 USEFUL RESULTS",
      },
    },
    rerouted
      ? {
          id: "ship-bridge",
          routeId: "ship",
          stage: 2,
          kind: "bridge",
          eyebrow: "ANOTHER WAY · YOU APPROVED",
          title: state.bridge.title,
          date: state.bridge.eta,
          status: "available",
          description: state.bridge.rationale,
          sourceLabel: state.bridge.sourceLabel,
          sourceUrl: state.bridge.sourceUrl,
          sourceClause: state.bridge.sourceClause,
          evidence: state.bridge.outputs,
          edgeToNext: { type: "creates", label: "PLANS A SEPARATE PROOF PATH" },
        }
      : {
          id: "ship-proof",
          routeId: "ship",
          stage: 2,
          kind: "evidence",
          eyebrow: missed ? "WHAT IS MISSING" : "WHAT THIS GIVES YOU",
          title: missed ? "The next step has nothing to review" : imported ? `${opportunityTitle} results` : "A product people can try",
          date: missed ? "No replacement yet" : `${opportunityOutputs.length} useful result${opportunityOutputs.length === 1 ? "" : "s"}`,
          status: defaultCohortMismatch || missed ? "blocked" : hasSimulatedResult ? "simulated" : "locked",
          description: missed
            ? "Without a live app, public code, and demo story, the next step has nothing concrete to review."
            : hasSimulatedResult
              ? "These are try-out results, not confirmed achievements."
          : "If the initial application is approved, the contribution period can create public work and mentor feedback.",
          evidence: missed ? opportunityOutputs.map((item) => `${item} missing`) : opportunityOutputs,
          edgeToNext: {
            type: missed ? "blocked" : "official",
            label: missed ? "NOTHING TO REVIEW" : "GIVES THE NEXT STEP REAL WORK",
          },
        },
    {
      id: "ship-showcase",
      routeId: "ship",
      stage: 3,
      kind: "opportunity",
      eyebrow: "DOOR 02 · SHARE",
      title: rerouted ? "Open-source proof portfolio" : "Outreachy final application",
      date: rerouted ? "Planned · add a real PR or review URL" : "After a recorded Outreachy contribution",
      status: rerouted ? "future" : defaultCohortMismatch || missed ? "blocked" : hasSimulatedResult ? "ready" : "locked",
      description: rerouted
        ? "This is a separate path toward the career goal. It does not reopen the closed Outreachy cohort, and it remains planned until a real artifact is attached."
        : defaultCohortMismatch || missed
          ? "The Outreachy final application stays closed because the official cohort rule or required Outreachy contribution is not satisfied."
          : "Only applicants who record an Outreachy project contribution can create a final application. Selection is never predicted or guaranteed.",
      sourceLabel: rerouted ? state.bridge.sourceLabel : "Official Outreachy Applicant Guide",
      sourceUrl: rerouted ? state.bridge.sourceUrl : "https://www.outreachy.org/docs/applicant/",
      sourceClause: rerouted ? "Agent inference: a bounded public contribution can support the career proof gap. The source does not claim it restores Outreachy eligibility." : "Applicants must record at least one Outreachy project contribution before they can create a final application.",
      evidence: rerouted ? ["Public contribution planned", "Review trail planned", "Artifact URL still missing"] : ["Recorded Outreachy contribution", "Project timeline", "Final application"],
      edgeToNext: { type: "signal", label: "STRENGTHENS — NEVER GUARANTEES" },
    },
    {
      id: "ship-destination",
      routeId: "ship",
      stage: 4,
      kind: "destination",
      eyebrow: `TARGET · ${state.profile.targetYear}`,
      title: state.profile.goal,
      date: rerouted ? `Target ${state.profile.targetYear} · ${state.bridge.eta}` : `Target · ${state.profile.targetYear}`,
      status: (defaultCohortMismatch && !rerouted) || missed ? "blocked" : hasSimulatedResult ? "strengthened" : "destination",
      description: (defaultCohortMismatch && !rerouted) || missed
        ? "The destination remains possible, but one step in this route is missing."
        : "A direction, not a hiring prediction. The route shows which work can help the next move.",
      evidence: ["Public work", "Mentor feedback", "Open-source collaboration"],
    },
  ];
}

function researchNodes(state: FutureDoorsState): PathNode[] {
  return [
    {
      id: "research-prepare",
      routeId: "research",
      stage: 1,
      kind: "opportunity",
      eyebrow: "DOOR 01 · PREPARE",
      title: "Prepare with a GSoC organization",
      date: "Next cycle · confirm dates",
      status: "checking",
      description: "A global, online mentored open-source route. Confirm eligibility before planning around it.",
      sourceLabel: "Official Google Summer of Code FAQ",
      sourceUrl: "https://developers.google.com/open-source/gsoc/faq",
      sourceClause: "GSoC is online and global. Applicants must meet age, work-eligibility, newcomer, prior-participation, and location rules.",
      evidence: ["Starter contribution", "Mentor context", "Proposal draft"],
      edgeToNext: { type: "creates", label: "MAKES A REAL APPLICATION POSSIBLE" },
    },
    {
      id: "research-proposal",
      routeId: "research",
      stage: 2,
      kind: "evidence",
      eyebrow: "WHAT YOU BUILD",
      title: "Contribution + proposal",
      date: "Public work + a scoped plan",
      status: "locked",
      description: "Early interaction and a concrete plan make the application grounded, not generic.",
      evidence: ["Starter contribution", "Mentor feedback", "Project proposal"],
      edgeToNext: { type: "signal", label: "HELPS YOU APPLY — NOT A GUARANTEE" },
    },
    {
      id: "research-apply",
      routeId: "research",
      stage: 3,
      kind: "opportunity",
      eyebrow: "DOOR 02 · APPLY",
      title: "Apply to Google Summer of Code",
      date: "When the next window opens",
      status: "locked",
      description: "A real application step, not an internship or a promise of selection.",
      sourceLabel: "Official Google Summer of Code FAQ",
      sourceUrl: "https://developers.google.com/open-source/gsoc/faq",
      sourceClause: "Google recommends contacting the mentoring organization early; prior mentor interaction is an important application factor.",
      evidence: ["Mentored project if accepted", "Open-source track record"],
      edgeToNext: { type: "signal", label: "STRENGTHENS — NEVER GUARANTEES" },
    },
    {
      id: "research-destination",
      routeId: "research",
      stage: 4,
      kind: "destination",
      eyebrow: `ALTERNATE ROUTE · ${state.profile.targetYear}`,
      title: state.profile.goal,
      date: `Target · ${state.profile.targetYear}`,
      status: "destination",
      description: "A mentorship-weighted path built through sustained public contribution.",
      evidence: ["Open-source craft", "Mentor feedback", "Applied project"],
    },
  ];
}

function communityNodes(state: FutureDoorsState): PathNode[] {
  return [
    {
      id: "community-contribute",
      routeId: "community",
      stage: 1,
      kind: "opportunity",
      eyebrow: "DOOR 01 · CONTRIBUTE",
      title: "Open-source contribution",
      date: "Open continuously",
      status: "available",
      description: "Start with a bounded issue where the work and review trail remain public.",
      sourceLabel: "GitHub open-source guide",
      sourceUrl: "https://docs.github.com/en/get-started/exploring-projects-on-github/finding-ways-to-contribute-to-open-source-on-github",
      sourceClause: "GitHub documents issue labels and contribution paths that help newcomers find bounded ways to contribute.",
      evidence: ["Merged change", "Review trail"],
      edgeToNext: { type: "creates", label: "CREATES PUBLIC CONTRIBUTION" },
    },
    {
      id: "community-record",
      routeId: "community",
      stage: 2,
      kind: "evidence",
      eyebrow: "WHAT THIS GIVES YOU",
      title: "Work people can review",
      date: "Code + collaboration trail",
      status: "locked",
      description: "A public record of technical judgment, iteration, and collaboration.",
      evidence: ["Merged work", "Maintainer feedback"],
      edgeToNext: { type: "official", label: "GIVES THE NEXT STEP REAL WORK" },
    },
    {
      id: "community-programs",
      routeId: "community",
      stage: 3,
      kind: "opportunity",
      eyebrow: "DOOR 02 · COMMUNITY",
      title: "Developer community programs",
      date: "After visible contribution",
      status: "locked",
      description: "Use credible public contribution as the input to community programs and collaborations.",
      evidence: ["Peer signal", "Technical visibility"],
      edgeToNext: { type: "signal", label: "STRENGTHENS — NEVER GUARANTEES" },
    },
    {
      id: "community-destination",
      routeId: "community",
      stage: 4,
      kind: "destination",
      eyebrow: `ALTERNATE ROUTE · ${state.profile.targetYear}`,
      title: state.profile.goal,
      date: `Target · ${state.profile.targetYear}`,
      status: "destination",
      description: "A community path built from public contribution rather than credentials alone.",
      evidence: ["Technical trust", "Community practice", "Public collaboration"],
    },
  ];
}

const routePreferenceFacts: Record<RouteId, {
  workMode: "remote" | "hybrid" | "onsite";
  compensation: "paid" | "unpaid" | "mixed";
  hours: 10 | 20 | 30;
  schedule: "semester" | "break" | "flexible";
  participation: "solo" | "team" | "either";
}> = {
  ship: { workMode: "remote", compensation: "paid", hours: 30, schedule: "break", participation: "either" },
  community: { workMode: "remote", compensation: "unpaid", hours: 10, schedule: "flexible", participation: "either" },
  research: { workMode: "remote", compensation: "mixed", hours: 10, schedule: "semester", participation: "either" },
};

/**
 * This is a transparent preference match, not a likelihood or admissions score.
 * It lets the interface explain why one practical route is ordered ahead of another.
 */
export function getRouteFit(state: FutureDoorsState, routeId: RouteId): RouteFit {
  const preference = state.profile.preferences;
  const facts = routePreferenceFacts[routeId];
  const checks = [
    {
      matches: preference.workMode === "Remote first" ? facts.workMode === "remote" : preference.workMode === "Hybrid okay" ? facts.workMode !== "onsite" : true,
      reason: facts.workMode === "remote" ? "Remote" : facts.workMode === "hybrid" ? "Hybrid" : "On-site",
    },
    {
      matches: preference.compensation === "Paid only" ? facts.compensation === "paid" : preference.compensation === "Paid preferred" ? facts.compensation !== "unpaid" : true,
      reason: facts.compensation === "paid" ? "Paid" : facts.compensation === "mixed" ? "Stipend varies" : "Volunteer work",
    },
    {
      matches: preference.timeCommitment === "Up to 10 hrs / week" ? facts.hours <= 10 : preference.timeCommitment === "Up to 20 hrs / week" ? facts.hours <= 20 : true,
      reason: `${facts.hours <= 10 ? "5–10" : facts.hours} hrs / week`,
    },
    {
      matches: preference.schedule === "During semester" ? facts.schedule !== "break" : preference.schedule === "Break only" ? facts.schedule !== "semester" : true,
      reason: facts.schedule === "semester" ? "Semester-friendly" : facts.schedule === "break" ? "Break-focused" : "Flexible timing",
    },
    {
      matches: preference.participation === "Solo only" ? facts.participation === "solo" : preference.participation === "Solo or small team" ? facts.participation !== "team" : true,
      reason: facts.participation === "solo" ? "Solo" : facts.participation === "team" ? "Team-based" : "Solo or team",
    },
  ];
  return {
    matches: checks.filter((check) => check.matches).length,
    total: checks.length,
    reasons: checks.filter((check) => check.matches).map((check) => check.reason).slice(0, 3),
  };
}

export function getSelectedCareerGoal(state: FutureDoorsState) {
  return state.goals.find((goal) => goal.id === state.selectedGoalId) ?? state.goals[0];
}

export function buildRoutes(state: FutureDoorsState): Route[] {
  const goalText = state.profile.goal.toLowerCase();
  const strengthText = state.profile.strengths.join(" ").toLowerCase();
  const researchGoal = /research|scientist|academic|phd|ml scientist/.test(goalText);
  const communityGoal = /community|devrel|developer relation|advocate|open.?source maintainer/.test(goalText);
  const productGoal = /product|builder|founder|startup|designer|engineer/.test(goalText);
  const publicGap = /public|portfolio|proof|visibility/.test(state.profile.gap.toLowerCase());
  const fits = {
    ship: isDefaultOutreachyCohortMismatch(state) ? 0 : Math.min(98, 80 + (productGoal ? 12 : 0) + (publicGap ? 5 : 0) + (/prototyp|ship/.test(strengthText) ? 2 : 0)),
    community: Math.min(98, 78 + (communityGoal ? 15 : 0) + (publicGap ? 3 : 0) + (/story|community|teach/.test(strengthText) ? 2 : 0)),
    research: Math.min(98, 78 + (researchGoal ? 18 : 0) + (/research|analysis|data/.test(strengthText) ? 2 : 0)),
  };

  return [
    {
      id: "ship",
      number: "01",
      label: "SHIP",
      fit: fits.ship,
      eta: state.scenario === "rerouted" ? `${state.profile.targetYear} · ${state.bridge.eta}` : String(state.profile.targetYear),
      summary: "Fastest way to build a public product",
      accent: "coral",
      nodes: shipNodes(state),
    },
    {
      id: "community",
      number: "02",
      label: "CONTRIBUTE",
      fit: fits.community,
      eta: String(state.profile.targetYear),
      summary: "Build trust through public work",
      accent: "blue",
      nodes: communityNodes(state),
    },
    {
      id: "research",
      number: "03",
      label: "RESEARCH",
      fit: fits.research,
      eta: String(state.profile.targetYear),
      summary: "Build depth with a mentor",
      accent: "yellow",
      nodes: researchNodes(state),
    },
  ];
}

export function getRoute(state: FutureDoorsState, routeId = state.selectedRouteId) {
  return buildRoutes(state).find((route) => route.id === routeId) ?? buildRoutes(state)[0];
}

export function getSelectedNode(state: FutureDoorsState) {
  const routes = buildRoutes(state);
  return routes.flatMap((route) => route.nodes).find((node) => node.id === state.selectedNodeId) ?? routes[0].nodes[0];
}

export function requireVisibleStep(state: FutureDoorsState, stepId: unknown) {
  if (typeof stepId !== "string" || stepId.trim().length === 0) {
    throw new PathInputError("INVALID_STEP_ID", "Provide a step id returned by get_path_snapshot.");
  }
  const step = buildRoutes(state).flatMap((route) => route.nodes).find((node) => node.id === stepId);
  if (!step) {
    throw new PathInputError("UNKNOWN_STEP_ID", `No visible step has id "${stepId}". Call get_path_snapshot and use an exact id.`);
  }
  return step;
}

export function requireActionableDoor(state: FutureDoorsState, doorId: unknown) {
  const id = requireDoorId(doorId);
  const door = buildRoutes(state).flatMap((route) => route.nodes).find((node) => node.id === id);
  if (!door || (door.status !== "available" && door.status !== "ready")) {
    throw new PathInputError("DOOR_NOT_ACTIONABLE", `${door?.title ?? "This door"} is ${door ? statusLabels[door.status] : "unavailable"}. Confirm the rule or plan another route instead.`);
  }
  return door;
}

export function downstreamEffect(state: FutureDoorsState, nodeId: string) {
  const node = requireVisibleStep(state, nodeId);
  if (node.status === "blocked" || node.status === "expired" || node.status === "ineligible") {
    return `${node.title} cannot create the work the next step needs. Later steps are marked as needing another way—not impossible.`;
  }
  if (node.kind === "evidence" || node.kind === "bridge") {
    return `${node.title} gives you ${node.evidence.join(", ")}, which the next step needs.`;
  }
  return `${node.title} helps the next step through ${node.edgeToNext?.label.toLowerCase() ?? "a useful result"}. This does not predict acceptance or hiring.`;
}

function compactText(value: string, limit = 48) {
  return value.length <= limit ? value : `${value.slice(0, limit - 1)}…`;
}

export function summarizeState(state: FutureDoorsState) {
  const routes = buildRoutes(state);
  const selected = getSelectedNode(state);
  const selectedRoute = routes.find((route) => route.id === state.selectedRouteId) ?? routes[0];
  const plannedProof = new Set(state.priorities.map((routeId) => ROUTE_PROOF[routeId]));
  const attachedProof = new Set(state.proofReceipts.map((receipt) => receipt.proofId));
  return {
    product: "Future Doors",
    goal: { role: state.profile.goal, by: state.profile.targetYear },
    goals: { selected: state.selectedGoalId, n: state.goals.length },
    profile: {
      age: state.profile.age,
      grad: state.profile.graduationMonth,
      citizen: state.profile.nationality,
      based: state.profile.residence,
      uni: state.profile.universityLocation,
      status: state.profile.studyStatus,
      field: state.profile.fieldOfStudy,
      auth: state.profile.workAuthorization,
      strengths: state.profile.strengths,
      ...(state.profile.credentials.length ? { credentials: state.profile.credentials } : {}),
      gap: state.profile.gap,
      // [mode, compensation, weekly time, schedule, participation]
      prefs: [
        state.profile.preferences.workMode === "Remote first" ? "remote" : state.profile.preferences.workMode === "Hybrid okay" ? "hybrid" : "onsite",
        state.profile.preferences.compensation === "Paid only" ? "paid" : state.profile.preferences.compensation === "Paid preferred" ? "prefer-paid" : "any",
        state.profile.preferences.timeCommitment === "Up to 10 hrs / week" ? "10h" : state.profile.preferences.timeCommitment === "Up to 20 hrs / week" ? "20h" : "flex",
        state.profile.preferences.schedule === "During semester" ? "semester" : state.profile.preferences.schedule === "Break only" ? "break" : "any",
        state.profile.preferences.participation === "Solo only" ? "solo" : state.profile.preferences.participation === "Team okay" ? "team" : "solo-small-team",
      ],
    },
    month: state.selectedMonth,
    scenario: state.scenario,
    selected: { route: state.selectedRouteId, step: selected.id },
    bridge: state.bridge.state,
    saved: {
      n: state.opportunities.length,
      on: getConnectedOpportunity(state) ? compactText(getConnectedOpportunity(state)!.title, 30) : null,
      waiting: state.opportunities
        .filter((candidate) => candidate.state === "review")
        .slice(0, 2)
        .map((candidate) => ({ id: candidate.id, title: compactText(candidate.title), state: reviewOpportunity(candidate).status })),
    },
    priorities: state.priorities,
    proof: Object.fromEntries(PROOF_IDS.map((proofId) => [proofId, attachedProof.has(proofId) ? "attached" : state.proofProposal.state === "staged" && state.proofProposal.proofId === proofId ? "review" : plannedProof.has(proofId) ? "planned" : "missing"])),
    ...(state.priorityProposal.state === "staged" ? { priorityProposal: "staged" } : {}),
    route: {
      id: selectedRoute.id,
      why: selectedRoute.summary,
      eta: selectedRoute.eta,
      steps: selectedRoute.nodes.map((node) => ({
        id: node.id,
        title: compactText(node.title),
        status: node.status,
        ...((node.kind === "evidence" || node.kind === "bridge") && node.evidence.length ? { evidence: node.evidence.slice(0, 3).map((item) => compactText(item, 36)) } : {}),
      })),
    },
    other: routes.filter((route) => route.id !== selectedRoute.id).map((route) => route.id),
    guardrails: [
      "human_approval_for_writes",
      "unknown_or_ineligible_not_actionable",
      "planned_never_means_attached",
    ],
  };
}

export function summarizeRouteComparison(state: FutureDoorsState) {
  return {
    goal: { role: state.profile.goal, by: state.profile.targetYear },
    constraints: state.pinnedConstraints,
    priorities: state.priorities,
    routes: buildRoutes(state).map((route) => ({
      id: route.id,
      why: route.summary,
      preferenceMatch: getRouteFit(state, route.id),
      eta: route.eta,
      firstDoor: route.nodes[0].title,
      creates: route.nodes[1].evidence,
      nextDoor: route.nodes[2].title,
      outcome: route.nodes[3].title,
    })),
    note: "Routes are ordered by their ability to create the missing proof within the pinned constraints. They do not predict acceptance or hiring.",
  };
}

export function cloneInitialState(): FutureDoorsState {
  return JSON.parse(JSON.stringify(initialState)) as FutureDoorsState;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeText(value: unknown, fallback: string, max = 500) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

function safeTextList(value: unknown, fallback: string[], maxItems: number) {
  if (!Array.isArray(value)) return fallback;
  const clean = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim().slice(0, 120)).slice(0, maxItems);
  return clean.length ? clean : fallback;
}

function preferenceValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T) {
  return typeof value === "string" && allowed.includes(value as T) ? value as T : fallback;
}

function sanitizePreferences(value: unknown, fallback: PathPreferences): PathPreferences {
  const raw = isRecord(value) ? value : {};
  return {
    workMode: preferenceValue(raw.workMode, ["Remote first", "Hybrid okay", "On-site okay"] as const, fallback.workMode),
    compensation: preferenceValue(raw.compensation, ["Paid preferred", "Paid only", "Any compensation"] as const, fallback.compensation),
    timeCommitment: preferenceValue(raw.timeCommitment, ["Up to 10 hrs / week", "Up to 20 hrs / week", "Flexible time"] as const, fallback.timeCommitment),
    schedule: preferenceValue(raw.schedule, ["During semester", "Break only", "Any schedule"] as const, fallback.schedule),
    participation: preferenceValue(raw.participation, ["Solo or small team", "Team okay", "Solo only"] as const, fallback.participation),
  };
}

function sanitizeCareerGoals(value: unknown, fallback: CareerGoal[]) {
  if (!Array.isArray(value)) return fallback;
  const goals = value.flatMap((raw): CareerGoal[] => {
    if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.title !== "string") return [];
    const id = raw.id.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 36);
    if (!id) return [];
    const supportedRoutes: RouteId[] = Array.isArray(raw.supportedRoutes)
      ? raw.supportedRoutes.filter((route): route is RouteId => route === "ship" || route === "community" || route === "research").filter((route, index, all) => all.indexOf(route) === index)
      : ["ship", "community", "research"];
    return [{
      id,
      title: safeText(raw.title, "Career goal", 80),
      shortLabel: safeText(raw.shortLabel, safeText(raw.title, "Goal", 22), 22),
      targetYear: Number.isInteger(raw.targetYear) ? Math.min(2040, Math.max(2027, Number(raw.targetYear))) : 2030,
      gap: safeText(raw.gap, "A visible proof of work", 100),
      supportedRoutes: supportedRoutes.length ? supportedRoutes : ["ship", "community", "research"],
    }];
  }).filter((goal, index, all) => all.findIndex((candidate) => candidate.id === goal.id) === index).slice(0, 4);
  return goals.length ? goals : fallback;
}

export function sanitizePersistedState(value: unknown): FutureDoorsState {
  const base = cloneInitialState();
  if (!isRecord(value)) return base;

  const bridgeRaw = isRecord(value.bridge) ? value.bridge : {};
  // Eligibility-driving profile facts are approvals, not browser preferences.
  // A local draft cannot become a confirmed fact after reload.
  const rawProfile = isRecord(value.profile) ? value.profile : {};
  const profile: Profile = {
    ...base.profile,
    // Practical preferences are user choices, not asserted eligibility facts.
    // They can safely restore as a local draft without changing an official rule result.
    preferences: sanitizePreferences(rawProfile.preferences, base.profile.preferences),
  };
  const goals = sanitizeCareerGoals(value.goals, base.goals);
  const selectedGoalId = typeof value.selectedGoalId === "string" && goals.some((goal) => goal.id === value.selectedGoalId) ? value.selectedGoalId : goals[0].id;

  let selectedMonth = base.selectedMonth;
  try { selectedMonth = requirePathMonth(value.selectedMonth); } catch { /* Keep the safe baseline month. */ }
  let selectedRouteId = base.selectedRouteId;
  try { selectedRouteId = requireRouteId(value.selectedRouteId); } catch { /* Keep the safe baseline route. */ }
  const scenario: Scenario = "baseline";
  const priorities = Array.isArray(value.priorities)
    ? value.priorities.filter((id): id is RouteId => id === "ship" || id === "community" || id === "research").filter((id, index, all) => all.indexOf(id) === index).slice(0, 2)
    : base.priorities;

  const opportunities = Array.isArray(value.opportunities) ? value.opportunities.flatMap((raw): OpportunityCandidate[] => {
    if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.title !== "string" || typeof raw.sourceUrl !== "string" || !raw.sourceUrl.startsWith("https://")) return [];
    let deadlineMonth: string;
    try { deadlineMonth = requirePathMonth(raw.deadlineMonth); } catch { return []; }
    return [{
      id: safeText(raw.id, "", 100),
      state: "review",
      title: safeText(raw.title, "Saved opportunity", 100),
      rationale: safeText(raw.rationale, "Review how this supports the next step.", 300),
      sourceLabel: safeText(raw.sourceLabel, "Official source", 120),
      sourceUrl: raw.sourceUrl.slice(0, 500),
      sourceClause: safeText(raw.sourceClause, "Source clause unavailable; review before use.", 500),
      deadlineMonth,
      deadlineText: safeText(raw.deadlineText, formatMonth(deadlineMonth), 100),
      requirements: safeTextList(raw.requirements, ["Review official requirements"], 4),
      ...(typeof raw.missingFact === "string" && raw.missingFact.trim() ? { missingFact: raw.missingFact.trim().slice(0, 120) } : {}),
      ...(typeof raw.prerequisite === "string" && raw.prerequisite.trim() ? { prerequisite: raw.prerequisite.trim().slice(0, 100) } : {}),
      outputs: safeTextList(raw.outputs, ["Review expected output"], 5),
      checkedAt: safeText(raw.checkedAt, "Unknown", 20),
    }];
  }).slice(0, 7) : [];

  // Browser storage is an untrusted draft. It may restore inputs, but never an
  // official connection, human approval, execution receipt, or attached proof.
  const activity = base.activity;
  const proofReceipts: ProofReceipt[] = [];

  const next: FutureDoorsState = {
    profile,
    goals,
    selectedGoalId,
    selectedMonth,
    selectedRouteId,
    selectedNodeId: typeof value.selectedNodeId === "string" ? value.selectedNodeId.slice(0, 80) : base.selectedNodeId,
    scenario,
    bridge: {
      state: "none",
      stagedBy: bridgeRaw.stagedBy === "agent" || bridgeRaw.stagedBy === "you" ? bridgeRaw.stagedBy : "system",
      title: safeText(bridgeRaw.title, base.bridge.title, 90),
      rationale: safeText(bridgeRaw.rationale, base.bridge.rationale, 300),
      sourceLabel: safeText(bridgeRaw.sourceLabel, base.bridge.sourceLabel, 100),
      sourceUrl: typeof bridgeRaw.sourceUrl === "string" && bridgeRaw.sourceUrl.startsWith("https://") ? bridgeRaw.sourceUrl.slice(0, 500) : base.bridge.sourceUrl,
      sourceClause: safeText(bridgeRaw.sourceClause, base.bridge.sourceClause, 500),
      outputs: safeTextList(bridgeRaw.outputs, base.bridge.outputs, 5),
      eta: safeText(bridgeRaw.eta, base.bridge.eta, 30),
    },
    opportunities,
    priorities,
    priorityProposal: { state: "none", routeIds: [], rationale: "" },
    proofReceipts,
    proofProposal: { state: "none", proofId: null, title: "", artifactUrl: "", sourceLabel: "", verificationNote: "" },
    pinnedConstraints: safeTextList(value.pinnedConstraints, base.pinnedConstraints, 5),
    activity,
    replayToken: Number.isInteger(value.replayToken) && Number(value.replayToken) >= 0 ? Number(value.replayToken) : 0,
  };

  const selectedGoal = getSelectedCareerGoal(next);
  next.profile = { ...next.profile, goal: selectedGoal.title, targetYear: selectedGoal.targetYear, gap: selectedGoal.gap };

  try { requireVisibleStep(next, next.selectedNodeId); } catch { next.selectedNodeId = getRoute(next, next.selectedRouteId).nodes[0].id; }
  if (isDefaultOutreachyCohortMismatch(next)) next.priorities = next.priorities.filter((id) => id !== "ship");
  return next;
}
