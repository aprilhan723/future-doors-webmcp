"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  PATH_START,
  buildRoutes,
  cloneInitialState,
  downstreamEffect,
  formatMonth,
  getSelectedNode,
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

type Modal = "bridge" | "capture" | "tools" | "goal" | "profile" | "why" | null;

const routeNames: Record<RouteId, { label: string; short: string; reason: string }> = {
  ship: { label: "Ship something", short: "SHIP", reason: "Fastest proof" },
  community: { label: "Contribute", short: "CONTRIBUTE", reason: "Public trust" },
  research: { label: "Find a mentor", short: "MENTORSHIP", reason: "Guided depth" },
};

const statusCopy: Record<PathNode["status"], string> = {
  available: "OPEN",
  ready: "UNLOCKED",
  checking: "CHECK",
  future: "LATER",
  locked: "TO CREATE",
  expired: "CLOSED",
  blocked: "BROKEN",
  simulated: "TAKEN",
  strengthened: "CLOSER",
  destination: "GOAL",
};

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

function ProfileRail({
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
  const facts = [
    ["Age", String(state.profile.age)],
    ["Graduation", formatMonth(state.profile.graduationMonth)],
    ["Based in", state.profile.residence],
    ["Status", state.profile.studyStatus],
  ];

  return (
    <aside className="panel profile-rail" aria-label="Confirmed profile and goal">
      <header className="panel-heading"><span>1</span><div><small>YOU</small><h2>Confirmed facts</h2></div></header>
      <div className="person-card">
        <span className="avatar">MP</span>
        <div><strong>{state.profile.name}</strong><small>{state.profile.fieldOfStudy}</small></div>
        <button onClick={onReview}>Edit</button>
      </div>
      <div className="goal-card">
        <small>GOAL</small><strong>{state.profile.goal}</strong><span>by {state.profile.targetYear}</span>
        <button onClick={onGoal} aria-label="Edit goal">↗</button>
      </div>
      <dl className="fact-grid">
        {facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      <div className="signal-block"><small>ALREADY PROVEN</small><div>{state.profile.strengths.slice(0, 3).map((item) => <span key={item}>✓ {item}</span>)}</div></div>
      <div className="gap-card"><small>THE MISSING PROOF</small><strong>{state.profile.gap}</strong></div>
      <div className="cv-card">
        <input ref={inputRef} hidden type="file" accept=".pdf,.doc,.docx" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); }} />
        <div><small>CV / RESUME</small><strong>{cvName}</strong></div>
        <button onClick={() => inputRef.current?.click()}>REVIEW CV</button>
        <p>Agent stages facts. You approve them.</p>
      </div>
    </aside>
  );
}

function RouteSwitcher({ routes, selected, onSelect }: { routes: Route[]; selected: RouteId; onSelect: (id: RouteId) => void }) {
  const bestFit = Math.max(...routes.map((route) => route.fit));
  return (
    <nav className="route-switcher" aria-label="Reachable route options">
      {routes.map((route) => (
        <button key={route.id} className={selected === route.id ? "active" : ""} onClick={() => onSelect(route.id)}>
          <span>{route.fit === bestFit ? "BEST FOR YOUR GAP" : "ANOTHER WAY"}</span>
          <strong>{routeNames[route.id].label}</strong>
          <b>{routeNames[route.id].reason}</b>
        </button>
      ))}
    </nav>
  );
}

function PathCard({ node, selected, onSelect }: { node: PathNode; selected: boolean; onSelect: () => void }) {
  const isEvidence = node.kind === "evidence" || node.kind === "bridge";
  const isGoal = node.kind === "destination";
  return (
    <button className={`path-card ${node.kind} ${node.status} ${selected ? "selected" : ""}`} onClick={onSelect}>
      <span className="status-pill">{statusCopy[node.status]}</span>
      <div className="path-icon">
        {isEvidence ? <span className="proof-stack" aria-hidden="true"><i /><i /><b>✓</b></span> : isGoal ? <span className="goal-glyph" aria-hidden="true"><i /><b /></span> : <DoorGlyph status={node.status} />}
      </div>
      <small>{node.eyebrow.split("·")[0]}</small>
      <strong>{node.title}</strong>
      <p>{node.date}</p>
      {isEvidence ? <div className="mini-evidence">{node.evidence.slice(0, 3).map((item) => <span key={item}>{node.status === "blocked" ? "×" : "✓"} {item}</span>)}</div> : null}
    </button>
  );
}

function Connector({ node, broken }: { node: PathNode; broken: boolean }) {
  const label = node.edgeToNext?.type === "creates" ? "Creates the next proof" : node.edgeToNext?.type === "official" ? "Unlocks the next door" : node.edgeToNext?.type === "blocked" ? "Required proof is missing" : "Strengthens the path";
  return (
    <div className={`path-connector ${broken ? "broken" : ""}`} role="img" aria-label={label} title={label}>
      <i><b /></i>
    </div>
  );
}

function DecisionDock({ state, route, onTake, onMiss, onRepair, onReset }: { state: FutureDoorsState; route: Route; onTake: () => void; onMiss: () => void; onRepair: () => void; onReset: () => void }) {
  if (route.id !== "ship") return <div className="decision-dock neutral"><div><small>ANOTHER WAY</small><strong>{route.summary}</strong></div><button onClick={onReset}>SHOW BEST ROUTE</button></div>;
  if (state.scenario === "miss") return <div className="decision-dock danger"><div><small>PROOF MISSING</small><strong>The next door closes.</strong></div><button className="primary" onClick={onRepair}>FIND ANOTHER WAY</button><button onClick={onReset}>RESET</button></div>;
  if (state.scenario === "take") return <div className="decision-dock success"><div><small>PROOF CREATED</small><strong>Door 02 is now reachable.</strong></div><button onClick={onReset}>RESET</button></div>;
  if (state.scenario === "rerouted") return <div className="decision-dock success"><div><small>PATH REPAIRED</small><strong>Same proof, six weeks later.</strong></div><button onClick={onReset}>RESET</button></div>;
  return <div className="decision-dock"><div><small>WHAT IF?</small><strong>See what this door changes.</strong></div><button className="primary" onClick={onTake}>TAKE DOOR</button><button onClick={onMiss}>MISS IT</button></div>;
}

function PathCanvas({ state, route, routes, onRoute, onNode, onTake, onMiss, onRepair, onReset, onWhy }: { state: FutureDoorsState; route: Route; routes: Route[]; onRoute: (id: RouteId) => void; onNode: (node: PathNode) => void; onTake: () => void; onMiss: () => void; onRepair: () => void; onReset: () => void; onWhy: () => void }) {
  const broken = state.scenario === "miss" && route.id === "ship";
  return (
    <section className="panel path-canvas" aria-label="Reachable opportunity path">
      <header className="canvas-heading">
        <div className="panel-heading"><span>2</span><div><small>YOUR PROOF PATH</small><h2>One move unlocks the next</h2></div></div>
        <button className="why-button" onClick={onWhy}>WHY THIS ROUTE ↗</button>
      </header>
      <RouteSwitcher routes={routes} selected={route.id} onSelect={onRoute} />
      <div className="route-summary"><strong>{route.summary}</strong><span className="path-formula"><b>DOOR</b><i>→</i><b>PROOF</b><i>→</i><b>NEXT DOOR</b><i>→</i><b>GOAL</b></span></div>
      <div className={`path-chain scenario-${state.scenario}`} key={state.replayToken}>
        {route.nodes.map((node, index) => (
          <div className="chain-piece" key={node.id}>
            <PathCard node={node} selected={state.selectedNodeId === node.id} onSelect={() => onNode(node)} />
            {index < route.nodes.length - 1 ? <Connector node={node} broken={broken} /> : null}
          </div>
        ))}
      </div>
      <div className="path-legend"><span><i className="solid-line" /> creates evidence</span><span><i className="dotted-line" /> strengthens, never guarantees</span><b>WHAT-IF ONLY</b></div>
      <DecisionDock state={state} route={route} onTake={onTake} onMiss={onMiss} onRepair={onRepair} onReset={onReset} />
    </section>
  );
}

function Inspector({ node, state, onTools }: { node: PathNode; state: FutureDoorsState; onTools: () => void }) {
  const sourceBacked = Boolean(node.sourceUrl && node.sourceClause);
  return (
    <aside className="panel inspector" aria-label="Selected step evidence and source">
      <header className="panel-heading"><span>3</span><div><small>WHY IT MOVES</small><h2>Evidence receipt</h2></div></header>
      <div className="inspect-status"><span className={`status-dot ${node.status}`} /><b>{statusCopy[node.status]}</b><small>{sourceBacked ? "OFFICIAL SOURCE" : "MODELED LINK"}</small></div>
      <div className="inspect-title"><small>{node.eyebrow}</small><h3>{node.title}</h3><p>{node.description}</p></div>
      <div className="receipt-card">
        <div><small>{sourceBacked ? "RULE RECEIPT" : "PATH LOGIC"}</small><span>{sourceBacked ? "Source-backed" : "Transparent model"}</span></div>
        <blockquote>{node.sourceClause ?? node.edgeToNext?.label ?? "This destination is a direction, not a predicted outcome."}</blockquote>
        {node.sourceUrl ? <a href={node.sourceUrl} target="_blank" rel="noreferrer">OPEN OFFICIAL SOURCE ↗</a> : null}
      </div>
      <div className="output-card"><small>{node.kind === "opportunity" ? "WHAT IT CAN CREATE" : "WHAT MOVES FORWARD"}</small>{node.evidence.map((item) => <span key={item}>✓ {item}</span>)}</div>
      <div className="control-card"><small>ONE SHARED MAP</small><div><span className="agent-mark">✦</span><p><b>Agent</b> finds rules and stages changes.</p></div><div><span className="human-mark">●</span><p><b>You</b> approve facts and detours.</p></div><button onClick={onTools}>VIEW {siteToolNames.length} WEBMCP TOOLS</button></div>
      <div className="latest-action"><small>LATEST SHARED ACTION</small><strong>{state.activity[0]?.label}</strong><span>{state.activity[0]?.detail}</span></div>
    </aside>
  );
}

function ModalFrame({ label, title, onClose, children, className = "" }: { label: string; title: string; onClose: () => void; children: React.ReactNode; className?: string }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}><header><div><small>{label}</small><h2>{title}</h2></div><button onClick={onClose} aria-label="Close">×</button></header>{children}</section></div>;
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
  return <ModalFrame label="SOURCED DETOUR · NOT APPLIED" title="The same proof, by another route" onClose={onClose} className="bridge-modal"><div className="bridge-flow"><span><small>CLOSED</small><b>WebMCP Challenge</b></span><i>→</i><span className="proposed"><small>PROPOSED</small><b>{state.bridge.title}</b><em>{state.bridge.eta}</em></span><i>→</i><span><small>STILL CREATES</small>{state.bridge.outputs.map((item) => <b key={item}>✓ {item}</b>)}</span></div><div className="bridge-reason"><div><small>WHY IT WORKS</small><p>{state.bridge.rationale}</p></div><div><small>SOURCE RECEIPT</small><blockquote>{state.bridge.sourceClause}</blockquote><a href={state.bridge.sourceUrl} target="_blank" rel="noreferrer">Open source ↗</a></div></div><footer><span>Only you can approve this change.</span><button onClick={onClose}>NOT NOW</button><button className="primary" onClick={onApprove}>APPROVE DETOUR</button></footer></ModalFrame>;
}

function CaptureModal({ candidate, onApprove, onClose }: { candidate: OpportunityCandidate; onApprove: () => void; onClose: () => void }) {
  const staged = candidate.state === "staged";
  const approved = candidate.state === "approved";
  return <ModalFrame label="SCREENSHOT → OFFICIAL SOURCE → DOOR" title="Turn a saved post into a verified door" onClose={onClose} className="capture-modal">
    {candidate.state === "none" ? <>
      <div className="capture-steps"><span><b>1</b><strong>Share the screenshot</strong><small>Drop the Instagram, LinkedIn, or poster image into ChatGPT.</small></span><i>→</i><span><b>2</b><strong>Agent finds the original</strong><small>It checks the official page, deadline, rule, and outputs.</small></span><i>→</i><span><b>3</b><strong>You approve the door</strong><small>Only then can it replace or repair a path.</small></span></div>
      <div className="capture-prompt"><small>TRY IN CHATGPT</small><p>“Find the original official source for this screenshot. If the rules are verifiable, add it to Future Doors for my review.”</p></div>
    </> : <>
      <div className={`candidate-banner ${approved ? "approved" : ""}`}><small>{approved ? "ON YOUR PATH" : "AGENT STAGED · NOT SAVED"}</small><strong>{candidate.title}</strong><span>Closes {formatMonth(candidate.deadlineMonth)}</span></div>
      <div className="candidate-grid"><div><small>OFFICIAL RECEIPT</small><blockquote>{candidate.sourceClause}</blockquote><a href={candidate.sourceUrl} target="_blank" rel="noreferrer">OPEN {candidate.sourceLabel.toUpperCase()} ↗</a></div><div><small>WHAT IT CAN CREATE</small>{candidate.outputs.map((item) => <span key={item}>✓ {item}</span>)}<p>{candidate.rationale}</p></div></div>
    </>}
    <footer><span>{staged ? "The agent cannot approve this." : "The screenshot is a clue—not a source."}</span><button onClick={onClose}>{approved ? "DONE" : "CLOSE"}</button>{staged ? <button className="primary" onClick={onApprove}>APPROVE & ADD</button> : null}</footer>
  </ModalFrame>;
}

function WhyModal({ route, profile, onClose }: { route: Route; profile: Profile; onClose: () => void }) {
  return <ModalFrame label="VISIBLE REASONING" title="Why this route comes first" onClose={onClose} className="why-modal"><div className="reason-row"><span><small>GOAL</small><b>{profile.goal}</b></span><i>+</i><span><small>MISSING PROOF</small><b>{profile.gap}</b></span><i>+</i><span><small>STRENGTH</small><b>{profile.strengths[0]}</b></span><i>→</i><span className="result"><small>ROUTE</small><b>{routeNames[route.id].label}</b></span></div><div className="why-grid"><div><small>WHY IT FITS</small><p>{route.summary}. It respects {profile.constraints.join(", ").toLowerCase()}.</p></div><div><small>WHAT IT DOES NOT CLAIM</small><p>No acceptance, hiring, or success prediction.</p></div></div><footer><span>Route order is explainable, not predictive.</span><button onClick={onClose}>DONE</button></footer></ModalFrame>;
}

function ToolsModal({ status, onClose }: { status: string; onClose: () => void }) {
  return <ModalFrame label="SHARED WEBSITE CAPABILITIES" title={`${siteToolNames.length} WebMCP tools`} onClose={onClose} className="tools-modal"><p className="modal-note">The agent acts on the same visible path. Profile facts and detours are staged for human approval.</p><div className="tool-grid">{siteToolNames.map((name) => <span key={name}>✓ {name.replaceAll("_", " ")}</span>)}</div><footer><span><i className={`capability-dot ${status}`} /> {status === "ready" ? "Connected in this browser" : "Ready in a WebMCP browser"}</span><button onClick={onClose}>DONE</button></footer></ModalFrame>;
}

export default function FutureDoors() {
  const [state, setState] = useState<FutureDoorsState>(() => cloneInitialState());
  const [modal, setModal] = useState<Modal>(null);
  const [cvName, setCvName] = useState("Sample · Maya_Park.pdf");
  const [proposedProfile, setProposedProfile] = useState<Profile | null>(null);
  const stateRef = useRef(state);

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
  const simulateTake = useCallback((actor: "you" | "agent" = "you") => commit(actor, "Door taken in what-if", "Three artifacts now reach the next door", (current) => ({ ...current, selectedMonth: "2026-08", selectedRouteId: "ship", selectedNodeId: "ship-proof", scenario: "take", bridge: { ...current.bridge, state: "none" }, replayToken: current.replayToken + 1 })), [commit]);
  const simulateMiss = useCallback((actor: "you" | "agent" = "you") => commit(actor, "Door missed in what-if", "The public-proof link is now broken", (current) => ({ ...current, selectedMonth: "2026-09", selectedRouteId: "ship", selectedNodeId: "ship-proof", scenario: "miss", bridge: { ...current.bridge, state: "none" }, replayToken: current.replayToken + 1 })), [commit]);
  const stageDefaultBridge = useCallback(() => { commit("system", "Demo detour staged", "An agent can stage this through WebMCP", (current) => ({ ...current, bridge: { ...current.bridge, state: "staged" } })); setModal("bridge"); }, [commit]);
  const approveBridge = useCallback(() => { commit("you", "Detour approved", "Same proof · six weeks later", (current) => ({ ...current, scenario: "rerouted", selectedRouteId: "ship", selectedNodeId: "ship-bridge", bridge: { ...current.bridge, state: "approved" }, replayToken: current.replayToken + 1 })); setModal(null); }, [commit]);
  const reset = useCallback((actor: "you" | "agent" = "you") => { const next = cloneInitialState(); next.profile = stateRef.current.profile; if (stateRef.current.opportunity.state === "approved") next.opportunity = stateRef.current.opportunity; next.activity = [{ id: makeId("activity"), actor, label: "What-if reset", detail: "Best route restored" }, ...stateRef.current.activity].slice(0, 6); stateRef.current = next; setState(next); setModal(null); return summarizeState(next); }, []);
  const stageProfileFacts = useCallback((proposal: Parameters<FutureDoorsActions["stageProfileFacts"]>[0]) => {
    const clean = Object.fromEntries(Object.entries(proposal).filter(([, value]) => value !== undefined));
    if (Object.keys(clean).length === 0) throw new Error("[EMPTY_PROFILE_PROPOSAL] Stage at least one explicit fact.");
    const next = { ...stateRef.current.profile, ...clean } as Profile;
    setProposedProfile(next); setModal("profile");
    return { status: "staged", fields: Object.keys(clean), humanApprovalRequired: true };
  }, []);
  const stageOpportunityFromSource = useCallback((proposal: Parameters<FutureDoorsActions["stageOpportunityFromSource"]>[0]) => {
    commit("agent", "Screenshot door staged", proposal.title, (current) => ({ ...current, opportunity: { ...proposal, state: "staged" }, replayToken: current.replayToken + 1 }));
    setModal("capture");
    return { status: "staged", title: proposal.title, officialSource: proposal.sourceUrl, deadline: proposal.deadlineMonth, humanApprovalRequired: true };
  }, [commit]);

  const actions = useMemo<FutureDoorsActions>(() => ({
    getPathSnapshot: () => summarizeState(stateRef.current), stageProfileFacts, stageOpportunityFromSource,
    focusRoute: selectRoute, focusStep: selectNode,
    movePathClock: (month, actor = "you") => { const valid = requirePathMonth(month); return commit(actor, "Path clock moved", formatMonth(valid), (current) => ({ ...current, selectedMonth: valid, replayToken: current.replayToken + 1 })); },
    simulateTakeDoor: (doorId, actor = "you") => { requireDoorId(doorId); return simulateTake(actor); },
    simulateMissedDoor: (doorId, actor = "you") => { requireDoorId(doorId); return simulateMiss(actor); },
    stageBridgeFromSource: (proposal) => { if (stateRef.current.scenario !== "miss") throw new Error("[PATH_NOT_BROKEN] Simulate a missed door before staging a detour."); const result = commit("agent", "Sourced detour staged", "Human approval required", (current) => ({ ...current, bridge: { ...proposal, state: "staged" } })); setModal("bridge"); return result; },
    pinConstraint: (constraint, actor = "you") => commit(actor, "Constraint pinned", constraint, (current) => ({ ...current, pinnedConstraints: current.pinnedConstraints.includes(constraint) ? current.pinnedConstraints : [...current.pinnedConstraints, constraint].slice(-5) })),
    compareRoutes: () => summarizeRouteComparison(stateRef.current),
    explainDownstreamEffect: (stepId, actor = "you") => { requireVisibleStep(stateRef.current, stepId); selectNode(stepId, actor); return downstreamEffect(stateRef.current, stepId); },
    resetPath: reset,
  }), [commit, reset, selectNode, selectRoute, simulateMiss, simulateTake, stageOpportunityFromSource, stageProfileFacts]);

  const webMcpStatus = useFutureDoorsWebMcp(actions);
  const routes = useMemo(() => buildRoutes(state), [state]);
  const route = routes.find((item) => item.id === state.selectedRouteId) ?? routes[0];
  const selectedNode = getSelectedNode(state);

  const saveGoal = (goal: string, targetYear: number) => { commit("you", "Goal updated", `${goal} · ${targetYear}`, (current) => { const updated = { ...current, profile: { ...current.profile, goal, targetYear }, scenario: "baseline" as const, bridge: { ...current.bridge, state: "none" as const } }; const best = buildRoutes(updated).reduce((leader, item) => item.fit > leader.fit ? item : leader); return { ...updated, selectedRouteId: best.id, selectedNodeId: best.nodes[0].id, replayToken: current.replayToken + 1 }; }); setModal(null); };
  const saveProfile = (profile: Profile) => { commit("you", "Profile facts approved", `${profile.name} · ${profile.residence}`, (current) => { const updated = { ...current, profile, scenario: "baseline" as const, bridge: { ...current.bridge, state: "none" as const } }; const best = buildRoutes(updated).reduce((leader, item) => item.fit > leader.fit ? item : leader); return { ...updated, selectedRouteId: best.id, selectedNodeId: best.nodes[0].id, replayToken: current.replayToken + 1 }; }); setProposedProfile(null); setModal(null); };
  const uploadCv = (file: File) => { setCvName(`Selected · ${file.name}`); commit("you", "CV selected", "Review facts before the path uses them", (current) => ({ ...current, replayToken: current.replayToken + 1 })); setProposedProfile(null); setModal("profile"); };
  const approveOpportunity = () => { commit("you", "Screenshot door approved", state.opportunity.title, (current) => ({ ...current, opportunity: { ...current.opportunity, state: "approved" }, selectedRouteId: "ship", selectedNodeId: "ship-challenge", scenario: "baseline", bridge: { ...current.bridge, state: "none" }, replayToken: current.replayToken + 1 })); setModal(null); };

  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-icon"><i /></span><strong>FUTURE DOORS</strong><small>PROOF, NOT PREDICTIONS</small></div><div className="agent-status"><span className={`capability-dot ${webMcpStatus}`} /><b>{webMcpStatus === "ready" ? "AGENT CONNECTED" : "WEBMCP READY"}</b><span>{siteToolNames.length} tools · human approval</span></div><nav className="top-actions"><button className="add-door" onClick={() => setModal("capture")}>＋ ADD A DOOR</button><button onClick={() => { setProposedProfile(null); setModal("profile"); }}>PROFILE</button><button onClick={() => setModal("tools")}>WEBMCP</button></nav></header>
    <section className="hero"><div><small>WHEN ONE DOOR CLOSES, REPAIR THE PATH</small><h1>One door should <em>lead to the next.</em></h1></div><p>Your agent finds the rules. You approve the facts. The map shows what every move creates.</p></section>
    <div className="workspace">
      <ProfileRail state={state} cvName={cvName} onUpload={uploadCv} onReview={() => { setProposedProfile(null); setModal("profile"); }} onGoal={() => setModal("goal")} />
      <PathCanvas state={state} route={route} routes={routes} onRoute={(id) => selectRoute(id)} onNode={(node) => selectNode(node.id)} onTake={() => simulateTake()} onMiss={() => simulateMiss()} onRepair={stageDefaultBridge} onReset={() => reset()} onWhy={() => setModal("why")} />
      <Inspector node={selectedNode} state={state} onTools={() => setModal("tools")} />
    </div>
    {modal === "profile" ? <ProfileModal profile={proposedProfile ?? state.profile} cvName={cvName} proposed={Boolean(proposedProfile)} onSave={saveProfile} onClose={() => { setProposedProfile(null); setModal(null); }} /> : null}
    {modal === "goal" ? <GoalModal profile={state.profile} onSave={saveGoal} onClose={() => setModal(null)} /> : null}
    {modal === "bridge" ? <BridgeModal state={state} onApprove={approveBridge} onClose={() => setModal(null)} /> : null}
    {modal === "capture" ? <CaptureModal candidate={state.opportunity} onApprove={approveOpportunity} onClose={() => setModal(null)} /> : null}
    {modal === "why" ? <WhyModal route={route} profile={state.profile} onClose={() => setModal(null)} /> : null}
    {modal === "tools" ? <ToolsModal status={webMcpStatus} onClose={() => setModal(null)} /> : null}
  </main>;
}
