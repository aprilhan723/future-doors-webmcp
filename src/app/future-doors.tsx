"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
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

type Modal = "bridge" | "capture" | "tools" | "goal" | "profile" | "why" | null;

const routeNames: Record<RouteId, { label: string; short: string; reason: string }> = {
  ship: { label: "Ship something", short: "SHIP", reason: "Fastest start" },
  community: { label: "Contribute", short: "CONTRIBUTE", reason: "Public trust" },
  research: { label: "Find a mentor", short: "MENTORSHIP", reason: "Guided depth" },
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

function OpportunityJourney({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="opportunity-journey" aria-label="A screenshot becomes a verified step in your path">
      <Spotlight className="journey-spotlight" size={250} />
      <Tilt className="journey-tilt" rotationFactor={3.5}>
        <button className="journey-card screenshot-card" onClick={onOpen}>
          <span className="journey-number">01</span>
          <span className="screenshot-thumb" aria-hidden="true"><i>OPEN CALL</i><b /><em /></span>
          <span><small>YOU SHARE</small><strong>An opportunity screenshot</strong></span>
        </button>
      </Tilt>
      <div className="journey-beam" aria-hidden="true"><motion.i animate={{ x: [0, 44, 44], opacity: [0, 1, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} /><span>AGENT</span></div>
      <motion.div className="journey-card source-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.5 }}>
        <span className="journey-number">02</span>
        <span className="source-sheet" aria-hidden="true"><b>✓</b><i /><i /><i /></span>
        <span><small>AGENT FINDS</small><strong>The official rules</strong><em>deadline · eligibility · results</em></span>
      </motion.div>
      <div className="journey-beam approval" aria-hidden="true"><motion.i animate={{ x: [0, 44, 44], opacity: [0, 1, 0] }} transition={{ duration: 1.8, delay: 0.7, repeat: Infinity, ease: "easeInOut" }} /><span>YOU</span></div>
      <motion.div className="journey-card approval-card" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.32, type: "spring", stiffness: 230, damping: 20 }}>
        <span className="journey-number">03</span>
        <span className="approval-door" aria-hidden="true"><i><b /></i></span>
        <span><small>YOU DECIDE</small><strong>Add it to your path</strong><em>then see what it opens</em></span>
      </motion.div>
    </div>
  );
}

function ProfileStrip({
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
    <div className="profile-strip" aria-label="Facts used to build this path">
      <input ref={inputRef} hidden type="file" accept=".pdf,.doc,.docx" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); }} />
      <div className="profile-person"><span className="avatar">MP</span><span><small>PATH FOR</small><strong>{state.profile.name}</strong></span><button onClick={onReview}>Edit</button></div>
      <div className="profile-fact goal"><small>GOAL</small><strong>{state.profile.goal}</strong><span>{state.profile.targetYear}</span></div>
      <div className="profile-fact need"><small>NEEDS NEXT</small><strong>{state.profile.gap}</strong></div>
      <div className="profile-fact profile-signals"><small>ALREADY STRONG AT</small><strong>{state.profile.strengths.slice(0, 2).join(" + ")}</strong></div>
      <div className="profile-actions"><button title={cvName} onClick={() => inputRef.current?.click()}>CHECK CV</button><button className="goal-action" onClick={onGoal}>CHANGE GOAL</button></div>
      <span className="profile-verified">YOU APPROVE ALL FACTS</span>
    </div>
  );
}

function RouteSwitcher({ routes, selected, onSelect }: { routes: Route[]; selected: RouteId; onSelect: (id: RouteId) => void }) {
  const bestFit = Math.max(...routes.map((route) => route.fit));
  return (
    <nav className="route-switcher" aria-label="Three possible routes">
      <AnimatedBackground defaultValue={selected} onValueChange={(id) => onSelect(id as RouteId)} className="route-active-bg" transition={{ type: "spring", stiffness: 420, damping: 34 }}>
        {routes.map((route) => (
          <button key={route.id} data-id={route.id}>
            <span>{route.fit === bestFit ? "BEST START" : "OTHER ROUTE"}</span>
            <strong>{routeNames[route.id].label}</strong>
            <b>{routeNames[route.id].reason}</b>
          </button>
        ))}
      </AnimatedBackground>
    </nav>
  );
}

function PathCard({ node, selected, onSelect }: { node: PathNode; selected: boolean; onSelect: () => void }) {
  const isEvidence = node.kind === "evidence" || node.kind === "bridge";
  const isGoal = node.kind === "destination";
  const label = isGoal ? "WHERE THIS LEADS" : isEvidence ? (node.status === "blocked" ? "WHAT IS MISSING" : "YOU LEAVE WITH") : node.stage === 1 ? "DO THIS NOW" : "THEN YOU CAN";
  const title = node.id === "ship-challenge" ? "Enter the WebMCP Challenge" : node.title;
  return <Tilt className="path-card-tilt" rotationFactor={2.4}>
    <motion.button layout className={`path-card ${node.kind} ${node.status} ${selected ? "selected" : ""}`} onClick={onSelect} whileTap={{ scale: 0.985 }}>
      <span className="status-pill">{cardStatus(node)}</span>
      <div className="path-icon">
        {isEvidence ? <span className="proof-stack" aria-hidden="true"><i /><i /><b>✓</b></span> : isGoal ? <span className="goal-glyph" aria-hidden="true"><i /><b /></span> : <DoorGlyph status={node.status} />}
      </div>
      <small>{label}</small>
      <strong>{title}</strong>
      <p>{node.date}</p>
      {isEvidence ? <div className="mini-evidence">{node.evidence.slice(0, 3).map((item) => <span key={item}>{node.status === "blocked" ? "×" : "✓"} {item}</span>)}</div> : null}
      <span className="card-corner" aria-hidden="true" />
    </motion.button>
  </Tilt>;
}

function Connector({ node, broken }: { node: PathNode; broken: boolean }) {
  const label = node.edgeToNext?.type === "creates" ? "Creates what the next step needs" : node.edgeToNext?.type === "official" ? "Opens the next step" : node.edgeToNext?.type === "blocked" ? "Required work is missing" : "Helps the path";
  const shortLabel = node.edgeToNext?.type === "creates" ? "CREATES" : node.edgeToNext?.type === "official" ? "UNLOCKS" : node.edgeToNext?.type === "blocked" ? "BREAKS HERE" : "BUILDS TOWARD";
  return (
    <div className={`path-connector ${broken ? "broken" : ""}`} role="img" aria-label={label} title={label}>
      <span>{shortLabel}</span>
      <i><b /></i>
    </div>
  );
}

function DecisionDock({ state, route, onTake, onMiss, onRepair, onReset }: { state: FutureDoorsState; route: Route; onTake: () => void; onMiss: () => void; onRepair: () => void; onReset: () => void }) {
  if (route.id !== "ship") return <div className="decision-dock neutral"><div><small>ANOTHER WAY</small><strong>{route.summary}</strong></div><button onClick={onReset}>BACK TO START</button></div>;
  if (state.scenario === "miss") return <div className="decision-dock danger"><div><small>THE NEXT STEP IS BLOCKED</small><strong>Find another way to make the same work.</strong></div><button className="primary" onClick={onRepair}>SHOW ANOTHER WAY</button><button onClick={onReset}>START OVER</button></div>;
  if (state.scenario === "take") return <div className="decision-dock success"><div><small>YOU NOW HAVE THE WORK YOU NEED</small><strong>The next step is open.</strong></div><button onClick={onReset}>START OVER</button></div>;
  if (state.scenario === "rerouted") return <div className="decision-dock success"><div><small>YOU FOUND ANOTHER WAY</small><strong>Same useful work, six weeks later.</strong></div><button onClick={onReset}>START OVER</button></div>;
  return <div className="decision-dock"><div><small>TRY THE PATH</small><strong>See what happens if you take or miss this opportunity.</strong></div><button className="primary" onClick={onTake}>I TAKE IT</button><button onClick={onMiss}>I MISS IT</button></div>;
}

function StepDock({ node, onTools }: { node: PathNode; onTools: () => void }) {
  const sourceBacked = Boolean(node.sourceUrl && node.sourceClause);
  const plainEffect = node.kind === "opportunity"
    ? `${node.title} can give you ${node.evidence.slice(0, 3).join(", ")}.`
    : node.kind === "destination"
      ? "This is your direction, not a promise of an outcome."
      : node.description;
  return <motion.div className="step-dock" layout key={node.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
    <span className={`step-status ${node.status}`}><i />{cardStatus(node)}</span>
    <div><small>WHY THIS STEP IS HERE</small><strong>{plainEffect}</strong></div>
    <div className="step-results"><small>WHAT MOVES FORWARD</small><span>{node.evidence.slice(0, 3).join(" · ")}</span></div>
    {sourceBacked ? <a href={node.sourceUrl} target="_blank" rel="noreferrer">OFFICIAL PAGE ↗</a> : <button onClick={onTools}>HOW THE AGENT HELPS</button>}
  </motion.div>;
}

function JourneyWorkspace({ state, route, routes, selectedNode, cvName, onUpload, onReview, onGoal, onRoute, onNode, onTake, onMiss, onRepair, onReset, onWhy, onTools }: { state: FutureDoorsState; route: Route; routes: Route[]; selectedNode: PathNode; cvName: string; onUpload: (file: File) => void; onReview: () => void; onGoal: () => void; onRoute: (id: RouteId) => void; onNode: (node: PathNode) => void; onTake: () => void; onMiss: () => void; onRepair: () => void; onReset: () => void; onWhy: () => void; onTools: () => void }) {
  const broken = state.scenario === "miss" && route.id === "ship";
  return (
    <section className="journey-workspace" aria-label="Your opportunity path">
      <Spotlight className="workspace-spotlight" size={460} />
      <header className="journey-heading">
        <div><small>YOUR OPPORTUNITY PATH</small><h2>One move should make the next one possible.</h2></div>
        <div className="journey-heading-actions"><span><i />AGENT CHECKS</span><span className="human"><i />YOU DECIDE</span><button className="why-button" onClick={onWhy}>WHY THIS PATH? ↗</button></div>
      </header>
      <ProfileStrip state={state} cvName={cvName} onUpload={onUpload} onReview={onReview} onGoal={onGoal} />
      <RouteSwitcher routes={routes} selected={route.id} onSelect={onRoute} />
      <div className={`path-stage scenario-${state.scenario}`}>
        <Image className="haikei-waves" src="/haikei-path-waves.svg" alt="" width={900} height={600} aria-hidden="true" />
        <div className="route-caption"><span>BEST NEXT MOVE</span><strong>{route.summary}</strong></div>
        <AnimatedGroup className="path-chain" key={`${state.replayToken}-${route.id}`} preset="blur-slide" stagger={0.07}>
        {route.nodes.map((node, index) => (
          <div className="chain-piece" key={node.id}>
            <PathCard node={node} selected={state.selectedNodeId === node.id} onSelect={() => onNode(node)} />
            {index < route.nodes.length - 1 ? <Connector node={node} broken={broken} /> : null}
          </div>
        ))}
        </AnimatedGroup>
        <div className="path-legend"><span><i className="solid-line" /> each arrow names what moves forward</span><b>TRY-OUT · NOT A PREDICTION</b></div>
      </div>
      <StepDock node={selectedNode} onTools={onTools} />
      <DecisionDock state={state} route={route} onTake={onTake} onMiss={onMiss} onRepair={onRepair} onReset={onReset} />
    </section>
  );
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
  return <ModalFrame label="ANOTHER WAY · WAITING FOR YOU" title="Replace the missed step" onClose={onClose} className="bridge-modal"><div className="bridge-flow"><span><small>MISSED</small><b>WebMCP Challenge</b></span><i>→</i><span className="proposed"><small>ANOTHER WAY</small><b>{state.bridge.title}</b><em>{state.bridge.eta}</em></span><i>→</i><span><small>YOU STILL GET</small>{state.bridge.outputs.map((item) => <b key={item}>✓ {item}</b>)}</span></div><div className="bridge-reason"><div><small>WHY IT CAN REPLACE IT</small><p>{state.bridge.rationale}</p></div><div><small>OFFICIAL PAGE</small><blockquote>{state.bridge.sourceClause}</blockquote><a href={state.bridge.sourceUrl} target="_blank" rel="noreferrer">Open official page ↗</a></div></div><footer><span>The agent suggests. Only you can change the path.</span><button onClick={onClose}>KEEP OLD PATH</button><button className="primary" onClick={onApprove}>USE THIS WAY</button></footer></ModalFrame>;
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
  const [modal, setModal] = useState<Modal>(null);
  const [cvName, setCvName] = useState("Sample · Maya_Park.pdf");
  const [proposedProfile, setProposedProfile] = useState<Profile | null>(null);
  const [reviewOpportunityId, setReviewOpportunityId] = useState<string | null>(null);
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
  const simulateTake = useCallback((actor: "you" | "agent" = "you") => commit(actor, "Opportunity taken in try-out", "Three useful results now reach the next step", (current) => ({ ...current, selectedMonth: "2026-08", selectedRouteId: "ship", selectedNodeId: "ship-proof", scenario: "take", bridge: { ...current.bridge, state: "none" }, replayToken: current.replayToken + 1 })), [commit]);
  const simulateMiss = useCallback((actor: "you" | "agent" = "you") => commit(actor, "Opportunity missed in try-out", "The next step is now missing the work it needs", (current) => ({ ...current, selectedMonth: "2026-09", selectedRouteId: "ship", selectedNodeId: "ship-proof", scenario: "miss", bridge: { ...current.bridge, state: "none" }, replayToken: current.replayToken + 1 })), [commit]);
  const stageDefaultBridge = useCallback(() => { commit("system", "Another way suggested", "An agent can suggest this through WebMCP", (current) => ({ ...current, bridge: { ...current.bridge, state: "staged" } })); setModal("bridge"); }, [commit]);
  const approveBridge = useCallback(() => { commit("you", "Another way approved", "Same useful work · six weeks later", (current) => ({ ...current, scenario: "rerouted", selectedRouteId: "ship", selectedNodeId: "ship-bridge", bridge: { ...current.bridge, state: "approved" }, replayToken: current.replayToken + 1 })); setModal(null); }, [commit]);
  const reset = useCallback((actor: "you" | "agent" = "you") => { const next = cloneInitialState(); next.profile = stateRef.current.profile; next.opportunities = stateRef.current.opportunities; next.activity = [{ id: makeId("activity"), actor, label: "Try-out reset", detail: "Starting path restored" }, ...stateRef.current.activity].slice(0, 6); stateRef.current = next; setState(next); setModal(null); return summarizeState(next); }, []);
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

  const actions = useMemo<FutureDoorsActions>(() => ({
    getPathSnapshot: () => summarizeState(stateRef.current), stageProfileFacts, stageOpportunityFromSource,
    focusRoute: selectRoute, focusStep: selectNode,
    movePathClock: (month, actor = "you") => { const valid = requirePathMonth(month); return commit(actor, "Path clock moved", formatMonth(valid), (current) => ({ ...current, selectedMonth: valid, replayToken: current.replayToken + 1 })); },
    simulateTakeDoor: (doorId, actor = "you") => { requireDoorId(doorId); return simulateTake(actor); },
    simulateMissedDoor: (doorId, actor = "you") => { requireDoorId(doorId); return simulateMiss(actor); },
    stageBridgeFromSource: (proposal) => { if (stateRef.current.scenario !== "miss") throw new Error("[PATH_NOT_BROKEN] Try missing the first opportunity before suggesting another way."); const result = commit("agent", "Another way suggested", "Waiting for your approval", (current) => ({ ...current, bridge: { ...proposal, state: "staged" } })); setModal("bridge"); return result; },
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
  const connectOpportunity = (id: string) => {
    const candidate = stateRef.current.opportunities.find((item) => item.id === id);
    if (!candidate) throw new Error("[UNKNOWN_OPPORTUNITY] Choose a saved opportunity shown in the review window.");
    const review = reviewOpportunity(candidate);
    if (!review.canConnect || review.status === "needs_fact") throw new Error("[OPPORTUNITY_NOT_READY] Answer the missing detail or choose an opportunity that helps the next step.");
    commit("you", "Opportunity added to path", candidate.title, (current) => ({ ...current, opportunities: current.opportunities.map((item) => ({ ...item, state: item.id === id ? "connected" as const : "review" as const })), selectedRouteId: "ship", selectedNodeId: "ship-challenge", scenario: "baseline", bridge: { ...current.bridge, state: "none" }, replayToken: current.replayToken + 1 }));
    setModal(null);
  };

  const openCapture = () => { setReviewOpportunityId(state.opportunities[0]?.id ?? null); setModal("capture"); };

  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-icon"><i /></span><strong>FUTURE DOORS</strong><small>SCREENSHOT → OFFICIAL RULES → NEXT MOVE</small></div><div className="agent-status"><span className={`capability-dot ${webMcpStatus}`} /><b>{webMcpStatus === "ready" ? "AGENT CONNECTED" : "WEBMCP READY"}</b><span>agent checks · you approve</span></div><nav className="top-actions"><button className="add-door" onClick={openCapture}>＋ START WITH A SCREENSHOT{state.opportunities.length ? ` · ${state.opportunities.length}` : ""}</button><button onClick={() => setModal("tools")}>WHAT THE AGENT CAN DO</button></nav></header>
    <section className="hero"><motion.div className="hero-copy" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}><small>STOP SAVING OPPORTUNITIES YOU NEVER USE</small><h1>See what one opportunity can <em>unlock next.</em></h1><p>Share any opportunity screenshot. The agent finds the official rules, checks your profile, and shows exactly where it fits. <b>You decide what joins your path.</b></p></motion.div><OpportunityJourney onOpen={openCapture} /></section>
    <JourneyWorkspace state={state} route={route} routes={routes} selectedNode={selectedNode} cvName={cvName} onUpload={uploadCv} onReview={() => { setProposedProfile(null); setModal("profile"); }} onGoal={() => setModal("goal")} onRoute={(id) => selectRoute(id)} onNode={(node) => selectNode(node.id)} onTake={() => simulateTake()} onMiss={() => simulateMiss()} onRepair={stageDefaultBridge} onReset={() => reset()} onWhy={() => setModal("why")} onTools={() => setModal("tools")} />
    <AnimatePresence>
      {modal === "profile" ? <ProfileModal profile={proposedProfile ?? state.profile} cvName={cvName} proposed={Boolean(proposedProfile)} onSave={saveProfile} onClose={() => { setProposedProfile(null); setModal(null); }} /> : null}
      {modal === "goal" ? <GoalModal profile={state.profile} onSave={saveGoal} onClose={() => setModal(null)} /> : null}
      {modal === "bridge" ? <BridgeModal state={state} onApprove={approveBridge} onClose={() => setModal(null)} /> : null}
      {modal === "capture" ? <CaptureModal candidates={state.opportunities} selectedId={reviewOpportunityId} profile={state.profile} onSelect={setReviewOpportunityId} onConnect={connectOpportunity} onClose={() => setModal(null)} /> : null}
      {modal === "why" ? <WhyModal route={route} profile={state.profile} onClose={() => setModal(null)} /> : null}
      {modal === "tools" ? <ToolsModal status={webMcpStatus} onClose={() => setModal(null)} /> : null}
    </AnimatePresence>
  </main>;
}
