export type Actor = "you" | "agent" | "system";
export type RouteId = "ship" | "research" | "community";
export type Scenario = "baseline" | "take" | "miss" | "rerouted";
export type NodeKind = "opportunity" | "evidence" | "bridge" | "destination";
export type NodeStatus =
  | "available"
  | "ready"
  | "checking"
  | "future"
  | "locked"
  | "expired"
  | "blocked"
  | "simulated"
  | "strengthened"
  | "destination";
export type EdgeType = "official" | "creates" | "signal" | "blocked";

export type Profile = {
  name: string;
  age: number;
  goal: string;
  targetYear: number;
  graduationMonth: string;
  nationality: string;
  residence: string;
  studyStatus: string;
  fieldOfStudy: string;
  workAuthorization: string;
  strengths: string[];
  credentials: string[];
  gap: string;
  constraints: string[];
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

export type BridgeProposal = {
  state: "none" | "staged" | "approved";
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
};

export type FutureDoorsState = {
  profile: Profile;
  selectedMonth: string;
  selectedRouteId: RouteId;
  selectedNodeId: string;
  scenario: Scenario;
  bridge: BridgeProposal;
  opportunities: OpportunityCandidate[];
  pinnedConstraints: string[];
  activity: Activity[];
  replayToken: number;
};

export const PATH_START = "2026-08";
export const PATH_END = "2040-12";
export const ROUTE_IDS = ["ship", "community", "research"] as const;
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
    studyStatus: "Undergraduate",
    fieldOfStudy: "Information Systems",
    workAuthorization: "Needs confirmation by country",
    strengths: ["Fast prototyping", "Product storytelling"],
    credentials: [],
    gap: "A public product people can review",
    constraints: ["≤ 10 hrs / week", "Low or no cost", "Remote-friendly"],
  },
  selectedMonth: "2026-08",
  selectedRouteId: "ship",
  selectedNodeId: "ship-challenge",
  scenario: "baseline",
  bridge: {
    state: "none",
    title: "Independent Public Demo Sprint",
    rationale: "Create the same useful work without claiming the missed award.",
    sourceLabel: "WebMCP Challenge submission requirements",
    sourceUrl: "https://webmcp.devpost.com/",
    sourceClause: "A working URL, public code repository, and public demo video are required.",
    outputs: ["Live app", "Public repository", "Demo video"],
    eta: "+6 weeks",
  },
  opportunities: [],
  pinnedConstraints: ["≤ 10 hrs / week", "Low or no cost", "Remote-friendly"],
  activity: [
    {
      id: "seed-route",
      actor: "system",
      label: "Three routes compiled",
      detail: "Each step creates what the next step needs.",
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

function shipNodes(state: FutureDoorsState): PathNode[] {
  const missed = state.scenario === "miss";
  const rerouted = state.scenario === "rerouted";
  const taken = state.scenario === "take";
  const challengeMissed = missed || rerouted;
  const connected = getConnectedOpportunity(state);
  const imported = Boolean(connected);
  const deadlineMonth = connected?.deadlineMonth ?? "2026-08";
  const opportunityTitle = connected?.title ?? "WebMCP Challenge";
  const opportunityOutputs = connected?.outputs ?? ["Live product", "Public code", "Demo narrative"];
  const challengeExpired = monthNumber(state.selectedMonth) > monthNumber(deadlineMonth) && !taken;
  const hasProof = taken || rerouted;

  return [
    {
      id: "ship-challenge",
      routeId: "ship",
      stage: 1,
      kind: "opportunity",
      eyebrow: "DOOR 01 · COMPETE",
      title: opportunityTitle,
      date: imported ? `Closes · ${formatMonth(deadlineMonth)}` : "Sep 4 · 5 AM KST",
      status: taken ? "simulated" : challengeMissed || challengeExpired ? "expired" : "available",
      description: taken
        ? "Simulated completion only. No real application fact was added to your profile."
        : challengeMissed || challengeExpired
          ? "The deadline passed, so this route no longer creates the work needed for the next step."
          : imported
            ? connected?.rationale ?? ""
            : "A live chance to turn product work into public work you can show.",
      sourceLabel: imported ? connected?.sourceLabel : "Official WebMCP Challenge",
      sourceUrl: imported ? connected?.sourceUrl : "https://webmcp.devpost.com/",
      sourceClause: imported ? connected?.sourceClause : "Submissions require a working URL, public repository, and public demo video.",
      evidence: opportunityOutputs,
      edgeToNext: {
        type: challengeMissed && !rerouted ? "blocked" : "creates",
        label: challengeMissed && !rerouted
          ? "NEEDED WORK NOT CREATED"
          : challengeMissed && rerouted
            ? "REPLACED BY ANOTHER WAY YOU APPROVED"
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
          edgeToNext: { type: "creates", label: "REPLACES THE MISSING WORK" },
        }
      : {
          id: "ship-proof",
          routeId: "ship",
          stage: 2,
          kind: "evidence",
          eyebrow: missed ? "WHAT IS MISSING" : "WHAT THIS GIVES YOU",
          title: missed ? "The next step has nothing to review" : imported ? `${opportunityTitle} results` : "A product people can try",
          date: missed ? "No replacement yet" : `${opportunityOutputs.length} useful result${opportunityOutputs.length === 1 ? "" : "s"}`,
          status: missed ? "blocked" : hasProof ? "simulated" : "locked",
          description: missed
            ? "Without a live app, public code, and demo story, the next step has nothing concrete to review."
            : hasProof
              ? "These are try-out results, not confirmed achievements."
              : "Complete the first opportunity to create real work people can review.",
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
      title: "Submit to OpenAI Showcase",
      date: rerouted ? "Ready after another route" : "After your project is public",
      status: missed ? "blocked" : hasProof ? "ready" : "locked",
      description: missed
        ? "This path is blocked because there is no public product to present."
        : "Submit a finished project, demo, or workflow. Being featured is never predicted or guaranteed.",
      sourceLabel: "OpenAI Developer Community",
      sourceUrl: "https://developers.openai.com/community",
      sourceClause: "The official community page invites developers to submit a project, demo, or workflow to the showcase.",
      evidence: ["Project submission", "Product explanation", "Community-ready story"],
      edgeToNext: { type: "signal", label: "STRENGTHENS — NEVER GUARANTEES" },
    },
    {
      id: "ship-destination",
      routeId: "ship",
      stage: 4,
      kind: "destination",
      eyebrow: `TARGET · ${state.profile.targetYear}`,
      title: state.profile.goal,
      date: rerouted ? `Target ${state.profile.targetYear} · +6 weeks` : `Target · ${state.profile.targetYear}`,
      status: missed ? "blocked" : hasProof ? "strengthened" : "destination",
      description: missed
        ? "The destination remains possible, but one step in this route is missing."
        : "A direction, not a hiring prediction. The route shows which work can help the next move.",
      evidence: ["Shipped product", "Work people can review", "Clear product judgment"],
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

export function buildRoutes(state: FutureDoorsState): Route[] {
  const goalText = state.profile.goal.toLowerCase();
  const strengthText = state.profile.strengths.join(" ").toLowerCase();
  const researchGoal = /research|scientist|academic|phd|ml scientist/.test(goalText);
  const communityGoal = /community|devrel|developer relation|advocate|open.?source maintainer/.test(goalText);
  const productGoal = /product|builder|founder|startup|designer|engineer/.test(goalText);
  const publicGap = /public|portfolio|proof|visibility/.test(state.profile.gap.toLowerCase());
  const fits = {
    ship: Math.min(98, 80 + (productGoal ? 12 : 0) + (publicGap ? 5 : 0) + (/prototyp|ship/.test(strengthText) ? 2 : 0)),
    community: Math.min(98, 78 + (communityGoal ? 15 : 0) + (publicGap ? 3 : 0) + (/story|community|teach/.test(strengthText) ? 2 : 0)),
    research: Math.min(98, 78 + (researchGoal ? 18 : 0) + (/research|analysis|data/.test(strengthText) ? 2 : 0)),
  };

  return [
    {
      id: "ship",
      number: "01",
      label: "SHIP",
      fit: fits.ship,
      eta: state.scenario === "rerouted" ? `${state.profile.targetYear} + 6 weeks` : String(state.profile.targetYear),
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

export function downstreamEffect(state: FutureDoorsState, nodeId: string) {
  const node = requireVisibleStep(state, nodeId);
  if (node.status === "blocked" || node.status === "expired") {
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
  return {
    product: "Future Doors",
    goal: { role: state.profile.goal, by: state.profile.targetYear },
    profile: {
      age: state.profile.age,
      grad: state.profile.graduationMonth,
      citizenship: state.profile.nationality,
      based: state.profile.residence,
      status: state.profile.studyStatus,
      field: state.profile.fieldOfStudy,
      workAuth: state.profile.workAuthorization,
      strengths: state.profile.strengths,
      ...(state.profile.credentials.length ? { credentials: state.profile.credentials } : {}),
      gap: state.profile.gap,
    },
    month: state.selectedMonth,
    scenario: state.scenario,
    selected: { route: state.selectedRouteId, step: selected.id },
    bridge: state.bridge.state,
    savedOpportunities: {
      count: state.opportunities.length,
      connected: getConnectedOpportunity(state) ? compactText(getConnectedOpportunity(state)!.title) : null,
      waiting: state.opportunities
        .filter((candidate) => candidate.state === "review")
        .slice(0, 3)
        .map((candidate) => ({ id: candidate.id, title: compactText(candidate.title), status: reviewOpportunity(candidate).status })),
    },
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
    alternatives: routes.filter((route) => route.id !== selectedRoute.id).map((route) => ({
      id: route.id,
      eta: route.eta,
      firstDoor: route.nodes[0].title,
    })),
    guardrails: [
      "Simulations never update confirmed facts.",
      "saved_items_need_human_approval",
      "missing_or_unrelated_items_stay_saved",
      "try_outs_never_confirm_facts",
    ],
  };
}

export function summarizeRouteComparison(state: FutureDoorsState) {
  return {
    goal: { role: state.profile.goal, by: state.profile.targetYear },
    constraints: state.pinnedConstraints,
    routes: buildRoutes(state).map((route) => ({
      id: route.id,
      why: route.summary,
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
