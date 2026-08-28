"use client";

import { useEffect, useState } from "react";
import {
  DOOR_IDS,
  PATH_END,
  PATH_START,
  ROUTE_IDS,
  requireDoorId,
  requirePathMonth,
  requireRouteId,
  type Profile,
  type RouteId,
} from "./future-map";

type JsonSchema = Record<string, unknown>;
type ToolAnnotations = {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
};
export type SiteTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonSchema;
  annotations?: ToolAnnotations;
  execute: (input: Record<string, unknown>) => unknown | Promise<unknown>;
};
type ModelContext = { registerTool: (tool: SiteTool) => Promise<unknown> | unknown };

declare global {
  interface Document { modelContext?: ModelContext }
  interface Navigator { modelContext?: ModelContext }
  interface Window { __futureDoorsPathToolsRegistered?: boolean }
}

export type FutureDoorsActions = {
  getPathSnapshot: () => unknown;
  stageProfileFacts: (proposal: Partial<Pick<Profile, "name" | "age" | "graduationMonth" | "nationality" | "residence" | "studyStatus" | "fieldOfStudy" | "workAuthorization" | "strengths" | "credentials" | "gap">>) => unknown;
  stageOpportunityFromSource: (proposal: {
    title: string;
    sourceLabel: string;
    sourceUrl: string;
    sourceClause: string;
    deadlineMonth: string;
    deadlineText: string;
    requirements: string[];
    missingFact?: string;
    prerequisite?: string;
    rationale: string;
    outputs: string[];
  }) => unknown;
  focusRoute: (routeId: RouteId, actor?: "you" | "agent") => unknown;
  focusStep: (stepId: string, actor?: "you" | "agent") => unknown;
  movePathClock: (month: string, actor?: "you" | "agent") => unknown;
  simulateTakeDoor: (doorId: string, actor?: "you" | "agent") => unknown;
  simulateMissedDoor: (doorId: string, actor?: "you" | "agent") => unknown;
  stageBridgeFromSource: (proposal: {
    title: string;
    sourceLabel: string;
    sourceUrl: string;
    sourceClause: string;
    rationale: string;
    outputs: string[];
    eta: string;
  }) => unknown;
  pinConstraint: (constraint: string, actor?: "you" | "agent") => unknown;
  compareRoutes: () => unknown;
  explainDownstreamEffect: (stepId: string, actor?: "you" | "agent") => unknown;
  resetPath: (actor?: "you" | "agent") => unknown;
};

export const WEBMCP_OUTPUT_CHARACTER_BUDGET = 1_500;

export class WebMcpToolError extends Error {
  constructor(public readonly code: string, message: string) {
    super(`[${code}] ${message}`);
    this.name = "WebMcpToolError";
  }
}

const objectSchema = (properties: JsonSchema, required: string[] = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

const routeSchema = {
  type: "string",
  enum: [...ROUTE_IDS],
  description: "Exact route id returned by get_path_snapshot.",
};

const stepSchema = {
  type: "string",
  minLength: 3,
  maxLength: 80,
  description: "Exact visible step id returned by get_path_snapshot.",
};

const doorSchema = {
  type: "string",
  enum: [...DOOR_IDS],
  description: "Exact opportunity door id returned by get_path_snapshot.",
};

function requireString(input: Record<string, unknown>, key: string, min: number, max: number) {
  const raw = input[key];
  if (typeof raw !== "string") {
    throw new WebMcpToolError("INVALID_ARGUMENT", `"${key}" must be a string.`);
  }
  const value = raw.trim();
  if (value.length < min || value.length > max) {
    throw new WebMcpToolError("INVALID_ARGUMENT", `"${key}" must contain ${min}–${max} characters.`);
  }
  return value;
}

function requireHttpsUrl(input: Record<string, unknown>, key: string) {
  const value = requireString(input, key, 8, 500);
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") throw new Error("not https");
    return url.toString();
  } catch {
    throw new WebMcpToolError("INVALID_SOURCE_URL", `"${key}" must be a valid HTTPS URL.`);
  }
}

function requireStringArray(input: Record<string, unknown>, key: string, minItems: number, maxItems: number) {
  const raw = input[key];
  if (!Array.isArray(raw) || raw.length < minItems || raw.length > maxItems) {
    throw new WebMcpToolError("INVALID_ARGUMENT", `"${key}" must contain ${minItems}–${maxItems} items.`);
  }
  return raw.map((item, index) => {
    if (typeof item !== "string" || item.trim().length < 2 || item.trim().length > 60) {
      throw new WebMcpToolError("INVALID_ARGUMENT", `"${key}[${index}]" must contain 2–60 characters.`);
    }
    return item.trim();
  });
}

function optionalString(input: Record<string, unknown>, key: string, min: number, max: number) {
  if (input[key] === undefined) return undefined;
  return requireString(input, key, min, max);
}

function optionalStringArray(input: Record<string, unknown>, key: string, maxItems: number) {
  if (input[key] === undefined) return undefined;
  return requireStringArray(input, key, 1, maxItems);
}

function optionalAge(input: Record<string, unknown>) {
  if (input.age === undefined) return undefined;
  if (!Number.isInteger(input.age) || Number(input.age) < 18 || Number(input.age) > 100) {
    throw new WebMcpToolError("INVALID_ARGUMENT", '"age" must be an integer from 18 to 100.');
  }
  return Number(input.age);
}

export function serializeToolOutput(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (typeof text !== "string") {
    throw new WebMcpToolError("EMPTY_TOOL_OUTPUT", "The tool returned no usable result.");
  }
  if (text.length > WEBMCP_OUTPUT_CHARACTER_BUDGET) {
    throw new WebMcpToolError(
      "OUTPUT_BUDGET_EXCEEDED",
      `The result is ${text.length} characters; keep it at or below ${WEBMCP_OUTPUT_CHARACTER_BUDGET}.`,
    );
  }
  return text;
}

export function asToolResult(value: unknown) {
  return {
    content: [{ type: "text", text: serializeToolOutput(value) }],
  };
}

export const siteToolNames = [
  "get_path_snapshot",
  "stage_profile_facts",
  "stage_opportunity_from_source",
  "focus_route",
  "focus_step",
  "move_path_clock",
  "simulate_take_door",
  "simulate_missed_door",
  "stage_bridge_from_source",
  "pin_constraint",
  "compare_routes",
  "explain_downstream_effect",
  "reset_path",
] as const;

export function createFutureDoorsTools(actions: FutureDoorsActions): SiteTool[] {
  return [
    {
      name: "get_path_snapshot",
      title: "Inspect the current path",
      description: "Read the selected opportunity route in detail plus concise summaries of the other routes, current timing, scenario, and safety guardrails. Call this before using a route, step, or door id.",
      inputSchema: objectSchema({}),
      annotations: { readOnlyHint: true },
      execute: () => asToolResult(actions.getPathSnapshot()),
    },
    {
      name: "stage_profile_facts",
      title: "Stage profile facts",
      description: "Stage facts extracted from a CV or conversation in the shared page for human review. This never confirms or saves a fact; the person must approve the proposal in the website.",
      inputSchema: {
        ...objectSchema({
          name: { type: "string", minLength: 2, maxLength: 80, description: "Person name if explicitly present." },
          age: { type: "integer", minimum: 18, maximum: 100, description: "Age only when explicitly known." },
          graduation_month: { type: "string", pattern: "^\\d{4}-(0[1-9]|1[0-2])$", description: "Graduation month in YYYY-MM format." },
          nationality: { type: "string", minLength: 2, maxLength: 80, description: "Nationality only when explicitly known." },
          residence: { type: "string", minLength: 2, maxLength: 80, description: "Current country of residence." },
          study_status: { type: "string", minLength: 2, maxLength: 80, description: "Current education or employment status." },
          field_of_study: { type: "string", minLength: 2, maxLength: 100, description: "Field of study or professional focus." },
          work_authorization: { type: "string", minLength: 2, maxLength: 120, description: "Confirmed work-authorization fact or needs-confirmation note." },
          strengths: { type: "array", minItems: 1, maxItems: 4, items: { type: "string", minLength: 2, maxLength: 60 }, description: "One to four evidence-backed strengths." },
          credentials: { type: "array", minItems: 1, maxItems: 6, items: { type: "string", minLength: 2, maxLength: 60 }, description: "Confirmed exams, licenses, or certificates." },
          gap: { type: "string", minLength: 2, maxLength: 100, description: "One current gap relevant to the goal." },
        }),
        minProperties: 1,
      },
      annotations: { untrustedContentHint: true },
      execute: (input) => asToolResult(actions.stageProfileFacts({
        name: optionalString(input, "name", 2, 80),
        age: optionalAge(input),
        graduationMonth: optionalString(input, "graduation_month", 7, 7),
        nationality: optionalString(input, "nationality", 2, 80),
        residence: optionalString(input, "residence", 2, 80),
        studyStatus: optionalString(input, "study_status", 2, 80),
        fieldOfStudy: optionalString(input, "field_of_study", 2, 100),
        workAuthorization: optionalString(input, "work_authorization", 2, 120),
        strengths: optionalStringArray(input, "strengths", 4),
        credentials: optionalStringArray(input, "credentials", 6),
        gap: optionalString(input, "gap", 2, 100),
      })),
    },
    {
      name: "stage_opportunity_from_source",
      title: "Save an opportunity from a screenshot",
      description: "After inspecting a screenshot, find the original official HTTPS page and add or update one saved opportunity for human review. Include the exact deadline, relevant rules, and one unresolved fact. Never connect it to the path automatically.",
      inputSchema: objectSchema({
        title: { type: "string", minLength: 3, maxLength: 100, description: "Official opportunity or program title." },
        source_label: { type: "string", minLength: 3, maxLength: 120, description: "Short label for the original official page." },
        source_url: { type: "string", format: "uri", description: "Original official HTTPS page, not a social post or screenshot URL." },
        source_clause: { type: "string", minLength: 12, maxLength: 500, description: "Concise official clause supporting the deadline or eligibility rule." },
        deadline_month: { type: "string", pattern: "^\\d{4}-(0[1-9]|1[0-2])$", description: `Verified deadline month from ${PATH_START} through ${PATH_END}.` },
        deadline_text: { type: "string", minLength: 3, maxLength: 100, description: "Exact official deadline with time zone, or say when the time is not stated." },
        requirements: { type: "array", minItems: 1, maxItems: 4, items: { type: "string", minLength: 2, maxLength: 60 }, description: "One to four official requirements that matter for this person." },
        missing_fact: { type: "string", minLength: 3, maxLength: 120, description: "One fact to ask the person when eligibility cannot yet be confirmed." },
        prerequisite: { type: "string", minLength: 3, maxLength: 100, description: "One required exam, certificate, or step that must happen before applying." },
        rationale: { type: "string", minLength: 12, maxLength: 300, description: "How this opportunity could create the work needed for the person's next step." },
        outputs: { type: "array", minItems: 1, maxItems: 5, items: { type: "string", minLength: 2, maxLength: 60 }, description: "One to five useful results this opportunity can create." },
      }, ["title", "source_label", "source_url", "source_clause", "deadline_month", "deadline_text", "requirements", "rationale", "outputs"]),
      annotations: { untrustedContentHint: true },
      execute: (input) => asToolResult(actions.stageOpportunityFromSource({
        title: requireString(input, "title", 3, 100),
        sourceLabel: requireString(input, "source_label", 3, 120),
        sourceUrl: requireHttpsUrl(input, "source_url"),
        sourceClause: requireString(input, "source_clause", 12, 500),
        deadlineMonth: requirePathMonth(input.deadline_month),
        deadlineText: requireString(input, "deadline_text", 3, 100),
        requirements: requireStringArray(input, "requirements", 1, 4),
        missingFact: optionalString(input, "missing_fact", 3, 120),
        prerequisite: optionalString(input, "prerequisite", 3, 100),
        rationale: requireString(input, "rationale", 12, 300),
        outputs: requireStringArray(input, "outputs", 1, 5),
      })),
    },
    {
      name: "focus_route",
      title: "Focus a route",
      description: "Focus one route in the shared page. Use an exact route_id from get_path_snapshot; call get_path_snapshot again afterward to inspect that route's steps.",
      inputSchema: objectSchema({ route_id: routeSchema }, ["route_id"]),
      execute: (input) => asToolResult(actions.focusRoute(requireRouteId(input.route_id), "agent")),
    },
    {
      name: "focus_step",
      title: "Focus a path step",
      description: "Select one visible path step and show why it matters on the shared page. Use an exact step_id from get_path_snapshot.",
      inputSchema: objectSchema({ step_id: stepSchema }, ["step_id"]),
      execute: (input) => asToolResult(actions.focusStep(requireString(input, "step_id", 3, 80), "agent")),
    },
    {
      name: "move_path_clock",
      title: "Move the path clock",
      description: `Move the shared path clock and recompute time-bound steps. The month must be within ${PATH_START} and ${PATH_END}; invalid dates are rejected rather than silently clamped.`,
      inputSchema: objectSchema({
        month: {
          type: "string",
          pattern: "^\\d{4}-(0[1-9]|1[0-2])$",
          description: `Calendar month in YYYY-MM format, from ${PATH_START} through ${PATH_END}.`,
        },
      }, ["month"]),
      execute: (input) => asToolResult(actions.movePathClock(requirePathMonth(input.month), "agent")),
    },
    {
      name: "simulate_take_door",
      title: "Simulate taking a door",
      description: "Try a reversible what-if where the person takes one opportunity. Show what they make and update later steps. This never records a real achievement. Use an exact door_id from get_path_snapshot.",
      inputSchema: objectSchema({ door_id: doorSchema }, ["door_id"]),
      execute: (input) => asToolResult(actions.simulateTakeDoor(requireDoorId(input.door_id), "agent")),
    },
    {
      name: "simulate_missed_door",
      title: "Simulate missing a door",
      description: "Try a reversible what-if where the person misses one opportunity. Show which later step needs another way. Use an exact door_id from get_path_snapshot.",
      inputSchema: objectSchema({ door_id: doorSchema }, ["door_id"]),
      execute: (input) => asToolResult(actions.simulateMissedDoor(requireDoorId(input.door_id), "agent")),
    },
    {
      name: "stage_bridge_from_source",
      title: "Find another way",
      description: "When a step is missed, suggest an alternative from an official HTTPS source that creates the same useful result. It appears on the page, but only the person can approve it.",
      inputSchema: objectSchema(
        {
          title: { type: "string", minLength: 3, maxLength: 90, description: "Short name for the proposed replacement action." },
          source_label: { type: "string", minLength: 3, maxLength: 100, description: "Human-readable name of the official source." },
          source_url: { type: "string", pattern: "^https://", description: "Direct HTTPS URL for the supporting source." },
          source_clause: { type: "string", minLength: 12, maxLength: 500, description: "Relevant source-backed rule or requirement, paraphrased concisely." },
          rationale: { type: "string", minLength: 12, maxLength: 300, description: "Why this action creates what the next step needs without promising an outcome." },
          outputs: { type: "array", minItems: 1, maxItems: 5, items: { type: "string", minLength: 2, maxLength: 60 }, description: "One to five useful results the alternative creates." },
          eta: { type: "string", minLength: 2, maxLength: 30, description: "Short time tradeoff such as +6 weeks." },
        },
        ["title", "source_label", "source_url", "source_clause", "rationale", "outputs", "eta"],
      ),
      annotations: { untrustedContentHint: true },
      execute: (input) => asToolResult(actions.stageBridgeFromSource({
        title: requireString(input, "title", 3, 90),
        sourceLabel: requireString(input, "source_label", 3, 100),
        sourceUrl: requireHttpsUrl(input, "source_url"),
        sourceClause: requireString(input, "source_clause", 12, 500),
        rationale: requireString(input, "rationale", 12, 300),
        outputs: requireStringArray(input, "outputs", 1, 5),
        eta: requireString(input, "eta", 2, 30),
      })),
    },
    {
      name: "pin_constraint",
      title: "Pin a route constraint",
      description: "Add one practical constraint that later route comparisons must respect, such as remote-only, a time limit, or a cost ceiling.",
      inputSchema: objectSchema({ constraint: { type: "string", minLength: 3, maxLength: 80, description: "One concise practical constraint." } }, ["constraint"]),
      execute: (input) => asToolResult(actions.pinConstraint(requireString(input, "constraint", 3, 80), "agent")),
    },
    {
      name: "compare_routes",
      title: "Compare all routes",
      description: "Read a concise comparison of all three routes, including the visible reason, timing, evidence created, next door, outcome direction, and pinned constraints.",
      inputSchema: objectSchema({}),
      annotations: { readOnlyHint: true },
      execute: () => asToolResult(actions.compareRoutes()),
    },
    {
      name: "explain_downstream_effect",
      title: "Explain a downstream effect",
      description: "Focus one exact visible step and explain how it affects the rest of that route without predicting acceptance or hiring. Use a step_id from get_path_snapshot.",
      inputSchema: objectSchema({ step_id: stepSchema }, ["step_id"]),
      execute: (input) => asToolResult(actions.explainDownstreamEffect(requireString(input, "step_id", 3, 80), "agent")),
    },
    {
      name: "reset_path",
      title: "Reset the path",
      description: "Clear reversible what-if state and restore the baseline best-match path while keeping the person's confirmed goal.",
      inputSchema: objectSchema({}),
      execute: () => asToolResult(actions.resetPath("agent")),
    },
  ];
}

export function useFutureDoorsWebMcp(actions: FutureDoorsActions) {
  const [status, setStatus] = useState<"checking" | "ready" | "preview">("checking");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const register = async () => {
      attempts += 1;
      const modelContext = document.modelContext ?? navigator.modelContext;
      if (!modelContext?.registerTool) {
        if (!cancelled && attempts === 1) setStatus("preview");
        if (attempts < 60) window.setTimeout(register, 500);
        return;
      }
      if (window.__futureDoorsPathToolsRegistered) {
        if (!cancelled) setStatus("ready");
        return;
      }

      const tools = createFutureDoorsTools(actions);

      try {
        for (const tool of tools) await modelContext.registerTool(tool);
        window.__futureDoorsPathToolsRegistered = true;
        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("preview");
      }
    };

    void register();
    return () => { cancelled = true; };
  }, [actions]);

  return status;
}
