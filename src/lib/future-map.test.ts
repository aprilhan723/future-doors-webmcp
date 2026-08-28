import { describe, expect, it } from "vitest";
import {
  cloneInitialState,
  requireDoorId,
  requirePathMonth,
  requireRouteId,
  requireVisibleStep,
  summarizeRouteComparison,
  summarizeState,
  type Scenario,
} from "./future-map";
import { WEBMCP_OUTPUT_CHARACTER_BUDGET, serializeToolOutput } from "./webmcp";

describe("path input validation", () => {
  it("accepts exact public ids and the full supported month boundary", () => {
    const state = cloneInitialState();
    expect(requireRouteId("community")).toBe("community");
    expect(requireDoorId("ship-challenge")).toBe("ship-challenge");
    expect(requirePathMonth("2026-08")).toBe("2026-08");
    expect(requirePathMonth("2040-12")).toBe("2040-12");
    expect(requireVisibleStep(state, "ship-proof").title).toBe("Product proof bundle");
  });

  it("rejects malformed, out-of-range, and unknown inputs instead of silently repairing them", () => {
    const state = cloneInitialState();
    expect(() => requireRouteId("career")).toThrow("[INVALID_ROUTE_ID]");
    expect(() => requireDoorId("ship-proof")).toThrow("[INVALID_DOOR_ID]");
    expect(() => requirePathMonth("2027-13")).toThrow("[INVALID_MONTH_FORMAT]");
    expect(() => requirePathMonth("2026-07")).toThrow("[MONTH_OUT_OF_RANGE]");
    expect(() => requireVisibleStep(state, "missing-step")).toThrow("[UNKNOWN_STEP_ID]");
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
});
