import { describe, expect, it } from "vitest";
import evalManifest from "../../evals/webmcp-journeys.json";
import {
  WEBMCP_OUTPUT_CHARACTER_BUDGET,
  createFutureDoorsTools,
  serializeToolOutput,
  siteToolNames,
  type FutureDoorsActions,
  type SiteTool,
} from "./webmcp";

type ExpectedCall = { functionName: string; arguments: Record<string, unknown> };

function makeActions(calls: ExpectedCall[]): FutureDoorsActions {
  const record = (functionName: string, args: Record<string, unknown> = {}) => {
    calls.push({ functionName, arguments: args });
    return { ok: true, functionName };
  };

  return {
    getPathSnapshot: () => record("get_path_snapshot"),
    stageProfileFacts: (proposal) => record("stage_profile_facts", Object.fromEntries(Object.entries({
      name: proposal.name,
      age: proposal.age,
      graduation_month: proposal.graduationMonth,
      nationality: proposal.nationality,
      residence: proposal.residence,
      study_status: proposal.studyStatus,
      field_of_study: proposal.fieldOfStudy,
      work_authorization: proposal.workAuthorization,
      strengths: proposal.strengths,
      credentials: proposal.credentials,
      gap: proposal.gap,
    }).filter(([, value]) => value !== undefined))),
    stageOpportunityFromSource: (proposal) => record("stage_opportunity_from_source", {
      title: proposal.title,
      source_label: proposal.sourceLabel,
      source_url: proposal.sourceUrl,
      source_clause: proposal.sourceClause,
      deadline_month: proposal.deadlineMonth,
      rationale: proposal.rationale,
      outputs: proposal.outputs,
    }),
    focusRoute: (routeId) => record("focus_route", { route_id: routeId }),
    focusStep: (stepId) => record("focus_step", { step_id: stepId }),
    movePathClock: (month) => record("move_path_clock", { month }),
    simulateTakeDoor: (doorId) => record("simulate_take_door", { door_id: doorId }),
    simulateMissedDoor: (doorId) => record("simulate_missed_door", { door_id: doorId }),
    stageBridgeFromSource: (proposal) => record("stage_bridge_from_source", {
      title: proposal.title,
      source_label: proposal.sourceLabel,
      source_url: proposal.sourceUrl,
      source_clause: proposal.sourceClause,
      rationale: proposal.rationale,
      outputs: proposal.outputs,
      eta: proposal.eta,
    }),
    pinConstraint: (constraint) => record("pin_constraint", { constraint }),
    compareRoutes: () => record("compare_routes"),
    explainDownstreamEffect: (stepId) => record("explain_downstream_effect", { step_id: stepId }),
    resetPath: () => record("reset_path"),
  };
}

function byName(tools: SiteTool[], name: string) {
  const tool = tools.find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`Missing test tool: ${name}`);
  return tool;
}

describe("WebMCP contract", () => {
  it("keeps names, descriptions, parameter descriptions, and outputs within official guidance", () => {
    const tools = createFutureDoorsTools(makeActions([]));
    expect(tools.map((tool) => tool.name)).toEqual([...siteToolNames]);

    for (const tool of tools) {
      expect(tool.name.length, tool.name).toBeLessThanOrEqual(30);
      expect(tool.description.length, tool.name).toBeLessThanOrEqual(500);

      const properties = (tool.inputSchema.properties ?? {}) as Record<string, { description?: string }>;
      for (const [name, schema] of Object.entries(properties)) {
        expect(name.length, `${tool.name}.${name}`).toBeLessThanOrEqual(30);
        expect(schema.description?.length ?? 0, `${tool.name}.${name}`).toBeLessThanOrEqual(150);
      }
    }

    expect(serializeToolOutput({ ok: true }).length).toBeLessThanOrEqual(WEBMCP_OUTPUT_CHARACTER_BUDGET);
    expect(() => serializeToolOutput("x".repeat(WEBMCP_OUTPUT_CHARACTER_BUDGET + 1))).toThrow("[OUTPUT_BUDGET_EXCEEDED]");
  });

  it("uses read-only hints only for tools that do not update the shared page", () => {
    const tools = createFutureDoorsTools(makeActions([]));
    const readOnly = tools.filter((tool) => tool.annotations?.readOnlyHint).map((tool) => tool.name);
    expect(readOnly).toEqual(["get_path_snapshot", "compare_routes"]);
    expect(byName(tools, "stage_profile_facts").annotations?.untrustedContentHint).toBe(true);
    expect(byName(tools, "stage_opportunity_from_source").annotations?.untrustedContentHint).toBe(true);
    expect(byName(tools, "stage_bridge_from_source").annotations?.untrustedContentHint).toBe(true);
  });

  it("rejects bad route, date, door, and source inputs with actionable codes", () => {
    const calls: ExpectedCall[] = [];
    const tools = createFutureDoorsTools(makeActions(calls));

    expect(() => byName(tools, "focus_route").execute({ route_id: "unknown" })).toThrow("[INVALID_ROUTE_ID]");
    expect(() => byName(tools, "move_path_clock").execute({ month: "2026-07" })).toThrow("[MONTH_OUT_OF_RANGE]");
    expect(() => byName(tools, "move_path_clock").execute({ month: "June 2027" })).toThrow("[INVALID_MONTH_FORMAT]");
    expect(() => byName(tools, "simulate_take_door").execute({ door_id: "not-a-door" })).toThrow("[INVALID_DOOR_ID]");
    expect(() => byName(tools, "stage_bridge_from_source").execute({
      title: "Replacement sprint",
      source_label: "Example source",
      source_url: "http://example.com",
      source_clause: "This clause is long enough.",
      rationale: "This rationale is long enough.",
      outputs: ["Live app"],
      eta: "+2 weeks",
    })).toThrow("[INVALID_SOURCE_URL]");
    expect(() => byName(tools, "stage_opportunity_from_source").execute({
      title: "Example program",
      source_label: "Official program page",
      source_url: "https://example.com/program",
      source_clause: "This official clause is long enough.",
      deadline_month: "August 2027",
      rationale: "This creates a public artifact relevant to the goal.",
      outputs: ["Public demo"],
    })).toThrow("[INVALID_MONTH_FORMAT]");
    expect(calls).toEqual([]);
  });
});

describe("WebMCP journey evals", () => {
  for (const evalCase of evalManifest.cases) {
    it(`replays the required call order: ${evalCase.id}`, async () => {
      const calls: ExpectedCall[] = [];
      const tools = createFutureDoorsTools(makeActions(calls));

      for (const expected of evalCase.expectedCall as ExpectedCall[]) {
        await byName(tools, expected.functionName).execute(expected.arguments);
      }

      expect(calls).toEqual(evalCase.expectedCall);
    });
  }

  it("keeps detour approval outside the agent tool surface", () => {
    for (const guardrail of evalManifest.guardrailCases) {
      for (const forbidden of guardrail.forbiddenToolNames) {
        expect(siteToolNames).not.toContain(forbidden);
      }
    }
  });

  it("keeps profile confirmation outside the agent tool surface", () => {
    expect(siteToolNames).not.toContain("approve_profile");
    expect(siteToolNames).not.toContain("confirm_profile");
  });
});
