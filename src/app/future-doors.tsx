"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AnimatedBackground, AnimatedGroup, Spotlight, Tilt } from "@/components/motion-primitives";
import {
  PATH_START,
  buildRoutes,
  cloneInitialState,
  downstreamEffect,
  formatMonth,
  getSelectedNode,
  reviewOpportunity,
  requireDoorId,
  requirePathMonth,
  requireRouteId,
  requireVisibleStep,
  summarizeRouteComparison,
  summarizeState,
  type Actor,
  type FutureDoorsState,
  type OpportunityCandidate,
  type PathNode,
  type Profile,
  type Route,
  type RouteId,
} from "@/lib/future-map";
import {
  siteToolNames,
  useFutureDoorsWebMcp,
  type FutureDoorsActions,
} from "@/lib/webmcp";

type Modal = "bridge" | "capture" | "tools" | "goal" | "profile" | "why" | "priority" | null;
const stateStorageKey = "future-doors:shared-path:v2";

const routeNames: Record<RouteId, { label: string; short: string; reason: string }> = {
  ship: { label: "Build & ship", short: "SHIP", reason: "Fastest proof" },
  community: { label: "Build in public", short: "CONTRIBUTE", reason: "Earn trust" },
  research: { label: "Get mentored", short: "MENTORSHIP", reason: "Guided depth" },
};

const statusCopy: Record<PathNode["status"], string> = {
  available: "OPEN NOW",
  ready: "OPEN NEXT",
  checking: "CHECK FIRST",
  future: "LATER",
  locked: "NEXT",
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

function DoorGlyph({ status }: { status: PathNode["status"] }) {
  const open = ["available", "ready", "simulated", "strengthened"].includes(status);
  const closed = status === "expired" || status === "blocked";
  return (
    <span className={`door-glyph ${open ? "is-open" : ""} ${closed ? "is-closed" : ""}`} aria-hidden="true">
      <i><b /></i>
      {closed ? <em>×</em> : null}
      {!open && !closed ? <span>•</span> : null}
    </span>
  );
}

function PremiumPortal({ status = "available", hero = false }: { status?: PathNode["status"]; hero?: boolean }) {
  const closed = status === "expired" || status === "blocked";
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
  if (state.scenario === "rerouted") return <div className="spatial-decision success"><div><small>DETOUR ADDED</small><strong>Same proof · {state.bridge.eta}</strong></div><button onClick={onReset}>RESET</button></div>;
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
      <div className="evidence-rule"><header><small>{sourceBacked ? "OFFICIAL RULE" : "PATH LOGIC"}</small><span>{sourceBacked ? "VERIFIED" : "PLANNED"}</span></header><p>{node.sourceClause ?? node.edgeToNext?.label ?? "This is a direction, not a predicted outcome."}</p>{node.sourceUrl ? <a href={node.sourceUrl} target="_blank" rel="noreferrer">SOURCE ↗</a> : null}</div>
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
      <small>EVERY OPPORTUNITY HAS A WINDOW</small>
      <h1>See what opens next.</h1>
    </motion.div>
    <button onClick={onDone}>SKIP ↗</button>
  </motion.section>;
}

function LaunchScene({ onDemo, onAdd, onTools }: { onDemo: () => void; onAdd: () => void; onTools: () => void }) {
  return <section className="launch-scene" aria-labelledby="launch-title">
    <motion.div className="launch-copy" initial={{ opacity: 0, x: -26 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .72, ease: [0.16, 1, 0.3, 1] }}>
      <small>ONE SAVED POST → ONE SOURCE-BACKED PATH</small>
      <h1 id="launch-title">See what this door <em>opens next.</em></h1>
      <p>Add a screenshot or link. The agent checks the official rules and shows what the opportunity can create. <b>You decide what joins your path.</b></p>
      <div className="launch-actions">
        <button className="launch-primary" onClick={onDemo}>TRY THE 30-SECOND DEMO <span>→</span></button>
        <button onClick={onAdd}>ADD MY OPPORTUNITY <span>＋</span></button>
      </div>
      <button className="launch-explain" onClick={onTools}>WHY THIS NEEDS WEBMCP ↗</button>
    </motion.div>

    <motion.div className="launch-world" initial={{ opacity: 0, scale: .78, rotateY: -10 }} animate={{ opacity: 1, scale: 1, rotateY: 0 }} transition={{ delay: .12, duration: 1.05, ease: [0.16, 1, 0.3, 1] }} onPointerMove={(event) => { const rect = event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty("--pointer-x", `${((event.clientX - rect.left) / rect.width - .5) * 2}`); event.currentTarget.style.setProperty("--pointer-y", `${((event.clientY - rect.top) / rect.height - .5) * 2}`); }} onPointerLeave={(event) => { event.currentTarget.style.setProperty("--pointer-x", "0"); event.currentTarget.style.setProperty("--pointer-y", "0"); }} aria-hidden="true">
      <div className="cinematic-field"><i /><i /><i /></div>
      <div className="launch-pass"><span>SAVED</span><strong>OUTREACHY<br />DEC 2026</strong><small>SCREENSHOT · 01</small><i /><b /></div>
      <div className="verification-path"><i /><b /></div>
      <PremiumPortal hero />
      <div className="next-proof"><span>WHAT OPENS NEXT</span><strong>OPEN-SOURCE PROOF</strong><small>CONTRIBUTION · REVIEW · MENTOR</small></div>
    </motion.div>

    <ol className="launch-method" aria-label="How Future Doors works">
      <li><i>01</i><span><b>YOU SHARE</b><small>A screenshot or link</small></span></li>
      <li><i>02</i><span><b>AGENT CHECKS</b><small>Source, rules, deadline</small></span></li>
      <li><i>03</i><span><b>YOU CHOOSE</b><small>Take it, skip it, or reroute</small></span></li>
    </ol>
  </section>;
}

const journeyLinks = ["CREATES", "OPENS", "BUILDS TOWARD"] as const;

const scrapbookDetails: Record<RouteId, { apply: string; activity: string; load: string; signal: string }> = {
  ship: { apply: "By Sep 1", activity: "Application + contribution", load: "30H/WK IF SELECTED", signal: "Mentor-reviewed work" },
  community: { apply: "Any time", activity: "4–8 weeks", load: "5–10H/WK", signal: "Public collaboration" },
  research: { apply: "Next cycle", activity: "12+ weeks", load: "6–10H/WK", signal: "Mentor feedback" },
};

function PinProofStage({ state, routes, route, selectedNode, onToggle, onRoute, onNode, onTools }: { state: FutureDoorsState; routes: Route[]; route: Route; selectedNode: PathNode; onToggle: (id: RouteId) => void; onRoute: (id: RouteId) => void; onNode: (node: PathNode) => void; onTools: () => void }) {
  const priorities = state.priorities;
  const planned = new Set(priorities.map((id) => scrapbookDetails[id].signal));
  const proposal = new Set(state.priorityProposal.state === "staged" ? state.priorityProposal.routeIds : []);
  const sourceBacked = Boolean(selectedNode.sourceUrl && selectedNode.sourceClause);
  return <section className={`pin-proof-stage scenario-${state.scenario}`} aria-label="Pin opportunities to the proof your goal needs">
    <header>
      <span><small>SAVED ISN&apos;T PLANNED</small><strong>Pin only what fills the gap.</strong></span>
      <b>{priorities.length}/2 PRIORITIES · {3 - planned.size} GAPS LEFT</b>
    </header>
    <div className="pin-proof-map">
      <div className="pin-start"><small>YOU · NOW</small><strong>{state.profile.name.split(" ")[0]}</strong><span>{state.profile.studyStatus}</span></div>
      <div className="map-arrow"><span>CHOOSE</span><i /></div>
      <div className="saved-stack" aria-label="Saved opportunities">
        <small>SAVED OPPORTUNITIES</small>
        {routes.map((item, index) => {
          const node = item.nodes[0];
          const detail = scrapbookDetails[item.id];
          const pinned = priorities.includes(item.id);
          const staged = proposal.has(item.id) && !pinned;
          const priority = priorities.indexOf(item.id) + 1;
          return <motion.article key={item.id} className={`${pinned ? "pinned" : ""} ${staged ? "staged" : ""} ${item.id === state.selectedRouteId ? "current" : ""}`} whileHover={{ x: 2 }}>
            <button className="saved-main" onClick={() => onRoute(item.id)} aria-pressed={item.id === state.selectedRouteId}>
              <i>0{index + 1}</i><span><strong>{displayNodeTitle(node)}</strong><small>APPLY {detail.apply} · {detail.activity} · {detail.load}</small></span>
            </button>
            <button className="pin-control" onClick={() => onToggle(item.id)} aria-label={`${pinned ? "Remove" : "Pin"} ${displayNodeTitle(node)}`} aria-pressed={pinned}>{pinned ? `P${priority}` : staged ? "AGENT?" : "+ PIN"}</button>
          </motion.article>;
        })}
      </div>
      <div className="map-arrow"><span>FILLS</span><i /></div>
      <div className="proof-bank">
        <small>PROOF YOUR GOAL NEEDS</small>
        {Object.values(scrapbookDetails).map((item) => <span className={planned.has(item.signal) ? "planned" : "missing"} key={item.signal}><i>{planned.has(item.signal) ? "~" : "+"}</i><b>{planned.has(item.signal) ? "PLANNED" : "MISSING"}</b><strong>{item.signal}</strong></span>)}
      </div>
      <div className="map-arrow"><span>BUILDS</span><i /></div>
      <div className="pin-goal"><PremiumPortal status={planned.size === 3 ? "ready" : "locked"} /><span><small>GOAL · {state.profile.targetYear}</small><strong>{state.profile.goal}</strong><em>{planned.size}/3 proof types planned</em></span></div>
    </div>
    <div className="causal-breadcrumb" aria-label="Selected opportunity chain">
      {route.nodes.map((node, index) => <span key={node.id}><button className={node.id === selectedNode.id ? "selected" : ""} onClick={() => onNode(node)}><small>{cardStatus(node)}</small><strong>{displayNodeTitle(node)}</strong></button>{index < route.nodes.length - 1 ? <i className={state.scenario === "miss" && index === 0 ? "broken" : ""}>{state.scenario === "miss" && index === 0 ? "BREAKS" : journeyLinks[index]}</i> : null}</span>)}
    </div>
    <footer className={`pin-proof-source ${sourceBacked ? "checked" : "planned"}`}>
      <span>{sourceBacked ? "✓ OFFICIAL RULE CHECKED" : "PATH LOGIC"}</span>
      <p>{selectedNode.sourceClause ?? selectedNode.edgeToNext?.label ?? selectedNode.description}</p>
      {selectedNode.sourceUrl ? <a href={selectedNode.sourceUrl} target="_blank" rel="noreferrer">OPEN SOURCE ↗</a> : <button onClick={onTools}>HOW IT WAS CHECKED ↗</button>}
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

function EditorialDecision({ state, route, onTake, onMiss, onRepair, onReset }: { state: FutureDoorsState; route: Route; onTake: () => void; onMiss: () => void; onRepair: () => void; onReset: () => void }) {
  const last = state.activity[0];
  const status = <em className={`change-author ${last?.actor ?? "system"}`}>LAST CHANGE · {last?.actor.toUpperCase() ?? "SYSTEM"} · {last?.label ?? "Path ready"}</em>;
  if (route.id !== "ship") return <div className="editorial-decision"><span><small>ANOTHER ROUTE</small><strong>{route.summary}</strong>{status}</span><button onClick={onReset}>BACK TO BEST ROUTE</button></div>;
  if (state.scenario === "miss") return <div className="editorial-decision danger"><span><small>THE PATH STOPS HERE</small><strong>The next step has no proof to use.</strong>{status}</span><button className="accent" onClick={onRepair}>FIND A DETOUR →</button><button onClick={onReset}>RESET</button></div>;
  if (state.scenario === "take") return <div className="editorial-decision success"><span><small>PROOF CREATED</small><strong>The next door is now ready.</strong>{status}</span><button onClick={onReset}>TRY AGAIN</button></div>;
  if (state.scenario === "rerouted") return <div className="editorial-decision success"><span><small>PATH REPAIRED</small><strong>Same proof · {state.bridge.eta}.</strong>{status}</span><button onClick={onReset}>TRY AGAIN</button></div>;
  return <div className="editorial-decision"><span><small>TRY THE FUTURE</small><strong>What happens to the path?</strong>{status}</span><button className="accent" onClick={onTake}>TAKE THIS DOOR →</button><button onClick={onMiss}>SKIP IT</button></div>;
}

function EditorialWorkspace({ state, route, routes, selectedNode, cvName, onUpload, onReview, onGoal, onRoute, onTogglePriority, onNode, onTake, onMiss, onRepair, onReset, onWhy, onTools, onCapture }: { state: FutureDoorsState; route: Route; routes: Route[]; selectedNode: PathNode; cvName: string; onUpload: (file: File) => void; onReview: () => void; onGoal: () => void; onRoute: (id: RouteId) => void; onTogglePriority: (id: RouteId) => void; onNode: (node: PathNode) => void; onTake: () => void; onMiss: () => void; onRepair: () => void; onReset: () => void; onWhy: () => void; onTools: () => void; onCapture: () => void }) {
  const sourceBacked = Boolean(selectedNode.sourceUrl && selectedNode.sourceClause);
  const proposedSource = selectedNode.kind === "bridge";
  const uploadRef = useRef<HTMLInputElement>(null);
  return <section className="editorial-workspace">
    <header className="editorial-hero">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08, duration: .58 }}><small>FROM A SAVED POST TO A REAL NEXT MOVE</small><h1>Don&apos;t just save it. <em>See where it leads.</em></h1></motion.div>
      <button className="capture-callout" onClick={onCapture}><span className="capture-glyph"><i>POST</i><b /><em /></span><span><small>START WITH ANY OPPORTUNITY</small><strong>Add a screenshot or link</strong><p>Agent finds the official rules → you choose</p></span><b>＋</b></button>
    </header>
    <div className="editorial-grid">
      <EditorialProfile state={state} cvName={cvName} onUpload={onUpload} onReview={onReview} onGoal={onGoal} />
      <section className="door-theater" aria-label="Your verified opportunity path">
        <header>
          <div><small>YOUR WHOLE PATH</small><h2>One door creates what the next door needs.</h2></div>
          <input ref={uploadRef} hidden type="file" accept=".pdf,.doc,.docx" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); }} />
          <nav className="theater-actions" aria-label="Path inputs">
            <button onClick={onReview}>YOU · {state.profile.name.split(" ")[0]} · {state.profile.age} · {state.profile.residence}</button>
            <button onClick={onGoal}>GOAL · {state.profile.goal} · {state.profile.targetYear}</button>
            <button onClick={() => uploadRef.current?.click()}>CV · {cvName.startsWith("Sample") ? "TRY" : "READY"}</button>
            <button onClick={onWhy}>WHY THIS ROUTE ↗</button>
          </nav>
        </header>
        <PinProofStage state={state} routes={routes} route={route} selectedNode={selectedNode} onToggle={onTogglePriority} onRoute={onRoute} onNode={onNode} onTools={onTools} />
        <EditorialDecision state={state} route={route} onTake={onTake} onMiss={onMiss} onRepair={onRepair} onReset={onReset} />
      </section>
      <aside className="editorial-inspector">
        <header><small>CHECK THIS STEP</small><b className={selectedNode.status}>{cardStatus(selectedNode)}</b></header>
        <motion.div key={selectedNode.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <span className="inspector-number">0{Math.min(selectedNode.stage, 9)}</span><h3>{displayNodeTitle(selectedNode)}</h3><p>{selectedNode.description}</p>
        </motion.div>
        <section><header><small>{proposedSource ? "PROPOSED SOURCE" : sourceBacked ? "OFFICIAL RULE" : "PATH LOGIC"}</small><span>{proposedSource ? "YOU APPROVED" : sourceBacked ? "CHECKED" : "PLANNED"}</span></header><p>{selectedNode.sourceClause ?? selectedNode.edgeToNext?.label ?? "A direction, never a prediction."}</p>{selectedNode.sourceUrl ? <a href={selectedNode.sourceUrl} target="_blank" rel="noreferrer">OPEN SOURCE ↗</a> : null}</section>
        <div className="agent-boundary"><span>AGENT</span><p>Checks the source and stages changes.</p><span>YOU</span><p>Approve what joins the path.</p></div>
        <button onClick={onTools}>HOW THE AGENT HELPS ↗</button>
      </aside>
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
      <label>Current status<input value={draft.studyStatus} onChange={(e) => setField("studyStatus", e.target.value)} /></label>
      <label>Field / focus<input value={draft.fieldOfStudy} onChange={(e) => setField("fieldOfStudy", e.target.value)} /></label>
      <label>Work authorization<input value={draft.workAuthorization} onChange={(e) => setField("workAuthorization", e.target.value)} /></label>
      <label className="wide">Strengths<input value={draft.strengths.join(", ")} onChange={(e) => setField("strengths", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} /></label>
      <label className="wide">Confirmed exams / credentials<input placeholder="Optional" value={draft.credentials.join(", ")} onChange={(e) => setField("credentials", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} /></label>
      <label className="wide">Current gap<input value={draft.gap} onChange={(e) => setField("gap", e.target.value)} /></label>
    </div>
    <footer><button onClick={onClose}>CANCEL</button><button className="primary" onClick={() => onSave(draft)}>APPROVE & REBUILD PATH</button></footer>
  </ModalFrame>;
}

function GoalModal({ profile, onSave, onClose }: { profile: Profile; onSave: (goal: string, year: number) => void; onClose: () => void }) {
  const [goal, setGoal] = useState(profile.goal);
  const [year, setYear] = useState(profile.targetYear);
  return <ModalFrame label="SET A DIRECTION" title="Where should this path lead?" onClose={onClose} className="goal-modal"><div className="modal-fields"><label className="wide">Goal<input autoFocus value={goal} onChange={(e) => setGoal(e.target.value)} /></label><label>Target year<input type="number" min="2027" max="2040" value={year} onChange={(e) => setYear(Number(e.target.value) || profile.targetYear)} /></label></div><p className="modal-note">The route updates. Future Doors never predicts hiring or acceptance.</p><footer><button onClick={onClose}>CANCEL</button><button className="primary" onClick={() => onSave(goal.trim() || profile.goal, Math.min(2040, Math.max(2027, year)))}>REBUILD PATH</button></footer></ModalFrame>;
}

function BridgeModal({ state, onApprove, onClose }: { state: FutureDoorsState; onApprove: () => void; onClose: () => void }) {
  return <ModalFrame label="ANOTHER WAY · WAITING FOR YOU" title="Replace the missed step" onClose={onClose} className="bridge-modal"><div className="bridge-flow"><span><small>MISSED</small><b>Outreachy · Dec 2026</b></span><i>→</i><span className="proposed"><small>AGENT PROPOSAL</small><b>{state.bridge.title}</b><em>{state.bridge.eta}</em></span><i>→</i><span><small>INTENDED OUTPUTS</small>{state.bridge.outputs.map((item) => <b key={item}>✓ {item}</b>)}</span></div><div className="bridge-reason"><div><small>WHY THE AGENT SUGGESTED IT</small><p>{state.bridge.rationale}</p></div><div><small>SOURCE TO REVIEW</small><blockquote>{state.bridge.sourceClause}</blockquote><a href={state.bridge.sourceUrl} target="_blank" rel="noreferrer">Open proposed source ↗</a></div></div><footer><span>This source is proposed, not independently verified. Only you can adopt it.</span><button onClick={onClose}>KEEP OLD PATH</button><button className="primary" onClick={onApprove}>USE THIS WAY</button></footer></ModalFrame>;
}

function PriorityModal({ state, onApprove, onClose }: { state: FutureDoorsState; onApprove: () => void; onClose: () => void }) {
  const labels = state.priorityProposal.routeIds.map((id, index) => `P${index + 1} · ${routeNames[id].label}`);
  return <ModalFrame label="AGENT STAGED · YOU DECIDE" title="Pin these priorities?" onClose={onClose} className="priority-modal">
    <div className="priority-proposal"><div>{labels.map((label) => <span key={label}>{label}</span>)}</div><p>{state.priorityProposal.rationale}</p></div>
    <p className="modal-note">This only plans which proof to pursue. It never marks the proof as earned.</p>
    <footer><span>Nothing changes until you approve.</span><button onClick={onClose}>KEEP MY PINS</button><button className="primary" onClick={onApprove}>APPROVE PRIORITIES</button></footer>
  </ModalFrame>;
}

function CaptureModal({ candidates, selectedId, profile, onSelect, onConnect, onClose }: { candidates: OpportunityCandidate[]; selectedId: string | null; profile: Profile; onSelect: (id: string) => void; onConnect: (id: string) => void; onClose: () => void }) {
  const candidate = candidates.find((item) => item.id === selectedId) ?? candidates[0];
  if (!candidate) return <ModalFrame label="FROM A SAVED POST TO YOUR PATH" title="Add a saved opportunity" onClose={onClose} className="capture-modal">
    <div className="capture-steps"><span><b>1</b><strong>Share a screenshot</strong><small>Drop an Instagram post, LinkedIn post, or poster into ChatGPT.</small></span><i>→</i><span><b>2</b><strong>We find the official page</strong><small>The agent checks the real deadline and the rules that matter to you.</small></span><i>→</i><span><b>3</b><strong>You choose where it goes</strong><small>It joins your path only when it helps the next step.</small></span></div>
    <div className="capture-prompt"><small>TRY IN CHATGPT</small><p>“Find the official page for this screenshot. Check whether I qualify and add it here for me to review.”</p></div>
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

function ToolsModal({ status, onClose }: { status: string; onClose: () => void }) {
  const abilities = [
    ["Read the path", "See the same steps you see"],
    ["Check a saved post", "Find the official page and deadline"],
    ["Ask for one missing fact", "Never guess eligibility"],
    ["Try take or miss", "Show what changes next"],
    ["Find another way", "Replace a missed step"],
    ["Compare routes", "Keep your limits in view"],
  ];
  return <ModalFrame label="PEOPLE + AGENTS, ON THE SAME PAGE" title="What WebMCP changes" onClose={onClose} className="tools-modal"><p className="modal-note">The agent can work with this path directly instead of clicking around and guessing. It can suggest changes; only you can approve them.</p><div className="tool-grid ability-grid">{abilities.map(([title, detail]) => <span key={title}><b>✓ {title}</b><small>{detail}</small></span>)}</div><footer><span><i className={`capability-dot ${status}`} /> {siteToolNames.length} structured tools · {status === "ready" ? "connected here" : "ready in a WebMCP browser"}</span><button onClick={onClose}>DONE</button></footer></ModalFrame>;
}

export default function FutureDoors() {
  const [state, setState] = useState<FutureDoorsState>(() => cloneInitialState());
  const [hydrated, setHydrated] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [cvName, setCvName] = useState("Sample · Maya_Park.pdf");
  const [proposedProfile, setProposedProfile] = useState<Profile | null>(null);
  const [reviewOpportunityId, setReviewOpportunityId] = useState<string | null>(null);
  const [introVisible, setIntroVisible] = useState(true);
  const [started, setStarted] = useState(false);
  const stateRef = useRef(state);

  useEffect(() => {
    window.queueMicrotask(() => {
      try {
        const raw = window.localStorage.getItem(stateStorageKey);
        if (raw) {
          const saved = JSON.parse(raw) as Partial<FutureDoorsState>;
          const base = cloneInitialState();
          const priorities = Array.isArray(saved.priorities)
            ? saved.priorities.filter((id): id is RouteId => id === "ship" || id === "community" || id === "research").slice(0, 2)
            : base.priorities;
          const next: FutureDoorsState = {
            ...base,
            ...saved,
            profile: { ...base.profile, ...(saved.profile ?? {}) },
            bridge: { ...base.bridge, ...(saved.bridge ?? {}) },
            priorities,
            priorityProposal: { state: "none", routeIds: [], rationale: "" },
            opportunities: Array.isArray(saved.opportunities) ? saved.opportunities.slice(0, 7) : [],
            activity: Array.isArray(saved.activity) ? saved.activity.slice(0, 6) : base.activity,
          };
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
  const commit = useCallback((actor: Actor, label: string, detail: string, transform: (current: FutureDoorsState) => FutureDoorsState) => setView((current) => { const changed = transform(current); return { ...changed, activity: [{ id: makeId("activity"), actor, label, detail }, ...changed.activity].slice(0, 6) }; }), [setView]);

  const selectRoute = useCallback((routeId: RouteId, actor: "you" | "agent" = "you") => {
    const id = requireRouteId(routeId); const route = buildRoutes(stateRef.current).find((item) => item.id === id); if (!route) throw new Error(`[UNKNOWN_ROUTE_ID] Route "${id}" is not visible.`);
    const change = (current: FutureDoorsState) => ({ ...current, selectedRouteId: id, selectedNodeId: route.nodes[0].id, scenario: id === "ship" ? current.scenario : "baseline" as const, selectedMonth: id === "ship" ? current.selectedMonth : PATH_START, bridge: id === "ship" ? current.bridge : { ...current.bridge, state: "none" as const } });
    return actor === "agent" ? commit(actor, "Route focused", routeNames[id].label, change) : setView(change);
  }, [commit, setView]);
  const selectNode = useCallback((nodeId: string, actor: "you" | "agent" = "you") => { const node = requireVisibleStep(stateRef.current, nodeId); const change = (current: FutureDoorsState) => ({ ...current, selectedRouteId: node.routeId, selectedNodeId: node.id }); return actor === "agent" ? commit(actor, "Step focused", node.title, change) : setView(change); }, [commit, setView]);
  const simulateTake = useCallback((actor: "you" | "agent" = "you") => commit(actor, "Opportunity taken in try-out", "Three useful results now reach the next step", (current) => ({ ...current, selectedMonth: "2026-08", selectedRouteId: "ship", selectedNodeId: "ship-proof", scenario: "take", bridge: { ...current.bridge, state: "none" }, replayToken: current.replayToken + 1 })), [commit]);
  const simulateMiss = useCallback((actor: "you" | "agent" = "you") => commit(actor, "Opportunity missed in try-out", "The next step is now missing the work it needs", (current) => ({ ...current, selectedMonth: "2026-09", selectedRouteId: "ship", selectedNodeId: "ship-proof", scenario: "miss", bridge: { ...current.bridge, state: "none" }, replayToken: current.replayToken + 1 })), [commit]);
  const stageDefaultBridge = useCallback(() => { commit("system", "Another way suggested", "An agent can suggest this through WebMCP", (current) => ({ ...current, bridge: { ...current.bridge, state: "staged" } })); setModal("bridge"); }, [commit]);
  const approveBridge = useCallback(() => { commit("you", "Another way approved", `Same useful work · ${stateRef.current.bridge.eta}`, (current) => ({ ...current, scenario: "rerouted", selectedRouteId: "ship", selectedNodeId: "ship-bridge", bridge: { ...current.bridge, state: "approved" }, replayToken: current.replayToken + 1 })); setModal(null); }, [commit]);
  const reset = useCallback((actor: "you" | "agent" = "you") => { const next = cloneInitialState(); next.profile = stateRef.current.profile; next.opportunities = stateRef.current.opportunities; next.priorities = stateRef.current.priorities; next.activity = [{ id: makeId("activity"), actor, label: "Try-out reset", detail: "Starting path restored" }, ...stateRef.current.activity].slice(0, 6); stateRef.current = next; setState(next); setModal(null); return summarizeState(next); }, []);
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
    commit("agent", "Priority plan staged", proposal.routeIds.map((id) => routeNames[id].label).join(" → "), (current) => ({ ...current, priorityProposal: { state: "staged", ...proposal } }));
    setModal("priority");
    return { status: "staged", routeIds: proposal.routeIds, humanApprovalRequired: true };
  }, [commit]);
  const approvePriorities = useCallback(() => {
    commit("you", "Priority plan approved", stateRef.current.priorityProposal.routeIds.map((id) => routeNames[id].label).join(" → "), (current) => ({ ...current, priorities: current.priorityProposal.routeIds, priorityProposal: { state: "none", routeIds: [], rationale: "" } }));
    setModal(null);
  }, [commit]);
  const togglePriority = useCallback((id: RouteId) => {
    commit("you", "Priority changed", routeNames[id].label, (current) => {
      const next = current.priorities.includes(id) ? current.priorities.filter((item) => item !== id) : current.priorities.length < 2 ? [...current.priorities, id] : current.priorities;
      return { ...current, priorities: next, priorityProposal: { state: "none", routeIds: [], rationale: "" } };
    });
  }, [commit]);

  const actions = useMemo<FutureDoorsActions>(() => ({
    getPathSnapshot: () => summarizeState(stateRef.current), stageProfileFacts, stageOpportunityFromSource, stagePriorityPlan,
    focusRoute: selectRoute, focusStep: selectNode,
    movePathClock: (month, actor = "you") => { const valid = requirePathMonth(month); return commit(actor, "Path clock moved", formatMonth(valid), (current) => ({ ...current, selectedMonth: valid, replayToken: current.replayToken + 1 })); },
    simulateTakeDoor: (doorId, actor = "you") => { requireDoorId(doorId); return simulateTake(actor); },
    simulateMissedDoor: (doorId, actor = "you") => { requireDoorId(doorId); return simulateMiss(actor); },
    stageBridgeFromSource: (proposal) => { if (stateRef.current.scenario !== "miss") throw new Error("[PATH_NOT_BROKEN] Try missing the first opportunity before suggesting another way."); const result = commit("agent", "Another way suggested", "Waiting for your approval", (current) => ({ ...current, bridge: { ...proposal, state: "staged" } })); setModal("bridge"); return result; },
    pinConstraint: (constraint, actor = "you") => commit(actor, "Constraint pinned", constraint, (current) => ({ ...current, pinnedConstraints: current.pinnedConstraints.includes(constraint) ? current.pinnedConstraints : [...current.pinnedConstraints, constraint].slice(-5) })),
    compareRoutes: () => summarizeRouteComparison(stateRef.current),
    explainDownstreamEffect: (stepId, actor = "you") => { requireVisibleStep(stateRef.current, stepId); selectNode(stepId, actor); return downstreamEffect(stateRef.current, stepId); },
    resetPath: reset,
  }), [commit, reset, selectNode, selectRoute, simulateMiss, simulateTake, stageOpportunityFromSource, stagePriorityPlan, stageProfileFacts]);

  const webMcpStatus = useFutureDoorsWebMcp(actions);
  const routes = useMemo(() => buildRoutes(state), [state]);
  const route = routes.find((item) => item.id === state.selectedRouteId) ?? routes[0];
  const selectedNode = getSelectedNode(state);

  const saveGoal = (goal: string, targetYear: number) => { commit("you", "Goal updated", `${goal} · ${targetYear}`, (current) => { const updated = { ...current, profile: { ...current.profile, goal, targetYear }, scenario: "baseline" as const, bridge: { ...current.bridge, state: "none" as const } }; const best = buildRoutes(updated).reduce((leader, item) => item.fit > leader.fit ? item : leader); return { ...updated, selectedRouteId: best.id, selectedNodeId: best.nodes[0].id, replayToken: current.replayToken + 1 }; }); setModal(null); };
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
    <header className="spatial-topbar editorial-topbar"><div className="spatial-brand"><span className="brand-icon"><i /></span><strong>FUTURE DOORS</strong><small>OPPORTUNITY → ACTION → PROOF</small></div><div className="spatial-agent"><span className={`capability-dot ${webMcpStatus}`} /><b>AGENT CHECKS · YOU APPROVE</b></div><nav><button className="spatial-capture" onClick={startAndCapture}>＋ ADD OPPORTUNITY{state.opportunities.length ? ` · ${state.opportunities.length}/7` : ""}</button><button onClick={() => setModal("tools")}>HOW IT WORKS</button></nav></header>
    {started ? <EditorialWorkspace state={state} route={route} routes={routes} selectedNode={selectedNode} cvName={cvName} onUpload={uploadCv} onReview={() => { setProposedProfile(null); setModal("profile"); }} onGoal={() => setModal("goal")} onRoute={(id) => selectRoute(id)} onTogglePriority={togglePriority} onNode={(node) => selectNode(node.id)} onTake={() => simulateTake()} onMiss={() => simulateMiss()} onRepair={stageDefaultBridge} onReset={() => reset()} onWhy={() => setModal("why")} onTools={() => setModal("tools")} onCapture={openCapture} /> : <LaunchScene onDemo={() => setStarted(true)} onAdd={startAndCapture} onTools={() => setModal("tools")} />}
    <AnimatePresence>
      {modal === "profile" ? <ProfileModal profile={proposedProfile ?? state.profile} cvName={cvName} proposed={Boolean(proposedProfile)} onSave={saveProfile} onClose={() => { setProposedProfile(null); setModal(null); }} /> : null}
      {modal === "goal" ? <GoalModal profile={state.profile} onSave={saveGoal} onClose={() => setModal(null)} /> : null}
      {modal === "bridge" ? <BridgeModal state={state} onApprove={approveBridge} onClose={() => setModal(null)} /> : null}
      {modal === "priority" ? <PriorityModal state={state} onApprove={approvePriorities} onClose={() => setModal(null)} /> : null}
      {modal === "capture" ? <CaptureModal candidates={state.opportunities} selectedId={reviewOpportunityId} profile={state.profile} onSelect={setReviewOpportunityId} onConnect={connectOpportunity} onClose={() => setModal(null)} /> : null}
      {modal === "why" ? <WhyModal route={route} profile={state.profile} onClose={() => setModal(null)} /> : null}
      {modal === "tools" ? <ToolsModal status={webMcpStatus} onClose={() => setModal(null)} /> : null}
    </AnimatePresence>
  </main>;
}
