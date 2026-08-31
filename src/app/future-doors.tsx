"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AnimatedBackground, AnimatedGroup, Spotlight, Tilt } from "@/components/motion-primitives";
import {
  PATH_START,
  ROUTE_PROOF,
  buildRoutes,
  cloneInitialState,
  downstreamEffect,
  formatMonth,
  getRouteFit,
  getSelectedNode,
  reviewOpportunity,
  requireActionableDoor,
  requireDoorId,
  requirePathMonth,
  requireRouteId,
  requireVisibleStep,
  sanitizePersistedState,
  summarizeRouteComparison,
  summarizeState,
  type Actor,
  type Activity,
  type FutureDoorsState,
  type OpportunityCandidate,
  type PathNode,
  type Profile,
  type ProofId,
  type Route,
  type RouteId,
} from "@/lib/future-map";
import {
  siteToolNames,
  useFutureDoorsWebMcp,
  type FutureDoorsActions,
} from "@/lib/webmcp";

type Modal = "bridge" | "capture" | "tools" | "goal" | "profile" | "why" | "priority" | "proof" | null;
const stateStorageKey = "future-doors:shared-path:v4";
const maxPriorities = 2;

const routeNames: Record<RouteId, { label: string; short: string; reason: string }> = {
  ship: { label: "Build & ship", short: "SHIP", reason: "Fastest proof" },
  community: { label: "Build in public", short: "CONTRIBUTE", reason: "Earn trust" },
  research: { label: "Get mentored", short: "MENTORSHIP", reason: "Guided depth" },
};

const proofLabels: Record<ProofId, string> = {
  delivered_project: "Delivered project",
  public_collaboration: "Public collaboration",
  mentor_feedback: "Mentor feedback",
};
const goalSignalCount = Object.keys(proofLabels).length;

function workLinkMeta(artifactUrl: string, proofId: ProofId) {
  try {
    const host = new URL(artifactUrl).hostname.replace(/^www\./, "");
    const sourceLabel = host === "github.com" ? "GitHub work link" : host === "youtube.com" || host === "youtu.be" ? "Video demo" : host === "figma.com" ? "Figma work link" : `Work link · ${host}`;
    return { title: `${proofLabels[proofId]} · ${host}`, sourceLabel };
  } catch {
    return { title: proofLabels[proofId], sourceLabel: "Direct work link" };
  }
}

const statusCopy: Record<PathNode["status"], string> = {
  available: "OPEN NOW",
  ready: "OPEN NEXT",
  checking: "CHECK FIRST",
  future: "LATER",
  locked: "NEXT",
  ineligible: "NOT THIS COHORT",
  expired: "CLOSED",
  blocked: "NEEDS ANOTHER WAY",
  simulated: "DONE IN TRY-OUT",
  strengthened: "CLOSER",
  destination: "GOAL",
};

function cardStatus(node: PathNode) {
  if (node.status === "locked" && (node.kind === "evidence" || node.kind === "bridge")) return "MAKE THIS";
  if (node.status === "locked" && node.kind === "opportunity") return "THEN";
  return statusCopy[node.status];
}

function displayNodeTitle(node: PathNode) {
  if (node.kind === "evidence" || node.kind === "bridge") return node.status === "blocked" ? "Missing public proof" : "Build public proof";
  return node.title;
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function validatePriorityPlan(state: FutureDoorsState, routeIds: RouteId[]) {
  const unique = [...new Set(routeIds)];
  if (unique.length === 0) throw new Error("[EMPTY_PRIORITY_PLAN] Choose at least one opportunity.");
  if (unique.length > maxPriorities) throw new Error(`[TOO_MANY_PRIORITIES] Choose no more than ${maxPriorities} opportunities.`);
  const routes = new Map(buildRoutes(state).map((route) => [route.id, route]));
  for (const id of unique) {
    const status = routes.get(id)?.nodes[0]?.status;
    if (!status) throw new Error(`[INVALID_ROUTE_ID] Unknown opportunity route: ${id}.`);
    if (status === "ineligible" || status === "expired" || status === "blocked") {
      throw new Error(`[UNAVAILABLE_PRIORITY] ${routeNames[id].label} cannot be added to the plan in its current state.`);
    }
  }
  return unique;
}

function DoorGlyph({ status }: { status: PathNode["status"] }) {
  const open = ["available", "ready", "simulated", "strengthened"].includes(status);
  const closed = status === "expired" || status === "blocked" || status === "ineligible";
  return (
    <span className={`door-glyph ${open ? "is-open" : ""} ${closed ? "is-closed" : ""}`} aria-hidden="true">
      <i><b /></i>
      {closed ? <em>×</em> : null}
      {!open && !closed ? <span>•</span> : null}
    </span>
  );
}

function PremiumPortal({ status = "available", hero = false }: { status?: PathNode["status"]; hero?: boolean }) {
  const closed = status === "expired" || status === "blocked" || status === "ineligible";
  return <span className={`premium-portal ${hero ? "portal-hero" : "portal-stage"} ${closed ? "portal-closed" : "portal-open"}`} aria-hidden="true">
    <i className="portal-aura" />
    <i className="portal-light-ray ray-left" /><i className="portal-light-ray ray-right" />
    <span className="portal-shell">
      <i className="portal-rim rim-outer" /><i className="portal-rim rim-inner" />
      <span className="portal-depth"><i className="portal-horizon" /><b className="portal-destination" />{Array.from({ length: 8 }, (_, index) => <i className={`portal-particle particle-${index + 1}`} key={index} />)}</span>
      <span className="portal-panel"><i className="portal-panel-inset" /><b className="portal-handle" /></span>
      <i className="portal-threshold" />
    </span>
    <span className="portal-reflection" />
  </span>;
}

function HandoffFlow({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="handoff-flow" aria-label="Save a post, check its official rules, then add it to your path">
      <Tilt className="handoff-tilt" rotationFactor={3}>
        <button className="handoff-card share" onClick={onOpen}>
          <span className="handoff-number">01</span>
          <span className="capture-glyph" aria-hidden="true"><i>POST</i><b /><em /></span>
          <span><strong>Save a post</strong></span>
        </button>
      </Tilt>
      <div className="handoff-link agent" aria-hidden="true"><motion.i animate={{ x: [0, 36], opacity: [0, 1, 0] }} transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }} /></div>
      <motion.div className="handoff-card verify" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.5 }}>
        <span className="handoff-number">02</span>
        <span className="verify-glyph" aria-hidden="true"><b>✓</b><i /><i /><i /></span>
        <span><strong>Check rules</strong></span>
      </motion.div>
      <div className="handoff-link human" aria-hidden="true"><motion.i animate={{ x: [0, 36], opacity: [0, 1, 0] }} transition={{ duration: 1.7, delay: 0.7, repeat: Infinity, ease: "easeInOut" }} /></div>
      <motion.div className="handoff-card approve" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, type: "spring", stiffness: 230, damping: 20 }}>
        <span className="handoff-number">03</span>
        <span className="approve-glyph" aria-hidden="true"><i><b /></i></span>
        <span><strong>Add to path</strong></span>
      </motion.div>
    </div>
  );
}

function ProfileBar({
  state,
  cvName,
  onUpload,
  onReview,
  onGoal,
}: {
  state: FutureDoorsState;
  cvName: string;
  onUpload: (file: File) => void;
  onReview: () => void;
  onGoal: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="profile-bar" aria-label="Facts used to build this path">
      <input ref={inputRef} hidden type="file" accept=".pdf,.doc,.docx" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); }} />
      <button className="identity-chip" onClick={onReview}><span className="avatar">MP</span><span><strong>{state.profile.name}</strong><em>{state.profile.age} · {state.profile.residence} · {formatMonth(state.profile.graduationMonth)}</em></span><b>EDIT</b></button>
      <button className="goal-chip" onClick={onGoal}><small>GOAL</small><strong>{state.profile.goal}</strong><span>{state.profile.targetYear} ↗</span></button>
      <div className="gap-chip"><small>NEED NEXT</small><strong>{state.profile.gap}</strong></div>
      <button className="cv-chip" title={cvName} onClick={() => inputRef.current?.click()}><span>CV</span><strong>{cvName === "Sample · Maya Park" ? "CHECK SAMPLE" : "CHECKED"}</strong></button>
    </div>
  );
}

function RouteSwitcher({ routes, selected, onSelect }: { routes: Route[]; selected: RouteId; onSelect: (id: RouteId) => void }) {
  const bestFit = Math.max(...routes.map((route) => route.fit));
  return (
    <nav className="route-deck" aria-label="Three possible routes">
      <AnimatedBackground defaultValue={selected} onValueChange={(id) => onSelect(id as RouteId)} className="route-active-bg" transition={{ type: "spring", stiffness: 420, damping: 34 }}>
        {routes.map((route) => (
          <button key={route.id} data-id={route.id}>
            <span>{route.fit === bestFit ? "BEST" : ""}</span>
            <strong>{routeNames[route.id].label}</strong>
          </button>
        ))}
      </AnimatedBackground>
    </nav>
  );
}

function PathCard({ node, selected, onSelect }: { node: PathNode; selected: boolean; onSelect: () => void }) {
  const isEvidence = node.kind === "evidence" || node.kind === "bridge";
  const isGoal = node.kind === "destination";
  const title = displayNodeTitle(node);
  return <Tilt className="portal-tilt" rotationFactor={2.7}>
    <motion.button layout className={`portal-card ${node.kind} ${node.status} ${selected ? "selected" : ""}`} onClick={onSelect} whileTap={{ scale: 0.985 }}>
      <span className="status-pill">{cardStatus(node)}</span>
      <span className="portal-index">0{Math.min(node.stage, 4)}</span>
      <div className="portal-scene">
        <span className="portal-glow" />
        {isEvidence ? <span className="proof-stack" aria-hidden="true"><i /><i /><b>✓</b></span> : isGoal ? <span className="goal-glyph" aria-hidden="true"><i /><b /></span> : <DoorGlyph status={node.status} />}
      </div>
      <div className="portal-copy"><strong>{title}</strong><p>{node.date}</p></div>
    </motion.button>
  </Tilt>;
}

function Connector({ node, broken }: { node: PathNode; broken: boolean }) {
  const label = node.edgeToNext?.type === "creates" ? "Creates what the next step needs" : node.edgeToNext?.type === "official" ? "Opens the next step" : node.edgeToNext?.type === "blocked" ? "Required work is missing" : "Helps the path";
  const shortLabel = node.edgeToNext?.type === "creates" ? "CREATES" : node.edgeToNext?.type === "official" ? "UNLOCKS" : node.edgeToNext?.type === "blocked" ? "BREAKS HERE" : "BUILDS TOWARD";
  return (
    <div className={`portal-connector ${broken ? "broken" : ""}`} role="img" aria-label={label} title={label}>
      <span>{shortLabel}</span>
      <i><b /></i>
    </div>
  );
}

function DecisionDock({ state, route, onTake, onMiss, onRepair, onReset }: { state: FutureDoorsState; route: Route; onTake: () => void; onMiss: () => void; onRepair: () => void; onReset: () => void }) {
  if (route.id !== "ship") return <div className="spatial-decision neutral"><div><small>OTHER ROUTE</small><strong>{route.summary}</strong></div><button onClick={onReset}>BACK</button></div>;
  if (state.scenario === "miss") return <div className="spatial-decision danger"><div><small>PATH BROKEN</small><strong>A detour can preserve the proof.</strong></div><button className="primary" onClick={onRepair}>FIND DETOUR</button><button onClick={onReset}>RESET</button></div>;
  if (state.scenario === "take") return <div className="spatial-decision success"><div><small>NEXT DOOR OPEN</small></div><button onClick={onReset}>RESET</button></div>;
  if (state.scenario === "rerouted") return <div className="spatial-decision success"><div><small>ALTERNATIVE PLANNED</small><strong>Different proof path · {state.bridge.eta}</strong></div><button onClick={onReset}>RESET</button></div>;
  return <div className="spatial-decision"><div><small>TRY IT</small><strong>Take or miss the first door.</strong></div><button className="primary" onClick={onTake}>TAKE</button><button onClick={onMiss}>MISS</button></div>;
}

function SpatialCanvas({ state, route, routes, onRoute, onNode, onTake, onMiss, onRepair, onReset, onWhy }: { state: FutureDoorsState; route: Route; routes: Route[]; onRoute: (id: RouteId) => void; onNode: (node: PathNode) => void; onTake: () => void; onMiss: () => void; onRepair: () => void; onReset: () => void; onWhy: () => void }) {
  const broken = state.scenario === "miss" && route.id === "ship";
  return <section className="spatial-canvas" aria-label="Your opportunity path">
    <div className="spatial-grid" aria-hidden="true" />
    <Spotlight className="spatial-spotlight" size={560} />
    <header className="spatial-canvas-heading"><div><small>YOUR PATH</small><h2>See what each door unlocks.</h2></div><button onClick={onWhy}>WHY? ↗</button></header>
    <RouteSwitcher routes={routes} selected={route.id} onSelect={onRoute} />
    <div className="spatial-route-line"><strong>{route.summary}</strong></div>
    <div className={`portal-stage scenario-${state.scenario}`}>
      <div className="light-floor" aria-hidden="true"><i /><i /><i /></div>
      <AnimatedGroup className="portal-chain" key={`${state.replayToken}-${route.id}`} preset="blur-slide" stagger={0.08}>
        {route.nodes.map((node, index) => <div className="portal-piece" key={node.id}><PathCard node={node} selected={state.selectedNodeId === node.id} onSelect={() => onNode(node)} />{index < route.nodes.length - 1 ? <Connector node={node} broken={broken && index === 0} /> : null}</div>)}
      </AnimatedGroup>
    </div>
    <DecisionDock state={state} route={route} onTake={onTake} onMiss={onMiss} onRepair={onRepair} onReset={onReset} />
  </section>;
}

function EvidenceDrawer({ node, onTools }: { node: PathNode; onTools: () => void }) {
  const sourceBacked = Boolean(node.sourceUrl && node.sourceClause);
  const plainEffect = node.kind === "destination"
      ? "This is your direction, not a promise of an outcome."
      : node.description;
  return <aside className="evidence-drawer" aria-label="Selected step details">
    <header><span>SELECTED</span><b className={node.status}>{cardStatus(node)}</b></header>
    <motion.div className="evidence-content" layout key={node.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.28 }}>
      <h3>{displayNodeTitle(node)}</h3><p>{plainEffect}</p>
      <div className="evidence-rule"><header><small>{sourceBacked ? "OFFICIAL RULE" : "PATH LOGIC"}</small><span>{sourceBacked ? "SOURCE FOUND" : "PLANNED"}</span></header><p>{node.sourceClause ?? node.edgeToNext?.label ?? "This is a direction, not a predicted outcome."}</p>{node.sourceUrl ? <a href={node.sourceUrl} target="_blank" rel="noreferrer">SOURCE ↗</a> : null}</div>
      <div className="evidence-output"><small>HELPS WITH</small>{node.evidence.slice(0, 2).map((item) => <span key={item}>✓ {item}</span>)}</div>
    </motion.div>
    <button onClick={onTools}>WEBMCP ↗</button>
  </aside>;
}

// Kept as a fallback composition while the editorial theater is validated.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SpatialWorkspace({ state, route, routes, selectedNode, cvName, onUpload, onReview, onGoal, onRoute, onNode, onTake, onMiss, onRepair, onReset, onWhy, onTools, onCapture }: { state: FutureDoorsState; route: Route; routes: Route[]; selectedNode: PathNode; cvName: string; onUpload: (file: File) => void; onReview: () => void; onGoal: () => void; onRoute: (id: RouteId) => void; onNode: (node: PathNode) => void; onTake: () => void; onMiss: () => void; onRepair: () => void; onReset: () => void; onWhy: () => void; onTools: () => void; onCapture: () => void }) {
  return (
    <section className="spatial-workspace" aria-label="Your opportunity path">
      <header className="spatial-intro">
        <motion.div className="spatial-copy" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}><h1>Save one opportunity. <em>See what it unlocks.</em></h1><p>AI checks the official rules. <b>You approve the path.</b></p></motion.div>
        <HandoffFlow onOpen={onCapture} />
      </header>
      <ProfileBar state={state} cvName={cvName} onUpload={onUpload} onReview={onReview} onGoal={onGoal} />
      <div className="spatial-main">
        <SpatialCanvas state={state} route={route} routes={routes} onRoute={onRoute} onNode={onNode} onTake={onTake} onMiss={onMiss} onRepair={onRepair} onReset={onReset} onWhy={onWhy} />
        <EvidenceDrawer node={selectedNode} onTools={onTools} />
      </div>
    </section>
  );
}

function OpeningSequence({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(onDone, reduced ? 350 : 2450);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return <motion.section className="opening-sequence" aria-label="Future Doors is opening" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.48 }}>
    <div className="opening-wordmark">FUTURE DOORS <span>01</span></div>
    <div className="opening-object" aria-hidden="true">
      <div className="opening-clock">
        {Array.from({ length: 12 }, (_, index) => <i key={index} style={{ transform: `rotate(${index * 30}deg)` }} />)}
        <b className="opening-hand hour" /><b className="opening-hand minute" />
      </div>
      <PremiumPortal hero />
    </div>
    <motion.div className="opening-copy" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.6 }}>
      <small>SAVE → CHECK RULES → CHOOSE</small>
      <h1>Turn a saved post into a real next step.</h1>
    </motion.div>
    <button onClick={onDone}>SKIP ↗</button>
  </motion.section>;
}

function LaunchScene({ onDemo, onAdd, onTools }: { onDemo: () => void; onAdd: () => void; onTools: () => void }) {
  return <section className="launch-scene" aria-labelledby="launch-title">
    <motion.div className="launch-copy" initial={{ opacity: 0, x: -26 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .72, ease: [0.16, 1, 0.3, 1] }}>
      <small>SAVED POST → OFFICIAL SOURCE → YOUR PLAN</small>
      <h1 id="launch-title">Save it. <em>See what it can build.</em></h1>
      <p>Add a screenshot or link. The agent checks the official source. <b>You choose up to two moves for each future you want to keep open.</b></p>
      <div className="launch-actions">
        <button className="launch-primary" onClick={onAdd}>ADD A POST OR LINK <span>＋</span></button>
        <button onClick={onDemo}>VIEW EXAMPLE <span>→</span></button>
      </div>
      <button className="launch-explain" onClick={onTools}>WHY THIS NEEDS WEBMCP ↗</button>
    </motion.div>

    <motion.div className="launch-world" initial={{ opacity: 0, scale: .78, rotateY: -10 }} animate={{ opacity: 1, scale: 1, rotateY: 0 }} transition={{ delay: .12, duration: 1.05, ease: [0.16, 1, 0.3, 1] }} onPointerMove={(event) => { const rect = event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty("--pointer-x", `${((event.clientX - rect.left) / rect.width - .5) * 2}`); event.currentTarget.style.setProperty("--pointer-y", `${((event.clientY - rect.top) / rect.height - .5) * 2}`); }} onPointerLeave={(event) => { event.currentTarget.style.setProperty("--pointer-x", "0"); event.currentTarget.style.setProperty("--pointer-y", "0"); }} aria-hidden="true">
      <div className="cinematic-field"><i /><i /><i /></div>
      <div className="launch-pass"><span>SAVED</span><strong>OUTREACHY<br />DEC 2026</strong><small>SCREENSHOT · 01</small><i /><b /></div>
      <div className="verification-path"><i /><b /></div>
      <PremiumPortal hero />
      <div className="next-proof"><span>WHAT OPENS NEXT</span><strong>PUBLIC WORK</strong><small>CONTRIBUTION · REVIEW · MENTOR</small></div>
    </motion.div>

    <ol className="launch-method" aria-label="How Future Doors works">
      <li><i>01</i><span><b>ADD A POST</b><small>Screenshot or link</small></span></li>
      <li><i>02</i><span><b>CHECK THE SOURCE</b><small>Rules and deadline</small></span></li>
      <li><i>03</i><span><b>CHOOSE YOUR MOVE</b><small>Add it or skip it</small></span></li>
    </ol>
  </section>;
}

const simpleRouteDetails: Record<RouteId, { timing: string; signal: string; track: string; shortTrack: string }> = {
  community: { timing: "Open now", signal: "Public collaboration", track: "Show your work", shortTrack: "SHOW" },
  research: { timing: "Next cycle", signal: "Mentor feedback", track: "Get feedback", shortTrack: "GROW" },
  ship: { timing: "Not available", signal: "Delivered project", track: "Make something", shortTrack: "MAKE" },
};

const routeDisplayOrder: RouteId[] = ["community", "research", "ship"];

function PinProofStage({ state, routes, selectedNode, onToggle, onRoute, onProof, onSettings, onGoal, onAddGoal }: { state: FutureDoorsState; routes: Route[]; selectedNode: PathNode; onToggle: (id: RouteId) => void; onRoute: (id: RouteId) => void; onProof: (proofId: ProofId) => void; onSettings: () => void; onGoal: (id: string) => void; onAddGoal: () => void }) {
  const [track, setTrack] = useState<"all" | RouteId>("all");
  const priorities = state.priorities;
  const planned = new Set(priorities.map((id) => ROUTE_PROOF[id]));
  const attached = new Set(state.proofReceipts.map((receipt) => receipt.proofId));
  const covered = new Set([...planned, ...attached]);
  const proposal = new Set(state.priorityProposal.state === "staged" ? state.priorityProposal.routeIds : []);
  const displayRoutes = routeDisplayOrder.map((id) => routes.find((item) => item.id === id)).filter((item): item is Route => Boolean(item));
  const selectedReason = "A source check comes first. You decide what joins your plan.";
  const preferenceSummary = [state.profile.preferences.workMode, state.profile.preferences.timeCommitment, state.profile.preferences.compensation];
  const visibleRoutes = track === "all" ? displayRoutes : displayRoutes.filter((item) => item.id === track);

  return <section className={`simple-plan scenario-${state.scenario}`} aria-label="Choose opportunities that build the work your goal needs">
    <header className="simple-plan-header">
      <span><small>NEXT 90 DAYS</small><strong>Choose up to two moves.</strong></span>
      <b>{priorities.length} / {maxPriorities} IN YOUR PLAN</b>
    </header>
    <section className="simple-goal-strip" aria-label={`Goal: ${state.profile.goal}`}>
      <div className="simple-goal-heading"><span><small>YOUR GOAL</small><strong>{state.profile.goal}</strong><em>by {state.profile.targetYear}</em></span><nav className="simple-goal-tabs" aria-label="Career goals">{state.goals.map((goal) => <button key={goal.id} className={goal.id === state.selectedGoalId ? "active" : ""} onClick={() => onGoal(goal.id)}>{goal.shortLabel}</button>)}{state.goals.length < 4 ? <button className="add-goal" onClick={onAddGoal} aria-label="Add another career direction">＋</button> : null}</nav></div>
      <div className="simple-goal-progress" aria-label={`${covered.size} of ${goalSignalCount} work types planned or linked`}>
        {displayRoutes.map((item) => {
          const proofId = ROUTE_PROOF[item.id];
          const stateCopy = attached.has(proofId) ? "linked" : planned.has(proofId) ? "planned" : "needed";
          return <span className={stateCopy} key={proofId}><i>{stateCopy === "linked" ? "✓" : stateCopy === "planned" ? "●" : "○"}</i>{simpleRouteDetails[item.id].signal}</span>;
        })}
      </div>
    </section>
    <div className="simple-plan-body">
      <div className="simple-settings-row">
        <span><small>YOUR SETTINGS</small>{preferenceSummary.map((value) => <b key={value}>{value}</b>)}</span>
        <button onClick={onSettings}>EDIT SETTINGS</button>
      </div>
      <nav className="simple-track-tabs" aria-label="Opportunity tracks">
        <button className={track === "all" ? "active" : ""} onClick={() => setTrack("all")}>All</button>
        {displayRoutes.map((item) => <button className={track === item.id ? "active" : ""} key={item.id} onClick={() => setTrack(item.id)}>{simpleRouteDetails[item.id].track}</button>)}
      </nav>
      <div className={`simple-route-list ${visibleRoutes.length === 1 ? "single" : ""}`} aria-label="Recommended opportunities">
      {visibleRoutes.map((item) => {
          const node = item.nodes[0];
          const detail = simpleRouteDetails[item.id];
          const fit = getRouteFit(state, item.id);
          const sharedWith = state.goals.filter((goal) => goal.id !== state.selectedGoalId && goal.supportedRoutes.includes(item.id)).map((goal) => goal.shortLabel);
          const proofId = ROUTE_PROOF[item.id];
          const pinned = priorities.includes(item.id);
          const staged = proposal.has(item.id) && !pinned;
          const priority = priorities.indexOf(item.id) + 1;
          const unavailable = node.status === "ineligible" || node.status === "expired" || node.status === "blocked";
          const atLimit = !pinned && priorities.length >= maxPriorities;
          const proofState = attached.has(proofId) ? "linked" : pinned ? "planned" : "needed";
          const label = unavailable ? "RULE DOESN'T FIT" : node.status === "checking" ? "CHECK OFFICIAL RULE" : staged ? "AGENT SUGGESTED" : `${fit.matches} / ${fit.total} SETTINGS MATCH`;
          return <motion.article className={`simple-route ${pinned ? "pinned" : ""} ${staged ? "staged" : ""} ${unavailable ? "unavailable" : ""} ${item.id === state.selectedRouteId ? "current" : ""}`} key={item.id} whileHover={{ y: -2 }}>
            <button className="simple-route-main" onClick={() => onRoute(item.id)} aria-pressed={item.id === state.selectedRouteId}>
              <i>{detail.shortTrack}</i><span><small>{label}</small><strong>{displayNodeTitle(node)}</strong><em>{detail.timing}</em><span className="simple-route-tags">{fit.reasons.map((reason) => <b key={reason}>{reason}</b>)}{sharedWith.length ? <b className="cross-goal">+ {sharedWith.join(" · ")}</b> : null}</span></span>
            </button>
            <div className={`simple-route-outcome ${proofState}`}><small>{proofState === "linked" ? "WORK LINK SAVED · NOT VERIFIED" : proofState === "planned" ? "YOUR PLAN ADDS" : "THIS COULD ADD"}</small><strong>{detail.signal}</strong></div>
            <div className="simple-route-action">
              {pinned ? <button className="simple-proof-button" onClick={() => onProof(proofId)}>{proofState === "linked" ? "VIEW LINK" : "ADD WORK LINK"}</button>
                : unavailable ? (node.sourceUrl ? <a href={node.sourceUrl} target="_blank" rel="noreferrer">VIEW RULE ↗</a> : <span>NOT AVAILABLE</span>)
                  : <button disabled={atLimit} onClick={() => onToggle(item.id)} aria-label={atLimit ? "Two opportunities are already selected" : `Add ${displayNodeTitle(node)} to the plan`}>{atLimit ? "2 SELECTED" : "+ ADD TO PLAN"}</button>}
              {pinned ? <small>SELECTED · {priority}</small> : null}
            </div>
          </motion.article>;
      })}
      </div>
      {priorities.length ? <div className="simple-pinned-plan" aria-label="Your selected plan">
        <small>YOUR PLAN</small>
        <div>{priorities.map((id, index) => <button key={id} onClick={() => onRoute(id)}><i>{index + 1}</i><span><b>{routeNames[id].label}</b><em>{simpleRouteDetails[id].timing}</em></span></button>)}</div>
      </div> : null}
    </div>
    <footer className="simple-plan-source">
      <span>{selectedReason}</span>
      {selectedNode.sourceUrl ? <a href={selectedNode.sourceUrl} target="_blank" rel="noreferrer">VIEW OFFICIAL RULE ↗</a> : null}
    </footer>
  </section>;
}

function EditorialProfile({ state, cvName, onUpload, onReview, onGoal }: { state: FutureDoorsState; cvName: string; onUpload: (file: File) => void; onReview: () => void; onGoal: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return <aside className="editorial-profile" aria-label="Facts used to build this path">
    <input ref={inputRef} hidden type="file" accept=".pdf,.doc,.docx" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); }} />
    <header><small>YOU ARE HERE</small><button onClick={onReview}>EDIT</button></header>
    <div className="editorial-person"><span>MP</span><div><strong>{state.profile.name}</strong><p>{state.profile.age} · {state.profile.residence}</p></div></div>
    <dl><div><dt>GRADUATION</dt><dd>{formatMonth(state.profile.graduationMonth)}</dd></div><div><dt>STATUS</dt><dd>{state.profile.studyStatus}</dd></div></dl>
    <button className="editorial-goal" onClick={onGoal}><small>YOUR DIRECTION</small><strong>{state.profile.goal}</strong><span>{state.profile.targetYear} ↗</span></button>
    <div className="editorial-gap"><small>NEED NEXT</small><strong>{state.profile.gap}</strong></div>
    <button className="editorial-cv" onClick={() => inputRef.current?.click()}><span>CV</span><div><small>{cvName.startsWith("Sample") ? "TRY THE SAMPLE" : "READY TO REVIEW"}</small><strong>{cvName.replace("Sample · ", "")}</strong></div><b>＋</b></button>
  </aside>;
}

function EditorialWorkspace({ state, routes, selectedNode, cvName, onUpload, onReview, onGoal, onSelectGoal, onAddGoal, onRoute, onTogglePriority, onProof, onCapture }: { state: FutureDoorsState; route: Route; routes: Route[]; selectedNode: PathNode; cvName: string; onUpload: (file: File) => void; onReview: () => void; onGoal: () => void; onSelectGoal: (id: string) => void; onAddGoal: () => void; onRoute: (id: RouteId) => void; onTogglePriority: (id: RouteId) => void; onNode: (node: PathNode) => void; onProof: (proofId: ProofId) => void; onTake: () => void; onMiss: () => void; onRepair: () => void; onReset: () => void; onWhy: () => void; onTools: () => void; onCapture: () => void }) {
  return <section className="editorial-workspace">
    <header className="editorial-hero">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08, duration: .58 }}><small>SAVED POST → REAL PLAN</small><h1>Choose your <em>next step.</em></h1></motion.div>
      <button className="capture-callout" onClick={onCapture}><span className="capture-glyph"><i>POST</i><b /><em /></span><span><small>ADD AN OPPORTUNITY</small><strong>Screenshot or link</strong></span><b>＋</b></button>
    </header>
    <div className="editorial-grid">
      <EditorialProfile state={state} cvName={cvName} onUpload={onUpload} onReview={onReview} onGoal={onGoal} />
      <section className="door-theater" aria-label="Your source-backed opportunity path">
        <header>
          <div><small>YOUR PLAN</small><h2>Choose the opportunities that move you toward your goal.</h2></div>
          <nav className="theater-actions" aria-label="Path inputs">
            <button onClick={onReview}>SETTINGS</button>
            <button onClick={onGoal}>EDIT GOAL</button>
          </nav>
        </header>
        <PinProofStage state={state} routes={routes} selectedNode={selectedNode} onToggle={onTogglePriority} onRoute={onRoute} onProof={onProof} onSettings={onReview} onGoal={onSelectGoal} onAddGoal={onAddGoal} />
      </section>
    </div>
  </section>;
}

function ModalFrame({ label, title, onClose, children, className = "" }: { label: string; title: string; onClose: () => void; children: React.ReactNode; className?: string }) {
  return <motion.div className="modal-backdrop" role="presentation" onMouseDown={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.section layout className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()} initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ type: "spring", stiffness: 330, damping: 30 }}><header><div><small>{label}</small><h2>{title}</h2></div><button onClick={onClose} aria-label="Close">×</button></header>{children}</motion.section></motion.div>;
}

function ProfileModal({ profile, cvName, proposed, onSave, onClose }: { profile: Profile; cvName: string; proposed: boolean; onSave: (profile: Profile) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(profile);
  const setField = <K extends keyof Profile>(key: K, value: Profile[K]) => setDraft((current) => ({ ...current, [key]: value }));
  return <ModalFrame label={proposed ? "AGENT STAGED · NOT SAVED" : "CONFIRM BEFORE USE"} title="Review profile facts" onClose={onClose} className="profile-modal">
    <div className={`trust-banner ${proposed ? "proposal" : ""}`}><b>{proposed ? "Human approval required" : cvName}</b><span>{proposed ? "The agent proposed these facts. Nothing changes until you approve." : "This demo uses only the facts you confirm below."}</span></div>
    <div className="modal-fields">
      <label>Name<input value={draft.name} onChange={(e) => setField("name", e.target.value)} /></label>
      <label>Age<input type="number" min="18" max="100" value={draft.age} onChange={(e) => setField("age", Number(e.target.value) || profile.age)} /></label>
      <label>Graduation<input type="month" value={draft.graduationMonth} onChange={(e) => setField("graduationMonth", e.target.value)} /></label>
      <label>Nationality<input value={draft.nationality} onChange={(e) => setField("nationality", e.target.value)} /></label>
      <label>Residence<input value={draft.residence} onChange={(e) => setField("residence", e.target.value)} /></label>
      <label>University location<input value={draft.universityLocation} onChange={(e) => setField("universityLocation", e.target.value)} /></label>
      <label>Current status<input value={draft.studyStatus} onChange={(e) => setField("studyStatus", e.target.value)} /></label>
      <label>Field / focus<input value={draft.fieldOfStudy} onChange={(e) => setField("fieldOfStudy", e.target.value)} /></label>
      <label>Work authorization<input value={draft.workAuthorization} onChange={(e) => setField("workAuthorization", e.target.value)} /></label>
      <label className="wide">Strengths<input value={draft.strengths.join(", ")} onChange={(e) => setField("strengths", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} /></label>
      <label className="wide">Confirmed exams / credentials<input placeholder="Optional" value={draft.credentials.join(", ")} onChange={(e) => setField("credentials", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} /></label>
      <label className="wide">Current gap<input value={draft.gap} onChange={(e) => setField("gap", e.target.value)} /></label>
      <div className="wide preference-heading"><small>HOW SHOULD THIS PLAN FIT YOUR LIFE?</small><span>These order choices. They never decide eligibility.</span></div>
      <label>Work style<select value={draft.preferences.workMode} onChange={(e) => setField("preferences", { ...draft.preferences, workMode: e.target.value as Profile["preferences"]["workMode"] })}><option>Remote first</option><option>Hybrid okay</option><option>On-site okay</option></select></label>
      <label>Compensation<select value={draft.preferences.compensation} onChange={(e) => setField("preferences", { ...draft.preferences, compensation: e.target.value as Profile["preferences"]["compensation"] })}><option>Paid preferred</option><option>Paid only</option><option>Any compensation</option></select></label>
      <label>Weekly time<select value={draft.preferences.timeCommitment} onChange={(e) => setField("preferences", { ...draft.preferences, timeCommitment: e.target.value as Profile["preferences"]["timeCommitment"] })}><option>Up to 10 hrs / week</option><option>Up to 20 hrs / week</option><option>Flexible time</option></select></label>
      <label>Schedule<select value={draft.preferences.schedule} onChange={(e) => setField("preferences", { ...draft.preferences, schedule: e.target.value as Profile["preferences"]["schedule"] })}><option>During semester</option><option>Break only</option><option>Any schedule</option></select></label>
      <label className="wide">Participation<select value={draft.preferences.participation} onChange={(e) => setField("preferences", { ...draft.preferences, participation: e.target.value as Profile["preferences"]["participation"] })}><option>Solo or small team</option><option>Team okay</option><option>Solo only</option></select></label>
    </div>
    <footer><button onClick={onClose}>CANCEL</button><button className="primary" onClick={() => onSave(draft)}>APPROVE & REBUILD PATH</button></footer>
  </ModalFrame>;
}

function GoalModal({ profile, mode, onSave, onClose }: { profile: Profile; mode: "edit" | "add"; onSave: (goal: string, year: number, gap: string) => void; onClose: () => void }) {
  const adding = mode === "add";
  const [goal, setGoal] = useState(adding ? "" : profile.goal);
  const [year, setYear] = useState(adding ? Math.max(2027, profile.targetYear) : profile.targetYear);
  const [gap, setGap] = useState(adding ? "A visible proof of work" : profile.gap);
  return <ModalFrame label={adding ? "ADD A DIRECTION" : "SET A DIRECTION"} title={adding ? "Keep another future open" : "Where should this path lead?"} onClose={onClose} className="goal-modal"><div className="modal-fields"><label className="wide">Direction<input autoFocus placeholder="For example, Sustainability product builder" value={goal} onChange={(e) => setGoal(e.target.value)} /></label><label>Target year<input type="number" min="2027" max="2040" value={year} onChange={(e) => setYear(Number(e.target.value) || profile.targetYear)} /></label><label className="wide">What would show progress?<input value={gap} onChange={(e) => setGap(e.target.value)} /></label></div><p className="modal-note">You can keep up to four directions. This plan shows useful evidence, never a hiring or acceptance prediction.</p><footer><button onClick={onClose}>CANCEL</button><button className="primary" onClick={() => onSave(goal.trim() || (adding ? "New direction" : profile.goal), Math.min(2040, Math.max(2027, year)), gap.trim() || "A visible proof of work")}>{adding ? "ADD TO MY GOALS" : "REBUILD PATH"}</button></footer></ModalFrame>;
}

function BridgeModal({ state, onApprove, onClose }: { state: FutureDoorsState; onApprove: () => void; onClose: () => void }) {
  return <ModalFrame label="DIFFERENT PATH · WAITING FOR YOU" title="Plan around the closed door" onClose={onClose} className="bridge-modal"><div className="bridge-flow"><span><small>RULE DOES NOT MATCH</small><b>Outreachy · Dec 2026</b></span><i>→</i><span className="proposed"><small>{state.bridge.stagedBy === "agent" ? "AGENT PROPOSAL" : "SAMPLE PROPOSAL"}</small><b>{state.bridge.title}</b><em>{state.bridge.eta}</em></span><i>→</i><span><small>WORK IT COULD CREATE</small>{state.bridge.outputs.map((item) => <b key={item}>○ {item}</b>)}</span></div><div className="bridge-reason"><div><small>{state.bridge.stagedBy === "agent" ? "WHY THE AGENT CONNECTED IT" : "WHY THE SAMPLE CONNECTS IT"}</small><p>{state.bridge.rationale} This may fill a work gap; it does not restore Outreachy eligibility.</p></div><div><small>AGENT-PROPOSED SOURCE B</small><blockquote>{state.bridge.sourceClause}</blockquote><a href={state.bridge.sourceUrl} target="_blank" rel="noreferrer">Open proposed source ↗</a></div></div><footer><span>Outreachy stays closed. This different path remains planned until you attach real work.</span><button onClick={onClose}>KEEP CURRENT PLAN</button><button className="primary" onClick={onApprove}>APPROVE NEW PLAN</button></footer></ModalFrame>;
}

function PriorityModal({ state, onApprove, onClose }: { state: FutureDoorsState; onApprove: () => void; onClose: () => void }) {
  const labels = state.priorityProposal.routeIds.map((id, index) => `P${index + 1} · ${routeNames[id].label}`);
  return <ModalFrame label="AGENT STAGED · YOU DECIDE" title="Pin these priorities?" onClose={onClose} className="priority-modal">
    <div className="priority-proposal"><div>{labels.map((label) => <span key={label}>{label}</span>)}</div><p>{state.priorityProposal.rationale}</p></div>
    <p className="modal-note">This only plans which proof to pursue. It never attaches a work link.</p>
    <footer><span>Nothing changes until you approve.</span><button onClick={onClose}>KEEP MY PINS</button><button className="primary" onClick={onApprove}>APPROVE PRIORITIES</button></footer>
  </ModalFrame>;
}

function ProofModal({ state, proofId, onApprove, onClose }: { state: FutureDoorsState; proofId: ProofId; onApprove: (receipt: { proofId: ProofId; title: string; artifactUrl: string; sourceLabel: string; verificationNote: string }) => void; onClose: () => void }) {
  const staged = state.proofProposal.state === "staged" && state.proofProposal.proofId === proofId ? state.proofProposal : null;
  const existing = state.proofReceipts.find((receipt) => receipt.proofId === proofId);
  const [artifactUrl, setArtifactUrl] = useState(staged?.artifactUrl ?? existing?.artifactUrl ?? "");
  const [verificationNote, setVerificationNote] = useState(staged?.verificationNote ?? "");
  const keptProposal = staged && artifactUrl.trim() === staged.artifactUrl ? staged : existing && artifactUrl.trim() === existing.artifactUrl ? existing : null;
  const derived = workLinkMeta(artifactUrl.trim(), proofId);
  const title = keptProposal?.title ?? derived.title;
  const sourceLabel = keptProposal?.sourceLabel ?? derived.sourceLabel;
  const ready = verificationNote.trim().length >= 12 && artifactUrl.trim().startsWith("https://");
  return <ModalFrame label={staged ? "AGENT STAGED · YOU DECIDE" : existing ? "SAVED WORK LINK · REPLACE CAREFULLY" : "PLANNED → LINK SAVED"} title={`Save work link · ${proofLabels[proofId]}`} onClose={onClose} className="proof-modal">
    <div className={`trust-banner ${staged ? "proposal" : ""}`}><b>{staged ? "Human approval required" : "A direct work link is required"}</b><span>{staged ? "The agent found this link. Approving only saves it for review; it does not verify ownership or quality." : "Paste the direct PR, review, demo, or portfolio URL. Saved means ready for review, not independently verified."}</span></div>
    <div className="modal-fields">
      <label className="wide">Direct work link<input autoFocus value={artifactUrl} onChange={(event) => setArtifactUrl(event.target.value)} placeholder="https://github.com/.../pull/123" /></label>
      <div className="wide proof-auto-label"><small>SHOWN AS</small><strong>{title}</strong><span>{sourceLabel}</span></div>
      <label className="wide">What does this link show?<input value={verificationNote} onChange={(event) => setVerificationNote(event.target.value)} placeholder="A public contribution and its review trail." /></label>
    </div>
    <p className="modal-note">This saves the link for review. It does not verify ownership, quality, acceptance, or skill level.</p>
    <footer><button onClick={onClose}>CANCEL</button><button disabled={!ready} className="primary" onClick={() => onApprove({ proofId, title: title.trim(), artifactUrl: artifactUrl.trim(), sourceLabel: sourceLabel.trim(), verificationNote: verificationNote.trim() })}>{staged ? "APPROVE & SAVE LINK" : "SAVE WORK LINK"}</button></footer>
  </ModalFrame>;
}

function CaptureModal({ candidates, selectedId, profile, onSelect, onConnect, onClose }: { candidates: OpportunityCandidate[]; selectedId: string | null; profile: Profile; onSelect: (id: string) => void; onConnect: (id: string) => void; onClose: () => void }) {
  const candidate = candidates.find((item) => item.id === selectedId) ?? candidates[0];
  if (!candidate) return <ModalFrame label="THE INPUT HAPPENS IN CHATGPT" title="Continue with a screenshot or link" onClose={onClose} className="capture-modal">
    <div className="capture-steps"><span><b>1</b><strong>Share a screenshot</strong><small>Drop an Instagram post, LinkedIn post, or poster into ChatGPT.</small></span><i>→</i><span><b>2</b><strong>We find the official page</strong><small>The agent checks the real deadline and the rules that matter to you.</small></span><i>→</i><span><b>3</b><strong>You choose where it goes</strong><small>It joins your path only when it helps the next step.</small></span></div>
    <div className="capture-prompt"><small>ONE NEXT ACTION · SEND THIS WITH YOUR SCREENSHOT</small><p>“Find the official page for this. Check the rule against my profile, then stage it in Future Doors for my review.”</p></div>
    <footer><span>A screenshot is only a clue. We always look for the official page.</span><button onClick={onClose}>DONE</button></footer>
  </ModalFrame>;

  const review = reviewOpportunity(candidate);
  return <ModalFrame label={`SAVED OPPORTUNITIES · ${candidates.length}/7`} title="Choose what belongs on your path" onClose={onClose} className="capture-modal inbox-modal">
    <div className="inbox-layout">
      <nav className="inbox-list" aria-label="Saved opportunities">
        {candidates.map((item) => { const itemReview = reviewOpportunity(item); return <button key={item.id} className={item.id === candidate.id ? "active" : ""} onClick={() => onSelect(item.id)}><small className={itemReview.status}>{itemReview.label}</small><strong>{item.title}</strong><span>{item.deadlineText}</span></button>; })}
      </nav>
      <section className="candidate-review">
        <div className={`candidate-banner ${review.status}`}><small>{review.label}</small><strong>{candidate.title}</strong><span>{candidate.deadlineText}</span></div>
        <div className="candidate-checks">
          <div><small>WHAT WE CHECKED</small>{candidate.requirements.map((item) => <span key={item}>✓ {item}</span>)}<a href={candidate.sourceUrl} target="_blank" rel="noreferrer">OPEN OFFICIAL PAGE ↗</a></div>
          <div><small>DOES IT HELP THE NEXT STEP?</small><strong>{review.pathAnswer}</strong><p>{candidate.rationale}</p></div>
        </div>
        {candidate.missingFact ? <div className="one-question"><small>ONE THING WE STILL NEED</small><strong>{candidate.missingFact}</strong><span>Answer this in ChatGPT. The agent will update this same card.</span></div> : null}
        {candidate.prerequisite ? <div className="first-step"><small>DO THIS FIRST</small><strong>{candidate.prerequisite}</strong></div> : null}
        <div className="candidate-output"><small>WHAT YOU CAN GET</small>{candidate.outputs.map((item) => <span key={item}>✓ {item}</span>)}</div>
        <div className="checked-line">Checked {candidate.checkedAt} · using {profile.name}&apos;s confirmed facts</div>
      </section>
    </div>
    <footer><span>NEXT: {review.nextAction}</span><button onClick={onClose}>KEEP SAVED</button>{review.canConnect && review.status !== "connected" ? <button className="primary" onClick={() => onConnect(candidate.id)}>ADD TO MY PATH</button> : null}{review.status === "connected" ? <button className="primary" onClick={onClose}>SEE MY PATH</button> : null}</footer>
  </ModalFrame>;
}

function WhyModal({ route, profile, onClose }: { route: Route; profile: Profile; onClose: () => void }) {
  return <ModalFrame label="WHAT WE USED" title="Why this path starts here" onClose={onClose} className="why-modal"><div className="reason-row"><span><small>YOUR GOAL</small><b>{profile.goal}</b></span><i>+</i><span><small>WHAT YOU NEED</small><b>{profile.gap}</b></span><i>+</i><span><small>WHAT YOU DO WELL</small><b>{profile.strengths[0]}</b></span><i>→</i><span className="result"><small>START HERE</small><b>{routeNames[route.id].label}</b></span></div><div className="why-grid"><div><small>WHY IT FITS</small><p>{route.summary}. It also works with {profile.constraints.join(", ").toLowerCase()}.</p></div><div><small>WHAT THIS DOES NOT SAY</small><p>It does not predict acceptance, hiring, or success.</p></div></div><footer><span>This is a plan you can inspect, not a prediction.</span><button onClick={onClose}>DONE</button></footer></ModalFrame>;
}

const judgeDemoPrompts = [
  {
    label: "1 · CHECK + STAGE ANOTHER WAY",
    text: "Read the current Future Doors path. Explain why Outreachy is not actionable for Maya using the official rule on the page. Then stage—not approve—a different path to public collaboration using GitHub's official open-source contribution guide as Source B. Keep Outreachy closed.",
  },
  {
    label: "2 · STAGE A REAL WORK LINK",
    text: "After I approve the different path, stage—not save—this public code change for the planned public_collaboration slot: https://github.com/aprilhan723/future-doors-webmcp/commit/86eb2b5. Describe only what the link directly shows. Leave final approval to me.",
  },
];

function ToolsModal({ status, onClose }: { status: string; onClose: () => void }) {
  const [copied, setCopied] = useState<number | null>(null);
  const abilities = [
    ["Read the path", "See the same steps you see"],
    ["Check a saved post", "Find the official page and deadline"],
    ["Ask for one missing fact", "Never guess eligibility"],
    ["Save real work", "Prepare a PR, review, or demo link"],
    ["Plan another way", "Work around a closed or missed door"],
    ["Compare routes", "Keep your limits in view"],
  ];
  const copyPrompt = async (index: number) => {
    const text = judgeDemoPrompts[index].text;
    let didCopy = false;
    try {
      await navigator.clipboard.writeText(text);
      didCopy = true;
    } catch {
      const field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      didCopy = document.execCommand("copy");
      field.remove();
    }
    setCopied(didCopy ? index : null);
  };
  return <ModalFrame label="PEOPLE + AGENTS, ON THE SAME PAGE" title="What WebMCP changes" onClose={onClose} className="tools-modal"><p className="modal-note">The agent can work with this path directly instead of clicking around and guessing. It can suggest changes; only you can approve them.</p><div className="tool-grid ability-grid">{abilities.map(([title, detail]) => <span key={title}><b>✓ {title}</b><small>{detail}</small></span>)}</div><section className="judge-demo"><header><span><small>90-SECOND JUDGE DEMO</small><strong>Run these in ChatGPT</strong></span><b>Approve on the page between steps.</b></header>{judgeDemoPrompts.map((prompt, index) => <div key={prompt.label}><span><small>{prompt.label}</small><p>{prompt.text}</p></span><button onClick={() => copyPrompt(index)}>{copied === index ? "COPIED ✓" : "COPY"}</button></div>)}</section><footer><span><i className={`capability-dot ${status}`} /> {siteToolNames.length} structured tools · {status === "ready" ? "connected here" : "ready in a WebMCP browser"}</span><button onClick={onClose}>DONE</button></footer></ModalFrame>;
}

export default function FutureDoors() {
  const [state, setState] = useState<FutureDoorsState>(() => cloneInitialState());
  const [hydrated, setHydrated] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [goalModalMode, setGoalModalMode] = useState<"edit" | "add">("edit");
  const [cvName, setCvName] = useState("Sample · Maya_Park.pdf");
  const [proposedProfile, setProposedProfile] = useState<Profile | null>(null);
  const [reviewOpportunityId, setReviewOpportunityId] = useState<string | null>(null);
  const [selectedProofId, setSelectedProofId] = useState<ProofId>("public_collaboration");
  const [introVisible, setIntroVisible] = useState(true);
  const [started, setStarted] = useState(false);
  const stateRef = useRef(state);

  useEffect(() => {
    window.queueMicrotask(() => {
      try {
        const raw = window.localStorage.getItem(stateStorageKey);
        if (raw) {
          const next = sanitizePersistedState(JSON.parse(raw));
          stateRef.current = next;
          setState(next);
        }
      } catch {
        // A malformed local draft never blocks the safe sample path.
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(stateStorageKey, JSON.stringify(state)); } catch { /* The shared page still works when storage is unavailable. */ }
  }, [hydrated, state]);

  const setView = useCallback((transform: (current: FutureDoorsState) => FutureDoorsState) => {
    const next = transform(stateRef.current); stateRef.current = next; setState(next); return summarizeState(next);
  }, []);
  const commit = useCallback((actor: Actor, label: string, detail: string, transform: (current: FutureDoorsState) => FutureDoorsState, meta: Partial<Pick<Activity, "toolName" | "source" | "stateDiff">> = {}) => setView((current) => { const changed = transform(current); return { ...changed, activity: [{ id: makeId("activity"), actor, label, detail, toolName: meta.toolName ?? (actor === "agent" ? "agent_action" : actor === "you" ? "human_ui" : "system_demo"), source: meta.source ?? "shared page", stateDiff: meta.stateDiff ?? label, timestamp: new Date().toISOString() }, ...changed.activity] }; }), [setView]);

  const selectRoute = useCallback((routeId: RouteId, actor: "you" | "agent" = "you") => {
    const id = requireRouteId(routeId); const route = buildRoutes(stateRef.current).find((item) => item.id === id); if (!route) throw new Error(`[UNKNOWN_ROUTE_ID] Route "${id}" is not visible.`);
    const change = (current: FutureDoorsState) => ({ ...current, selectedRouteId: id, selectedNodeId: route.nodes[0].id, scenario: id === "ship" ? current.scenario : "baseline" as const, selectedMonth: id === "ship" ? current.selectedMonth : PATH_START, bridge: id === "ship" ? current.bridge : { ...current.bridge, state: "none" as const } });
    return actor === "agent" ? commit(actor, "Route focused", routeNames[id].label, change) : setView(change);
  }, [commit, setView]);
  const selectCareerGoal = useCallback((goalId: string) => {
    const requested = stateRef.current.goals.find((goal) => goal.id === goalId);
    if (!requested) throw new Error("[UNKNOWN_GOAL_ID] Choose a goal shown in the career tabs.");
    return commit("you", "Career goal selected", requested.title, (current) => {
      const goal = current.goals.find((item) => item.id === goalId) ?? current.goals[0];
      const updated = {
        ...current,
        selectedGoalId: goal.id,
        profile: { ...current.profile, goal: goal.title, targetYear: goal.targetYear, gap: goal.gap },
        scenario: "baseline" as const,
        bridge: { ...current.bridge, state: "none" as const },
      };
      const best = buildRoutes(updated).reduce((leader, item) => item.fit > leader.fit ? item : leader);
      return { ...updated, selectedRouteId: best.id, selectedNodeId: best.nodes[0].id, replayToken: current.replayToken + 1 };
    });
  }, [commit]);
  const selectNode = useCallback((nodeId: string, actor: "you" | "agent" = "you") => { const node = requireVisibleStep(stateRef.current, nodeId); const change = (current: FutureDoorsState) => ({ ...current, selectedRouteId: node.routeId, selectedNodeId: node.id }); return actor === "agent" ? commit(actor, "Step focused", node.title, change) : setView(change); }, [commit, setView]);
  const simulateTake = useCallback((actor: "you" | "agent" = "you") => {
    requireActionableDoor(stateRef.current, "ship-challenge");
    return commit(actor, "Try-out completed", "Simulated results only — no work link was saved", (current) => ({ ...current, selectedMonth: "2026-08", selectedRouteId: "ship", selectedNodeId: "ship-proof", scenario: "take", bridge: { ...current.bridge, state: "none" }, replayToken: current.replayToken + 1 }));
  }, [commit]);
  const simulateMiss = useCallback((actor: "you" | "agent" = "you") => commit(actor, "Opportunity missed in try-out", "The next step is now missing the work it needs", (current) => ({ ...current, selectedMonth: "2026-09", selectedRouteId: "ship", selectedNodeId: "ship-proof", scenario: "miss", bridge: { ...current.bridge, state: "none" }, replayToken: current.replayToken + 1 })), [commit]);
  const stageDefaultBridge = useCallback(() => { commit("system", "Sample proof path staged", "The same proposal can be staged through WebMCP", (current) => ({ ...current, bridge: { ...current.bridge, state: "staged", stagedBy: "system" } }), { toolName: "sample_proposal", source: stateRef.current.bridge.sourceLabel, stateDiff: "bridge.none → staged" }); setModal("bridge"); }, [commit]);
  const approveBridge = useCallback(() => { commit("you", "Different proof path approved", `Outreachy stays closed · ${stateRef.current.bridge.eta} plan`, (current) => ({ ...current, scenario: "rerouted", selectedRouteId: "ship", selectedNodeId: "ship-bridge", priorities: ["community"], bridge: { ...current.bridge, state: "approved" }, replayToken: current.replayToken + 1 }), { toolName: "human_ui", source: stateRef.current.bridge.sourceLabel, stateDiff: "bridge.staged → approved · public_collaboration MISSING → PLANNED" }); setModal(null); }, [commit]);
  const reset = useCallback((actor: "you" | "agent" = "you") => { const next = cloneInitialState(); next.profile = stateRef.current.profile; next.opportunities = stateRef.current.opportunities; next.priorities = stateRef.current.priorities; next.proofReceipts = stateRef.current.proofReceipts; next.activity = [{ id: makeId("activity"), actor, label: "Try-out reset", detail: "Starting path restored", toolName: actor === "agent" ? "reset_path" : "human_ui", stateDiff: "scenario → baseline", timestamp: new Date().toISOString() }, ...stateRef.current.activity]; stateRef.current = next; setState(next); setModal(null); return summarizeState(next); }, []);
  const stageProfileFacts = useCallback((proposal: Parameters<FutureDoorsActions["stageProfileFacts"]>[0]) => {
    const clean = Object.fromEntries(Object.entries(proposal).filter(([, value]) => value !== undefined));
    if (Object.keys(clean).length === 0) throw new Error("[EMPTY_PROFILE_PROPOSAL] Stage at least one explicit fact.");
    const next = { ...stateRef.current.profile, ...clean } as Profile;
    setProposedProfile(next); setModal("profile");
    return { status: "staged", fields: Object.keys(clean), humanApprovalRequired: true };
  }, []);
  const stageOpportunityFromSource = useCallback((proposal: Parameters<FutureDoorsActions["stageOpportunityFromSource"]>[0]) => {
    const existing = stateRef.current.opportunities.find((candidate) => candidate.sourceUrl === proposal.sourceUrl);
    const id = existing?.id ?? makeId("opportunity");
    const candidate: OpportunityCandidate = { ...proposal, id, state: "review", checkedAt: new Date().toISOString().slice(0, 10) };
    commit("agent", existing ? "Saved opportunity updated" : "Saved opportunity checked", proposal.title, (current) => ({ ...current, opportunities: [candidate, ...current.opportunities.filter((item) => item.id !== id)].slice(0, 7), replayToken: current.replayToken + 1 }));
    setReviewOpportunityId(id);
    setModal("capture");
    return { status: "ready_for_human_review", id, title: proposal.title, officialSource: proposal.sourceUrl, deadline: proposal.deadlineText, humanApprovalRequired: true };
  }, [commit]);
  const stagePriorityPlan = useCallback((proposal: Parameters<FutureDoorsActions["stagePriorityPlan"]>[0]) => {
    const routeIds = validatePriorityPlan(stateRef.current, proposal.routeIds);
    commit("agent", "Priority plan staged", routeIds.map((id) => routeNames[id].label).join(" → "), (current) => ({ ...current, priorityProposal: { state: "staged", ...proposal, routeIds } }), { toolName: "stage_priority_plan", stateDiff: "priority proposal none → staged" });
    setModal("priority");
    return { status: "staged", routeIds, humanApprovalRequired: true };
  }, [commit]);
  const stageProofReceipt = useCallback((proposal: Parameters<FutureDoorsActions["stageProofReceipt"]>[0]) => {
    const routeId = (Object.entries(ROUTE_PROOF) as [RouteId, ProofId][]).find(([, proofId]) => proofId === proposal.proofId)?.[0];
    if (!routeId || !stateRef.current.priorities.includes(routeId)) throw new Error("[PROOF_NOT_PLANNED] Pin the opportunity that creates this proof before attaching an artifact.");
    commit("agent", "Proof receipt staged", proposal.title, (current) => ({ ...current, proofProposal: { state: "staged", ...proposal } }), { toolName: "stage_proof_receipt", source: proposal.sourceLabel, stateDiff: `${proposal.proofId} PLANNED → waiting for approval` });
    setSelectedProofId(proposal.proofId); setModal("proof");
    return { status: "staged", proofId: proposal.proofId, transition: "PLANNED → LINK SAVED", humanApprovalRequired: true };
  }, [commit]);
  const approveProofReceipt = useCallback((receipt: Parameters<FutureDoorsActions["stageProofReceipt"]>[0]) => {
    const previous = stateRef.current.proofReceipts.find((item) => item.proofId === receipt.proofId);
    commit("you", "Proof receipt approved", `${proofLabels[receipt.proofId]} · ${receipt.sourceLabel}`, (current) => ({
      ...current,
      proofReceipts: [...current.proofReceipts.filter((item) => item.proofId !== receipt.proofId), { proofId: receipt.proofId, title: receipt.title, artifactUrl: receipt.artifactUrl, sourceLabel: receipt.sourceLabel, verificationNote: receipt.verificationNote, attachedAt: new Date().toISOString() }],
      proofProposal: { state: "none", proofId: null, title: "", artifactUrl: "", sourceLabel: "", verificationNote: "" },
    }), { toolName: "human_ui", source: receipt.sourceLabel, stateDiff: previous ? `${receipt.proofId} LINK SAVED → LINK SAVED · supersedes ${previous.title}` : `${receipt.proofId} PLANNED → LINK SAVED` });
    setModal(null);
  }, [commit]);
  const approvePriorities = useCallback(() => {
    const routeIds = validatePriorityPlan(stateRef.current, stateRef.current.priorityProposal.routeIds);
    commit("you", "Priority plan approved", routeIds.map((id) => routeNames[id].label).join(" → "), (current) => ({ ...current, priorities: routeIds, priorityProposal: { state: "none", routeIds: [], rationale: "" } }), { toolName: "human_ui", stateDiff: "priority proposal staged → approved" });
    setModal(null);
  }, [commit]);
  const togglePriority = useCallback((id: RouteId) => {
    const firstDoor = buildRoutes(stateRef.current).find((item) => item.id === id)?.nodes[0];
    if (firstDoor?.status === "ineligible" || firstDoor?.status === "expired" || firstDoor?.status === "blocked") return;
    commit("you", "Priority changed", routeNames[id].label, (current) => {
      const removing = current.priorities.includes(id);
      const next = removing ? current.priorities.filter((item) => item !== id) : current.priorities.length < maxPriorities ? [...current.priorities, id] : current.priorities;
      const focusedNode = buildRoutes(current).find((item) => item.id === id)?.nodes[0];
      return { ...current, priorities: next, selectedRouteId: removing || !focusedNode ? current.selectedRouteId : id, selectedNodeId: removing || !focusedNode ? current.selectedNodeId : focusedNode.id, priorityProposal: { state: "none", routeIds: [], rationale: "" } };
    });
  }, [commit]);

  const actions = useMemo<FutureDoorsActions>(() => ({
    getPathSnapshot: () => summarizeState(stateRef.current), stageProfileFacts, stageOpportunityFromSource, stagePriorityPlan, stageProofReceipt,
    focusRoute: selectRoute, focusStep: selectNode,
    movePathClock: (month, actor = "you") => { const valid = requirePathMonth(month); return commit(actor, "Path clock moved", formatMonth(valid), (current) => ({ ...current, selectedMonth: valid, replayToken: current.replayToken + 1 })); },
    simulateTakeDoor: (doorId, actor = "you") => { requireDoorId(doorId); return simulateTake(actor); },
    simulateMissedDoor: (doorId, actor = "you") => { requireDoorId(doorId); return simulateMiss(actor); },
    stageBridgeFromSource: (proposal) => { const firstDoor = buildRoutes(stateRef.current).find((item) => item.id === "ship")?.nodes[0]; if (stateRef.current.scenario !== "miss" && firstDoor?.status !== "ineligible") throw new Error("[PATH_NOT_BLOCKED] Suggest another way only after a door is missed or an official rule does not match."); const result = commit("agent", "Different proof path staged", "Waiting for your approval", (current) => ({ ...current, bridge: { ...proposal, state: "staged", stagedBy: "agent" } }), { toolName: "stage_bridge_from_source", source: proposal.sourceLabel, stateDiff: "bridge.none → staged · human approval required" }); setModal("bridge"); return result; },
    pinConstraint: (constraint, actor = "you") => commit(actor, "Constraint pinned", constraint, (current) => ({ ...current, pinnedConstraints: current.pinnedConstraints.includes(constraint) ? current.pinnedConstraints : [...current.pinnedConstraints, constraint].slice(-5) })),
    compareRoutes: () => summarizeRouteComparison(stateRef.current),
    explainDownstreamEffect: (stepId, actor = "you") => { requireVisibleStep(stateRef.current, stepId); selectNode(stepId, actor); return downstreamEffect(stateRef.current, stepId); },
    resetPath: reset,
  }), [commit, reset, selectNode, selectRoute, simulateMiss, simulateTake, stageOpportunityFromSource, stagePriorityPlan, stageProfileFacts, stageProofReceipt]);

  const webMcpStatus = useFutureDoorsWebMcp(actions);
  const routes = useMemo(() => buildRoutes(state), [state]);
  const route = routes.find((item) => item.id === state.selectedRouteId) ?? routes[0];
  const selectedNode = getSelectedNode(state);

  const saveGoal = (goal: string, targetYear: number, gap: string) => { commit("you", "Goal updated", `${goal} · ${targetYear}`, (current) => { const goals = current.goals.map((item) => item.id === current.selectedGoalId ? { ...item, title: goal, shortLabel: goal.slice(0, 22), targetYear, gap } : item); const updated = { ...current, goals, profile: { ...current.profile, goal, targetYear, gap }, scenario: "baseline" as const, bridge: { ...current.bridge, state: "none" as const } }; const best = buildRoutes(updated).reduce((leader, item) => item.fit > leader.fit ? item : leader); return { ...updated, selectedRouteId: best.id, selectedNodeId: best.nodes[0].id, replayToken: current.replayToken + 1 }; }); setModal(null); };
  const addCareerGoal = (goal: string, targetYear: number, gap: string) => { commit("you", "Career goal added", `${goal} · ${targetYear}`, (current) => {
    if (current.goals.length >= 4) return current;
    const slug = goal.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 28) || "direction";
    const id = `${slug}-${Date.now().toString(36)}`;
    const nextGoal = { id, title: goal, shortLabel: goal.slice(0, 22), targetYear, gap, supportedRoutes: ["ship", "community", "research"] as RouteId[] };
    const updated = { ...current, goals: [...current.goals, nextGoal], selectedGoalId: id, profile: { ...current.profile, goal, targetYear, gap }, scenario: "baseline" as const, bridge: { ...current.bridge, state: "none" as const } };
    const best = buildRoutes(updated).reduce((leader, item) => item.fit > leader.fit ? item : leader);
    return { ...updated, selectedRouteId: best.id, selectedNodeId: best.nodes[0].id, replayToken: current.replayToken + 1 };
  }); setModal(null); };
  const saveProfile = (profile: Profile) => { commit("you", "Profile facts approved", `${profile.name} · ${profile.residence}`, (current) => { const updated = { ...current, profile, scenario: "baseline" as const, bridge: { ...current.bridge, state: "none" as const } }; const best = buildRoutes(updated).reduce((leader, item) => item.fit > leader.fit ? item : leader); return { ...updated, selectedRouteId: best.id, selectedNodeId: best.nodes[0].id, replayToken: current.replayToken + 1 }; }); setProposedProfile(null); setModal(null); };
  const uploadCv = (file: File) => { setCvName(`Selected · ${file.name}`); commit("you", "CV selected", "Review facts before the path uses them", (current) => ({ ...current, replayToken: current.replayToken + 1 })); setProposedProfile(null); setModal("profile"); };
  const connectOpportunity = (id: string) => {
    const candidate = stateRef.current.opportunities.find((item) => item.id === id);
    if (!candidate) throw new Error("[UNKNOWN_OPPORTUNITY] Choose a saved opportunity shown in the review window.");
    const review = reviewOpportunity(candidate);
    if (!review.canConnect || review.status === "needs_fact") throw new Error("[OPPORTUNITY_NOT_READY] Answer the missing detail or choose an opportunity that helps the next step.");
    commit("you", "Opportunity added to path", candidate.title, (current) => ({ ...current, opportunities: current.opportunities.map((item) => ({ ...item, state: item.id === id ? "connected" as const : "review" as const })), selectedRouteId: "ship", selectedNodeId: "ship-challenge", scenario: "baseline", bridge: { ...current.bridge, state: "none" }, replayToken: current.replayToken + 1 }));
    setModal(null);
  };

  const openCapture = () => { setReviewOpportunityId(state.opportunities[0]?.id ?? null); setModal("capture"); };
  const startAndCapture = () => { setStarted(true); openCapture(); };

  return <main className="spatial-shell editorial-shell">
    <AnimatePresence>{introVisible ? <OpeningSequence onDone={() => setIntroVisible(false)} /> : null}</AnimatePresence>
    <header className="spatial-topbar editorial-topbar"><div className="spatial-brand"><span className="brand-icon"><i /></span><strong>FUTURE DOORS</strong><small>OPPORTUNITY → ACTION → GOAL</small></div><div className="spatial-agent"><span className={`capability-dot ${webMcpStatus}`} /><b>AGENT CHECKS · YOU APPROVE</b></div><nav><button className="spatial-capture" onClick={startAndCapture}>＋ ADD VIA CHATGPT{state.opportunities.length ? ` · ${state.opportunities.length}/7` : ""}</button><button onClick={() => setModal("tools")}>HOW IT WORKS</button></nav></header>
    {started ? <EditorialWorkspace state={state} route={route} routes={routes} selectedNode={selectedNode} cvName={cvName} onUpload={uploadCv} onReview={() => { setProposedProfile(null); setModal("profile"); }} onGoal={() => { setGoalModalMode("edit"); setModal("goal"); }} onSelectGoal={selectCareerGoal} onAddGoal={() => { setGoalModalMode("add"); setModal("goal"); }} onRoute={(id) => selectRoute(id)} onTogglePriority={togglePriority} onNode={(node) => selectNode(node.id)} onProof={(proofId) => { setSelectedProofId(proofId); setModal("proof"); }} onTake={() => simulateTake()} onMiss={() => simulateMiss()} onRepair={stageDefaultBridge} onReset={() => reset()} onWhy={() => setModal("why")} onTools={() => setModal("tools")} onCapture={openCapture} /> : <LaunchScene onDemo={() => setStarted(true)} onAdd={startAndCapture} onTools={() => setModal("tools")} />}
    <AnimatePresence>
      {modal === "profile" ? <ProfileModal profile={proposedProfile ?? state.profile} cvName={cvName} proposed={Boolean(proposedProfile)} onSave={saveProfile} onClose={() => { setProposedProfile(null); setModal(null); }} /> : null}
      {modal === "goal" ? <GoalModal profile={state.profile} mode={goalModalMode} onSave={goalModalMode === "add" ? addCareerGoal : saveGoal} onClose={() => setModal(null)} /> : null}
      {modal === "bridge" ? <BridgeModal state={state} onApprove={approveBridge} onClose={() => setModal(null)} /> : null}
      {modal === "priority" ? <PriorityModal state={state} onApprove={approvePriorities} onClose={() => setModal(null)} /> : null}
      {modal === "proof" ? <ProofModal state={state} proofId={selectedProofId} onApprove={approveProofReceipt} onClose={() => setModal(null)} /> : null}
      {modal === "capture" ? <CaptureModal candidates={state.opportunities} selectedId={reviewOpportunityId} profile={state.profile} onSelect={setReviewOpportunityId} onConnect={connectOpportunity} onClose={() => setModal(null)} /> : null}
      {modal === "why" ? <WhyModal route={route} profile={state.profile} onClose={() => setModal(null)} /> : null}
      {modal === "tools" ? <ToolsModal status={webMcpStatus} onClose={() => setModal(null)} /> : null}
    </AnimatePresence>
  </main>;
}
