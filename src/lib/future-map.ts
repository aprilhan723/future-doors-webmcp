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
  ready: "READY TO TRY",
  checking: "CHECK ELIGIBILITY",
  future: "OPENS LATER",
  locked: "NEEDS PROOF",
  expired: "MISSED",
  blocked: "PATH BROKEN",
  simulated: "SIMULATED",
  strengthened: "STRONGER",
  destination: "DESTINATION",
};

export const edgeLabels: Record<EdgeType, string> = {
  official: "OFFICIAL REQUIREMENT",
  creates: "CREATES EVIDENCE",
  signal: "STRENGTHENS — NOT A GUARANTEE",
  blocked: "MISSING EVIDENCE",
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
    gap: "Public proof of work",
    constraints: ["≤ 10 hrs / week", "Low or no cost", "Remote-friendly"],
  },
  selectedMonth: "2026-08",
  selectedRouteId: "ship",
  selectedNodeId: "ship-challenge",
  scenario: "baseline",
  bridge: {
    state: "none",
    title: "Independent Public Demo Sprint",
    rationale: "Recreate the missing proof bundle without claiming the missed award.",
    sourceLabel: "WebMCP Challenge submission requirements",
    sourceUrl: "https://webmcp.devpost.com/",
    sourceClause: "A working URL, public code repository, and public demo video are required submission artifacts.",
    outputs: ["Live app", "Public repository", "Demo video"],
    eta: "+6 weeks",
  },
  pinnedConstraints: ["≤ 10 hrs / week", "Low or no cost", "Remote-friendly"],
  activity: [
    {
      id: "seed-route",
      actor: "system",
      label: "Three routes compiled",
      detail: "Opportunities are connected by the evidence they create.",
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

function shipNodes(state: FutureDoorsState): PathNode[] {
  const missed = state.scenario === "miss";
  const rerouted = state.scenario === "rerouted";
  const taken = state.scenario === "take";
  const challengeMissed = missed || rerouted;
  const challengeExpired = monthNumber(state.selectedMonth) > monthNumber("2026-08") && !taken;
  const hasProof = taken || rerouted;

  return [
    {
      id: "ship-challenge",
      routeId: "ship",
      stage: 1,
      kind: "opportunity",
      eyebrow: "DOOR 01 · COMPETE",
      title: "WebMCP Challenge",
      date: "Sep 4 · 5 AM KST",
      status: taken ? "simulated" : challengeMissed || challengeExpired ? "expired" : "available",
      description: taken
        ? "Simulated completion only. No real application fact was added to your profile."
        : challengeMissed || challengeExpired
          ? "The submission deadline passed, so this route no longer creates its proof bundle."
          : "A live chance to turn product work into public, inspectable evidence.",
      sourceLabel: "Official WebMCP Challenge",
      sourceUrl: "https://webmcp.devpost.com/",
      sourceClause: "Submissions require a working URL, public repository, and public demo video.",
      evidence: ["Live product", "Public code", "Demo narrative"],
      edgeToNext: {
        type: challengeMissed && !rerouted ? "blocked" : "creates",
        label: challengeMissed && !rerouted
          ? "PROOF NOT CREATED"
          : challengeMissed && rerouted
            ? "BYPASSED BY APPROVED BRIDGE"
            : "CREATES 3 PROOF SIGNALS",
      },
    },
    rerouted
      ? {
          id: "ship-bridge",
          routeId: "ship",
          stage: 2,
          kind: "bridge",
          eyebrow: "AGENT BRIDGE · YOU APPROVED",
          title: state.bridge.title,
          date: state.bridge.eta,
          status: "available",
          description: state.bridge.rationale,
          sourceLabel: state.bridge.sourceLabel,
          sourceUrl: state.bridge.sourceUrl,
          sourceClause: state.bridge.sourceClause,
          evidence: state.bridge.outputs,
          edgeToNext: { type: "creates", label: "REPAIRS PUBLIC PROOF" },
        }
      : {
          id: "ship-proof",
          routeId: "ship",
          stage: 2,
          kind: "evidence",
          eyebrow: missed ? "BROKEN LINK" : "EVIDENCE CREATED",
          title: missed ? "Public proof gap" : "Product proof bundle",
          date: missed ? "No replacement yet" : "3 inspectable artifacts",
          status: missed ? "blocked" : hasProof ? "simulated" : "locked",
          description: missed
            ? "Without a live app, public repo, and demo story, the next door lacks the evidence it can inspect."
            : hasProof
              ? "These artifacts are simulated outputs, not confirmed achievements."
              : "Complete the first door to create public evidence instead of another profile claim.",
          evidence: missed ? ["Live app missing", "Public repo missing", "Demo missing"] : ["Live app", "Public repository", "Demo video"],
          edgeToNext: {
            type: missed ? "blocked" : "official",
            label: missed ? "CANNOT VERIFY WORK" : "MAKES WORK INSPECTABLE",
          },
        },
    {
      id: "ship-showcase",
      routeId: "ship",
      stage: 3,
      kind: "opportunity",
      eyebrow: "DOOR 02 · AMPLIFY",
      title: "Submit to OpenAI Showcase",
      date: rerouted ? "Ready after detour" : "After your project is public",
      status: missed ? "blocked" : hasProof ? "ready" : "locked",
      description: missed
        ? "This path is blocked because there is no public product evidence to present."
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
        ? "The destination remains possible, but this route currently has a visible evidence break."
        : "A direction, not a hiring prediction. The route shows which evidence becomes more credible next.",
      evidence: ["Shipped product", "Inspectable craft", "Clear product judgment"],
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
      edgeToNext: { type: "creates", label: "CREATES APPLICATION PROOF" },
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
      eyebrow: "EVIDENCE CREATED",
      title: "Contribution record",
      date: "Code + collaboration trail",
      status: "locked",
      description: "A public record of technical judgment, iteration, and collaboration.",
      evidence: ["Merged work", "Maintainer feedback"],
      edgeToNext: { type: "official", label: "MAKES CONTRIBUTION INSPECTABLE" },
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
      description: "A community-weighted path built from contribution evidence rather than credentials alone.",
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
      summary: "Fastest route to public product proof",
      accent: "coral",
      nodes: shipNodes(state),
    },
    {
      id: "community",
      number: "02",
      label: "CONTRIBUTE",
      fit: fits.community,
      eta: String(state.profile.targetYear),
      summary: "Build trust through public collaboration",
      accent: "blue",
      nodes: communityNodes(state),
    },
    {
      id: "research",
      number: "03",
      label: "RESEARCH",
      fit: fits.research,
      eta: String(state.profile.targetYear),
      summary: "Build depth through a mentored open-source program",
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
    return `${node.title} cannot create its expected evidence. Every later step in this route is marked for repair, not treated as impossible.`;
  }
  if (node.kind === "evidence" || node.kind === "bridge") {
    return `${node.title} makes ${node.evidence.join(", ")} inspectable for the next door.`;
  }
  return `${node.title} connects forward through ${node.edgeToNext?.label.toLowerCase() ?? "a modeled signal"}. No acceptance or hiring outcome is predicted.`;
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
    selected: { route: state.selectedRouteId, step: selected.id, title: selected.title },
    bridge: state.bridge.state,
    route: {
      id: selectedRoute.id,
      fit: selectedRoute.fit,
      eta: selectedRoute.eta,
      steps: selectedRoute.nodes.map((node) => ({
        id: node.id,
        title: node.title,
        status: node.status,
        ...(node.evidence.length ? { evidence: node.evidence } : {}),
      })),
    },
    alternatives: routes.filter((route) => route.id !== selectedRoute.id).map((route) => ({
      id: route.id,
      fit: route.fit,
      eta: route.eta,
      firstDoor: route.nodes[0].title,
    })),
    guardrails: [
      "Simulations never update confirmed facts.",
      "Dotted links never guarantee outcomes.",
      "Detour approval is human-only.",
    ],
  };
}

export function summarizeRouteComparison(state: FutureDoorsState) {
  return {
    goal: { role: state.profile.goal, by: state.profile.targetYear },
    constraints: state.pinnedConstraints,
    routes: buildRoutes(state).map((route) => ({
      id: route.id,
      fit: route.fit,
      eta: route.eta,
      firstDoor: route.nodes[0].title,
      creates: route.nodes[1].evidence,
      nextDoor: route.nodes[2].title,
      outcome: route.nodes[3].title,
    })),
    note: "Fit compares route usefulness for this demo profile; it does not predict acceptance or hiring.",
  };
}

export function cloneInitialState(): FutureDoorsState {
  return JSON.parse(JSON.stringify(initialState)) as FutureDoorsState;
}
