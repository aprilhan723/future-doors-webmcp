import { describe, expect, it } from "vitest";
import {
  buildRoutes,
  cloneInitialState,
  getRouteFutureImpact,
  getRouteFit,
  getOpportunityRouteOptions,
  reviewOpportunity,
  requireActionableDoor,
  requireDoorId,
  requirePathMonth,
  requireRouteId,
  requireVisibleStep,
  sanitizePersistedState,
  sortSavedOpportunities,
  summarizeRouteComparison,
  summarizeState,
  type Scenario,
} from "./future-map";
import { WEBMCP_OUTPUT_CHARACTER_BUDGET, serializeToolOutput } from "./webmcp";

describe("path input validation", () => {
  it("explains a route's practical fit without claiming a chance of acceptance", () => {
    const state = cloneInitialState();
    const community = getRouteFit(state, "community");
    const ship = getRouteFit(state, "ship");

    expect(community).toMatchObject({ total: 5, reasons: expect.arrayContaining(["Remote", "5–10 hrs / week"]) });
    expect(community.matches).toBeGreaterThan(ship.matches);
  });

  it("accepts exact public ids and the full supported month boundary", () => {
    const state = cloneInitialState();
    expect(requireRouteId("community")).toBe("community");
    expect(requireDoorId("ship-challenge")).toBe("ship-challenge");
    expect(requirePathMonth("2026-08")).toBe("2026-08");
    expect(requirePathMonth("2040-12")).toBe("2040-12");
    expect(requireVisibleStep(state, "ship-proof").title).toBe("A product people can try");
  });

  it("rejects malformed, out-of-range, and unknown inputs instead of silently repairing them", () => {
    const state = cloneInitialState();
    expect(() => requireRouteId("career")).toThrow("[INVALID_ROUTE_ID]");
    expect(() => requireDoorId("ship-proof")).toThrow("[INVALID_DOOR_ID]");
    expect(() => requirePathMonth("2027-13")).toThrow("[INVALID_MONTH_FORMAT]");
    expect(() => requirePathMonth("2026-07")).toThrow("[MONTH_OUT_OF_RANGE]");
    expect(() => requireVisibleStep(state, "missing-step")).toThrow("[UNKNOWN_STEP_ID]");
  });

  it("lets the official cohort rule block both human and agent take simulations", () => {
    const state = cloneInitialState();
    expect(state.profile.universityLocation).toBe("South Korea");
    const routes = buildRoutes(state);
    expect(routes.find((route) => route.id === "ship")?.nodes[0].status).toBe("ineligible");
    expect(routes.find((route) => route.id === "community")!.fit).toBeGreaterThan(routes.find((route) => route.id === "ship")!.fit);
    expect(() => requireActionableDoor(state, "ship-challenge")).toThrow("[DOOR_NOT_ACTIONABLE]");

    state.opportunities = [{
      id: "approved-source",
      state: "connected",
      pathRouteId: "ship",
      title: "Confirmed eligible product program",
      sourceLabel: "Official program page",
      sourceUrl: "https://example.com/program",
      sourceClause: "The confirmed applicant facts match the published requirements.",
      deadlineMonth: "2027-08",
      deadlineText: "August 31, 2027",
      requirements: ["Confirmed student status"],
      rationale: "The approved program creates public work for the next step.",
      outputs: ["Live product"],
      checkedAt: "2026-08-31",
    }];
    expect(requireActionableDoor(state, "ship-challenge").status).toBe("available");
  });

  it("sanitizes malformed browser state without restoring impossible priorities", () => {
    const restored = sanitizePersistedState({
      profile: "not-an-object",
      selectedMonth: "tomorrow",
      selectedRouteId: "unknown",
      selectedNodeId: 42,
      scenario: "won",
      priorities: ["ship", "ship", "unknown"],
      opportunities: [{ id: "bad", title: "Bad", sourceUrl: "javascript:alert(1)" }],
      activity: [{ actor: "you", label: "Forged human approval", detail: "Injected from storage" }],
      proofReceipts: [{ proofId: "mentor_feedback", artifactUrl: "https://evil.example/fake", title: "Fake", sourceLabel: "Fake", verificationNote: "Fake", attachedAt: "2026-08-31" }],
    });
    expect(restored.selectedMonth).toBe("2026-08");
    expect(restored.selectedRouteId).toBe("ship");
    expect(restored.selectedNodeId).toBe("ship-challenge");
    expect(restored.scenario).toBe("baseline");
    expect(restored.priorities).toEqual([]);
    expect(restored.opportunities).toEqual([]);
    expect(restored.proofReceipts).toEqual([]);
    expect(restored.activity).toEqual(cloneInitialState().activity);
    expect(restored.profile.name).toBe("Maya Park");
  });

  it("never restores eligibility-driving profile facts as confirmed approvals", () => {
    const restored = sanitizePersistedState({
      profile: { ...cloneInitialState().profile, universityLocation: "Canada", studyStatus: "Working professional" },
      priorities: ["ship"],
    });
    expect(restored.profile.universityLocation).toBe("South Korea");
    expect(restored.profile.studyStatus).toBe("Undergraduate");
    expect(buildRoutes(restored).find((route) => route.id === "ship")?.nodes[0].status).toBe("ineligible");
    expect(restored.priorities).toEqual([]);
  });

  it("can restore practical preferences without restoring eligibility facts", () => {
    const restored = sanitizePersistedState({
      profile: {
        ...cloneInitialState().profile,
        universityLocation: "Canada",
        preferences: { workMode: "Hybrid okay", compensation: "Any compensation", timeCommitment: "Flexible time", schedule: "Any schedule", participation: "Team okay" },
      },
    });
    expect(restored.profile.universityLocation).toBe("South Korea");
    expect(restored.profile.preferences).toEqual({ workMode: "Hybrid okay", compensation: "Any compensation", timeCommitment: "Flexible time", schedule: "Any schedule", participation: "Team okay" });
  });

  it("keeps at most four user-created career directions", () => {
    const base = cloneInitialState();
    const goals = Array.from({ length: 5 }, (_, index) => ({
      id: `goal-${index + 1}`,
      title: `Direction ${index + 1}`,
      shortLabel: `D${index + 1}`,
      targetYear: 2030,
      gap: "A visible proof of work",
      supportedRoutes: ["ship", "community", "research"],
    }));
    const restored = sanitizePersistedState({ profile: base.profile, goals, selectedGoalId: "goal-4" });
    expect(restored.goals).toHaveLength(4);
    expect(restored.selectedGoalId).toBe("goal-4");
    expect(restored.profile.goal).toBe("Direction 4");
  });

  it("shows only the futures a person explicitly connects to each proof path", () => {
    const state = cloneInitialState();

    expect(getRouteFutureImpact(state, "community")).toMatchObject({
      count: 3,
      goalIds: ["ai-product", "hardware-story", "learning-founder"],
      includesSelectedGoal: true,
    });
    expect(getRouteFutureImpact(state, "ship")).toMatchObject({
      count: 2,
      goalIds: ["ai-product", "learning-founder"],
    });

    state.goals[1].supportedRoutes = ["research"];
    expect(getRouteFutureImpact(state, "community")).toMatchObject({ count: 2, goalIds: ["ai-product", "learning-founder"] });
    expect(summarizeRouteComparison(state).routes.find((route) => route.id === "community")?.helpsFutures).toBe(2);
  });
});

describe("agent output budgets", () => {
  const scenarios: Scenario[] = ["baseline", "take", "miss", "rerouted"];

  for (const scenario of scenarios) {
    it(`keeps the ${scenario} path snapshot within ${WEBMCP_OUTPUT_CHARACTER_BUDGET} characters`, () => {
      const state = cloneInitialState();
      state.scenario = scenario;
      state.bridge.state = scenario === "rerouted" ? "approved" : "none";
      const output = serializeToolOutput(summarizeState(state));
      expect(output.length).toBeLessThanOrEqual(WEBMCP_OUTPUT_CHARACTER_BUDGET);
    });
  }

  it("keeps the three-route comparison within the same budget", () => {
    const state = cloneInitialState();
    state.pinnedConstraints = [
      "≤ 10 hrs / week",
      "Low or no cost",
      "Remote-friendly",
      "No relocation",
      "Must create public evidence",
    ];
    const output = serializeToolOutput(summarizeRouteComparison(state));
    expect(output.length).toBeLessThanOrEqual(WEBMCP_OUTPUT_CHARACTER_BUDGET);
  });

  it("keeps an approved screenshot door within the same budget", () => {
    const state = cloneInitialState();
    state.opportunities = [{
      id: "opportunity-1",
      state: "connected",
      pathRouteId: "ship",
      title: "A long but valid source-backed opportunity title for a public product-building program",
      sourceLabel: "Official opportunity page",
      sourceUrl: "https://example.com/opportunity",
      sourceClause: "An official rule clause that is intentionally long but never copied into the compact path snapshot.",
      deadlineMonth: "2027-08",
      deadlineText: "August 31, 2027 at 5:00 PM KST",
      requirements: ["Open to current students", "Public demo required"],
      rationale: "This route creates useful public work for the person's next step.",
      outputs: ["Published product case study", "Public repository with documentation", "Recorded product walkthrough", "Peer review trail", "Decision log"],
      checkedAt: "2026-08-29",
    }];
    const output = serializeToolOutput(summarizeState(state));
    expect(output.length).toBeLessThanOrEqual(WEBMCP_OUTPUT_CHARACTER_BUDGET);
  });

  it("keeps planned work distinct from an attached, not independently verified, work link", () => {
    const state = cloneInitialState();
    state.priorities = ["community"];
    expect(summarizeState(state).proof.public_collaboration).toBe("planned");

    state.proofReceipts = [{
      proofId: "public_collaboration",
      title: "Merged accessibility fix",
      artifactUrl: "https://github.com/example/project/pull/42",
      sourceLabel: "GitHub pull request",
      verificationNote: "Shows the public contribution and review history.",
      attachedAt: "2026-08-31T12:00:00.000Z",
    }];
    const snapshot = summarizeState(state);
    expect(snapshot.proof.public_collaboration).toBe("attached");
    expect(serializeToolOutput(snapshot).length).toBeLessThanOrEqual(WEBMCP_OUTPUT_CHARACTER_BUDGET);
  });
});

describe("saved opportunity review", () => {
  const base = {
    id: "opportunity-1",
    state: "review" as const,
    title: "Public product challenge",
    sourceLabel: "Official page",
    sourceUrl: "https://example.com/opportunity",
    sourceClause: "Applicants must publish a working project and demo.",
    deadlineMonth: "2027-08",
    deadlineText: "August 31, 2027 at 5:00 PM KST",
    requirements: ["Publish a working project"],
    rationale: "The project can become public work for the next step.",
    outputs: ["Live product"],
    checkedAt: "2026-08-29",
  };

  it("keeps an opportunity with one unanswered fact off the path", () => {
    expect(reviewOpportunity({ ...base, missingFact: "Can you work in the host country?" })).toMatchObject({ status: "needs_fact", canConnect: false });
  });

  it("allows only an opportunity that creates work useful to the next step", () => {
    expect(reviewOpportunity(base)).toMatchObject({ status: "ready", canConnect: true });
    expect(reviewOpportunity({ ...base, outputs: ["Attendance certificate"] })).toMatchObject({ status: "saved_only", canConnect: false });
  });

  it("lets the person choose the plan a source-backed result supports", () => {
    expect(getOpportunityRouteOptions({ ...base, outputs: ["Live product", "Public contribution"] })).toEqual(["ship", "community"]);
    expect(getOpportunityRouteOptions({ ...base, outputs: ["Mentor feedback", "Research proposal"] })).toEqual(["research"]);
    expect(getOpportunityRouteOptions({ ...base, state: "connected", pathRouteId: "community" })).toEqual(["community"]);
  });

  it("keeps a saved source in the route the person chose, without reopening a different route", () => {
    const state = cloneInitialState();
    state.opportunities = [{
      ...base,
      state: "connected",
      pathRouteId: "research",
      title: "Mentored research fellowship",
      outputs: ["Mentor feedback", "Research proposal"],
    }];

    expect(buildRoutes(state).find((route) => route.id === "research")?.nodes[0].title).toBe("Mentored research fellowship");
    expect(buildRoutes(state).find((route) => route.id === "ship")?.nodes[0].status).toBe("ineligible");
  });

  it("keeps connected work visible, then sorts the remaining scrapbook by official deadline", () => {
    const ordered = sortSavedOpportunities([
      { ...base, id: "late", title: "Later review", deadlineMonth: "2027-11" },
      { ...base, id: "connected", title: "Pinned proof", state: "connected", deadlineMonth: "2030-01" },
      { ...base, id: "soon", title: "Soon review", deadlineMonth: "2027-04" },
    ]);

    expect(ordered.map((item) => item.id)).toEqual(["connected", "soon", "late"]);
  });
});
